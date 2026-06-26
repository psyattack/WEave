use serde::Serialize;
use tauri::{command, AppHandle, Emitter};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use once_cell::sync::Lazy;
use parking_lot::Mutex;
use tokio::io::AsyncReadExt;
use tokio::process::{Child, Command};
use tokio::sync::Mutex as AsyncMutex;

use crate::accounts::AccountCredentials;
use crate::commands::AppStateHandle;
use crate::plugin_paths;

type ChildHandle = Arc<AsyncMutex<Option<Child>>>;
static AUTH_HANDLES: Lazy<Mutex<HashMap<String, ChildHandle>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static QR_LOGIN_HANDLE: Lazy<Mutex<ChildHandle>> = Lazy::new(|| Mutex::new(Arc::new(AsyncMutex::new(None))));

#[derive(Serialize)]
pub struct AccountSummary {
    pub index: usize,
    pub username: String,
    pub is_custom: bool,
}

#[command]
pub fn accounts_list(state: AppStateHandle<'_>) -> Vec<AccountSummary> {
    state
        .accounts
        .list_detailed()
        .into_iter()
        .enumerate()
        .map(|(index, a)| AccountSummary {
            index,
            username: a.username,
            is_custom: a.is_custom,
        })
        .collect()
}

#[command]
pub fn accounts_get_current(state: AppStateHandle<'_>) -> AccountCredentials {
    let index = state.settings.read().get_account_number() as usize;
    let mut credentials = state.accounts.credentials(index);
    credentials.password = String::new();
    credentials
}

#[command]
pub fn accounts_set_current(state: AppStateHandle<'_>, index: u32) {
    state.settings.read().set_account_number(index);
}

/// Add a new user account. The password is stored encrypted via
/// `UserAccountsStore` (PBKDF2 + AES-256-GCM, machine-bound key).
#[command]
pub fn accounts_set_custom(
    state: AppStateHandle<'_>,
    username: String,
    password: String,
) -> Result<(), String> {
    state
        .accounts
        .add_user_account(username.trim(), password.as_str())
}

/// Remove a single user account by username.
#[command]
pub fn accounts_remove_custom(
    state: AppStateHandle<'_>,
    username: String,
) -> Result<(), String> {
    state.accounts.remove_user_account(username.trim())
}

/// Wipe all encrypted user accounts.
#[command]
pub fn accounts_reset_custom(state: AppStateHandle<'_>) -> Result<(), String> {
    state.accounts.clear_user_accounts()
}

/// List the usernames of user-added accounts (the SettingsDialog shows
/// these so the user can remove them individually).
#[command]
pub fn accounts_list_custom(state: AppStateHandle<'_>) -> Vec<String> {
    state.accounts.list_custom_usernames()
}

