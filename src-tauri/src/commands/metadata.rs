use serde_json::Value;
use tauri::command;

use crate::commands::AppStateHandle;

#[command]
pub fn metadata_get_all(state: AppStateHandle<'_>) -> Value {
    state.config.read().get_metadata_all()
}

#[command]
pub fn metadata_get(state: AppStateHandle<'_>, pubfileid: String) -> Option<Value> {
    state
        .config
        .read()
        .get(&format!("wallpaper_metadata.{pubfileid}"))
}

#[command]
pub fn metadata_save(state: AppStateHandle<'_>, pubfileid: String, data: Value) {
    state.config.read().set_metadata_item(&pubfileid, data);
}

#[command]
pub fn metadata_remove(state: AppStateHandle<'_>, pubfileid: String) {
    state.config.read().remove_metadata_item(&pubfileid);
}
