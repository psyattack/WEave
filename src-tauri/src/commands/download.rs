use std::path::PathBuf;

use tauri::command;

use crate::commands::{map_err, AppStateHandle};
use crate::download::TaskStatus;
use crate::plugin_paths;

#[command]
pub async fn download_start(
    state: AppStateHandle<'_>,
    pubfileid: String,
    account_index: Option<usize>,
) -> Result<(), String> {
    let Some(we_directory) = state.settings.read().get_directory() else {
        return Err("Wallpaper Engine directory is not configured".into());
    };
    let exe = plugin_paths::depot_downloader()?;
    let index =
        account_index.unwrap_or_else(|| state.settings.read().get_account_number() as usize);
    let infinite_retry = state.settings.read().get_infinite_retry_accounts();
    let dotnet_root = state.dotnet_root.lock().clone();
    state
        .downloads
        .start(
            &pubfileid,
            index,
            state.accounts.clone(),
            PathBuf::from(we_directory),
            exe,
            dotnet_root,
            infinite_retry,
        )
        .await
        .map_err(map_err)
}

#[command]
pub async fn download_cancel(state: AppStateHandle<'_>, pubfileid: String) -> Result<bool, String> {
    let we_directory = state
        .settings
        .read()
        .get_directory()
        .map(PathBuf::from)
        .unwrap_or_default();
    let result = state.downloads.cancel(&pubfileid, &we_directory).await;
    Ok(result)
}

#[command]
pub fn download_status_all(state: AppStateHandle<'_>) -> Vec<TaskStatus> {
    state.downloads.list()
}

#[command]
pub async fn download_multi_start(
    state: AppStateHandle<'_>,
    pubfileids: Vec<String>,
    account_index: Option<usize>,
) -> Result<(), String> {
    for id in pubfileids {
        if let Err(err) = download_start(state.clone(), id, account_index).await {
            log::warn!("download_multi_start failed: {err}");
        }
    }
    Ok(())
}

#[command]
pub async fn download_submit_2fa(
    state: AppStateHandle<'_>,
    pubfileid: String,
    code: String,
) -> Result<(), String> {
    state.downloads.submit_2fa(&pubfileid, &code).await
}