#[command]
pub async fn accounts_login_qr(
    state: AppStateHandle<'_>,
    app: AppHandle,
) -> Result<(), String> {
    let depot_exe = plugin_paths::depot_downloader().map_err(|e| e.to_string())?;

    log::info!("[auth-qr] Starting DepotDownloader at: {}", depot_exe.display());

    // Launch DepotDownloader DIRECTLY (not via `cmd /c "chcp ... && ..."`).
    // The cmd wrapper was the real cause of the blank QR: Rust escapes the inner
    // quotes around the exe path, which cmd.exe does not understand, so the
    // executable was never actually started - you'd see "Spawned successfully"
    // (that is just cmd) followed by zero DepotDownloader output. This mirrors
    // the working username/password login (accounts_verify_custom). We read raw
    // bytes and decode per line downstream, so the chcp 65001 trick is not
    // needed: block glyphs arrive either as UTF-8 or as a single OEM code-page
    // byte (which becomes U+FFFD and is mapped back to a block).
    let mut cmd = Command::new(&depot_exe);
    cmd.args([
        "-app", "730",
        "-depot", "0",
        "-remember-password",
        "-qr",
    ])
    .stdin(Stdio::null())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .kill_on_drop(true);

    // DepotDownloaderMod needs the bundled .NET runtime root to start.
    if let Some(ref root) = *state.dotnet_root.lock() {
        cmd.env("DOTNET_ROOT", root);
    }

    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            let err_msg = format!("Failed to spawn DepotDownloader: {}", e);
            log::error!("[auth-qr] {}", err_msg);
            return Err(err_msg);
        }
    };
    log::info!("[auth-qr] Spawned successfully");
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let child_handle = Arc::new(AsyncMutex::new(Some(child)));
    
    {
        let mut qr_handle = QR_LOGIN_HANDLE.lock();
        *qr_handle = child_handle.clone();
    }

    // Merge stdout and stderr
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(100);

    if let Some(mut out) = stdout {
        let tx = tx.clone();
        tokio::spawn(async move {
            // Read raw bytes and split into lines at the BYTE level (0x0A). A
            // newline byte can never appear inside a multi-byte UTF-8 sequence,
            // so this is safe and - crucially - we only decode COMPLETE lines.
            // Decoding arbitrary 1024-byte chunks would split the 3-byte block
            // glyph (U+2588) across reads and corrupt the QR code.
            let mut buf = [0u8; 1024];
            let mut pending: Vec<u8> = Vec::new();
            while let Ok(n) = out.read(&mut buf).await {
                if n == 0 { break; }
                pending.extend_from_slice(&buf[..n]);
                while let Some(pos) = pending.iter().position(|&b| b == b'\n') {
                    // drain the line including its trailing newline byte
                    let mut line_bytes: Vec<u8> = pending.drain(..=pos).collect();
                    line_bytes.pop(); // remove '\n'
                    if line_bytes.last() == Some(&b'\r') {
                        line_bytes.pop(); // remove '\r'
                    }
                    let line = String::from_utf8_lossy(&line_bytes).into_owned();
                    // Send ALL lines, including whitespace-only (QR border lines)
                    let _ = tx.send(line).await;
                }
            }
            if !pending.is_empty() {
                if pending.last() == Some(&b'\r') { pending.pop(); }
                let line = String::from_utf8_lossy(&pending).into_owned();
                let _ = tx.send(line).await;
            }
        });
    }

    if let Some(mut err) = stderr {
        let tx = tx.clone();
        tokio::spawn(async move {
            use tokio::io::AsyncBufReadExt;
            let mut reader = tokio::io::BufReader::new(&mut err);
            let mut line = String::new();
            while let Ok(n) = reader.read_line(&mut line).await {
                if n == 0 { break; }
                let trimmed = line.trim().to_string();
                if !trimmed.is_empty() {
                    let _ = tx.send(trimmed).await;
                }
                line.clear();
            }
        });
    }
    drop(tx);

    // Process merged lines
    tokio::spawn(async move {
        let mut capturing_qr = false;
        let mut qr_data = String::new();
        let mut qr_emitted = false;
        let mut empty_line_count = 0;
        // Account name parsed from the QR success banner. The banner is printed
        // *before* the refresh token is written to disk, so we only remember the
        // name here and wait for the real "logged in" confirmation before we stop
        // the process - otherwise we could kill it mid-save and break
        // -remember-password for future downloads.
        let mut qr_username = "qr_user".to_string();

        // We use a timeout on recv() so that a "quiet" stdout (DepotDownloader
        // prints the QR and then silently waits for the phone scan) still lets us
        // flush the captured QR to the UI. Relying on trailing blank quiet-zone
        // lines was unreliable: terminals/pipes strip or buffer them, so the QR
        // was captured but never emitted -> the modal spun forever.
        use tokio::time::{timeout, Duration};
        loop {
            let line = match timeout(Duration::from_millis(400), rx.recv()).await {
                Ok(Some(line)) => line,
                Ok(None) => break, // channel closed: the process has exited
                Err(_) => {
                    // No new output for 400ms. If a QR has been captured but not
                    // yet shown, emit it now (no dependence on trailing blanks).
                    if capturing_qr && !qr_emitted && qr_data.contains('\u{2588}') {
                        app.emit("auth://qr_ready", &qr_data).ok();
                        qr_emitted = true;
                    }
                    continue;
                }
            };
            let lower = line.to_lowercase();
            // ALWAYS log the raw output from DepotDownloader so the developer
            // can see if it's crashing, asking for input, or failing to start.

            if lower.contains("unhandled exception") || lower.contains("fatal error") {
                app.emit("auth://qr_failed", "DepotDownloader crashed").ok();
                break;
            }

            // --- Success / failure detection ---
            // These can appear whether or not we are still mid-capture, so they
            // are checked first.
            //
            // The original code only looked for a single line containing
            // "logging" + "done!" + "steam3". DepotDownloaderMod prints those as
            // *separate* lines, so that condition was never true and the QR login
            // never completed (the account was never added). The QR flow instead
            // prints:
            //   "Success! Next time you can login with -username <name> ..."  (name)
            //   ...token saved to disk...
            //   " Done!" / "Got <n> licenses for account!"                    (logged in)
            //
            // We grab the username from the banner, then finish only once the
            // account is fully logged in so the saved token is intact.
            if lower.contains("success! next time you can login") {
                if let Some(idx) = lower.find("-username ") {
                    let rest = &line[idx + "-username ".len()..];
                    if let Some(name) = rest.split_whitespace().next() {
                        if !name.is_empty() {
                            qr_username = name.to_string();
                        }
                    }
                }
            }

            // Definitive "logged in" confirmation, printed after the refresh
            // token has been persisted. Safe to emit success and stop here.
            if lower.contains("licenses for account") {
                app.emit("auth://qr_success", &qr_username).ok();
                break;
            }

            if lower.contains("failed to authenticate")
                || lower.contains("authentication failed")
                || lower.contains("access token was rejected")
            {
                app.emit("auth://qr_failed", "Authentication failed").ok();
                break;
            }

            if capturing_qr {
                let is_empty_or_spaces = line.chars().all(|ch| ch == ' ');
                let has_blocks =
                    line.contains('█') || line.contains('▄') || line.contains('▀') || line.contains('�');

                if is_empty_or_spaces || has_blocks {
                    // If the terminal encoding messed up the blocks, fix them
                    let fixed_line = line.replace('\u{FFFD}', "\u{2588}");
                    qr_data.push_str(&fixed_line);
                    qr_data.push('\n');

                    if is_empty_or_spaces && !has_blocks {
                        // Only start counting trailing blank lines once actual QR
                        // modules have been captured. The QR is rendered with a
                        // 4-line quiet zone below it, and two consecutive all-blank
                        // lines can never occur *inside* the code itself (the timing
                        // pattern guarantees a dark module on alternating rows), so
                        // emitting after 2 blank lines is both safe and reliable.
                        if qr_data.contains('█') || qr_data.contains('�') {
                            empty_line_count += 1;
                            if empty_line_count >= 2 && !qr_emitted {
                                app.emit("auth://qr_ready", &qr_data).ok();
                                qr_emitted = true;
                            }
                        }
                    } else {
                        empty_line_count = 0;
                    }
                } else {
                    // A normal text line ended the QR block before the trailing
                    // quiet zone was seen. Flush whatever we captured so the modal
                    // still opens (covers terminals that trim trailing whitespace).
                    capturing_qr = false;
                    if !qr_emitted && (qr_data.contains('█') || qr_data.contains('�')) {
                        app.emit("auth://qr_ready", &qr_data).ok();
                        qr_emitted = true;
                    }
                }
            } else if lower.contains("with this qr code:")
                || lower.contains("qr code has changed:")
            {
                // A fresh QR code is about to be drawn. Reset state so the new
                // code is captured and re-emitted (Steam rotates the challenge URL
                // periodically while the modal is open).
                capturing_qr = true;
                qr_data.clear();
                empty_line_count = 0;
                qr_emitted = false;
            }
        }

        // If the process ended while we still held a captured-but-unshown QR,
        // emit it so the modal can render it rather than spin.
        if !qr_emitted && qr_data.contains('\u{2588}') {
            app.emit("auth://qr_ready", &qr_data).ok();
            qr_emitted = true;
        }

        // Cleanup. `we_killed_child` is true only when the child was still owned
        // here (i.e. it exited on its own). If the user pressed Cancel,
        // accounts_cancel_qr already took & killed the handle, so take() yields
        // None and we stay silent (no spurious error toast).
        let we_killed_child = {
            let mut killed = false;
            if let Ok(mut child_guard) = child_handle.try_lock() {
                if let Some(mut c) = child_guard.take() {
                    let _ = c.kill().await;
                    killed = true;
                }
            }
            killed
        };

        // Process exited before producing any QR -> report failure so the modal
        // closes with an error instead of showing "Generating..." forever.
        if !qr_emitted && we_killed_child {
            app.emit("auth://qr_failed", "DepotDownloader exited before producing a QR code").ok();
        }
        app.emit("auth://done", "qr").ok();
    });

    Ok(())
}

