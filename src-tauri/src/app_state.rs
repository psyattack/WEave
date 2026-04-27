use std::path::PathBuf;
use std::sync::Arc;

use parking_lot::RwLock;
use tauri::AppHandle;

use parking_lot::Mutex;

use crate::accounts::AccountManager;
use crate::config::ConfigService;
use crate::download::DownloadManager;
use crate::extract::ExtractManager;
use crate::i18n::I18nService;
use crate::image_cache::ImageCache;
use crate::we_client::WallpaperEngineClient;
use crate::workshop::webview::SteamWebview;
use crate::workshop::WorkshopClient;

pub struct AppState {
    pub app_handle: AppHandle,
    pub app_data_dir: PathBuf,
    pub config: Arc<RwLock<ConfigService>>,
    pub i18n: Arc<RwLock<I18nService>>,
    pub accounts: Arc<AccountManager>,
    /// Tracks the most recently completed download so the
    /// `auto_apply_last_downloaded` behavior can pick it up.
    pub last_downloaded: Arc<Mutex<Option<String>>>,
    pub we_client: Arc<RwLock<WallpaperEngineClient>>,
    pub workshop: Arc<WorkshopClient>,
    pub downloads: Arc<DownloadManager>,
    pub extracts: Arc<ExtractManager>,
    pub image_cache: Arc<ImageCache>,
    pub steam_webview: Arc<SteamWebview>,
}

impl AppState {
    pub fn initialize(app_handle: AppHandle) -> anyhow::Result<Self> {
        let app_data_dir = resolve_app_data_dir();
        std::fs::create_dir_all(&app_data_dir).ok();

        let config_path = app_data_dir.join("config.json");
        let config = ConfigService::load(&config_path)?;

        let language = config.get_language();
        let i18n = I18nService::load(&language);

        let accounts = AccountManager::from_runtime(&app_data_dir);

        // Resolve the WE install directory: prefer whatever the user has
        // saved, otherwise auto-detect (Steam library scan + registry).
        // The detected path is persisted so we don't have to re-detect on
        // every launch.
        let mut we_dir: Option<PathBuf> = config.get_directory().map(PathBuf::from);
        if we_dir
            .as_ref()
            .map(|p| !p.exists())
            .unwrap_or(true)
        {
            if let Some(detected) = WallpaperEngineClient::detect_installation() {
                config.set_directory(&detected.to_string_lossy());
                we_dir = Some(detected);
            }
        }
        let we_client = WallpaperEngineClient::new(we_dir);

        let cookies_dir = app_data_dir.join("cookies");
        let workshop = Arc::new(WorkshopClient::new(cookies_dir.clone()));

        let image_cache = ImageCache::new(app_data_dir.join("image_cache"));

        let downloads = DownloadManager::new(app_handle.clone());
        let extracts = ExtractManager::new(app_handle.clone());

        let webview_data_dir = app_data_dir.join("steam_webview");
        let cookies_file = cookies_dir.join("cookies.json");
        let workshop_for_persist = workshop.clone();
        let persist: crate::workshop::webview::CookiePersistFn = Arc::new(move |cookies| {
            workshop_for_persist.save_cookies(cookies);
        });
        let steam_webview = SteamWebview::new(
            app_handle.clone(),
            webview_data_dir,
            workshop.cookie_jar(),
            cookies_file,
            Some(persist),
        );

        Ok(Self {
            app_handle,
            app_data_dir,
            config: Arc::new(RwLock::new(config)),
            i18n: Arc::new(RwLock::new(i18n)),
            accounts: Arc::new(accounts),
            last_downloaded: Arc::new(Mutex::new(None)),
            we_client: Arc::new(RwLock::new(we_client)),
            workshop,
            downloads: Arc::new(downloads),
            extracts: Arc::new(extracts),
            image_cache: Arc::new(image_cache),
            steam_webview: Arc::new(steam_webview),
        })
    }
}

/// Resolve the app's data directory.
///
/// Mirrors `shared/filesystem.get_app_data_dir()` from the original
/// PyQt6 project — on Windows we use `%LOCALAPPDATA%/WEave`
/// (i.e. `dirs::data_local_dir()`, **not** the Roaming `data_dir()`),
/// so configs/credentials live in the same folder as the legacy app.
fn resolve_app_data_dir() -> PathBuf {
    // Windows: %LOCALAPPDATA%\WEave  (matches the original Python)
    // macOS:   ~/Library/Application Support/WEave
    // Linux:   $XDG_DATA_HOME/WEave or ~/.local/share/WEave
    if let Some(base) = dirs::data_local_dir() {
        return base.join("WEave");
    }

    if let Some(base) = dirs::data_dir() {
        return base.join("WEave");
    }

    if let Some(home) = dirs::home_dir() {
        return home.join(".weave");
    }

    PathBuf::from("./WEave")
}
