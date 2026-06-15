<div align="center">
  <img src="src/assets/icon.svg" alt="WEave Logo" width="120" height="120">
  
  # WEave
  
  **Modern desktop application for managing Steam Workshop wallpapers for Wallpaper Engine**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-blue)](https://www.microsoft.com/windows)
  
  [Русская версия](README.ru.md)
</div>

---

## 📖 Overview

WEave is a powerful Wallpaper Engine Workshop Manager built with Tauri 2 and React. Discover, download, and manage thousands of wallpapers from Steam Workshop without opening Steam or a web browser.

<div align="center">
  <img src="public/main_window.png" alt="WEave Interface" width="100%">
</div>

---

## ✨ Key Features

<details open>
<summary><b>🌐 Workshop Browser</b></summary>

- Full support for filters and sorting
- Image preview with lazy loading and caching
- Detailed item view with ratings, descriptions, and author info
- Collections and related collections support
- Page preloading for seamless navigation
- Description translation (Google Translate API)

</details>

<details>
<summary><b>📥 Download Management</b></summary>

- Multi-threaded downloads via DepotDownloaderMod
- Multiple Steam account support (6 built-in + custom)
- Real-time progress tracking with cancellation
- Batch download from IDs/URLs
- Queue management with status tracking
- Optional auto-apply after download

</details>

<details>
<summary><b>🖼️ Installed Wallpapers</b></summary>

- View all installed wallpapers from Wallpaper Engine
- Local filtering and sorting
- **Multi-select mode with batch operations** (delete, extract)
- Apply wallpapers to specific monitors
- Active wallpaper detection
- Open folders in Explorer
- Extract .pkg files with RePKG

</details>

<details>
<summary><b>⚙️ Wallpaper Engine Integration</b></summary>

- Auto-detect WE installation
- Apply wallpapers to monitors
- Read current configuration
- Detect active wallpapers across monitors

</details>

<details>
<summary><b>🎨 Customization</b></summary>

- 5 built-in themes
- 10 accent colors
- Multi-language support (English, Russian)

</details>

---

## 🚀 Installation

### For End Users

#### Prerequisites
- **Windows 10/11** (x64)
- **Wallpaper Engine** (installed)
- **.NET Runtime** (auto-downloaded if missing)

#### Steps

1. Download the latest release from [**GitHub Releases**](https://github.com/psyattack/weave-tauri/releases)
2. Extract the archive
3. Run `weave.exe`

> **Note:** WEave will auto-download a portable .NET 9.0.17 runtime if no system .NET 8/9/10 is detected.

---

### For Developers

<details>
<summary><b>Development Setup</b></summary>

#### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (v1.77+)
- [.NET 9 Runtime](https://dotnet.microsoft.com/download/dotnet/9.0)
- Wallpaper Engine

#### Setup

```bash
# Clone repository
git clone https://github.com/psyattack/weave-tauri.git
cd weave-tauri

# Download required tools to plugins/ directory:
# - DepotDownloaderMod: https://github.com/SteamAutoCracks/DepotDownloaderMod/releases
# - RePKG: https://github.com/notscuffed/repkg/releases

# Install dependencies
npm install

# Run in dev mode
npm run tauri dev

# Build for production
npm run tauri build

# Run tests
npm test  # Frontend tests
cd src-tauri && cargo test  # Backend tests
```

</details>

---

## 📚 Usage

1. **Launch WEave** and accept the legal agreement (first run)
2. **Configure** Wallpaper Engine path in Settings (auto-detected)
3. **Select** a Steam account for downloads (if the current one doesn't work)
4. **Browse** Workshop tab to discover wallpapers
5. **Install** wallpapers with one click
6. **Manage** installed wallpapers in the Installed tab
7. **Apply** wallpapers to your monitors

---

## 🛠️ Tech Stack

<table>
<tr>
<td width="50%">

### Frontend
- **React 18** + TypeScript
- **Tauri 2** (Desktop framework)
- **Vite** (Build tool)
- **TailwindCSS** (Styling)
- **Framer Motion** (Animations)
- **Radix UI** (Components)
- **Zustand** (State management)
- **Type-safe i18n** (Custom system)
- **Lucide React** (Icons)
- **Vitest** (Testing)

</td>
<td width="50%">

### Backend
- **Rust** (Tauri backend)
- **Tokio** (Async runtime)
- **Reqwest** (HTTP client)
- **Scraper** (HTML parsing)
- **AES-GCM + PBKDF2** (Encryption)
- **Serde** (Serialization)
- **Tracing** (Logging)

</td>
</tr>
</table>

---

## 📂 Project Structure

<details>
<summary><b>View Structure</b></summary>

```
WEave/
├── src/                              # React frontend
│   ├── components/
│   │   ├── common/                   # Reusable UI (Dialog, Drawer, Tooltip, etc.)
│   │   ├── dialogs/                  # Modal dialogs (Settings, Legal, Update, etc.)
│   │   ├── installed/                # Installed wallpapers components
│   │   ├── layout/                   # TitleBar, Sidebar, TopBar
│   │   ├── settings/                 # Settings dialog sections
│   │   ├── tasks/                    # Download/extract task drawer
│   │   ├── views/                    # Main views (Workshop, Collections, Installed)
│   │   └── workshop/                 # Workshop components (Cards, Filters, Details)
│   ├── stores/                       # Zustand state stores
│   ├── hooks/                        # React hooks (useBootstrap, useTheme, etc.)
│   ├── lib/                          # Utilities (errors, logger, helpers)
│   ├── i18n/                         # Type-safe i18n system
│   ├── types/                        # TypeScript definitions
│   └── assets/                       # Static assets
│
├── src-tauri/                        # Rust backend
│   ├── src/
│   │   ├── commands/                 # Tauri command handlers
│   │   │   ├── accounts.rs           # Account management
│   │   │   ├── download.rs           # Download orchestration
│   │   │   ├── extract.rs            # Package extraction
│   │   │   ├── steam.rs              # Steam login/cookies
│   │   │   ├── dotnet.rs             # .NET runtime management
│   │   │   ├── logging.rs            # Logging integration
│   │   │   └── ...
│   │   ├── workshop/                 # Steam Workshop parser
│   │   ├── accounts/                 # Encrypted account storage
│   │   ├── config/                   # Configuration management
│   │   ├── download/                 # Download manager (DepotDownloader wrapper)
│   │   ├── extract/                  # Extract manager (RePKG wrapper)
│   │   ├── dotnet_runtime/           # .NET runtime downloader
│   │   ├── we_client/                # Wallpaper Engine client
│   │   ├── metadata/                 # Metadata batch initializer
│   │   ├── logger.rs                 # Rotating file logger
│   │   ├── errors.rs                 # Structured error types
│   │   └── ...
│   └── locales/                      # Backend translations
│
└── plugins/                          # External tools (gitignored)
    ├── DepotDownloaderMod/           # Steam depot downloader (.NET)
    ├── RePKG/                        # WE package extractor
    └── dotnet/                       # Portable .NET runtime (auto-downloaded)
```

</details>

---

## 📝 Configuration

Configuration files are stored in:  
**`%LOCALAPPDATA%\com.weave.app\`**

| File | Description |
|------|-------------|
| `settings.json` | App settings (theme, language, WE directory, etc.) |
| `metadata.json` | Cached wallpaper metadata |
| `user_accounts.enc` | Encrypted Steam accounts |
| `SteamWebView/` | WebView2 data (persisted cookies) |
| `weave.log` | Rotating log file (10MB, 5 files retention) |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙏 Credits

- **Built with:** [Tauri](https://tauri.app/), [React](https://react.dev/)
- **Icons:** [Lucide](https://lucide.dev/)
- **UI Components:** [Radix UI](https://www.radix-ui.com/)
- **Download Tool:** [DepotDownloaderMod](https://github.com/SteamAutoCracks/DepotDownloaderMod)
- **Package Extractor:** [RePKG](https://github.com/notscuffed/repkg)

---

## ⚠️ Disclaimer

This application is **not affiliated with or endorsed by** Valve Corporation or Wallpaper Engine. Steam and Wallpaper Engine are trademarks of their respective owners.

---

## 💬 Support

For issues, questions, or feature requests, please open an issue on [**GitHub**](https://github.com/psyattack/weave-tauri/issues).

---