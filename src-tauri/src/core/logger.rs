//! Centralized logging module for WEave application.
//!
//! Logs are written to a rotating file in the app data directory alongside settings.
//! Provides structured logging with context information and automatic log rotation.

use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use chrono::Local;
use log::{LevelFilter, Metadata, Record};
use parking_lot::Mutex;

/// Maximum log file size before rotation (10 MB)
const MAX_LOG_SIZE: u64 = 10 * 1024 * 1024;
/// Number of rotated log files to keep
const MAX_LOG_FILES: usize = 5;

/// Custom logger that writes to both console and file
pub struct WEaveLogger {
    file: Arc<Mutex<Option<File>>>,
    log_path: Arc<Mutex<PathBuf>>,
}

impl WEaveLogger {
    /// Initialize the logger with a log directory path
    pub fn init(log_dir: &Path, level: LevelFilter) -> anyhow::Result<()> {
        fs::create_dir_all(log_dir)?;

        let log_path = log_dir.join("weave.log");
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_path)?;

        let logger = Box::new(WEaveLogger {
            file: Arc::new(Mutex::new(Some(file))),
            log_path: Arc::new(Mutex::new(log_path)),
        });

        log::set_boxed_logger(logger)?;
        log::set_max_level(level);

        log::info!("=== WEave Logger Initialized ===");
        log::info!("Log directory: {}", log_dir.display());
        log::info!("Log level: {}", level);

        Ok(())
    }

    /// Rotate log files if current log exceeds maximum size
    fn rotate_if_needed(&self) {
        let log_path_guard = self.log_path.lock();
        let log_path = log_path_guard.clone();
        drop(log_path_guard);

        if let Ok(metadata) = fs::metadata(&log_path) {
            if metadata.len() > MAX_LOG_SIZE {
                drop(self.file.lock().take());

                if let Err(e) = Self::perform_rotation(&log_path) {
                    eprintln!("Failed to rotate log file: {}", e);
                }

                // Reopen the log file
                if let Ok(new_file) = OpenOptions::new().create(true).append(true).open(&log_path) {
                    *self.file.lock() = Some(new_file);
                }
            }
        }
    }

    /// Perform log file rotation
    fn perform_rotation(log_path: &Path) -> anyhow::Result<()> {
        let parent = log_path.parent().unwrap();
        let stem = log_path.file_stem().unwrap().to_string_lossy();
        let ext = log_path.extension().unwrap_or_default().to_string_lossy();

        // Remove oldest log file
        let oldest = parent.join(format!("{}.{}.{}", stem, MAX_LOG_FILES, ext));
        fs::remove_file(oldest).ok();

        // Rotate existing log files
        for i in (1..MAX_LOG_FILES).rev() {
            let from = parent.join(format!("{}.{}.{}", stem, i, ext));
            let to = parent.join(format!("{}.{}.{}", stem, i + 1, ext));
            fs::rename(from, to).ok();
        }

        // Move current log to .1
        let backup = parent.join(format!("{}.1.{}", stem, ext));
        fs::rename(log_path, backup)?;

        Ok(())
    }

    /// Format log record with timestamp and metadata
    fn format_record(record: &Record) -> String {
        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let level = record.level();
        let target = record.target();
        let message = record.args();

        format!("[{}] {:5} [{}] {}", timestamp, level, target, message)
    }
}

impl log::Log for WEaveLogger {
    fn enabled(&self, metadata: &Metadata) -> bool {
        if metadata.level() > log::max_level() {
            return false;
        }

        let target = metadata.target();

        // Filter out noisy debug targets
        if target.starts_with("selectors::matching") ||
           target.starts_with("html5ever::tokenizer") ||
           target.starts_with("html5ever::tree_builder") ||
           target.contains("parse") ||
           target.contains("parser") {
            return false;
        }

        true
    }

    fn log(&self, record: &Record) {
        if !self.enabled(record.metadata()) {
            return;
        }

        let formatted = Self::format_record(record);

        // Write to console in debug mode
        #[cfg(debug_assertions)]
        {
            eprintln!("{}", formatted);
        }

        // Write to file
        if let Some(file) = self.file.lock().as_mut() {
            writeln!(file, "{}", formatted).ok();
            file.flush().ok();
        }

        // Check for rotation after writing
        self.rotate_if_needed();
    }

    fn flush(&self) {
        if let Some(file) = self.file.lock().as_mut() {
            file.flush().ok();
        }
    }
}

/// Log an operation with context
#[macro_export]
macro_rules! log_operation {
    ($level:expr, $op:expr, $($arg:tt)*) => {
        log::log!($level, "[{}] {}", $op, format!($($arg)*))
    };
}

/// Log a successful operation
#[macro_export]
macro_rules! log_success {
    ($op:expr, $($arg:tt)*) => {
        $crate::log_operation!(log::Level::Info, $op, $($arg)*)
    };
}

/// Log a failed operation
#[macro_export]
macro_rules! log_error {
    ($op:expr, $err:expr, $($arg:tt)*) => {
        log::error!("[{}] {} - Error: {}", $op, format!($($arg)*), $err)
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_logger_initialization() {
        let temp_dir = TempDir::new().unwrap();
        // Test that we can create log directory and file
        let log_path = temp_dir.path().join("weave.log");
        let file = OpenOptions::new().create(true).append(true).open(&log_path);

        assert!(file.is_ok());
        assert!(log_path.exists());
    }

    #[test]
    fn test_log_rotation() {
        let temp_dir = TempDir::new().unwrap();
        let log_path = temp_dir.path().join("test.log");

        // Create a log file
        std::fs::write(&log_path, "test content").unwrap();

        // Test rotation
        let result = WEaveLogger::perform_rotation(&log_path);
        assert!(result.is_ok());

        // Check that backup was created
        let backup = temp_dir.path().join("test.1.log");
        assert!(backup.exists());
    }

    #[test]
    fn test_log_formatting() {
        let record = log::Record::builder()
            .args(format_args!("Test message"))
            .level(log::Level::Info)
            .target("test_module")
            .build();

        let formatted = WEaveLogger::format_record(&record);
        assert!(formatted.contains("INFO"));
        assert!(formatted.contains("test_module"));
        assert!(formatted.contains("Test message"));
    }
}
