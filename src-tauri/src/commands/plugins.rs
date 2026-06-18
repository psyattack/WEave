use tauri::command;

use crate::commands::AppStateHandle;

#[command]
pub fn plugins_init(state: AppStateHandle<'_>) {
    state.init_plugins_async();
}