#[command]
pub async fn accounts_cancel_qr() -> Result<(), String> {
    let child_handle_opt = {
        let qr_handle = QR_LOGIN_HANDLE.lock();
        qr_handle.clone()
    };
    
    if let Ok(mut child_guard) = child_handle_opt.try_lock() {
        if let Some(mut c) = child_guard.take() {
            let _ = c.kill().await;
        }
    }
    Ok(())
}

/// Kill any in-flight custom-account login / verification processes.
///
/// Called when the download login modal closes so DepotDownloader does not keep
/// running (and spamming the console) in the background after the window is
/// gone. Also stops a pending QR login for good measure.
#[command]
pub async fn accounts_cancel_auth() -> Result<(), String> {
    // Drain all credential-verification handles out of the map first so we do
    // not hold the synchronous mutex across the await points below.
    let handles: Vec<ChildHandle> = {
        let mut map = AUTH_HANDLES.lock();
        map.drain().map(|(_, h)| h).collect()
    };
    for handle in handles {
        if let Ok(mut guard) = handle.try_lock() {
            if let Some(mut c) = guard.take() {
                let _ = c.kill().await;
            }
        }
    }

    // Also stop a running QR login, if any.
    let qr_handle = {
        let guard = QR_LOGIN_HANDLE.lock();
        guard.clone()
    };
    if let Ok(mut guard) = qr_handle.try_lock() {
        if let Some(mut c) = guard.take() {
            let _ = c.kill().await;
        }
    }
    Ok(())
}

