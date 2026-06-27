//! Centralized error handling for WEave application.
//!
//! Provides structured error types with context and automatic logging.

use std::fmt;
use thiserror::Error;

/// Main error type for WEave operations
#[derive(Error, Debug)]
pub enum WEaveError {
    #[error("Configuration error: {0}")]
    Config(String),

    #[error("File system error: {0}")]
    FileSystem(String),

    #[error("Network error: {0}")]
    Network(String),

    #[error("Download error: {0}")]
    Download(String),

    #[error("Extract error: {0}")]
    Extract(String),

    #[error("Wallpaper Engine error: {0}")]
    WallpaperEngine(String),

    #[error("Workshop error: {0}")]
    Workshop(String),

    #[error("Account error: {0}")]
    Account(String),

    #[error("Authentication error: {0}")]
    Authentication(String),

    #[error("Metadata error: {0}")]
    Metadata(String),

    #[error("Translation error: {0}")]
    Translation(String),

    #[error("Update error: {0}")]
    Update(String),

    #[error("Runtime error: {0}")]
    Runtime(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Operation cancelled")]
    Cancelled,

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Already exists: {0}")]
    AlreadyExists(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl WEaveError {
    /// Create error from anyhow::Error with context
    pub fn from_anyhow(context: &str, err: anyhow::Error) -> Self {
        WEaveError::Internal(format!("{}: {}", context, err))
    }

    /// Create error from std::io::Error with context
    pub fn from_io(context: &str, err: std::io::Error) -> Self {
        WEaveError::FileSystem(format!("{}: {}", context, err))
    }

    /// Create error from reqwest::Error with context
    pub fn from_reqwest(context: &str, err: reqwest::Error) -> Self {
        WEaveError::Network(format!("{}: {}", context, err))
    }

    /// Log the error with context
    pub fn log(&self, operation: &str) {
        log::error!("[{}] Error: {}", operation, self);
    }

    /// Log the error and return it
    pub fn log_and_return(self, operation: &str) -> Self {
        self.log(operation);
        self
    }
}

/// Result type for WEave operations
pub type WEaveResult<T> = Result<T, WEaveError>;

/// Extension trait for Results to add context and logging
pub trait ResultExt<T> {
    /// Add context to an error
    fn context(self, context: &str) -> WEaveResult<T>;

    /// Add context and log the error
    fn context_log(self, operation: &str, context: &str) -> WEaveResult<T>;

    /// Log success or error
    fn log_result(self, operation: &str) -> WEaveResult<T>;
}

impl<T, E: fmt::Display> ResultExt<T> for Result<T, E> {
    fn context(self, context: &str) -> WEaveResult<T> {
        self.map_err(|e| WEaveError::Internal(format!("{}: {}", context, e)))
    }

    fn context_log(self, operation: &str, context: &str) -> WEaveResult<T> {
        match self {
            Ok(v) => {
                log::debug!("[{}] Success: {}", operation, context);
                Ok(v)
            }
            Err(e) => {
                let err = WEaveError::Internal(format!("{}: {}", context, e));
                err.log(operation);
                Err(err)
            }
        }
    }

    fn log_result(self, operation: &str) -> WEaveResult<T> {
        match self {
            Ok(v) => {
                log::info!("[{}] Operation completed successfully", operation);
                Ok(v)
            }
            Err(e) => {
                let err = WEaveError::Internal(e.to_string());
                err.log(operation);
                Err(err)
            }
        }
    }
}

/// Extension trait for Options to convert to Result with error
pub trait OptionExt<T> {
    /// Convert Option to Result with custom error message
    fn ok_or_error(self, error: WEaveError) -> WEaveResult<T>;

    /// Convert Option to Result with NotFound error
    fn ok_or_not_found(self, resource: &str) -> WEaveResult<T>;
}

impl<T> OptionExt<T> for Option<T> {
    fn ok_or_error(self, error: WEaveError) -> WEaveResult<T> {
        self.ok_or(error)
    }

    fn ok_or_not_found(self, resource: &str) -> WEaveResult<T> {
        self.ok_or_else(|| WEaveError::NotFound(resource.to_string()))
    }
}

/// Convert WEaveError to String for Tauri commands
impl From<WEaveError> for String {
    fn from(err: WEaveError) -> String {
        err.to_string()
    }
}

/// Convert anyhow::Error to WEaveError
impl From<anyhow::Error> for WEaveError {
    fn from(err: anyhow::Error) -> Self {
        WEaveError::Internal(err.to_string())
    }
}

/// Convert std::io::Error to WEaveError
impl From<std::io::Error> for WEaveError {
    fn from(err: std::io::Error) -> Self {
        WEaveError::FileSystem(err.to_string())
    }
}

/// Convert reqwest::Error to WEaveError
impl From<reqwest::Error> for WEaveError {
    fn from(err: reqwest::Error) -> Self {
        WEaveError::Network(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_creation() {
        let err = WEaveError::Config("test error".to_string());
        assert_eq!(err.to_string(), "Configuration error: test error");
    }

    #[test]
    fn test_error_from_anyhow() {
        let anyhow_err = anyhow::anyhow!("test error");
        let err = WEaveError::from_anyhow("test context", anyhow_err);
        assert!(err.to_string().contains("test context"));
        assert!(err.to_string().contains("test error"));
    }

    #[test]
    fn test_result_context() {
        let result: Result<(), &str> = Err("test error");
        let weave_result = result.context("test context");
        assert!(weave_result.is_err());
        let err = weave_result.unwrap_err();
        assert!(err.to_string().contains("test context"));
        assert!(err.to_string().contains("test error"));
    }

    #[test]
    fn test_option_ok_or_not_found() {
        let opt: Option<i32> = None;
        let result = opt.ok_or_not_found("test resource");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, WEaveError::NotFound(_)));
        assert!(err.to_string().contains("test resource"));
    }

    #[test]
    fn test_error_conversion_to_string() {
        let err = WEaveError::Network("connection failed".to_string());
        let s: String = err.into();
        assert_eq!(s, "Network error: connection failed");
    }

    #[test]
    fn test_io_error_conversion() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let err: WEaveError = io_err.into();
        assert!(matches!(err, WEaveError::FileSystem(_)));
        assert!(err.to_string().contains("file not found"));
    }
}
