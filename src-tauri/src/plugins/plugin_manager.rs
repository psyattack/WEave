//! Plugin management — checks if plugins (DepotDownloaderMod, RePKG) are
//! installed in the shared app data directory and downloads them from GitHub
//! releases if missing. Uses a unified status system with dotnet downloads.

use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

/// Plugin definitions with their GitHub release URLs and expected binary names.
pub struct PluginDef {
    pub id: &'static str,
    pub name: &'static str,
    pub download_url: &'static str,
    pub binary_name: &'static str,
    /// Whether the plugin archive is a ZIP (true) or RAR (false)
    pub is_zip: bool,
    /// Optional prefix to strip from archive paths during extraction.
    /// For example, DepotDownloaderMod RAR has files under `Release/net9.0/`.
    pub strip_prefix: Option<&'static str>,
}

pub const PLUGINS: &[PluginDef] = &[
    PluginDef {
        id: "depot_downloader_mod",
        name: "DepotDownloaderMod",
        download_url:
            "https://github.com/SteamAutoCracks/DepotDownloaderMod/releases/download/DepotDownloaderMod_3.4.0.2/Release.rar",
        binary_name: if cfg!(windows) {
            "DepotDownloaderMod.exe"
        } else {
            "DepotDownloaderMod"
        },
        is_zip: false,
        strip_prefix: Some("Release/net9.0/"),
    },
    PluginDef {
        id: "repkg",
        name: "RePKG",
        download_url:
            "https://github.com/notscuffed/repkg/releases/download/v0.4.0-alpha/RePKG.zip",
        binary_name: if cfg!(windows) { "RePKG.exe" } else { "RePKG" },
        is_zip: true,
        strip_prefix: None,
    },
];

