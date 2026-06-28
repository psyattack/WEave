//! Resolve where the DepotDownloaderMod / RePKG executables live on disk.
//!
//! Plugins are now stored in the shared app data directory under `plugins/`.
//! The app data directory is typically:
//! - Windows: %LOCALAPPDATA%\WEave
//! - macOS:   ~/Library/Application Support/WEave
//! - Linux:   $XDG_DATA_HOME/WEave or ~/.local/share/WEave

use std::path::PathBuf;

/// Resolve the shared app data directory.
fn resolve_app_data_dir() -> PathBuf {
    if let Some(base) = dirs::data_local_dir() {
        return base.join("WEave");
    }

    if let Some(base) = dirs::data_dir() {
        return base.join("WEave");
    }

    if let Some(home) = dirs::home_dir() {
        return home.join(".weave");
    }

    PathBuf::from("./WEave")
}

/// Get the plugins directory in the shared app data directory.
pub fn plugins_dir() -> PathBuf {
    resolve_app_data_dir().join("plugins")
}

fn find_plugin_binary(plugin_folder: &str, binary_name: &str) -> Option<PathBuf> {
    let plugins_dir = plugins_dir();
    let candidate = plugins_dir.join(plugin_folder).join(binary_name);
    if candidate.is_file() {
        return Some(candidate);
    }
    None
}

pub fn depot_downloader() -> Result<PathBuf, String> {
    let name = if cfg!(windows) {
        "DepotDownloaderMod.exe"
    } else {
        "DepotDownloaderMod"
    };
    find_plugin_binary("DepotDownloaderMod", name).ok_or_else(|| {
        format!(
            "DepotDownloaderMod not found. It will be downloaded automatically on first use from the shared data directory: {}",
            plugins_dir().join("DepotDownloaderMod").display()
        )
    })
}

pub fn repkg() -> Result<PathBuf, String> {
    let name = if cfg!(windows) { "RePKG.exe" } else { "RePKG" };
    find_plugin_binary("RePKG", name).ok_or_else(|| {
        format!(
            "RePKG not found. It will be downloaded automatically on first use from the shared data directory: {}",
            plugins_dir().join("RePKG").display()
        )
    })
}
