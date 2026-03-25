use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawMatchSummariesResponse {
    #[serde(default)]
    pub games: Vec<RawMatchSummaryGame>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawMatchSummaryGame {
    pub json: RawMatchSummaryJson,
    pub metadata: RawMatchSummaryMetadata,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawMatchSummaryJson {
    pub end_of_game_result: String,
    pub game_creation: i64,
    pub game_duration: i64,
    pub game_end_timestamp: i64,
    pub game_id: u64,
    pub game_mode: String,
    #[serde(default)]
    pub game_mode_mutators: Vec<String>,
    pub game_name: String,
    pub game_start_timestamp: Option<i64>,
    pub game_type: String,
    pub game_version: String,
    pub map_id: i64,
    #[serde(default)]
    pub participants: Vec<RawMatchSummaryParticipant>,
    pub platform_id: String,
    pub queue_id: i64,
    pub season_id: i64,
    #[serde(default)]
    pub teams: Vec<RawMatchSummaryTeam>,
    pub tournament_code: Option<String>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawMatchSummaryMetadata {
    pub data_version: Option<String>,
    pub info_type: Option<String>,
    pub match_id: Option<String>,
    #[serde(default)]
    pub participants: Vec<String>,
    pub private: Option<bool>,
    pub product: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub timestamp: Option<String>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawMatchSummaryTeam {
    #[serde(default)]
    pub bans: Vec<RawMatchSummaryBan>,
    pub feats: Option<RawMatchSummaryFeats>,
    pub objectives: Option<RawMatchSummaryObjectives>,
    pub team_id: Option<i64>,
    pub win: Option<bool>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawMatchSummaryBan {
    pub champion_id: Option<i64>,
    pub pick_turn: Option<i64>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawMatchSummaryFeats {
    #[serde(rename = "EPIC_MONSTER_KILL")]
    pub epic_monster_kill: Option<RawMatchSummaryFeat>,
    #[serde(rename = "FIRST_BLOOD")]
    pub first_blood: Option<RawMatchSummaryFeat>,
    #[serde(rename = "FIRST_TURRET")]
    pub first_turret: Option<RawMatchSummaryFeat>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawMatchSummaryFeat {
    pub feat_state: Option<i64>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawMatchSummaryObjectives {
    pub atakhan: Option<RawMatchSummaryObjective>,
    pub baron: Option<RawMatchSummaryObjective>,
    pub champion: Option<RawMatchSummaryObjective>,
    pub dragon: Option<RawMatchSummaryObjective>,
    pub horde: Option<RawMatchSummaryObjective>,
    pub inhibitor: Option<RawMatchSummaryObjective>,
    pub rift_herald: Option<RawMatchSummaryObjective>,
    pub tower: Option<RawMatchSummaryObjective>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawMatchSummaryObjective {
    pub first: Option<bool>,
    pub kills: Option<i64>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawMatchSummaryParticipant {
    pub player_score0: Option<i64>,
    pub player_score1: Option<i64>,
    pub player_score2: Option<i64>,
    pub player_score3: Option<i64>,
    pub player_score4: Option<i64>,
    pub player_score5: Option<i64>,
    pub player_score6: Option<i64>,
    pub player_score7: Option<i64>,
    pub player_score8: Option<i64>,
    pub player_score9: Option<i64>,
    pub player_score10: Option<i64>,
    pub player_score11: Option<i64>,
    pub all_in_pings: Option<i64>,
    pub assist_me_pings: Option<i64>,
    pub assists: Option<i64>,
    pub baron_kills: Option<i64>,
    pub basic_pings: Option<i64>,
    pub challenges: Option<RawMatchSummaryChallenges>,
    pub champ_experience: Option<i64>,
    pub champ_level: Option<i64>,
    pub champion_id: i64,
    pub champion_name: Option<String>,
    pub champion_transform: Option<i64>,
    pub command_pings: Option<i64>,
    pub consumables_purchased: Option<i64>,
    pub damage_dealt_to_buildings: Option<i64>,
    pub damage_dealt_to_epic_monsters: Option<i64>,
    pub damage_dealt_to_objectives: Option<i64>,
    pub damage_dealt_to_turrets: Option<i64>,
    pub damage_self_mitigated: Option<i64>,
    pub danger_pings: Option<i64>,
    pub deaths: Option<i64>,
    pub detector_wards_placed: Option<i64>,
    pub double_kills: Option<i64>,
    pub dragon_kills: Option<i64>,
    pub eligible_for_progression: Option<bool>,
    pub enemy_missing_pings: Option<i64>,
    pub enemy_vision_pings: Option<i64>,
    pub first_blood_assist: Option<bool>,
    pub first_blood_kill: Option<bool>,
    pub first_tower_assist: Option<bool>,
    pub first_tower_kill: Option<bool>,
    pub game_ended_in_early_surrender: Option<bool>,
    pub game_ended_in_surrender: Option<bool>,
    pub get_back_pings: Option<i64>,
    pub gold_earned: Option<i64>,
    pub gold_spent: Option<i64>,
    pub hold_pings: Option<i64>,
    pub individual_position: Option<String>,
    pub inhibitor_kills: Option<i64>,
    pub inhibitor_takedowns: Option<i64>,
    pub inhibitors_lost: Option<i64>,
    pub item0: Option<i64>,
    pub item1: Option<i64>,
    pub item2: Option<i64>,
    pub item3: Option<i64>,
    pub item4: Option<i64>,
    pub item5: Option<i64>,
    pub item6: Option<i64>,
    pub items_purchased: Option<i64>,
    pub killing_sprees: Option<i64>,
    pub kills: Option<i64>,
    pub lane: Option<String>,
    pub largest_critical_strike: Option<i64>,
    pub largest_killing_spree: Option<i64>,
    pub largest_multi_kill: Option<i64>,
    pub longest_time_spent_living: Option<i64>,
    pub magic_damage_dealt: Option<i64>,
    pub magic_damage_dealt_to_champions: Option<i64>,
    pub magic_damage_taken: Option<i64>,
    pub missions: Option<RawMatchSummaryMissions>,
    pub need_vision_pings: Option<i64>,
    pub neutral_minions_killed: i64,
    pub nexus_kills: Option<i64>,
    pub nexus_lost: Option<i64>,
    pub nexus_takedowns: Option<i64>,
    pub objectives_stolen: Option<i64>,
    pub objectives_stolen_assists: Option<i64>,
    pub on_my_way_pings: Option<i64>,
    pub participant_id: Option<i64>,
    pub penta_kills: Option<i64>,
    pub perks: Option<RawMatchSummaryPerks>,
    pub physical_damage_dealt: Option<i64>,
    pub physical_damage_dealt_to_champions: Option<i64>,
    pub physical_damage_taken: Option<i64>,
    pub placement: Option<i64>,
    pub player_augment1: Option<i64>,
    pub player_augment2: Option<i64>,
    pub player_augment3: Option<i64>,
    pub player_augment4: Option<i64>,
    pub player_augment5: Option<i64>,
    pub player_augment6: Option<i64>,
    pub player_subteam_id: Option<i64>,
    #[serde(rename = "PlayerBehavior")]
    pub player_behavior: Option<RawMatchSummaryPlayerBehavior>,
    pub profile_icon: Option<i64>,
    pub push_pings: Option<i64>,
    pub puuid: Option<String>,
    pub quadra_kills: Option<i64>,
    pub retreat_pings: Option<i64>,
    pub riot_id_game_name: Option<String>,
    pub riot_id_tagline: Option<String>,
    pub role: Option<String>,
    pub role_bound_item: Option<i64>,
    pub sight_wards_bought_in_game: Option<i64>,
    pub spell1_casts: Option<i64>,
    pub spell1_id: Option<i64>,
    pub spell2_casts: Option<i64>,
    pub spell2_id: Option<i64>,
    pub spell3_casts: Option<i64>,
    pub spell4_casts: Option<i64>,
    pub subteam_placement: Option<i64>,
    pub summoner1_casts: Option<i64>,
    pub summoner2_casts: Option<i64>,
    pub summoner_id: Option<i64>,
    pub summoner_level: Option<i64>,
    pub summoner_name: Option<String>,
    pub team_early_surrendered: Option<bool>,
    pub team_id: Option<i64>,
    pub team_position: Option<String>,
    pub time_ccing_others: Option<i64>,
    pub time_played: Option<i64>,
    pub total_ally_jungle_minions_killed: Option<i64>,
    pub total_damage_dealt: i64,
    pub total_damage_dealt_to_champions: i64,
    pub total_damage_shielded_on_teammates: i64,
    pub total_damage_taken: i64,
    pub total_enemy_jungle_minions_killed: Option<i64>,
    pub total_heal: i64,
    pub total_heals_on_teammates: i64,
    pub total_minions_killed: i64,
    pub total_time_cc_dealt: Option<i64>,
    pub total_time_spent_dead: Option<i64>,
    pub total_units_healed: Option<i64>,
    pub triple_kills: Option<i64>,
    pub true_damage_dealt: Option<i64>,
    pub true_damage_dealt_to_champions: Option<i64>,
    pub true_damage_taken: Option<i64>,
    pub turret_kills: Option<i64>,
    pub turret_takedowns: Option<i64>,
    pub turrets_lost: Option<i64>,
    pub unreal_kills: Option<i64>,
    pub vision_cleared_pings: Option<i64>,
    pub vision_score: Option<i64>,
    pub vision_wards_bought_in_game: Option<i64>,
    pub wards_killed: Option<i64>,
    pub wards_placed: Option<i64>,
    pub win: Option<bool>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawMatchSummaryPlayerBehavior {
    #[serde(rename = "PlayerBehavior_IsHeroInCombat")]
    pub player_behavior_is_hero_in_combat: Option<f64>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawMatchSummaryPerks {
    pub stat_perks: Option<RawMatchSummaryStatPerks>,
    #[serde(default)]
    pub styles: Vec<RawMatchSummaryStyle>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawMatchSummaryStatPerks {
    pub defense: Option<i64>,
    pub flex: Option<i64>,
    pub offense: Option<i64>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawMatchSummaryStyle {
    pub description: Option<String>,
    #[serde(default)]
    pub selections: Vec<RawMatchSummaryPerkSelection>,
    pub style: Option<i64>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawMatchSummaryPerkSelection {
    pub perk: Option<i64>,
    pub var1: Option<i64>,
    pub var2: Option<i64>,
    pub var3: Option<i64>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawMatchSummaryChallenges {
    #[serde(rename = "12AssistStreakCount")]
    pub k_12assiststreakcount: Option<f64>,
    #[serde(rename = "abilityUses")]
    pub abilityuses: Option<f64>,
    #[serde(rename = "acesBefore15Minutes")]
    pub acesbefore15minutes: Option<f64>,
    #[serde(rename = "alliedJungleMonsterKills")]
    pub alliedjunglemonsterkills: Option<f64>,
    #[serde(rename = "baronTakedowns")]
    pub barontakedowns: Option<f64>,
    #[serde(rename = "blastConeOppositeOpponentCount")]
    pub blastconeoppositeopponentcount: Option<f64>,
    #[serde(rename = "bountyGold")]
    pub bountygold: Option<f64>,
    #[serde(rename = "buffsStolen")]
    pub buffsstolen: Option<f64>,
    #[serde(rename = "completeSupportQuestInTime")]
    pub completesupportquestintime: Option<f64>,
    #[serde(rename = "controlWardsPlaced")]
    pub controlwardsplaced: Option<f64>,
    #[serde(rename = "damagePerMinute")]
    pub damageperminute: Option<f64>,
    #[serde(rename = "damageTakenOnTeamPercentage")]
    pub damagetakenonteampercentage: Option<f64>,
    #[serde(rename = "dancedWithRiftHerald")]
    pub dancedwithriftherald: Option<f64>,
    #[serde(rename = "deathsByEnemyChamps")]
    pub deathsbyenemychamps: Option<f64>,
    #[serde(rename = "dodgeSkillShotsSmallWindow")]
    pub dodgeskillshotssmallwindow: Option<f64>,
    #[serde(rename = "doubleAces")]
    pub doubleaces: Option<f64>,
    #[serde(rename = "dragonTakedowns")]
    pub dragontakedowns: Option<f64>,
    #[serde(rename = "effectiveHealAndShielding")]
    pub effectivehealandshielding: Option<f64>,
    #[serde(rename = "elderDragonKillsWithOpposingSoul")]
    pub elderdragonkillswithopposingsoul: Option<f64>,
    #[serde(rename = "elderDragonMultikills")]
    pub elderdragonmultikills: Option<f64>,
    #[serde(rename = "enemyChampionImmobilizations")]
    pub enemychampionimmobilizations: Option<f64>,
    #[serde(rename = "enemyJungleMonsterKills")]
    pub enemyjunglemonsterkills: Option<f64>,
    #[serde(rename = "epicMonsterKillsNearEnemyJungler")]
    pub epicmonsterkillsnearenemyjungler: Option<f64>,
    #[serde(rename = "epicMonsterKillsWithin30SecondsOfSpawn")]
    pub epicmonsterkillswithin30secondsofspawn: Option<f64>,
    #[serde(rename = "epicMonsterSteals")]
    pub epicmonstersteals: Option<f64>,
    #[serde(rename = "epicMonsterStolenWithoutSmite")]
    pub epicmonsterstolenwithoutsmite: Option<f64>,
    #[serde(rename = "fastestLegendary")]
    pub fastestlegendary: Option<f64>,
    #[serde(rename = "firstTurretKilled")]
    pub firstturretkilled: Option<f64>,
    #[serde(rename = "firstTurretKilledTime")]
    pub firstturretkilledtime: Option<f64>,
    #[serde(rename = "fistBumpParticipation")]
    pub fistbumpparticipation: Option<f64>,
    #[serde(rename = "flawlessAces")]
    pub flawlessaces: Option<f64>,
    #[serde(rename = "fullTeamTakedown")]
    pub fullteamtakedown: Option<f64>,
    #[serde(rename = "gameLength")]
    pub gamelength: Option<f64>,
    #[serde(rename = "getTakedownsInAllLanesEarlyJungleAsLaner")]
    pub gettakedownsinalllanesearlyjungleaslaner: Option<f64>,
    #[serde(rename = "goldPerMinute")]
    pub goldperminute: Option<f64>,
    #[serde(rename = "hadOpenNexus")]
    pub hadopennexus: Option<f64>,
    #[serde(rename = "HealFromMapSources")]
    pub healfrommapsources: Option<f64>,
    #[serde(rename = "highestChampionDamage")]
    pub highestchampiondamage: Option<f64>,
    #[serde(rename = "highestCrowdControlScore")]
    pub highestcrowdcontrolscore: Option<f64>,
    #[serde(rename = "immobilizeAndKillWithAlly")]
    pub immobilizeandkillwithally: Option<f64>,
    #[serde(rename = "InfernalScalePickup")]
    pub infernalscalepickup: Option<f64>,
    #[serde(rename = "initialBuffCount")]
    pub initialbuffcount: Option<f64>,
    #[serde(rename = "initialCrabCount")]
    pub initialcrabcount: Option<f64>,
    #[serde(rename = "jungleCsBefore10Minutes")]
    pub junglecsbefore10minutes: Option<f64>,
    #[serde(rename = "junglerTakedownsNearDamagedEpicMonster")]
    pub junglertakedownsneardamagedepicmonster: Option<f64>,
    #[serde(rename = "kda")]
    pub kda: Option<f64>,
    #[serde(rename = "killAfterHiddenWithAlly")]
    pub killafterhiddenwithally: Option<f64>,
    #[serde(rename = "killedChampTookFullTeamDamageSurvived")]
    pub killedchamptookfullteamdamagesurvived: Option<f64>,
    #[serde(rename = "killingSprees")]
    pub killingsprees: Option<f64>,
    #[serde(rename = "killParticipation")]
    pub killparticipation: Option<f64>,
    #[serde(rename = "killsNearEnemyTurret")]
    pub killsnearenemyturret: Option<f64>,
    #[serde(rename = "killsOnOtherLanesEarlyJungleAsLaner")]
    pub killsonotherlanesearlyjungleaslaner: Option<f64>,
    #[serde(rename = "killsOnRecentlyHealedByAramPack")]
    pub killsonrecentlyhealedbyarampack: Option<f64>,
    #[serde(rename = "killsUnderOwnTurret")]
    pub killsunderownturret: Option<f64>,
    #[serde(rename = "killsWithHelpFromEpicMonster")]
    pub killswithhelpfromepicmonster: Option<f64>,
    #[serde(rename = "knockEnemyIntoTeamAndKill")]
    pub knockenemyintoteamandkill: Option<f64>,
    #[serde(rename = "kTurretsDestroyedBeforePlatesFall")]
    pub kturretsdestroyedbeforeplatesfall: Option<f64>,
    #[serde(rename = "landSkillShotsEarlyGame")]
    pub landskillshotsearlygame: Option<f64>,
    #[serde(rename = "laneMinionsFirst10Minutes")]
    pub laneminionsfirst10minutes: Option<f64>,
    #[serde(rename = "legendaryCount")]
    pub legendarycount: Option<f64>,
    #[serde(rename = "legendaryItemUsed")]
    pub legendaryitemused: Option<Vec<f64>>,
    #[serde(rename = "lostAnInhibitor")]
    pub lostaninhibitor: Option<f64>,
    #[serde(rename = "maxKillDeficit")]
    pub maxkilldeficit: Option<f64>,
    #[serde(rename = "mejaisFullStackInTime")]
    pub mejaisfullstackintime: Option<f64>,
    #[serde(rename = "moreEnemyJungleThanOpponent")]
    pub moreenemyjunglethanopponent: Option<f64>,
    #[serde(rename = "multiKillOneSpell")]
    pub multikillonespell: Option<f64>,
    #[serde(rename = "multikills")]
    pub multikills: Option<f64>,
    #[serde(rename = "multikillsAfterAggressiveFlash")]
    pub multikillsafteraggressiveflash: Option<f64>,
    #[serde(rename = "multiTurretRiftHeraldCount")]
    pub multiturretriftheraldcount: Option<f64>,
    #[serde(rename = "outerTurretExecutesBefore10Minutes")]
    pub outerturretexecutesbefore10minutes: Option<f64>,
    #[serde(rename = "outnumberedKills")]
    pub outnumberedkills: Option<f64>,
    #[serde(rename = "outnumberedNexusKill")]
    pub outnumberednexuskill: Option<f64>,
    #[serde(rename = "perfectDragonSoulsTaken")]
    pub perfectdragonsoulstaken: Option<f64>,
    #[serde(rename = "perfectGame")]
    pub perfectgame: Option<f64>,
    #[serde(rename = "pickKillWithAlly")]
    pub pickkillwithally: Option<f64>,
    #[serde(rename = "poroExplosions")]
    pub poroexplosions: Option<f64>,
    #[serde(rename = "quickCleanse")]
    pub quickcleanse: Option<f64>,
    #[serde(rename = "quickFirstTurret")]
    pub quickfirstturret: Option<f64>,
    #[serde(rename = "quickSoloKills")]
    pub quicksolokills: Option<f64>,
    #[serde(rename = "riftHeraldTakedowns")]
    pub riftheraldtakedowns: Option<f64>,
    #[serde(rename = "saveAllyFromDeath")]
    pub saveallyfromdeath: Option<f64>,
    #[serde(rename = "scuttleCrabKills")]
    pub scuttlecrabkills: Option<f64>,
    #[serde(rename = "shortestTimeToAceFromFirstTakedown")]
    pub shortesttimetoacefromfirsttakedown: Option<f64>,
    #[serde(rename = "skillshotsDodged")]
    pub skillshotsdodged: Option<f64>,
    #[serde(rename = "skillshotsHit")]
    pub skillshotshit: Option<f64>,
    #[serde(rename = "snowballsHit")]
    pub snowballshit: Option<f64>,
    #[serde(rename = "soloBaronKills")]
    pub solobaronkills: Option<f64>,
    #[serde(rename = "soloKills")]
    pub solokills: Option<f64>,
    #[serde(rename = "stealthWardsPlaced")]
    pub stealthwardsplaced: Option<f64>,
    #[serde(rename = "survivedSingleDigitHpCount")]
    pub survivedsingledigithpcount: Option<f64>,
    #[serde(rename = "survivedThreeImmobilizesInFight")]
    pub survivedthreeimmobilizesinfight: Option<f64>,
    #[serde(rename = "SWARM_DefeatAatrox")]
    pub swarm_defeataatrox: Option<f64>,
    #[serde(rename = "SWARM_DefeatBriar")]
    pub swarm_defeatbriar: Option<f64>,
    #[serde(rename = "SWARM_DefeatMiniBosses")]
    pub swarm_defeatminibosses: Option<f64>,
    #[serde(rename = "SWARM_EvolveWeapon")]
    pub swarm_evolveweapon: Option<f64>,
    #[serde(rename = "SWARM_Have3Passives")]
    pub swarm_have3passives: Option<f64>,
    #[serde(rename = "SWARM_KillEnemy")]
    pub swarm_killenemy: Option<f64>,
    #[serde(rename = "SWARM_PickupGold")]
    pub swarm_pickupgold: Option<f64>,
    #[serde(rename = "SWARM_ReachLevel50")]
    pub swarm_reachlevel50: Option<f64>,
    #[serde(rename = "SWARM_Survive15Min")]
    pub swarm_survive15min: Option<f64>,
    #[serde(rename = "SWARM_WinWith5EvolvedWeapons")]
    pub swarm_winwith5evolvedweapons: Option<f64>,
    #[serde(rename = "takedownOnFirstTurret")]
    pub takedownonfirstturret: Option<f64>,
    #[serde(rename = "takedowns")]
    pub takedowns: Option<f64>,
    #[serde(rename = "takedownsAfterGainingLevelAdvantage")]
    pub takedownsaftergainingleveladvantage: Option<f64>,
    #[serde(rename = "takedownsBeforeJungleMinionSpawn")]
    pub takedownsbeforejungleminionspawn: Option<f64>,
    #[serde(rename = "takedownsFirstXMinutes")]
    pub takedownsfirstxminutes: Option<f64>,
    #[serde(rename = "takedownsInAlcove")]
    pub takedownsinalcove: Option<f64>,
    #[serde(rename = "takedownsInEnemyFountain")]
    pub takedownsinenemyfountain: Option<f64>,
    #[serde(rename = "teamBaronKills")]
    pub teambaronkills: Option<f64>,
    #[serde(rename = "teamDamagePercentage")]
    pub teamdamagepercentage: Option<f64>,
    #[serde(rename = "teamElderDragonKills")]
    pub teamelderdragonkills: Option<f64>,
    #[serde(rename = "teamRiftHeraldKills")]
    pub teamriftheraldkills: Option<f64>,
    #[serde(rename = "tookLargeDamageSurvived")]
    pub tooklargedamagesurvived: Option<f64>,
    #[serde(rename = "turretPlatesTaken")]
    pub turretplatestaken: Option<f64>,
    #[serde(rename = "turretsTakenWithRiftHerald")]
    pub turretstakenwithriftherald: Option<f64>,
    #[serde(rename = "turretTakedowns")]
    pub turrettakedowns: Option<f64>,
    #[serde(rename = "twentyMinionsIn3SecondsCount")]
    pub twentyminionsin3secondscount: Option<f64>,
    #[serde(rename = "twoWardsOneSweeperCount")]
    pub twowardsonesweepercount: Option<f64>,
    #[serde(rename = "unseenRecalls")]
    pub unseenrecalls: Option<f64>,
    #[serde(rename = "visionScorePerMinute")]
    pub visionscoreperminute: Option<f64>,
    #[serde(rename = "voidMonsterKill")]
    pub voidmonsterkill: Option<f64>,
    #[serde(rename = "wardsGuarded")]
    pub wardsguarded: Option<f64>,
    #[serde(rename = "wardTakedowns")]
    pub wardtakedowns: Option<f64>,
    #[serde(rename = "wardTakedownsBefore20M")]
    pub wardtakedownsbefore20m: Option<f64>,
}

#[derive(TS)]
#[ts(export, export_to = "matches.ts")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawMatchSummaryMissions {
    #[serde(rename = "2026_S1A1_Skins_Ashe")]
    pub k_2026_s1a1_skins_ashe: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_AurelionSol")]
    pub k_2026_s1a1_skins_aurelionsol: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Briar")]
    pub k_2026_s1a1_skins_briar: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Caitlyn")]
    pub k_2026_s1a1_skins_caitlyn: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Camille")]
    pub k_2026_s1a1_skins_camille: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Galio")]
    pub k_2026_s1a1_skins_galio: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Jayce")]
    pub k_2026_s1a1_skins_jayce: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Katarina")]
    pub k_2026_s1a1_skins_katarina: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Lillia")]
    pub k_2026_s1a1_skins_lillia: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Nautilus")]
    pub k_2026_s1a1_skins_nautilus: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Ornn")]
    pub k_2026_s1a1_skins_ornn: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Poppy")]
    pub k_2026_s1a1_skins_poppy: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Samira")]
    pub k_2026_s1a1_skins_samira: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Seraphine")]
    pub k_2026_s1a1_skins_seraphine: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Viego")]
    pub k_2026_s1a1_skins_viego: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Yasuo")]
    pub k_2026_s1a1_skins_yasuo: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Yuumi")]
    pub k_2026_s1a1_skins_yuumi: Option<f64>,
    #[serde(rename = "2026_S1A1_Skins_Ziggs")]
    pub k_2026_s1a1_skins_ziggs: Option<f64>,
    #[serde(rename = "2026_S1A1_SR_FaerieWards")]
    pub k_2026_s1a1_sr_faeriewards: Option<f64>,
    #[serde(rename = "2026_S1A1_SR_GrowthSmashed")]
    pub k_2026_s1a1_sr_growthsmashed: Option<f64>,
    #[serde(rename = "2026_S1A1_SR_RoleQuestComplete")]
    pub k_2026_s1a1_sr_rolequestcomplete: Option<f64>,
    #[serde(rename = "2026_S1A2_Shyvana_AOE")]
    pub k_2026_s1a2_shyvana_aoe: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_Blitzcrank")]
    pub k_2026_s1a2_skins_blitzcrank: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_Maokai")]
    pub k_2026_s1a2_skins_maokai: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_Mordekaiser")]
    pub k_2026_s1a2_skins_mordekaiser: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_Naafiri")]
    pub k_2026_s1a2_skins_naafiri: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_Sejuani")]
    pub k_2026_s1a2_skins_sejuani: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_Senna")]
    pub k_2026_s1a2_skins_senna: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_Sivir")]
    pub k_2026_s1a2_skins_sivir: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_Swain")]
    pub k_2026_s1a2_skins_swain: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_TahmKench")]
    pub k_2026_s1a2_skins_tahmkench: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_Vex")]
    pub k_2026_s1a2_skins_vex: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_Vladimir")]
    pub k_2026_s1a2_skins_vladimir: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_Warwick")]
    pub k_2026_s1a2_skins_warwick: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_Xerath")]
    pub k_2026_s1a2_skins_xerath: Option<f64>,
    #[serde(rename = "2026_S1A2_Skins_Zac")]
    pub k_2026_s1a2_skins_zac: Option<f64>,
    #[serde(rename = "ActMission_S1_A2_ArenaRoundsWon")]
    pub actmission_s1_a2_arenaroundswon: Option<f64>,
    #[serde(rename = "ActMission_S1_A2_BloodyPetalsCollected")]
    pub actmission_s1_a2_bloodypetalscollected: Option<f64>,
    #[serde(rename = "ActMission_S1_A2_FeatsOfStrength")]
    pub actmission_s1_a2_featsofstrength: Option<f64>,
    #[serde(rename = "DemonsHand_MissionPointsA")]
    pub demonshand_missionpointsa: Option<f64>,
    #[serde(rename = "DemonsHand_MissionPointsB")]
    pub demonshand_missionpointsb: Option<f64>,
    #[serde(rename = "DemonsHand_MissionPointsC")]
    pub demonshand_missionpointsc: Option<f64>,
    #[serde(rename = "DemonsHand_MissionPointsD")]
    pub demonshand_missionpointsd: Option<f64>,
    #[serde(rename = "DemonsHand_MissionPointsE")]
    pub demonshand_missionpointse: Option<f64>,
    #[serde(rename = "DemonsHand_MissionPointsF")]
    pub demonshand_missionpointsf: Option<f64>,
    #[serde(rename = "Event_2025LR_StructuresEpicMonsters")]
    pub event_2025lr_structuresepicmonsters: Option<f64>,
    #[serde(rename = "Event_ARAM_Docks")]
    pub event_aram_docks: Option<f64>,
    #[serde(rename = "Event_ARAM_Hexgates")]
    pub event_aram_hexgates: Option<f64>,
    #[serde(rename = "Event_Brawl_Jungle")]
    pub event_brawl_jungle: Option<f64>,
    #[serde(rename = "Event_Brawl_Minions")]
    pub event_brawl_minions: Option<f64>,
    #[serde(rename = "Event_S1_A1_AprilFools_Dragon")]
    pub event_s1_a1_aprilfools_dragon: Option<f64>,
    #[serde(rename = "Event_S1_A1_AprilFools_Snowball")]
    pub event_s1_a1_aprilfools_snowball: Option<f64>,
    #[serde(rename = "Event_S1_A2_AprilFools_Dragon")]
    pub event_s1_a2_aprilfools_dragon: Option<f64>,
    #[serde(rename = "Event_S1_A2_AprilFools_Garen_Play")]
    pub event_s1_a2_aprilfools_garen_play: Option<f64>,
    #[serde(rename = "Event_S1_A2_AprilFools_Garen_Takedown")]
    pub event_s1_a2_aprilfools_garen_takedown: Option<f64>,
    #[serde(rename = "Event_S1_A2_AprilFools_Snowball")]
    pub event_s1_a2_aprilfools_snowball: Option<f64>,
    #[serde(rename = "Event_S1_A2_Arena_BraveryChampions")]
    pub event_s1_a2_arena_braverychampions: Option<f64>,
    #[serde(rename = "Event_S1_A2_Arena_NoxianChampions")]
    pub event_s1_a2_arena_noxianchampions: Option<f64>,
    #[serde(rename = "Event_S1_A2_Arena_ReviveAllies")]
    pub event_s1_a2_arena_reviveallies: Option<f64>,
    #[serde(rename = "Event_S1_A2_Esports_TakedownEpicMonstersSingleGame")]
    pub event_s1_a2_esports_takedownepicmonsterssinglegame: Option<f64>,
    #[serde(rename = "Event_S1_A2_Mordekaiser")]
    pub event_s1_a2_mordekaiser: Option<f64>,
    #[serde(rename = "Event_S2A2_Exalted")]
    pub event_s2a2_exalted: Option<f64>,
    #[serde(rename = "Event_S2A2_MV")]
    pub event_s2a2_mv: Option<f64>,
    #[serde(rename = "Event_S2A2_PetalPoints")]
    pub event_s2a2_petalpoints: Option<f64>,
    #[serde(rename = "Event_S2A2Champ_DamageAbilities")]
    pub event_s2a2champ_damageabilities: Option<f64>,
    #[serde(rename = "Event_S2A2Champ_DamageAutos")]
    pub event_s2a2champ_damageautos: Option<f64>,
    #[serde(rename = "HoL_ChampionsDamagedWhileHidden")]
    pub hol_championsdamagedwhilehidden: Option<f64>,
    #[serde(rename = "HoL_ControlWardsKilled")]
    pub hol_controlwardskilled: Option<f64>,
    #[serde(rename = "HoL_Elite_AsheCrystalArrowTakedowns")]
    pub hol_elite_ashecrystalarrowtakedowns: Option<f64>,
    #[serde(rename = "HoL_Elite_AsheHawkshotChampsRevealed")]
    pub hol_elite_ashehawkshotchampsrevealed: Option<f64>,
    #[serde(rename = "HoL_Elite_EzrealEssenceFluxDetonated")]
    pub hol_elite_ezrealessencefluxdetonated: Option<f64>,
    #[serde(rename = "HoL_Elite_EzrealTrueshotBarrageMultiHit")]
    pub hol_elite_ezrealtrueshotbarragemultihit: Option<f64>,
    #[serde(rename = "HoL_Elite_KaiSaAbilitiesUpgraded")]
    pub hol_elite_kaisaabilitiesupgraded: Option<f64>,
    #[serde(rename = "HoL_Elite_KaiSaKillerInstinctKills")]
    pub hol_elite_kaisakillerinstinctkills: Option<f64>,
    #[serde(rename = "HoL_Elite_LucianCullingHits")]
    pub hol_elite_luciancullinghits: Option<f64>,
    #[serde(rename = "HoL_Elite_LucianPiercingLightMultiHit")]
    pub hol_elite_lucianpiercinglightmultihit: Option<f64>,
    #[serde(rename = "HoL_Elite_VayneCondemnStun")]
    pub hol_elite_vaynecondemnstun: Option<f64>,
    #[serde(rename = "HoL_Elite_VayneTumbleDodge")]
    pub hol_elite_vaynetumbledodge: Option<f64>,
    #[serde(rename = "HoL_EnemyTakedownUnderTower")]
    pub hol_enemytakedownundertower: Option<f64>,
    #[serde(rename = "HoL_FightsSurvivedWhileLowHealth")]
    pub hol_fightssurvivedwhilelowhealth: Option<f64>,
    #[serde(rename = "HoL_HiddenEnemiesDamaged")]
    pub hol_hiddenenemiesdamaged: Option<f64>,
    #[serde(rename = "HoL_JungleCampsStolen")]
    pub hol_junglecampsstolen: Option<f64>,
    #[serde(rename = "HoL_KillsWhileLowHealth")]
    pub hol_killswhilelowhealth: Option<f64>,
    #[serde(rename = "HoL_OutnumberedTakedowns")]
    pub hol_outnumberedtakedowns: Option<f64>,
    #[serde(rename = "HoL_ShutdownGoldCollected")]
    pub hol_shutdowngoldcollected: Option<f64>,
    #[serde(rename = "HoL_SoloKills")]
    pub hol_solokills: Option<f64>,
    #[serde(rename = "HoL_TurretsTakenWithinMinutes")]
    pub hol_turretstakenwithinminutes: Option<f64>,
    #[serde(rename = "Missions_BXP_EarnedPerGame")]
    pub missions_bxp_earnedpergame: Option<f64>,
    #[serde(rename = "Missions_CannonMinionsKilled")]
    pub missions_cannonminionskilled: Option<f64>,
    #[serde(rename = "Missions_ChampionsHitWithAbilitiesEarlyGame")]
    pub missions_championshitwithabilitiesearlygame: Option<f64>,
    #[serde(rename = "Missions_ChampionsKilled")]
    pub missions_championskilled: Option<f64>,
    #[serde(rename = "Missions_ChampionTakedownsWhileGhosted")]
    pub missions_championtakedownswhileghosted: Option<f64>,
    #[serde(rename = "Missions_ChampionTakedownsWithIgnite")]
    pub missions_championtakedownswithignite: Option<f64>,
    #[serde(rename = "Missions_CreepScore")]
    pub missions_creepscore: Option<f64>,
    #[serde(rename = "Missions_CreepScoreBy10Minutes")]
    pub missions_creepscoreby10minutes: Option<f64>,
    #[serde(rename = "Missions_Crepe_DamageDealtSpeedZone")]
    pub missions_crepe_damagedealtspeedzone: Option<f64>,
    #[serde(rename = "Missions_Crepe_SnowballLanded")]
    pub missions_crepe_snowballlanded: Option<f64>,
    #[serde(rename = "Missions_Crepe_TakedownsWithInhibBuff")]
    pub missions_crepe_takedownswithinhibbuff: Option<f64>,
    #[serde(rename = "Missions_DamageToChampsWithItems")]
    pub missions_damagetochampswithitems: Option<f64>,
    #[serde(rename = "Missions_DamageToStructures")]
    pub missions_damagetostructures: Option<f64>,
    #[serde(rename = "Missions_DestroyPlants")]
    pub missions_destroyplants: Option<f64>,
    #[serde(rename = "Missions_DominationRune")]
    pub missions_dominationrune: Option<f64>,
    #[serde(rename = "Missions_GoldFromStructuresDestroyed")]
    pub missions_goldfromstructuresdestroyed: Option<f64>,
    #[serde(rename = "Missions_GoldFromTurretPlatesTaken")]
    pub missions_goldfromturretplatestaken: Option<f64>,
    #[serde(rename = "Missions_GoldPerMinute")]
    pub missions_goldperminute: Option<f64>,
    #[serde(rename = "Missions_HealingFromLevelObjects")]
    pub missions_healingfromlevelobjects: Option<f64>,
    #[serde(rename = "Missions_HexgatesUsed")]
    pub missions_hexgatesused: Option<f64>,
    #[serde(rename = "Missions_ImmobilizeChampions")]
    pub missions_immobilizechampions: Option<f64>,
    #[serde(rename = "Missions_InspirationRune")]
    pub missions_inspirationrune: Option<f64>,
    #[serde(rename = "Missions_LegendaryItems")]
    pub missions_legendaryitems: Option<f64>,
    #[serde(rename = "Missions_MinionsKilled")]
    pub missions_minionskilled: Option<f64>,
    #[serde(rename = "Missions_PeriodicDamage")]
    pub missions_periodicdamage: Option<f64>,
    #[serde(rename = "Missions_PlaceUsefulControlWards")]
    pub missions_placeusefulcontrolwards: Option<f64>,
    #[serde(rename = "Missions_PlaceUsefulWards")]
    pub missions_placeusefulwards: Option<f64>,
    #[serde(rename = "Missions_PorosFed")]
    pub missions_porosfed: Option<f64>,
    #[serde(rename = "Missions_PrecisionRune")]
    pub missions_precisionrune: Option<f64>,
    #[serde(rename = "Missions_ResolveRune")]
    pub missions_resolverune: Option<f64>,
    #[serde(rename = "Missions_SnowballsHit")]
    pub missions_snowballshit: Option<f64>,
    #[serde(rename = "Missions_SorceryRune")]
    pub missions_sorceryrune: Option<f64>,
    #[serde(rename = "Missions_TakedownBaronsElderDragons")]
    pub missions_takedownbaronselderdragons: Option<f64>,
    #[serde(rename = "Missions_TakedownDragons")]
    pub missions_takedowndragons: Option<f64>,
    #[serde(rename = "Missions_TakedownEpicMonsters")]
    pub missions_takedownepicmonsters: Option<f64>,
    #[serde(rename = "Missions_TakedownEpicMonstersSingleGame")]
    pub missions_takedownepicmonsterssinglegame: Option<f64>,
    #[serde(rename = "Missions_TakedownGold")]
    pub missions_takedowngold: Option<f64>,
    #[serde(rename = "Missions_TakedownsAfterExhausting")]
    pub missions_takedownsafterexhausting: Option<f64>,
    #[serde(rename = "Missions_TakedownsAfterTeleporting")]
    pub missions_takedownsafterteleporting: Option<f64>,
    #[serde(rename = "Missions_TakedownsBefore15Min")]
    pub missions_takedownsbefore15min: Option<f64>,
    #[serde(rename = "Missions_TakedownStructures")]
    pub missions_takedownstructures: Option<f64>,
    #[serde(rename = "Missions_TakedownsUnderTurret")]
    pub missions_takedownsunderturret: Option<f64>,
    #[serde(rename = "Missions_TakedownsWithHelpFromMonsters")]
    pub missions_takedownswithhelpfrommonsters: Option<f64>,
    #[serde(rename = "Missions_TakedownWards")]
    pub missions_takedownwards: Option<f64>,
    #[serde(rename = "Missions_TimeSpentActivelyPlaying")]
    pub missions_timespentactivelyplaying: Option<f64>,
    #[serde(rename = "Missions_TotalGold")]
    pub missions_totalgold: Option<f64>,
    #[serde(rename = "Missions_TrueDamageToStructures")]
    pub missions_truedamagetostructures: Option<f64>,
    #[serde(rename = "Missions_TurretPlatesDestroyed")]
    pub missions_turretplatesdestroyed: Option<f64>,
    #[serde(rename = "Missions_TwoChampsKilledWithSameAbility")]
    pub missions_twochampskilledwithsameability: Option<f64>,
    #[serde(rename = "Missions_VoidMitesSummoned")]
    pub missions_voidmitessummoned: Option<f64>,
    #[serde(rename = "PlayerScore0")]
    pub playerscore0: Option<f64>,
    #[serde(rename = "PlayerScore1")]
    pub playerscore1: Option<f64>,
    #[serde(rename = "PlayerScore10")]
    pub playerscore10: Option<f64>,
    #[serde(rename = "PlayerScore11")]
    pub playerscore11: Option<f64>,
    #[serde(rename = "PlayerScore2")]
    pub playerscore2: Option<f64>,
    #[serde(rename = "PlayerScore3")]
    pub playerscore3: Option<f64>,
    #[serde(rename = "PlayerScore4")]
    pub playerscore4: Option<f64>,
    #[serde(rename = "PlayerScore5")]
    pub playerscore5: Option<f64>,
    #[serde(rename = "PlayerScore6")]
    pub playerscore6: Option<f64>,
    #[serde(rename = "PlayerScore7")]
    pub playerscore7: Option<f64>,
    #[serde(rename = "PlayerScore8")]
    pub playerscore8: Option<f64>,
    #[serde(rename = "PlayerScore9")]
    pub playerscore9: Option<f64>,
    #[serde(rename = "S3A1_Event_DoombotsTakenDownBefore5")]
    pub s3a1_event_doombotstakendownbefore5: Option<f64>,
    #[serde(rename = "S3A1_PlayAsDemaciansOrAgainstNoxians")]
    pub s3a1_playasdemaciansoragainstnoxians: Option<f64>,
    #[serde(rename = "S3A1_Takedowns")]
    pub s3a1_takedowns: Option<f64>,
    #[serde(rename = "S3A2_PrismaticAug")]
    pub s3a2_prismaticaug: Option<f64>,
    #[serde(rename = "S3A2_ZaahenUnlock")]
    pub s3a2_zaahenunlock: Option<f64>,
    #[serde(rename = "SeasonalMissions_TakedownAtakhan")]
    pub seasonalmissions_takedownatakhan: Option<f64>,
    #[serde(rename = "WeeklyMission_S2_DamagingAbilities")]
    pub weeklymission_s2_damagingabilities: Option<f64>,
    #[serde(rename = "WeeklyMission_S2_FeatsOfStrength")]
    pub weeklymission_s2_featsofstrength: Option<f64>,
    #[serde(rename = "WeeklyMission_S2_SpiritPetals")]
    pub weeklymission_s2_spiritpetals: Option<f64>,
}
