use serde_json::{Map, Value};

pub fn headers_to_json(headers: &reqwest::header::HeaderMap) -> Value {
    let mut object = Map::new();

    for (name, value) in headers {
        let key = name.as_str().to_string();
        let value_str = value.to_str().unwrap_or("<non-utf8>").to_string();

        if let Some(existing) = object.get_mut(&key) {
            match existing {
                Value::Array(arr) => arr.push(Value::String(value_str)),
                _ => {
                    let first = existing.take();
                    *existing = Value::Array(vec![first, Value::String(value_str)]);
                }
            }
        } else {
            object.insert(key, Value::String(value_str));
        }
    }

    Value::Object(object)
}

pub fn parse_json_or_string(raw: &str) -> Value {
    match serde_json::from_str::<Value>(raw) {
        Ok(value) => value,
        Err(_) => Value::String(raw.to_string()),
    }
}

pub fn pretty_json(value: &Value) -> String {
    serde_json::to_string_pretty(value).unwrap_or_else(|_| value.to_string())
}
