//! Commands for logging frontend messages to the backend log file

use tauri::command;

#[command]
pub fn log_frontend_message(level: String, context: String, message: String, data: Option<String>) {
    let log_msg = if let Some(d) = data {
        format!("[Frontend:{}] {} | {}", context, message, d)
    } else {
        format!("[Frontend:{}] {}", context, message)
    };

    match level.as_str() {
        "debug" => log::debug!("{}", log_msg),
        "info" => log::info!("{}", log_msg),
        "warn" => log::warn!("{}", log_msg),
        "error" => log::error!("{}", log_msg),
        _ => log::info!("{}", log_msg),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_frontend_message() {
        // This test just ensures the function compiles and runs
        log_frontend_message(
            "info".to_string(),
            "test".to_string(),
            "test message".to_string(),
            None,
        );

        log_frontend_message(
            "error".to_string(),
            "test".to_string(),
            "error message".to_string(),
            Some("additional data".to_string()),
        );
    }
}
