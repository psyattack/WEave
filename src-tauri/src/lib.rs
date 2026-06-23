//! WEave — Tauri 2 + Rust port of the WEave (Wallpaper Engine Workshop Manager)
//! Python/PyQt6 application. Preserves full feature parity with the original
//! while adding a modern, animated web-based UI.

pub mod accounts;
pub mod app_state;
pub mod commands;
pub mod config;
pub mod constants;
pub mod download;
pub mod errors;
pub mod extract;
pub mod i18n;
pub mod logger;
pub mod metadata;
pub mod plugin_manager;
pub mod plugin_paths;
pub mod runtime;
pub mod translator;
pub mod updater;
pub mod we_client;
pub mod workshop;

use std::sync::Arc;
use tauri::Manager;

use crate::app_state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize custom logger - fallback to env_logger if it fails
    let log_level = if cfg!(debug_assertions) {
        log::LevelFilter::Debug
    } else {
        log::LevelFilter::Info
    };

    // Try to initialize custom logger, fallback to env_logger
    if let Some(data_dir) = dirs::data_local_dir() {
        let log_dir = data_dir.join("WEave");
        if logger::WEaveLogger::init(&log_dir, log_level).is_err() {
            env_logger::try_init().ok();
        }
    } else {
        env_logger::try_init().ok();
    }

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .setup(|app| {
            let state = AppState::initialize(app.handle().clone())?;
            let arc_state = Arc::new(state);
            // Sync cookies from WebView2 on startup so Workshop requests are authenticated
            arc_state.init_cookies();
            // Don't start .NET Runtime check here - let frontend trigger it
            // arc_state.init_dotnet_runtime();
            app.manage(arc_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app::app_get_info,
            commands::app::app_get_data_dir,
            commands::app::app_open_data_dir,
            commands::app::app_minimize,
            commands::app::app_quit,
            commands::app::app_get_window_geometry,
            commands::app::app_save_window_geometry,
            commands::app::app_restore_window_geometry,
            commands::app::app_init_metadata,
            commands::config::config_get_all,
            commands::config::config_set,
            commands::config::config_get,
            commands::config::config_save_window_geometry,
            commands::i18n::i18n_get_available_languages,
            commands::i18n::i18n_set_language,
            commands::accounts::accounts_list,
            commands::accounts::accounts_list_custom,
            commands::accounts::accounts_get_current,
            commands::accounts::accounts_set_current,
            commands::accounts::accounts_set_custom,
            commands::accounts::accounts_remove_custom,
            commands::accounts::accounts_reset_custom,
            commands::updater::updater_check,
            commands::updater::updater_skip_version,
            commands::metadata::metadata_get_all,
            commands::metadata::metadata_get,
            commands::metadata::metadata_save,
            commands::metadata::metadata_remove,
            commands::translator::translator_translate,
            commands::we::we_detect,
            commands::we::we_set_directory,
            commands::we::we_get_directory,
            commands::we::we_list_installed,
            commands::we::we_apply,
            commands::we::we_open,
            commands::we::we_delete_wallpaper,
            commands::we::we_current_pubfileid,
            commands::we::we_active_pubfileids,
            commands::workshop::workshop_browse,
            commands::workshop::workshop_browse_collections,
            commands::workshop::workshop_get_item,
            commands::workshop::workshop_get_collection,
            commands::workshop::workshop_get_author_items,
            commands::workshop::workshop_get_author_collections,
            commands::workshop::workshop_refresh_cache,
            commands::workshop::workshop_debug_log,
            commands::workshop::workshop_debug_clear,
            commands::download::download_start,
            commands::download::download_cancel,
            commands::download::download_status_all,
            commands::download::download_multi_start,
            commands::extract::extract_start,
            commands::extract::extract_status_all,
            commands::image::open_path,
            commands::steam::steam_login_show,
            commands::steam::steam_parser_show,
            commands::steam::steam_login_hide,
            commands::steam::steam_sync_cookies,
            commands::steam::steam_is_logged_in,
            commands::steam::steam_current_account,
            commands::steam::steam_auto_login,
            commands::steam::steam_login_fill,
            commands::steam::steam_login_fill_2fa,
            commands::steam::steam_login_switch_to_code,
            commands::steam::steam_login_prepare,
            commands::steam::steam_qr_begin,
            commands::steam::steam_qr_poll,
            commands::steam::steam_qr_login_finalize,
            commands::steam::steam_login_poll_error,
            commands::dotnet::dotnet_get_root,
            commands::dotnet::dotnet_init,
            commands::plugins::plugins_init,
            commands::logging::log_frontend_message,
        ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
