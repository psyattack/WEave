//! Download orchestration. Spawns `DepotDownloaderMod.exe` per task, streams
//! stdout/stderr, emits `download://status` events to the frontend, and
//! supports cancellation. Replicates Python `download_service.py` behaviour.

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;

use once_cell::sync::Lazy;
use parking_lot::Mutex;
use regex::Regex;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex as AsyncMutex;

static PROGRESS_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(\d{1,3}(?:[.,]\d+)?)\s*%").expect("progress regex"));

use crate::constants::STEAM_APP_ID;

#[derive(Debug, Clone, Serialize)]
pub struct TaskStatus {
    pub pubfileid: String,
    pub status: String,
    pub account: String,
    pub phase: Phase,
    pub progress: Option<f32>,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    Starting,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize)]
pub struct DownloadCompleted {
    pub pubfileid: String,
    pub success: bool,
}

type ChildHandle = Arc<AsyncMutex<Option<Child>>>;
type HandleMap = HashMap<String, ChildHandle>;

pub struct DownloadManager {
    app: AppHandle,
    tasks: Arc<Mutex<HashMap<String, TaskStatus>>>,
    handles: Arc<Mutex<HandleMap>>,
    cancelled: Arc<Mutex<std::collections::HashSet<String>>>,
}

impl DownloadManager {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            tasks: Arc::new(Mutex::new(HashMap::new())),
            handles: Arc::new(Mutex::new(HashMap::new())),
            cancelled: Arc::new(Mutex::new(std::collections::HashSet::new())),
        }
    }

    pub fn list(&self) -> Vec<TaskStatus> {
        self.tasks.lock().values().cloned().collect()
    }

    pub async fn start(
        &self,
        pubfileid: &str,
        starting_index: usize,
        accounts: Arc<crate::accounts::AccountManager>,
        we_directory: PathBuf,
        plugin_path: PathBuf,
        dotnet_root: Option<PathBuf>,
        infinite_retry: bool,
    ) -> anyhow::Result<()> {
        if self.tasks.lock().contains_key(pubfileid) {
            return Ok(());
        }

        let output_dir = we_directory
            .join("projects")
            .join("myprojects")
            .join(pubfileid);


        let status = TaskStatus {
            pubfileid: pubfileid.into(),
            status: "Starting…".into(),
            account: accounts.credentials(starting_index).username,
            phase: Phase::Starting,
            progress: None,
        };
        self.tasks.lock().insert(pubfileid.into(), status.clone());
        self.emit_status(&status);

        let tasks = self.tasks.clone();
        let handles = self.handles.clone();
        let cancelled = self.cancelled.clone();
        let app = self.app.clone();

        let pubfileid_owned = pubfileid.to_string();
        let output_dir_string = output_dir.to_string_lossy().to_string();
        let plugin_path_owned = plugin_path.clone();

        tokio::spawn(async move {
            let pubfileid = pubfileid_owned;
            let initial_creds = accounts.credentials(starting_index);
            let is_custom = initial_creds.is_custom;
            
            let mut current_index = if is_custom { starting_index } else { 0 };
            let total_accounts = if is_custom { 1 } else { std::cmp::max(1, accounts.builtin_count()) };
            let mut attempt = 0;

            loop {
                let credentials = accounts.credentials(current_index);
                let username = credentials.username.clone();

                let status = TaskStatus {
                    pubfileid: pubfileid.clone(),
                    status: format!("Starting (Account {})...", current_index + 1),
                    account: username.clone(),
                    phase: Phase::Starting,
                    progress: None,
                };
                tasks.lock().insert(pubfileid.clone(), status.clone());
                app.emit("download://status", &status).ok();

                let mut cmd = Command::new(&plugin_path_owned);
                let login_id: u32 = rand::random();
                cmd.args([
                    "-app",
                    STEAM_APP_ID,
                    "-pubfile",
                    &pubfileid,
                    "-verify-all",
                    "-username",
                    &credentials.username,
                    "-password",
                    &credentials.password,
                    "-remember-password",
                    "-loginid",
                    &login_id.to_string(),
                    "-max-downloads",
                    "32",
                    "-dir",
                ])
                .arg(&output_dir_string)
                .stdin(Stdio::piped())
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .kill_on_drop(true);

                if let Some(ref root) = dotnet_root {
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
                        log::error!("Failed to spawn DepotDownloader: {}", e);
                        break;
                    }
                };

                let stdout = child.stdout.take();
                let stderr = child.stderr.take();

                let child_holder = Arc::new(AsyncMutex::new(Some(child)));
                handles
                    .lock()
                    .insert(pubfileid.clone(), child_holder.clone());

                let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(100);

                if let Some(mut out) = stdout {
                    let tx = tx.clone();
                    tokio::spawn(async move {
                        use tokio::io::AsyncReadExt;
                        let mut buf = [0u8; 1024];
                        let mut current_line = String::new();
                        while let Ok(n) = out.read(&mut buf).await {
                            if n == 0 {
                                break;
                            }
                            let chunk = String::from_utf8_lossy(&buf[..n]);
                            for c in chunk.chars() {
                                if c == '\n' {
                                    let line = std::mem::take(&mut current_line);
                                    let trimmed = line.trim_end_matches('\r');
                                    if !trimmed.is_empty() {
                                        let _ = tx.send(format!("OUT:{}", trimmed)).await;
                                    }
                                } else {
                                    current_line.push(c);
                                    let lower = current_line.to_lowercase();
                                    if lower.contains("enter your 2-factor auth code") || lower.contains("auth code sent to your email") {
                                        let line = std::mem::take(&mut current_line);
                                        let _ = tx.send(format!("OUT:{}", line)).await;
                                    }
                                }
                            }
                        }
                        if !current_line.is_empty() {
                            let _ = tx.send(format!("OUT:{}", current_line)).await;
                        }
                    });
                }

                if let Some(err) = stderr {
                    let tx = tx.clone();
                    tokio::spawn(async move {
                        let mut reader = BufReader::new(err).lines();
                        while let Ok(Some(line)) = reader.next_line().await {
                            if !line.trim().is_empty() {
                                let _ = tx.send(format!("ERR:{}", line)).await;
                            }
                        }
                    });
                }
                drop(tx);

                let mut stderr_tail: Vec<String> = Vec::new();
                let mut connection_failed = false;
                let start_time = tokio::time::Instant::now();
                let mut download_started = false;

                loop {
                    let current_timeout = if !download_started {
                        let elapsed = start_time.elapsed();
                        if elapsed >= std::time::Duration::from_secs(15) {
                            log::warn!("15-second timeout reached before download started for {}", pubfileid);
                            connection_failed = true;
                            break;
                        }
                        std::time::Duration::from_secs(15).saturating_sub(elapsed)
                    } else {
                        // Once download starts, there is no inactivity timeout. 
                        // The user can manually cancel large downloads if needed.
                        std::time::Duration::from_secs(86400 * 365)
                    };

                    match tokio::time::timeout(current_timeout, rx.recv()).await {
                        Ok(Some(msg)) => {
                            if let Some(line) = msg.strip_prefix("OUT:") {
                                let cleaned = line
                                    .replace(&format!("{}\\", output_dir_string), ": ")
                                    .replace(&format!("{}/", output_dir_string), ": ");
                                let progress = PROGRESS_RE
                                    .captures(&cleaned)
                                    .and_then(|c| c.get(1))
                                    .and_then(|m| m.as_str().replace(',', ".").parse::<f32>().ok())
                                    .map(|p| p.clamp(0.0, 100.0));
                                
                                if progress.is_some() {
                                    download_started = true;
                                }
                                
                                let lower = cleaned.to_lowercase();
                                if (lower.contains("enter") && lower.contains("code")) || lower.contains("auth code") || lower.contains("2 factor") || lower.contains("authenticator app") {
                                    download_started = true; // prevent timeout
                                    app.emit("download://require_2fa", pubfileid.clone()).ok();
                                } else if lower.contains("waiting for steam guard app confirmation") {
                                    download_started = true; // prevent timeout
                                    app.emit("download://require_app_confirm", pubfileid.clone()).ok();
                                }
                                let status = TaskStatus {
                                    pubfileid: pubfileid.clone(),
                                    status: cleaned,
                                    account: username.clone(),
                                    phase: Phase::Running,
                                    progress,
                                };
                                tasks.lock().insert(pubfileid.clone(), status.clone());
                                app.emit("download://status", &status).ok();
                            } else if let Some(line) = msg.strip_prefix("ERR:") {
                                log::warn!("[DepotDownloader] {line}");
                                if stderr_tail.len() >= 10 {
                                    stderr_tail.remove(0);
                                }
                                stderr_tail.push(line.to_string());
                            }
                        }
                        Ok(None) => break, // EOF
                        Err(_) => {
                            if !download_started {
                                log::warn!("DepotDownloader timed out before starting for {}", pubfileid);
                                connection_failed = true;
                            }
                            break;
                        }
                    }
                }

                let was_cancelled = cancelled.lock().contains(&pubfileid);
                let holder = handles.lock().remove(&pubfileid);
                let mut exit_ok = false;

                if let Some(holder) = holder {
                    let mut guard = holder.lock().await;
                    if let Some(child) = guard.as_mut() {
                        if connection_failed || was_cancelled {
                            let _ = child.kill().await;
                        }
                        if let Ok(status) = child.wait().await {
                            exit_ok = status.success();
                        }
                    }
                }

                if was_cancelled {
                    cancelled.lock().remove(&pubfileid);
                    tasks.lock().remove(&pubfileid);
                    return;
                }

                let output_dir = std::path::Path::new(&output_dir_string);
                let has_output = dir_has_files(output_dir);
                let success = (exit_ok || has_output) && !connection_failed;

                if success {
                    let final_status = TaskStatus {
                        pubfileid: pubfileid.clone(),
                        status: "Completed".to_string(),
                        account: username,
                        phase: Phase::Completed,
                        progress: Some(100.0),
                    };
                    app.emit("download://status", &final_status).ok();
                    app.emit(
                        "download://completed",
                        DownloadCompleted {
                            pubfileid: pubfileid.clone(),
                            success: true,
                        },
                    ).ok();
                    tasks.lock().remove(&pubfileid);
                    return;
                }

                attempt += 1;
                current_index = if is_custom { starting_index } else { (current_index + 1) % total_accounts };

                if attempt >= total_accounts && !infinite_retry {
                    let status_text = if !stderr_tail.is_empty() {
                        format!("Failed: {}", stderr_tail.join(" | "))
                    } else {
                        "Failed".to_string()
                    };
                    let final_status = TaskStatus {
                        pubfileid: pubfileid.clone(),
                        status: status_text,
                        account: username,
                        phase: Phase::Failed,
                        progress: None,
                    };
                    app.emit("download://status", &final_status).ok();
                    app.emit(
                        "download://completed",
                        DownloadCompleted {
                            pubfileid: pubfileid.clone(),
                            success: false,
                        },
                    ).ok();
                    tasks.lock().remove(&pubfileid);
                    return;
                }

                log::warn!("Retrying {} with account index {}...", pubfileid, current_index);
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            }
        });

        Ok(())
    }

    pub async fn submit_2fa(&self, pubfileid: &str, code: &str) -> Result<(), String> {
        let child_opt = self.handles.lock().get(pubfileid).cloned();
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
        Err("Download task not found or stdin unavailable".to_string())
    }

    pub async fn cancel(&self, pubfileid: &str, we_directory: &std::path::Path) -> bool {
        // Mark as cancelled and check if task exists BEFORE removing handle
        self.cancelled.lock().insert(pubfileid.to_string());

        let task_exists = self.tasks.lock().contains_key(pubfileid);

        // Send cancelled status BEFORE removing handle (which allows main thread to finish)
        if task_exists {
            let status = TaskStatus {
                pubfileid: pubfileid.into(),
                status: "Cancelled".into(),
                account: String::new(),
                phase: Phase::Cancelled,
                progress: None,
            };
            self.app.emit("download://status", status).ok();
            self.app
                .emit(
                    "download://completed",
                    DownloadCompleted {
                        pubfileid: pubfileid.into(),
                        success: false,
                    },
                )
                .ok();
        }

        // NOW remove the handle and kill the process
        let holder = self.handles.lock().remove(pubfileid);
        if let Some(holder) = holder {
            let mut guard = holder.lock().await;
            if let Some(child) = guard.as_mut() {
                let _ = child.kill().await;
            }
        }

        let folder = we_directory
            .join("projects")
            .join("myprojects")
            .join(pubfileid);
        if folder.exists() {
            let _ = std::fs::remove_dir_all(&folder);
        }

        task_exists
    }

    fn emit_status(&self, status: &TaskStatus) {
        self.app.emit("download://status", status).ok();
    }
}

/// Returns true if the directory exists and contains at least one regular
/// file. Used to detect "the plugin actually produced output" even when the
/// exit code is misleading.
fn dir_has_files(dir: &std::path::Path) -> bool {
    let Ok(read) = std::fs::read_dir(dir) else {
        return false;
    };
    for entry in read.flatten() {
        if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            return true;
        }
        if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) && dir_has_files(&entry.path()) {
            return true;
        }
    }
    false
}