#[derive(Debug, Clone, Serialize)]
pub struct PluginStatus {
    pub phase: PluginPhase,
    pub plugin_id: String,
    pub plugin_name: String,
    pub message: String,
    pub progress: Option<f32>,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PluginPhase {
    Checking,
    Downloading,
    Extracting,
    Ready,
    Error,
}

/// Check if a plugin is already installed in the plugins directory.
pub fn is_plugin_installed(plugins_dir: &std::path::Path, plugin: &PluginDef) -> bool {
    let plugin_dir = plugins_dir.join(plugin.id);
    if !plugin_dir.exists() {
        return false;
    }
    let binary = plugin_dir.join(plugin.binary_name);
    binary.exists()
}

/// Get the path to a plugin binary if installed.
pub fn get_plugin_path(plugins_dir: &std::path::Path, plugin: &PluginDef) -> Option<PathBuf> {
    let binary = plugins_dir.join(plugin.id).join(plugin.binary_name);
    if binary.exists() {
        Some(binary)
    } else {
        None
    }
}

/// Ensure all plugins are installed, downloading any that are missing.
/// Emits unified status events that can be displayed in the same UI as dotnet.
pub async fn ensure_plugins(app: &AppHandle, plugins_dir: &std::path::Path) -> anyhow::Result<()> {
    // Create plugins directory if it doesn't exist
    std::fs::create_dir_all(plugins_dir)?;

    for plugin in PLUGINS {
        if is_plugin_installed(plugins_dir, plugin) {
            log::info!("Plugin {} is already installed", plugin.name);
            emit_plugin_status(
                app,
                PluginPhase::Ready,
                plugin.id,
                plugin.name,
                &format!("{} is installed", plugin.name),
                Some(100.0),
            );
            continue;
        }

        log::info!("Plugin {} not found, downloading...", plugin.name);
        download_and_extract_plugin(app, plugins_dir, plugin).await?;
    }

    Ok(())
}

fn emit_plugin_status(
    app: &AppHandle,
    phase: PluginPhase,
    plugin_id: &str,
    plugin_name: &str,
    message: &str,
    progress: Option<f32>,
) {
    let status = PluginStatus {
        phase,
        plugin_id: plugin_id.to_string(),
        plugin_name: plugin_name.to_string(),
        message: message.to_string(),
        progress,
    };
    app.emit("plugin://status", &status).ok();
}

async fn download_and_extract_plugin(
    app: &AppHandle,
    plugins_dir: &std::path::Path,
    plugin: &PluginDef,
) -> anyhow::Result<()> {
    let plugin_dir = plugins_dir.join(plugin.id);
    std::fs::create_dir_all(&plugin_dir)?;

    // Determine archive file extension
    let archive_ext = if plugin.is_zip { "zip" } else { "rar" };
    let archive_path = plugins_dir.join(format!("{}.{}", plugin.id, archive_ext));

    // Download
    emit_plugin_status(
        app,
        PluginPhase::Downloading,
        plugin.id,
        plugin.name,
        &format!("Downloading {}...", plugin.name),
        Some(0.0),
    );
    log::info!(
        "Downloading {} from {}...",
        plugin.name,
        plugin.download_url
    );

    let response = reqwest::get(plugin.download_url).await?;
    if !response.status().is_success() {
        anyhow::bail!(
            "Failed to download {}: HTTP {}",
            plugin.name,
            response.status()
        );
    }

    let total_size = response.content_length().unwrap_or(0);
    let bytes = response.bytes().await?;
    std::fs::write(&archive_path, &bytes)?;

    let progress = if total_size > 0 {
        (bytes.len() as f32 / total_size as f32) * 100.0
    } else {
        100.0
    };

    emit_plugin_status(
        app,
        PluginPhase::Downloading,
        plugin.id,
        plugin.name,
        &format!("Downloaded {:.1} MB", bytes.len() as f32 / 1_048_576.0),
        Some(progress),
    );
    log::info!("Downloaded {} bytes for {}", bytes.len(), plugin.name);

    // Extract
    emit_plugin_status(
        app,
        PluginPhase::Extracting,
        plugin.id,
        plugin.name,
        &format!("Extracting {}...", plugin.name),
        Some(0.0),
    );
    log::info!("Extracting {} to {}...", plugin.name, plugin_dir.display());

    if plugin.is_zip {
        extract_zip(&archive_path, &plugin_dir, plugin.strip_prefix)?;
    } else {
        extract_rar(&archive_path, &plugin_dir, plugin.strip_prefix)?;
    }

    // Delete the archive file
    std::fs::remove_file(&archive_path)?;
    log::info!("Plugin {} installed successfully", plugin.name);

    emit_plugin_status(
        app,
        PluginPhase::Ready,
        plugin.id,
        plugin.name,
        &format!("{} installed", plugin.name),
        Some(100.0),
    );

    Ok(())
}

fn extract_zip(
    zip_path: &std::path::Path,
    target_dir: &std::path::Path,
    strip_prefix: Option<&str>,
) -> anyhow::Result<()> {
    let file = std::fs::File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let raw_path = file
            .enclosed_name()
            .map(|p| p.to_path_buf())
            .unwrap_or_default();

        // Strip the prefix if configured
        let rel_path = if let Some(prefix) = strip_prefix {
            match raw_path.strip_prefix(prefix) {
                Ok(stripped) => stripped.to_path_buf(),
                Err(_) => {
                    // Skip entries that are parent directories of the prefix
                    // e.g. "Release/" for prefix "Release/net9.0/"
                    continue;
                }
            }
        } else {
            raw_path
        };

        // Skip empty paths (the prefix directory entry itself)
        if rel_path.as_os_str().is_empty() {
            continue;
        }

        let outpath = target_dir.join(&rel_path);

        if file.name().ends_with('/') || rel_path.to_string_lossy().ends_with('/') {
            std::fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                std::fs::create_dir_all(p)?;
            }
            let mut outfile = std::fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Some(mode) = file.unix_mode() {
                std::fs::set_permissions(&outpath, std::fs::Permissions::from_mode(mode))?;
            }
        }
    }

    Ok(())
}

fn extract_rar(
    rar_path: &std::path::Path,
    target_dir: &std::path::Path,
    strip_prefix: Option<&str>,
) -> anyhow::Result<()> {
    let mut archive = unrar::Archive::new(rar_path).open_for_processing()?;

    while let Some(header) = archive.read_header()? {
        let filename = header.entry().filename.to_string_lossy().to_string();

        // Get the path relative to the archive root
        let raw_path = std::path::Path::new(&filename);

        // Strip the prefix if configured
        let rel_path = if let Some(prefix) = strip_prefix {
            match raw_path.strip_prefix(prefix) {
                Ok(stripped) => stripped,
                Err(_) => {
                    // Skip entries that are parent directories of the prefix
                    archive = header.skip()?;
                    continue;
                }
            }
        } else {
            raw_path
        };

        // Skip the prefix directory entry itself
        if rel_path.as_os_str().is_empty() {
            archive = header.skip()?;
            continue;
        }

        // Extract to the correct location
        let outpath = target_dir.join(rel_path);
        archive = header.extract_to(outpath)?;
    }

    Ok(())
}
