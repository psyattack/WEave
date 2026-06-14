use serde::Serialize;
use tauri::command;

use crate::commands::AppStateHandle;

#[derive(Serialize)]
pub struct LanguageInfo {
    pub code: String,
    pub label: String,
}

#[command]
pub fn i18n_get_available_languages(state: AppStateHandle<'_>) -> Vec<LanguageInfo> {
    state
        .i18n
        .read()
        .available()
        .into_iter()
        .map(|(code, label)| LanguageInfo { code, label })
        .collect()
}

#[command]
pub fn i18n_set_language(state: AppStateHandle<'_>, language: String) -> Result<(), String> {
    state.settings.read().set_language(&language);
    Ok(())
}
