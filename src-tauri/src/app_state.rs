use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use parking_lot::RwLock;
use tauri::AppHandle;

use parking_lot::Mutex;

use crate::accounts::AccountManager;
use crate::config::{MetadataService, SettingsService};
use crate::download::DownloadManager;
use crate::extract::ExtractManager;
use crate::i18n::I18nService;
use crate::we_client::WallpaperEngineClient;
use crate::workshop::webview::SteamWebview;
use crate::workshop::WorkshopClient;

pub struct AppState {
    pub app_handle: AppHandle,
    pub app_data_dir: PathBuf,
    pub settings: Arc<RwLock<SettingsService>>,
    pub metadata: Arc<RwLock<MetadataService>>,
    pub i18n: Arc<RwLock<I18nService>>,
    pub accounts: Arc<AccountManager>,
    /// Tracks the most recently completed download so the
    /// `auto_apply_last_downloaded` behavior can pick it up.
    pub last_downloaded: Arc<Mutex<Option<String>>>,
    pub we_client: Arc<RwLock<WallpaperEngineClient>>,
    pub workshop: Arc<WorkshopClient>,
    pub downloads: Arc<DownloadManager>,
    pub extracts: Arc<ExtractManager>,
    pub steam_webview: Arc<SteamWebview>,
    /// Path to portable .NET Runtime directory (if needed).
    /// None means use system .NET installation.
    pub dotnet_root: Arc<Mutex<Option<PathBuf>>>,
    /// Flag to ensure .NET Runtime check runs only once
    dotnet_initialized: Arc<AtomicBool>,
}

impl AppState {
    pub fn initialize(app_handle: AppHandle) -> anyhow::Result<Self> {
        log::info!("Initializing AppState");
        let app_data_dir = resolve_app_data_dir();
        log::info!("App data directory: {}", app_data_dir.display());
        std::fs::create_dir_all(&app_data_dir).ok();

        let settings_path = app_data_dir.join("settings.json");
        let settings = SettingsService::load(&settings_path)?;

        let metadata_path = app_data_dir.join("metadata.json");
        let metadata = MetadataService::load(&metadata_path)?;

        log::debug!("Initializing i18n service");
        let i18n = I18nService::new();

        log::debug!("Loading account manager");
        let accounts = AccountManager::from_runtime(&app_data_dir);

        // Resolve the WE install directory: prefer whatever the user has
        // saved, otherwise auto-detect (Steam library scan + registry).
        // The detected path is persisted so we don't have to re-detect on
        // every launch.
        let mut we_dir: Option<PathBuf> = settings.get_directory().map(PathBuf::from);
        if we_dir.as_ref().map(|p| !p.exists()).unwrap_or(true) {
            log::info!("Detecting Wallpaper Engine installation");
            if let Some(detected) = WallpaperEngineClient::detect_installation() {
                log::info!("Wallpaper Engine detected at: {}", detected.display());
                settings.set_directory(&detected.to_string_lossy());
                we_dir = Some(detected);
            } else {
                log::warn!("Wallpaper Engine installation not found");
            }
        } else {
            log::info!("Using configured Wallpaper Engine directory: {:?}", we_dir);
        }
        let we_client = WallpaperEngineClient::new(we_dir);

        let steam_webview_dir = app_data_dir.join("SteamWebView");
        log::debug!("Initializing Workshop client");
        let workshop = Arc::new(WorkshopClient::new(steam_webview_dir.clone()));

        log::debug!("Initializing download and extract managers");
        let downloads = DownloadManager::new(app_handle.clone());
        let extracts = ExtractManager::new(app_handle.clone());

        log::debug!("Initializing Steam WebView");
        let steam_webview =
            SteamWebview::new(app_handle.clone(), steam_webview_dir, workshop.cookie_jar());

        log::info!("AppState initialized successfully");
        Ok(Self {
            app_handle,
            app_data_dir,
            settings: Arc::new(RwLock::new(settings)),
            metadata: Arc::new(RwLock::new(metadata)),
            i18n: Arc::new(RwLock::new(i18n)),
            accounts: Arc::new(accounts),
            last_downloaded: Arc::new(Mutex::new(None)),
            we_client: Arc::new(RwLock::new(we_client)),
            workshop,
            downloads: Arc::new(downloads),
            extracts: Arc::new(extracts),
            steam_webview: Arc::new(steam_webview),
            dotnet_root: Arc::new(Mutex::new(None)),
            dotnet_initialized: Arc::new(AtomicBool::new(false)),
        })
    }

    /// Sync cookies from WebView2 storage into reqwest jar on startup.
    /// This ensures the Workshop client has authentication cookies from
    /// previous sessions without needing to wait for an explicit login.
    pub fn init_cookies(&self) {
        log::info!("Initializing cookies from WebView2");
        let steam_webview = self.steam_webview.clone();
        let workshop = self.workshop.clone();
        std::thread::spawn(move || {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async move {
                match steam_webview.sync_cookies().await {
                    Ok(n) => {
                        if n > 0 {
                            log::info!("Synced {} cookies from WebView2 on startup", n);
                            workshop.clear_caches();
                        } else {
                            log::debug!("No cookies to sync from WebView2");
                        }
                    }
                    Err(e) => {
                        log::warn!("Failed to sync cookies from WebView2: {}", e);
                    }
                }
            });
        });
    }

    /// Initialize .NET Runtime check in background. Call this after state is created.
    pub fn init_dotnet_runtime(&self) {
        log::info!("Initializing .NET Runtime check");
        let app = self.app_handle.clone();
        let dotnet_root = self.dotnet_root.clone();
        std::thread::spawn(move || {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async move {
                match crate::dotnet_runtime::ensure_dotnet_runtime(&app).await {
                    Ok(path) => {
                        if let Some(ref p) = path {
                            log::info!(".NET Runtime available at: {}", p.display());
                        } else {
                            log::info!("Using system .NET Runtime");
                        }
                        *dotnet_root.lock() = path;
                    }
                    Err(e) => {
                        log::error!("Failed to ensure .NET Runtime: {}", e);
                    }
                }
            });
        });
    }

    /// Initialize .NET Runtime check manually (for frontend-triggered init)
    pub fn init_dotnet_runtime_async(&self) {
        // Check if already initialized to prevent duplicate runs
        if self.dotnet_initialized.swap(true, Ordering::SeqCst) {
            log::debug!("dotnet_init already called, skipping duplicate initialization");
            return;
        }
        self.init_dotnet_runtime();
    }
}

/// Resolve the app's data directory.
///
/// Uses the same identifier as the Tauri app (com.weave.app) to keep
/// all application data (config, cache, WebView2) in one location.
fn resolve_app_data_dir() -> PathBuf {
    // Windows: %LOCALAPPDATA%\com.weave.app
    // macOS:   ~/Library/Application Support/com.weave.app
    // Linux:   $XDG_DATA_HOME/com.weave.app or ~/.local/share/com.weave.app
    if let Some(base) = dirs::data_local_dir() {
        return base.join("com.weave.app");
    }

    if let Some(base) = dirs::data_dir() {
        return base.join("com.weave.app");
    }

    if let Some(home) = dirs::home_dir() {
        return home.join(".weave");
    }

    PathBuf::from("./com.weave.app")
}
