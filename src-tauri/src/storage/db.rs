use base64::Engine as _;
use rusqlite::Connection;
use std::sync::Mutex;

use crate::error::AppError;

pub struct SqliteDb {
    conn: Mutex<Connection>,
}

impl SqliteDb {
    /// Open (or create) a database and run migrations.
    pub fn open(path: &std::path::Path) -> Result<Self, AppError> {
        let conn = Connection::open(path)?;

        // Enable WAL mode for better concurrent performance
        conn.execute_batch("PRAGMA journal_mode=WAL;")?;

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<(), AppError> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());

        let version: i64 = conn
            .query_row("PRAGMA user_version", [], |r| r.get(0))
            .unwrap_or(0);

        if version < 1 {
            conn.execute_batch(
                "
                CREATE TABLE IF NOT EXISTS saved_players (
                    puuid       TEXT PRIMARY KEY,
                    note        TEXT NOT NULL DEFAULT '',
                    tag         TEXT NOT NULL DEFAULT '',
                    first_seen  INTEGER NOT NULL,
                    last_seen   INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS encountered_games (
                    game_id     INTEGER PRIMARY KEY,
                    puuids      TEXT NOT NULL,
                    played_at   INTEGER NOT NULL
                );

                PRAGMA user_version = 1;
                ",
            )?;
        }

        if version < 2 {
            conn.execute_batch(
                "CREATE TABLE IF NOT EXISTS search_history (
                    puuid TEXT PRIMARY KEY,
                    game_name TEXT NOT NULL,
                    tag_line TEXT NOT NULL,
                    region TEXT NOT NULL DEFAULT '',
                    last_searched INTEGER NOT NULL
                );
                PRAGMA user_version = 2;",
            )?;
        }

        Ok(())
    }

    /// Generic query returning rows as JSON values
    #[allow(dead_code)]
    pub fn query_raw(
        &self,
        sql: &str,
        params: &[&dyn rusqlite::ToSql],
    ) -> Result<Vec<serde_json::Value>, AppError> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        let mut stmt = conn.prepare(sql)?;
        let col_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

        let rows = stmt.query_map(rusqlite::params_from_iter(params.iter()), |row| {
            let mut map = serde_json::Map::new();
            for (i, name) in col_names.iter().enumerate() {
                let val: rusqlite::types::Value = row.get(i)?;
                map.insert(name.clone(), rusqlite_to_json(val));
            }
            Ok(serde_json::Value::Object(map))
        })?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(AppError::Database)
    }

    pub fn execute(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<usize, AppError> {
        let conn = self.conn.lock().unwrap_or_else(|e| e.into_inner());
        Ok(conn.execute(sql, rusqlite::params_from_iter(params.iter()))?)
    }
}

#[allow(dead_code)]
fn rusqlite_to_json(val: rusqlite::types::Value) -> serde_json::Value {
    match val {
        rusqlite::types::Value::Null => serde_json::Value::Null,
        rusqlite::types::Value::Integer(i) => serde_json::Value::Number(i.into()),
        rusqlite::types::Value::Real(f) => serde_json::json!(f),
        rusqlite::types::Value::Text(s) => serde_json::Value::String(s),
        rusqlite::types::Value::Blob(b) => {
            serde_json::Value::String(base64::engine::general_purpose::STANDARD.encode(b))
        }
    }
}
