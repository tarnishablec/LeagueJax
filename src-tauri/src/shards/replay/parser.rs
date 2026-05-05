use std::path::Path;

use serde::Deserialize;

const ROFL_MAGIC: &[u8; 4] = b"RIOT";
const MIN_ROFL_LEN: usize = 16;
const OLD_HEADER_METADATA_OFFSET: usize = 268;
const OLD_HEADER_METADATA_LENGTH: usize = 272;
const SCAN_VERSION_LIMIT: usize = 512;
const METADATA_MARKERS: [&[u8]; 2] = [br#"{"gameLength""#, br#"{"gameVersion""#];

#[derive(Debug, Clone)]
pub struct RoflFileMetadata {
    pub game_version: Option<String>,
    pub champion_ids: Vec<u32>,
    pub champion_aliases: Vec<String>,
    pub game_length_ms: Option<u64>,
    pub last_game_chunk_id: Option<u64>,
    pub last_key_frame_id: Option<u64>,
}

#[derive(Debug, Default)]
struct RoflChampionMetadata {
    ids: Vec<u32>,
    aliases: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RawRoflMetadata {
    game_version: Option<String>,
    game_length: Option<serde_json::Value>,
    last_game_chunk_id: Option<serde_json::Value>,
    last_key_frame_id: Option<serde_json::Value>,
    stats_json: Option<serde_json::Value>,
}

pub fn read_rofl_metadata(path: &Path) -> Result<RoflFileMetadata, String> {
    let content =
        std::fs::read(path).map_err(|error| format!("Failed to read replay file: {error}"))?;
    parse_rofl_metadata(&content)
}

pub fn parse_rofl_metadata(content: &[u8]) -> Result<RoflFileMetadata, String> {
    validate_rofl(content)?;

    let header_version = find_header_version(content);
    let raw_metadata = read_metadata_json(content)?;

    if raw_metadata.is_none() && header_version.is_none() {
        return Err("Replay metadata JSON and header version could not be located".to_string());
    }

    let mut metadata = raw_metadata
        .map(metadata_from_raw)
        .unwrap_or_else(empty_metadata);
    if metadata.game_version.is_none() {
        metadata.game_version = header_version;
    }

    Ok(metadata)
}

fn validate_rofl(content: &[u8]) -> Result<(), String> {
    if content.len() < MIN_ROFL_LEN {
        return Err(format!(
            "Replay file is too small to contain a ROFL header: {} bytes",
            content.len()
        ));
    }

    if content.get(..ROFL_MAGIC.len()) != Some(ROFL_MAGIC) {
        return Err("Replay file does not start with the RIOT magic header".to_string());
    }

    Ok(())
}

fn empty_metadata() -> RoflFileMetadata {
    RoflFileMetadata {
        game_version: None,
        champion_ids: Vec::new(),
        champion_aliases: Vec::new(),
        game_length_ms: None,
        last_game_chunk_id: None,
        last_key_frame_id: None,
    }
}

fn metadata_from_raw(raw: RawRoflMetadata) -> RoflFileMetadata {
    let champions = champions_from_stats_json(raw.stats_json.as_ref());
    RoflFileMetadata {
        game_version: raw.game_version.and_then(normalize_version),
        champion_ids: champions.ids,
        champion_aliases: champions.aliases,
        game_length_ms: raw.game_length.as_ref().and_then(json_u64),
        last_game_chunk_id: raw.last_game_chunk_id.as_ref().and_then(json_u64),
        last_key_frame_id: raw.last_key_frame_id.as_ref().and_then(json_u64),
    }
}

fn read_metadata_json(content: &[u8]) -> Result<Option<RawRoflMetadata>, String> {
    if let Some(section) = read_old_header_metadata_section(content)? {
        return parse_metadata(section).map(Some);
    }

    let mut first_error = None;
    for marker in METADATA_MARKERS {
        let mut offset = 0;
        while let Some(start) = find_bytes(content, marker, offset) {
            let Some(end) = find_json_object_end(content, start) else {
                first_error.get_or_insert_with(|| {
                    "Replay metadata JSON marker was found but the object was incomplete"
                        .to_string()
                });
                break;
            };

            match parse_metadata(&content[start..end]) {
                Ok(metadata) => return Ok(Some(metadata)),
                Err(error) => {
                    first_error.get_or_insert(error);
                    offset = start.saturating_add(1);
                }
            }
        }
    }

    if let Some(error) = first_error {
        return Err(error);
    }

    Ok(None)
}

fn read_old_header_metadata_section(content: &[u8]) -> Result<Option<&[u8]>, String> {
    let Some(offset) = read_u32_le(content, OLD_HEADER_METADATA_OFFSET) else {
        return Ok(None);
    };
    let Some(length) = read_u32_le(content, OLD_HEADER_METADATA_LENGTH) else {
        return Ok(None);
    };

    let Ok(offset) = usize::try_from(offset) else {
        return Ok(None);
    };
    let Ok(length) = usize::try_from(length) else {
        return Ok(None);
    };
    let Some(end) = offset.checked_add(length) else {
        return Ok(None);
    };

    if length == 0 || end > content.len() {
        return Ok(None);
    }

    let Some(section) = content.get(offset..end) else {
        return Ok(None);
    };

    if section.first() != Some(&b'{') {
        return Ok(None);
    }

    Ok(Some(section))
}

fn parse_metadata(section: &[u8]) -> Result<RawRoflMetadata, String> {
    let metadata = std::str::from_utf8(section)
        .map_err(|error| format!("Replay metadata JSON is not UTF-8: {error}"))?;
    serde_json::from_str(metadata)
        .map_err(|error| format!("Replay metadata JSON could not be parsed: {error}"))
}

fn find_header_version(content: &[u8]) -> Option<String> {
    let limit = content.len().min(SCAN_VERSION_LIMIT);
    let mut start = 0;

    while start < limit {
        if !content[start].is_ascii_digit() {
            start += 1;
            continue;
        }

        let mut end = start + 1;
        while end < limit && (content[end].is_ascii_digit() || content[end] == b'.') {
            end += 1;
        }

        let candidate = std::str::from_utf8(content.get(start..end)?).ok()?;
        if is_plausible_version(candidate) {
            return normalize_version(candidate);
        }

        start = end;
    }

    None
}

fn is_plausible_version(candidate: &str) -> bool {
    let mut count = 0;
    for part in candidate.split('.') {
        if part.is_empty() || !part.bytes().all(|byte| byte.is_ascii_digit()) {
            return false;
        }
        count += 1;
    }
    (2..=4).contains(&count)
}

fn find_bytes(haystack: &[u8], needle: &[u8], offset: usize) -> Option<usize> {
    if needle.is_empty() || offset >= haystack.len() {
        return None;
    }

    haystack
        .get(offset..)?
        .windows(needle.len())
        .position(|window| window == needle)
        .map(|position| offset + position)
}

fn find_json_object_end(content: &[u8], start: usize) -> Option<usize> {
    if content.get(start) != Some(&b'{') {
        return None;
    }

    let mut depth = 0usize;
    let mut in_string = false;
    let mut escaped = false;

    for (index, byte) in content.iter().enumerate().skip(start) {
        if in_string {
            if escaped {
                escaped = false;
                continue;
            }

            match *byte {
                b'\\' => escaped = true,
                b'"' => in_string = false,
                _ => {}
            }
            continue;
        }

        match *byte {
            b'"' => in_string = true,
            b'{' => depth += 1,
            b'}' => {
                depth = depth.checked_sub(1)?;
                if depth == 0 {
                    return Some(index + 1);
                }
            }
            _ => {}
        }
    }

    None
}

fn read_u32_le(content: &[u8], offset: usize) -> Option<u32> {
    let bytes = content.get(offset..offset.checked_add(4)?)?;
    let bytes = <[u8; 4]>::try_from(bytes).ok()?;
    Some(u32::from_le_bytes(bytes))
}

fn normalize_version(value: impl AsRef<str>) -> Option<String> {
    let trimmed = value
        .as_ref()
        .trim_matches(char::from(0))
        .trim()
        .to_string();
    if trimmed.is_empty() {
        return None;
    }
    Some(trimmed)
}

fn json_u64(value: &serde_json::Value) -> Option<u64> {
    if let Some(value) = value.as_u64() {
        return Some(value);
    }

    if let Some(value) = value.as_str() {
        return value.trim().parse::<u64>().ok();
    }

    let value = value.as_f64()?;
    if !value.is_finite() || value < 0.0 {
        return None;
    }
    Some(value.round() as u64)
}

fn champions_from_stats_json(value: Option<&serde_json::Value>) -> RoflChampionMetadata {
    let Some(value) = value else {
        return RoflChampionMetadata::default();
    };
    let Some(stats) = normalize_stats_json(value) else {
        return RoflChampionMetadata::default();
    };

    let participants = participant_stats_from_value(&stats);
    RoflChampionMetadata {
        ids: participants
            .iter()
            .filter_map(|value| champion_id_from_participant_stats(value))
            .collect(),
        aliases: participants
            .iter()
            .filter_map(|value| champion_alias_from_participant_stats(value))
            .collect(),
    }
}

fn participant_stats_from_value(value: &serde_json::Value) -> Vec<&serde_json::Value> {
    match value {
        serde_json::Value::Array(values) => values.iter().collect(),
        serde_json::Value::Object(object) => {
            if let Some(values) = object
                .get("participants")
                .or_else(|| object.get("Participants"))
                .or_else(|| object.get("PARTICIPANTS"))
                .and_then(|value| value.as_array())
            {
                values.iter().collect()
            } else {
                vec![value]
            }
        }
        _ => Vec::new(),
    }
}

fn normalize_stats_json(value: &serde_json::Value) -> Option<serde_json::Value> {
    match value {
        serde_json::Value::String(text) => serde_json::from_str(text).ok(),
        other => Some(other.clone()),
    }
}

fn champion_id_from_participant_stats(value: &serde_json::Value) -> Option<u32> {
    let object = value.as_object()?;
    object.iter().find_map(|(key, value)| {
        let normalized = key
            .chars()
            .filter(|char| *char != '_' && *char != '-')
            .collect::<String>()
            .to_ascii_lowercase();

        match normalized.as_str() {
            "championid" | "champion" | "skin" => json_u32(value),
            _ => None,
        }
    })
}

fn champion_alias_from_participant_stats(value: &serde_json::Value) -> Option<String> {
    let object = value.as_object()?;
    object.iter().find_map(|(key, value)| {
        let normalized = key
            .chars()
            .filter(|char| *char != '_' && *char != '-')
            .collect::<String>()
            .to_ascii_lowercase();

        match normalized.as_str() {
            "skin" | "championalias" | "championname" => json_champion_alias(value),
            _ => None,
        }
    })
}

fn json_champion_alias(value: &serde_json::Value) -> Option<String> {
    let trimmed = value.as_str()?.trim();
    if trimmed.is_empty() || trimmed.parse::<u32>().is_ok() {
        return None;
    }
    Some(trimmed.to_string())
}

fn json_u32(value: &serde_json::Value) -> Option<u32> {
    let value = json_u64(value)?;
    if value == 0 {
        return None;
    }
    u32::try_from(value).ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_rofl2_metadata_from_embedded_json() -> Result<(), String> {
        let content = [
            br#"RIOT\x02\x00aaaa16.9.772.1032zzzz"#.as_slice(),
            br#"noise{"gameLength":1612502,"lastGameChunkId":540,"lastKeyFrameId":27,"statsJson":"[{\"WIN\":\"Win\"}]"}tail"#.as_slice(),
        ]
        .concat();

        let metadata = parse_rofl_metadata(&content)?;

        assert_eq!(metadata.game_version.as_deref(), Some("16.9.772.1032"));
        assert_eq!(metadata.game_length_ms, Some(1_612_502));
        assert_eq!(metadata.last_game_chunk_id, Some(540));
        assert_eq!(metadata.last_key_frame_id, Some(27));
        assert!(metadata.champion_ids.is_empty());
        assert!(metadata.champion_aliases.is_empty());
        Ok(())
    }

    #[test]
    fn prefers_metadata_game_version_over_header_version() -> Result<(), String> {
        let content = [
            br#"RIOT\x02\x00aaaa16.9.772.1032zzzz"#.as_slice(),
            br#"noise{"gameVersion":"16.8.1.2","gameLength":10,"lastGameChunkId":2,"lastKeyFrameId":1}"#.as_slice(),
        ]
        .concat();

        let metadata = parse_rofl_metadata(&content)?;

        assert_eq!(metadata.game_version.as_deref(), Some("16.8.1.2"));
        assert_eq!(metadata.game_length_ms, Some(10));
        Ok(())
    }

    #[test]
    fn extracts_champion_ids_from_stats_json() -> Result<(), String> {
        let content = [
            br#"RIOT\x02\x00aaaa16.9.772.1032zzzz"#.as_slice(),
            br#"noise{"gameLength":10,"lastGameChunkId":2,"lastKeyFrameId":1,"statsJson":"[{\"SKIN\":\"22\"},{\"championId\":64},{\"CHAMPION_ID\":\"99\"}]"}"#.as_slice(),
        ]
        .concat();

        let metadata = parse_rofl_metadata(&content)?;

        assert_eq!(metadata.champion_ids, vec![22, 64, 99]);
        assert!(metadata.champion_aliases.is_empty());
        Ok(())
    }

    #[test]
    fn extracts_champion_aliases_from_stats_json() -> Result<(), String> {
        let content = [
            br#"RIOT\x02\x00aaaa16.9.772.1032zzzz"#.as_slice(),
            br#"noise{"gameLength":10,"lastGameChunkId":2,"lastKeyFrameId":1,"statsJson":"[{\"SKIN\":\"Jayce\"},{\"SKIN\":\"MissFortune\"},{\"championId\":64}]"}"#.as_slice(),
        ]
        .concat();

        let metadata = parse_rofl_metadata(&content)?;

        assert_eq!(metadata.champion_ids, vec![64]);
        assert_eq!(metadata.champion_aliases, vec!["Jayce", "MissFortune"]);
        Ok(())
    }

    #[test]
    fn extracts_all_arena_champion_aliases_from_stats_json() -> Result<(), String> {
        let aliases = [
            "Aatrox",
            "Ahri",
            "Akali",
            "Alistar",
            "Ambessa",
            "Anivia",
            "Annie",
            "Ashe",
            "AurelionSol",
            "Azir",
            "Bard",
            "Belveth",
            "Blitzcrank",
            "Brand",
            "Braum",
            "Caitlyn",
        ];
        let stats_json = aliases
            .iter()
            .map(|alias| format!(r#"{{\"SKIN\":\"{alias}\"}}"#))
            .collect::<Vec<_>>()
            .join(",");
        let content = format!(
            r#"RIOT\x02\x00aaaa16.9.772.1032zzzznoise{{"gameLength":10,"lastGameChunkId":2,"lastKeyFrameId":1,"statsJson":"[{stats_json}]"}}"#
        );

        let metadata = parse_rofl_metadata(content.as_bytes())?;

        assert_eq!(
            metadata.champion_aliases,
            aliases
                .iter()
                .map(|alias| alias.to_string())
                .collect::<Vec<_>>()
        );
        Ok(())
    }

    #[test]
    fn rejects_non_rofl_content() {
        let error = parse_rofl_metadata(b"NOPE");
        assert!(error.is_err());
    }

    #[test]
    fn balances_braces_inside_json_strings() -> Result<(), String> {
        let content = br#"RIOT16.9{"gameLength":1,"statsJson":"[{\"A\":\"}\"}]","lastGameChunkId":2,"lastKeyFrameId":3}tail"#;
        let start = find_bytes(content, br#"{"gameLength""#, 0)
            .ok_or_else(|| "metadata marker missing".to_string())?;
        let end = find_json_object_end(content, start)
            .ok_or_else(|| "metadata object end missing".to_string())?;
        let section = std::str::from_utf8(
            content
                .get(start..end)
                .ok_or_else(|| "metadata slice missing".to_string())?,
        )
        .map_err(|error| error.to_string())?;

        assert_eq!(
            section,
            r#"{"gameLength":1,"statsJson":"[{\"A\":\"}\"}]","lastGameChunkId":2,"lastKeyFrameId":3}"#
        );
        Ok(())
    }
}
