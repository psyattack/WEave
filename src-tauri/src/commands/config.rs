use serde_json::Value;
use tauri::command;

use crate::commands::{map_err, AppStateHandle};
use crate::config::WindowGeometry;

#[command]
pub fn config_get_all(state: AppStateHandle<'_>) -> Value {
    state.config.read().snapshot()
}

#[command]
pub fn config_get(state: AppStateHandle<'_>, path: String) -> Option<Value> {
    state.config.read().get(&path)
}

#[command]
pub fn config_set(
    state: AppStateHandle<'_>,
    path: String,
    value: Value,
) -> Result<(), String> {
    state.config.read().set(&path, value).map_err(map_err)
}

#[command]
pub fn config_save_window_geometry(
    state: AppStateHandle<'_>,
    geometry: WindowGeometry,
) -> Result<(), String> {
    state.config.read().set_window_geometry(geometry);
    Ok(())
}