#[command]
pub async fn accounts_verify_custom(
    state: AppStateHandle<'_>,
    app: AppHandle,
    username: String,
    password: String,
) -> Result<(), String> {
    let depot_exe = plugin_paths::depot_downloader().map_err(|e| e.to_string())?;
    
    let mut cmd = Command::new(&depot_exe);
    cmd.args([
        "-app", "730",
        "-depot", "0",
        "-username", &username,
        "-password", &password,
        "-remember-password",
    ])
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .kill_on_drop(true);

    if let Some(ref root) = *state.dotnet_root.lock() {
        cmd.env("DOTNET_ROOT", root);
    }

    #[cfg(windows)]
    {
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    let child_handle = Arc::new(AsyncMutex::new(Some(child)));
    AUTH_HANDLES.lock().insert(username.clone(), child_handle.clone());

    // Merge stdout and stderr into a single channel, same pattern as download/mod.rs
    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(100);

    if let Some(mut out) = stdout {
        let tx = tx.clone();
        tokio::spawn(async move {
            let mut buf = [0u8; 1024];
            let mut current_line = String::new();
            while let Ok(n) = out.read(&mut buf).await {
                if n == 0 { break; }
                let chunk = String::from_utf8_lossy(&buf[..n]);
                for c in chunk.chars() {
                    if c == '\n' {
                        let line = std::mem::take(&mut current_line);
                        let trimmed = line.trim_end_matches('\r');
                        if !trimmed.is_empty() {
                            let _ = tx.send(trimmed.to_string()).await;
                        }
                    } else {
                        current_line.push(c);
                        // These prompts are printed with Console.Write (NO trailing
                        // newline) and then block on input, so we must detect them
                        // mid-line. We deliberately do NOT flush on a bare
                        // "STEAM GUARD!" prefix: the email AND authenticator code
                        // prompts also start with "STEAM GUARD! ...", and flushing on
                        // the prefix alone made them get sent as a standalone
                        // "STEAM GUARD!" line that the classifier then mistook for a
                        // mobile-app confirmation. We wait until a disambiguating
                        // keyword (a code-entry phrase or a SPECIFIC confirm phrase) is
                        // present so the full prompt reaches the classifier intact.
                        let lower = current_line.to_lowercase();
                        let is_code_prompt = (lower.contains("enter") && lower.contains("code"))
                            || lower.contains("auth code")
                            || lower.contains("authentication code")
                            || lower.contains("code sent to")
                            || lower.contains("two-factor")
                            || lower.contains("two factor")
                            || lower.contains("2 factor")
                            || lower.contains("authenticator app");
                        let is_confirm_prompt = lower.contains("confirm your sign in")
                            || lower.contains("confirm the sign in")
                            || lower.contains("use the steam mobile app")
                            || lower.contains("mobile app to confirm")
                            || lower.contains("waiting for confirmation")
                            || lower.contains("waiting for steam guard");
                        // Catch-all for an email / authenticator code prompt that
                        // is printed with Console.Write and then BLOCKS on
                        // Console.ReadLine(). Such prompts never produce a newline,
                        // and the exact wording varies between DepotDownloader
                        // builds, so the keyword lists above can miss them - in
                        // which case the line stays stuck in `current_line` until
                        // the process is killed (the user pressed Cancel), which is
                        // exactly the "modal only appears after Cancel" bug.
                        //
                        // A prompt that is waiting for typed input ends with a
                        // colon (e.g. "STEAM GUARD! ... code ...:"). When we see a
                        // Steam Guard / 2FA line whose last non-space character is
                        // a ':' we flush it immediately so the classifier can open
                        // the 2FA modal without waiting for the (never-coming)
                        // newline. Device confirmations don't block on input and
                        // are newline-terminated, so they are unaffected.
                        let trimmed = lower.trim_end();
                        let is_blocking_input_prompt = trimmed.ends_with(':')
                            && (lower.contains("steam guard")
                                || lower.contains("code")
                                || lower.contains("2fa")
                                || lower.contains("two-factor")
                                || lower.contains("two factor"));
                        if is_code_prompt || is_confirm_prompt || is_blocking_input_prompt {
                            let line = std::mem::take(&mut current_line);
                            let _ = tx.send(line).await;
                        }
                    }
                }
            }
            if !current_line.is_empty() {
                let _ = tx.send(current_line).await;
            }
        });
    }

    if let Some(mut err) = stderr {
        let tx = tx.clone();
        tokio::spawn(async move {
            use tokio::io::AsyncBufReadExt;
            let mut reader = tokio::io::BufReader::new(&mut err);
            let mut line = String::new();
            while let Ok(n) = reader.read_line(&mut line).await {
                if n == 0 { break; }
                let trimmed = line.trim().to_string();
                if !trimmed.is_empty() {
                    let _ = tx.send(trimmed).await;
                }
                line.clear();
            }
        });
    }
    drop(tx); // drop the original sender so rx closes when both tasks finish

    // Process merged lines
    {
        let username_clone = username.clone();
        tokio::spawn(async move {
            use tokio::time::{timeout, Duration, Instant};

            let mut got_result = false;
            let mut prompted = false; // require_2fa or require_app_confirm sent
            let mut seen_login_attempt = false;
            let mut last_activity = Instant::now();

            // DepotDownloader prints the emailed / authenticator Steam Guard code
            // prompt with Console.Write (NO trailing newline) and then blocks on
            // Console.ReadLine(). On a redirected stdout the .NET runtime does not
            // flush that partial line to our pipe, so we never receive it until
            // the process is killed - which is why the 2FA modal used to appear
            // only after the user pressed Cancel.
            //
            // We cannot see that prompt, but we CAN see its side effect: once the
            // login attempt has started, the process goes completely silent while
            // it waits for the typed code. The mobile-app confirmation path, by
            // contrast, keeps emitting newline-terminated lines (and is handled
            // below). So: prolonged silence after the login attempt => a code is
            // being requested => open the 2FA modal.
            let quiet_2fa_threshold = Duration::from_secs(6);

            loop {
                let next = timeout(Duration::from_millis(500), rx.recv()).await;
                let line = match next {
                    Ok(Some(line)) => line,
                    Ok(None) => break, // channel closed: process exited
                    Err(_) => {
                        // No output for the poll interval. If the login attempt is
                        // under way and we have not already surfaced a Steam Guard
                        // prompt, treat sustained silence as a blocked code prompt.
                        if seen_login_attempt
                            && !prompted
                            && !got_result
                            && last_activity.elapsed() >= quiet_2fa_threshold
                        {
                            app.emit("auth://require_2fa", &username_clone).ok();
                            prompted = true;
                        }
                        continue;
                    }
                };

                last_activity = Instant::now();
                let lower = line.to_lowercase();
                log::debug!("[auth-verify] {}", line);

                if lower.contains("authentication failed")
                    || lower.contains("failed to authenticate")
                    || lower.contains("invalidpassword")
                    || lower.contains("incorrect password")
                    || lower.contains("invalid password")
                {
                    app.emit("auth://failed", &username_clone).ok();
                    got_result = true;
                    break;
                } else if (lower.contains("enter") && lower.contains("code"))
                    || lower.contains("auth code")
                    || lower.contains("authentication code")
                    || lower.contains("code sent to")
                    || lower.contains("two-factor")
                    || lower.contains("two factor")
                    || lower.contains("2 factor")
                    || lower.contains("authenticator app")
                    || (lower.trim_end().ends_with(':')
                        && (lower.contains("steam guard")
                            || lower.contains("code")
                            || lower.contains("2fa")))
                {
                    // Code entry (email OR authenticator app). Checked BEFORE the
                    // generic "steam guard" confirm branch because these prompts
                    // also contain the words "STEAM GUARD!".
                    app.emit("auth://require_2fa", &username_clone).ok();
                    prompted = true;
                    // Don't break — keep reading for success/failure after 2FA
                } else if lower.contains("confirm your sign in")
                    || lower.contains("confirm the sign in")
                    || lower.contains("use the steam mobile app")
                    || lower.contains("mobile app to confirm")
                    || lower.contains("waiting for confirmation")
                    || lower.contains("waiting for steam guard")
                    || lower.contains("steam guard")
                {
                    // Mobile-app push confirmation (no code to type).
                    app.emit("auth://require_app_confirm", &username_clone).ok();
                    prompted = true;
                    // Don't break — keep reading
                } else if (lower.starts_with("logging") && lower.contains("done!") && lower.contains("steam3"))
                    || lower.contains("got appinfo")
                    || lower.contains("depot 0 not found")
                {
                    app.emit("auth://success", &username_clone).ok();
                    got_result = true;
                    break;
                }

                // Mark that the credential login attempt has begun so the silence
                // watchdog above can start arming the 2FA fallback.
                if lower.contains("logging") && lower.contains("steam3") {
                    seen_login_attempt = true;
                }
            }

            if !got_result {
                // Process exited without producing any recognized status
                app.emit("auth://failed", &username_clone).ok();
            }

            // Cleanup
            if let Ok(mut child_guard) = child_handle.try_lock() {
                if let Some(mut c) = child_guard.take() {
                    let _ = c.kill().await;
                }
            }
            AUTH_HANDLES.lock().remove(&username_clone);
            app.emit("auth://done", &username_clone).ok();
        });
    }

    Ok(())
}

#[command]
pub async fn accounts_submit_2fa(
    username: String,
    code: String,
) -> Result<(), String> {
    let child_opt = AUTH_HANDLES.lock().get(&username).cloned();
    if let Some(child_holder) = child_opt {
        let mut child_guard = child_holder.lock().await;
        if let Some(child) = child_guard.as_mut() {
            if let Some(stdin) = child.stdin.as_mut() {
                use tokio::io::AsyncWriteExt;
                if let Err(e) = stdin.write_all(format!("{}\n", code).as_bytes()).await {
                    return Err(format!("Failed to write to stdin: {}", e));
                }
                let _ = stdin.flush().await;
                return Ok(());
            }
        }
    }
    Err("Auth task not found or stdin unavailable".to_string())
}
