//! .NET Runtime management for DepotDownloaderMod and RePKG plugins.
//!
//! Checks if .NET 8/9/10 is installed in the system. If not found, downloads
//! the portable .NET 9.0.17 runtime, extracts it to the shared app data
//! directory (`dotnet/`), and returns the path to set as DOTNET_ROOT
//! environment variable.

use std::path::PathBuf;
use std::process::Command;

use serde::Serialize;
use tauri::{AppHandle, Emitter};

const DOTNET_RUNTIME_URL: &str =
    "https://builds.dotnet.microsoft.com/dotnet/Runtime/9.0.17/dotnet-runtime-9.0.17-win-x64.zip";
const DOTNET_RUNTIME_VERSION: &str = "9.0.17";

#[derive(Debug, Clone, Serialize)]
pub struct DotnetStatus {
    pub phase: DotnetPhase,
    pub message: String,
    pub progress: Option<f32>,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DotnetPhase {
    Checking,
    Downloading,
    Extracting,
    Ready,
    Error,
}

/// Returns the path to use for DOTNET_ROOT. If .NET 8/9/10 is installed in
/// the system, returns None (use system runtime). Otherwise, ensures the
/// portable runtime is downloaded and returns its path.
///
/// # Arguments
/// * `app` - Tauri app handle for emitting events
/// * `app_data_dir` - The shared app data directory (e.g., %LOCALAPPDATA%\WEave)
pub async fn ensure_dotnet_runtime(
    app: &AppHandle,
    app_data_dir: &std::path::Path,
) -> anyhow::Result<Option<PathBuf>> {
    // Check if .NET 8, 9, or 10 is installed in the system
    if is_dotnet_installed()? {
        log::info!(".NET Runtime 8/9/10 found in system, using system installation");
        // Don't emit events if system runtime is already available
        return Ok(None);
    }

    log::info!(".NET Runtime 8/9/10 not found in system, will use portable version");

    // Get the dotnet directory inside the shared app data directory
    let dotnet_dir = app_data_dir.join("dotnet");

    // Check if we already have the portable runtime
    if is_portable_runtime_valid(&dotnet_dir) {
        log::info!(
            "Portable .NET Runtime already exists at {}",
            dotnet_dir.display()
        );
        // Don't emit events if portable runtime already exists
        return Ok(Some(dotnet_dir));
    }

    // Only emit events if we actually need to download
    emit_status(
        app,
        DotnetPhase::Checking,
        "Checking for .NET Runtime...",
        None,
    );

    // Download and extract the portable runtime
    log::info!(
        "Downloading .NET Runtime {} portable...",
        DOTNET_RUNTIME_VERSION
    );

    let result = download_and_extract_runtime(app_data_dir, app).await;

    match result {
        Ok(_) => {
            emit_status(
                app,
                DotnetPhase::Ready,
                "Portable .NET Runtime installed",
                Some(100.0),
            );
            Ok(Some(dotnet_dir))
        }
        Err(e) => {
            emit_status(
                app,
                DotnetPhase::Error,
                &format!("Failed to install .NET Runtime: {}", e),
                None,
            );
            Err(e)
        }
    }
}

fn emit_status(app: &AppHandle, phase: DotnetPhase, message: &str, progress: Option<f32>) {
    let status = DotnetStatus {
        phase,
        message: message.to_string(),
        progress,
    };
    app.emit("dotnet://status", &status).ok();
}

/// Checks if .NET 8, 9, or 10 is installed by running `dotnet --list-runtimes`.
fn is_dotnet_installed() -> anyhow::Result<bool> {
    let output = Command::new("dotnet").arg("--list-runtimes").output();

    let Ok(output) = output else {
        // dotnet command not found
        return Ok(false);
    };

    if !output.status.success() {
        return Ok(false);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Look for Microsoft.NETCore.App 8.x, 9.x, or 10.x
    for line in stdout.lines() {
        if line.contains("Microsoft.NETCore.App") {
            if line.contains(" 8.") || line.contains(" 9.") || line.contains(" 10.") {
                return Ok(true);
            }
        }
    }

    Ok(false)
}

/// Checks if the portable runtime directory exists and looks valid.
fn is_portable_runtime_valid(dotnet_dir: &std::path::Path) -> bool {
    if !dotnet_dir.exists() {
        return false;
    }

    // Check for essential files
    let dotnet_exe = if cfg!(windows) {
        dotnet_dir.join("dotnet.exe")
    } else {
        dotnet_dir.join("dotnet")
    };

    dotnet_exe.exists()
}

/// Downloads the .NET Runtime ZIP and extracts it to the shared app data directory.
async fn download_and_extract_runtime(
    app_data_dir: &std::path::Path,
    app: &AppHandle,
) -> anyhow::Result<()> {
    let zip_path = app_data_dir.join("dotnet-runtime.zip");
    let dotnet_dir = app_data_dir.join("dotnet");

    // Create app data directory if it doesn't exist
    std::fs::create_dir_all(app_data_dir)?;

    // Download the runtime
    emit_status(
        app,
        DotnetPhase::Downloading,
        "Downloading .NET Runtime (this may take a few minutes)...",
        Some(0.0),
    );
    log::info!("Downloading from {}...", DOTNET_RUNTIME_URL);

    let response = reqwest::get(DOTNET_RUNTIME_URL).await?;

    if !response.status().is_success() {
        anyhow::bail!(
            "Failed to download .NET Runtime: HTTP {}",
            response.status()
        );
    }

    let total_size = response.content_length().unwrap_or(0);
    let bytes = response.bytes().await?;
    std::fs::write(&zip_path, &bytes)?;

    let progress = if total_size > 0 {
        (bytes.len() as f32 / total_size as f32) * 100.0
    } else {
        100.0
    };

    emit_status(
        app,
        DotnetPhase::Downloading,
        &format!("Downloaded {:.1} MB", bytes.len() as f32 / 1_048_576.0),
        Some(progress),
    );

    log::info!("Downloaded {} bytes", bytes.len());

    // Extract the ZIP
    emit_status(
        app,
        DotnetPhase::Extracting,
        "Extracting .NET Runtime...",
        Some(0.0),
    );
    log::info!("Extracting to {}...", dotnet_dir.display());
    extract_zip(&zip_path, &dotnet_dir)?;

    // Delete the ZIP file
    std::fs::remove_file(&zip_path)?;
    log::info!("Portable .NET Runtime installed successfully");

    Ok(())
}

/// Extracts a ZIP archive to the target directory.
fn extract_zip(zip_path: &std::path::Path, target_dir: &std::path::Path) -> anyhow::Result<()> {
    let file = std::fs::File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let outpath = match file.enclosed_name() {
            Some(path) => target_dir.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                std::fs::create_dir_all(p)?;
            }
            let mut outfile = std::fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }

        // Set permissions on Unix
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
