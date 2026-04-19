use serde::Serialize;
use snafu::prelude::*;
use std::panic::Location;

#[derive(Debug, Snafu)]
pub enum AppError {
    #[snafu(display("LCU not connected"))]
    LcuNotConnected,

    #[snafu(display("LCU request failed: {source}"))]
    LcuRequest { source: reqwest::Error },

    #[snafu(display("JSON error at {file}:{line}:{column}: {source}"))]
    Json {
        source: serde_json::Error,
        file: &'static str,
        line: u32,
        column: u32,
    },

    #[snafu(display("Deserialize error at {file}:{line}:{column} path={deser_path}: {source}"))]
    JsonDeserialize {
        source: serde_json::Error,
        deser_path: String,
        file: &'static str,
        line: u32,
        column: u32,
    },

    #[snafu(display("Database error: {source}"))]
    Database { source: rusqlite::Error },

    #[snafu(display("IO error: {source}"))]
    Io { source: std::io::Error },

    #[snafu(display("Sled error: {source}"))]
    Sled { source: sled::Error },

    #[snafu(display("Mutex poisoned"))]
    MutexPoisoned,

    #[snafu(whatever, display("{message}"))]
    Other {
        message: String,
        #[snafu(source(from(Box<dyn std::error::Error + Send + Sync>, Some)))]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
}

macro_rules! from_variant {
    ($v:ident => $t:ty) => {
        impl From<$t> for AppError {
            fn from(source: $t) -> Self {
                Self::$v { source }
            }
        }
    };
}

from_variant!(LcuRequest => reqwest::Error);
from_variant!(Database  => rusqlite::Error);
from_variant!(Io        => std::io::Error);
from_variant!(Sled      => sled::Error);

impl From<serde_json::Error> for AppError {
    #[track_caller]
    fn from(source: serde_json::Error) -> Self {
        let caller = Location::caller();

        Self::Json {
            source,
            file: caller.file(),
            line: caller.line(),
            column: caller.column(),
        }
    }
}

impl From<serde_path_to_error::Error<serde_json::Error>> for AppError {
    #[track_caller]
    fn from(error: serde_path_to_error::Error<serde_json::Error>) -> Self {
        let caller = Location::caller();
        let deser_path = error.path().to_string();
        let source = error.into_inner();

        tracing::error!(
            file = caller.file(),
            line = caller.line(),
            column = caller.column(),
            deser_path = %deser_path,
            deser_message = %source,
            "Backend deserialization failed"
        );

        Self::JsonDeserialize {
            source,
            deser_path,
            file: caller.file(),
            line: caller.line(),
            column: caller.column(),
        }
    }
}

impl AppError {
    pub fn other(message: impl Into<String>) -> Self {
        Self::Other {
            message: message.into(),
            source: None,
        }
    }

    fn to_client_message(&self) -> &'static str {
        "Internal error. Check backend logs."
    }

    fn log_internal(&self) {
        tracing::error!(error = %self, "Backend command failed");
    }
}

// Tauri commands must return errors that implement Serialize
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        self.log_internal();
        serializer.serialize_str(self.to_client_message())
    }
}
