<div align="center">
  <img src="src/assets/icon.svg" alt="WEave Logo" width="120" height="120">
  
  # WEave
  
  **Modern desktop application for managing Steam Workshop wallpapers for Wallpaper Engine**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D6?logo=windows&logoColor=white)](https://www.microsoft.com/windows)
  [![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
  [![Rust](https://img.shields.io/badge/Rust-%3E%3D1.77-black?logo=rust&logoColor=white)](https://www.rust-lang.org)
  [![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=black)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-v6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
  [![Vite](https://img.shields.io/badge/Vite-v8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
  [![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
  
  [Русская версия](README.ru.md)
</div>

---

## 📖 Overview

WEave is a powerful Wallpaper Engine Workshop Manager built with Tauri 2 and React. Discover, download, and manage thousands of wallpapers from Steam Workshop without opening Steam or a web browser.

https://github.com/user-attachments/assets/45bf371d-6b76-4ecc-93d5-9bc8d95c467a

<div align="center">
  <img src="https://github.com/user-attachments/assets/084d0710-4fb4-492c-a2eb-b9e1941a89bf" width="49%"> <img src="https://github.com/user-attachments/assets/5cd7ba5b-bb4e-4a87-be55-b4b74143cf94" width="49%">
  <img src="https://github.com/user-attachments/assets/21eb0771-b350-47e0-8057-ccbcc774c83f" width="49%"> <img src="https://github.com/user-attachments/assets/1042d7d8-8f5b-4c7a-9097-2d0d7319876f" width="49%">
</div>

---

## ✨ Key Features

<details open>
<summary><b>🌐 Workshop Browser</b></summary>

- Full support for filters and sorting
- View detailed information about the wallpaper
- Collections and related collections support
- Page preloading for seamless navigation
- Description translation (Google Translate API)

</details>

<details>
<summary><b>📥 Download Management</b></summary>

- Multi-threaded downloads via DepotDownloaderMod
- Multiple Steam account support (3 built-in + custom)
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
- Open folders in Explorer
- Extract .pkg files with RePKG
- **Interactive Preset & Property Settings**: Customize wallpaper properties (playback rate, alignment, volume, audio responsiveness, colors, brightness, contrast, saturation, hue, post-processing filters, and custom project-defined properties)
- **Live Preview & Persistence**: Apply adjustments live to the active wallpaper. Use "Fixate Changes" to write the settings directly into `project.json` (auto-backups created) or "Restore Defaults" to reset all settings

</details>

<details>
<summary><b>⚙️ Wallpaper Engine Integration & Control</b></summary>

- Auto-detect WE installation
- Apply wallpapers
- Read current configuration
- Detect active wallpapers
- **Integrated Media Control Center**: Animated control bar to play, pause, stop, switch next/previous wallpapers, mute/unmute, and toggle desktop icons visibility (show/hide)
- **Playlist & Profile Loader**: Quickly load Wallpaper Engine playlists or profiles by name from the control bar

</details>

<details>
<summary><b>🎨 Customization</b></summary>

- 6 built-in themes
- 10 accent colors
- Multi-language support (English, Russian)
- Auto-detect system language on first launch
- Global hotkey system with customizable bindings

</details>

---

## 🚀 Installation

### For End Users

#### Prerequisites
- **Windows 10/11** (x64)
- **Wallpaper Engine** (installed)
- **.NET Runtime 8/9/10** (auto-downloaded if missing)

#### Steps

1. Download the latest release from [**GitHub Releases**](https://github.com/psyattack/weave/releases):
   - **Installer (`.exe`):** Run the installer and follow the instructions.
   - **Portable version (`.zip`):** Extract the archive to any convenient location on your disk and run `WEave.exe`.

> [!NOTE]
> When you first log in, WEave will automatically download additional tools and the portable version of .NET Runtime 9.0.17 if .NET Runtime/SDK 8/9/10 is not detected on your system.

---

### For Developers

<details>
<summary><b>Development Setup</b></summary>

#### Prerequisites
- **Node.js** (v20+)
- **Rust** (v1.77+)
- **.NET Runtime/SDK 8/9/10**
- **Wallpaper Engine**

#### Setup & Other options

```bash
# Clone repository
git clone https://github.com/psyattack/WEave.git
cd WEave

# Install dependencies
npm install

# Run in dev mode
npm run tauri dev

# Build for production
npm run tauri build

# Run tests
npm run test  # Frontend tests
cd src-tauri && cargo test  # Backend tests

# Checks backend (personal recommendation)
cargo check
cargo machete
cargo clippy -- -W dead_code
cargo +nightly udeps

# Checks frontend (personal recommendation)
npx knip
npm run typecheck
npm run lint

# Bump version
npm run bump -- <semver>
```

</details>

---

## 🛠️ Tech Stack

<table>
<tr>
<td width="50%">

### Frontend
- **React 19** + TypeScript
- **Tauri 2** (Desktop framework)
- **Vite** (Build tool)
- **TailwindCSS v4** (Styling)
- **Framer Motion** (Animations with reduced motion support)
- **Radix UI** (Components)
- **Zustand** (State management)
- **Type-safe i18n** (Custom system)
- **Lucide React** (Icons)
- **Vitest** (Unit, Integration, and E2E testing with custom Tauri mock setup)

</td>
<td width="50%">

### Backend
- **Rust** (Tauri backend)
- **Tokio** (Async runtime)
- **Reqwest** (HTTP client)
- **Scraper** (HTML parsing)
- **zip + unrar** (Archive extraction)
- **AES-GCM + PBKDF2** (Encryption)
- **Serde** (Serialization)
- **dirs** (Platform directories)
- **log + env_logger** (Logging)

</td>
</tr>
</table>

---

## 📂 Project Structure

<details>
<summary><b>View structure</b></summary>

```
WEave/
├── src/                              # React frontend
│   ├── assets/                       # Static assets (logos, icons)
│   ├── components/                   # React components
│   │   ├── common/                   # Reusable UI components (Select, ToastStack, SetupOverlay, etc.)
│   │   │   ├── DetailsPanel.tsx      # Main wallpaper details panel
│   │   │   └── details/              # Details panel sub-components (Actions, MetaGrid, Sidebar, Presets)
│   │   ├── dialogs/                  # Modals & Dialogs (Legal, Update, Login/2FA, MultiDownload, etc.)
│   │   ├── installed/                # Installed wallpapers components (Grid, SelectionBar, Toolbar, WallpaperCard)
│   │   ├── layout/                   # App layout components (Sidebar, TitleBar, TopBar)
│   │   ├── settings/                 # Settings components (General, Accounts, Hotkeys, SettingsDialog)
│   │   ├── tasks/                    # Task drawer component (TasksDrawer)
│   │   ├── views/                    # Views/screens (Workshop, Collections, Installed, Author)
│   │   └── workshop/                 # Workshop components (Card, FilterBar, Pagination)
│   ├── e2e/                          # UI & integration tests (Vitest + Tauri mock)
│   ├── hooks/                        # React hooks (useWallpaperActions, useTheme, useBootstrap, useHotkeys, etc.)
│   ├── i18n/                         # Type-safe i18n system
│   │   └── locales/                  # Translation source files (en.ts, ru.ts)
│   ├── lib/                          # Utility helpers (errors, logger, tauri, tauri-mock, workshop)
│   ├── stores/                       # Zustand stores (app, dotnet, filters, hotkeys/, etc.)
│   └── types/                        # TypeScript types (workshop.ts)
│
└── src-tauri/                        # Rust backend (Tauri)
    ├── capabilities/                 # Tauri v2 permissions & security profiles
    └── src/                          # Backend source code
        ├── commands/                 # Tauri commands (invoked from frontend)
        │   ├── accounts.rs           # Account management commands
        │   ├── download.rs           # Download orchestration commands
        │   ├── extract.rs            # Extraction commands (RePKG)
        │   ├── steam.rs              # Steam login, cookies & webview commands
        │   ├── we.rs                 # Wallpaper Engine commands (install, apply, control)
        │   └── ...                   # Metadata, config, i18n, autoupdate commands, etc.
        ├── config/                   # Configuration management
        │   ├── settings.rs           # User settings service (JSON)
        │   └── metadata.rs           # Metadata caching service
        ├── core/                     # Core app logic
        │   ├── app_state.rs          # Global application state (AppState)
        │   ├── errors.rs             # Structured error types & formatting
        │   ├── logger.rs             # Rotating file logger setup
        │   └── runtime.rs            # Portable .NET runtime manager
        ├── plugins/                  # External utility plugins
        │   ├── plugin_manager.rs     # Plugin download & updates logic
        │   └── plugin_paths.rs       # External binary path resolution
        ├── services/                 # Business logic services
        │   ├── accounts/             # Encrypted Steam account storage service
        │   ├── workshop/             # Steam Workshop scraper, parser & webview handler
        │   ├── download.rs           # Wrapper service for DepotDownloader
        │   ├── extract.rs            # Wrapper service for RePKG extractor
        │   ├── we_client.rs          # Wallpaper Engine API and monitor integration service
        │   └── ...                   # i18n, translator, metadata services, etc.
        ├── lib.rs                    # Tauri context & builder setup
        └── main.rs                   # Executable entry point
```

</details>

---

## 📝 Configuration

Configuration files and plugins are stored in:  
**`%LOCALAPPDATA%\WEave\`**

| File / Directory | Description |
|------|-------------|
| `settings.json` | App settings |
| `metadata.json` | Cached wallpaper metadata |
| `user_accounts.enc` | Encrypted Steam accounts |
| `SteamWebView/` | Steam parser data |
| `EBWebView/` | App data |
| `plugins/` | Auto-downloaded plugins (DepotDownloaderMod, RePKG) |
| `dotnet/` | Portable .NET Runtime 9.0.17 (if needed) |
| `.log` | App log file |

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

For issues, questions, or feature requests, please open an issue on [**GitHub**](https://github.com/psyattack/weave/issues).

---