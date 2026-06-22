use std::sync::Arc;
use tauri::State;

use crate::app_state::AppState;
use crate::workshop::SteamAccount;

use tauri::Emitter;
static STEAM_LOGIN_POLLING: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

#[tauri::command]
pub async fn steam_login_show(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    state
        .steam_webview
        .show_login()
        .await
        .map_err(|e| e.to_string())?;

    if !STEAM_LOGIN_POLLING.swap(true, std::sync::atomic::Ordering::SeqCst) {
        let app_handle = state.app_handle.clone();
        let steam_webview = state.steam_webview.clone();
        let workshop = state.workshop.clone();

        tokio::spawn(async move {
            for _ in 0..180 {
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                if steam_webview.is_logged_in().await {
                    if let Ok(_) = steam_webview.sync_cookies().await {
                        workshop.clear_caches();
                        let _ = steam_webview.hide().await;
                        let _ = app_handle.emit("steam-login-success", ());
                        break;
                    }
                }
            }
            STEAM_LOGIN_POLLING.store(false, std::sync::atomic::Ordering::SeqCst);
        });
    }

    Ok(())
}

/// Just opens the parser webview window without starting any login-polling loop.
/// Safe to call when already logged in — will not fire "steam-login-success".
#[tauri::command]
pub async fn steam_parser_show(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    state
        .steam_webview
        .show_login()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn steam_login_hide(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    state
        .steam_webview
        .hide()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn steam_sync_cookies(state: State<'_, Arc<AppState>>) -> Result<usize, String> {
    let n = state.steam_webview.sync_cookies().await?;
    // Clear page cache so that subsequent requests go through with the new
    // cookies and don't return stale anonymous pages.
    state.workshop.clear_caches();
    Ok(n)
}

#[tauri::command]
pub async fn steam_is_logged_in(state: State<'_, Arc<AppState>>) -> Result<bool, String> {
    Ok(state.steam_webview.is_logged_in().await)
}

/// Ask Steam itself who the scraper is currently acting as. Returns `None`
/// if no valid Steam session is attached to the reqwest client — which is
/// also the hook the frontend uses to warn the user that the Workshop
/// parser is running anonymously. This is the check the user requested:
/// the account is resolved by hitting steamcommunity.com, not by reading
/// whatever is selected in the Settings dialog.
#[tauri::command]
pub async fn steam_current_account(
    state: State<'_, Arc<AppState>>,
) -> Result<Option<SteamAccount>, String> {
    // Make sure whatever cookies are in the webview profile are
    // reflected in the reqwest jar before we query Steam.
    let _ = state.steam_webview.sync_cookies().await;
    Ok(state.workshop.current_account().await)
}

/// Attempt to sign the hidden webview into Steam. When an `account_index`
/// is supplied the requested download account is used — otherwise we fall
/// back to the dedicated parser account (`weworkshopmanager2`), which is
/// intentionally kept out of the download-account list. Returns true on
/// success. Safe to call repeatedly — no-ops if we're already logged in.
/// When `force` is true, the current session is terminated first and a
/// fresh login is always attempted.
#[tauri::command]
pub async fn steam_auto_login(
    state: State<'_, Arc<AppState>>,
    account_index: Option<usize>,
    force: Option<bool>,
) -> Result<bool, String> {
    if !force.unwrap_or(false) {
        // When not forcing, check for an existing session — but verify it's
        // actually valid by hitting Steam's profile endpoint. A stale
        // `steamLoginSecure` cookie can survive for a long time after the
        // session has expired server-side, so we must not trust it blindly.
        if state.steam_webview.is_logged_in().await {
            let _ = state.steam_webview.sync_cookies().await;
            if state.workshop.current_account().await.is_some() {
                state.workshop.clear_caches();
                return Ok(true);
            }
            // Session cookie exists but is stale — fall through to re-login.
        }
    }
    let creds = match account_index {
        Some(i) => state.accounts.credentials(i),
        None => state.accounts.parser_credentials(),
    };
    if creds.username.is_empty() || creds.password.is_empty() {
        return Ok(false);
    }
    let ok = state
        .steam_webview
        .auto_login(&creds.username, &creds.password, force.unwrap_or(false))
        .await?;
    if ok {
        let _ = state.steam_webview.sync_cookies().await;
        state.workshop.clear_caches();
    }
    Ok(ok)
}
