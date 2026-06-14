use tauri::command;

use crate::commands::AppStateHandle;

#[command]
pub fn dotnet_get_root(state: AppStateHandle<'_>) -> Option<String> {
    state
        .dotnet_root
        .lock()
        .as_ref()
        .map(|p| p.to_string_lossy().to_string())
}

#[command]
pub fn dotnet_init(state: AppStateHandle<'_>) {
    state.init_dotnet_runtime_async();
}
