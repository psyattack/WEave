<div align="center">
  <img src="src/assets/icon.svg" alt="WEave Logo" width="128" height="128">
  
  # WEave
  
  > Modern desktop application for browsing, downloading, and managing Steam Workshop wallpapers for Wallpaper Engine
  
  [Русская версия](README.ru.md)
</div>

## Overview

WEave is a powerful Wallpaper Engine Workshop Manager built with Tauri 2 and React. It provides a seamless experience for discovering, downloading, and managing thousands of wallpapers from the Steam Workshop without opening Steam or a web browser.

## Features

### Workshop Browser
- Browse Steam Workshop wallpapers with advanced search
- Search by keyword, sort by trending/popular/recent with date ranges
- Filter by category, type, age rating, resolution, tags
- Tristate filtering (include/exclude/idle) for all filter types
- Preview images with lazy loading and caching
- View item details, ratings, descriptions, and author info
- Collections and related collections support
- Page preloading for faster navigation
- Description translation support (Google Translate API)

### Download Management
- Multi-threaded download system using DepotDownloaderMod
- Multiple Steam account support (6 built-in + custom accounts)
- Real-time progress tracking with cancellation
- Batch download from IDs/URLs
- Queue management
- Auto-apply downloaded wallpapers (optional)

### Installed Wallpapers
- View all installed wallpapers from Wallpaper Engine
- Local filtering and sorting (date, title, size, type)
- Tag-based filtering with tristate support
- Apply wallpapers to specific monitors
- Delete wallpapers with active wallpaper detection
- Open wallpaper folders in Explorer
- Extract .pkg files

### Wallpaper Engine Integration
- Auto-detect Wallpaper Engine installation
- Apply wallpapers to monitors
- Launch Wallpaper Engine
- Read current wallpaper configuration
- Detect active wallpapers across all monitors

### Collections & Authors
- Browse Steam Workshop collections
- View collection contents and metadata
- Author profiles with items and collections
- Related collections discovery

### Customization
- 5 built-in themes (Dark, Light, Nord, Monokai, Solarized)
- 10 accent colors
- Multi-language support (English, Russian)

### Additional Features
- Steam authentication with cookie persistence
- Encrypted account storage (PBKDF2 + AES-256-GCM)
- Metadata caching for offline access
- Auto-update checker with GitHub releases
- Task management with history and status tracking
- Image caching system with LRU cache
- Single instance enforcement
- Persistent window geometry
- Description translation (Google Translate API)

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tauri 2** - Desktop framework
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **Radix UI** - Accessible components
- **Zustand** - State management
- **i18next** - Internationalization
- **Lucide React** - Icons

### Backend
- **Rust** - Tauri backend
- **Tokio** - Async runtime
- **Reqwest** - HTTP client
- **Scraper** - HTML parsing
- **AES-GCM + PBKDF2** - Encryption
- **Serde** - Serialization

## Platform Support

**Windows Only** - This application is designed exclusively for Windows 10/11 as it requires:
- Wallpaper Engine
- Windows-specific executables
- Windows file system integration

Linux and macOS are not supported.

## Installation

### For End Users

#### Prerequisites
- [.NET 8 Runtime](https://dotnet.microsoft.com/download/dotnet/8.0) or [.NET 9 Runtime](https://dotnet.microsoft.com/download/dotnet/9.0)
- Wallpaper Engine

#### Installation Steps

1. Install .NET 8 or .NET 9 Runtime if not already installed
2. Download the latest release from [GitHub Releases](https://github.com/psyattack/weave-tauri/releases)
3. Extract the archive (includes WEave executable, DepotDownloaderMod, and RePKG)
4. Run `weave.exe`

### For Developers

#### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/) (v1.77 or higher)
- [.NET 8 Runtime](https://dotnet.microsoft.com/download/dotnet/8.0) or [.NET 9 Runtime](https://dotnet.microsoft.com/download/dotnet/9.0)
- Wallpaper Engine

#### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/psyattack/weave-tauri.git
cd weave-tauri
```

2. Download required tools:
   - [DepotDownloaderMod](https://github.com/mmvanheusden/DepotDownloaderMod/releases) - Place in `plugins/` directory
   - [RePKG](https://github.com/notscuffed/repkg/releases) - Place in `plugins/` directory

3. Install dependencies:
```bash
npm install
```

4. Run in development mode:
```bash
npm run tauri dev
```

#### Building

Build the application:
```bash
npm run tauri build
```

The compiled application will be in `src-tauri/target/release/`.

## Usage

1. Launch WEave
2. Configure Wallpaper Engine directory in Settings (auto-detected by default)
3. Select a Steam account for downloads in Settings
4. Browse Workshop tab to discover wallpapers
5. Click Install to download and extract wallpapers
6. View installed wallpapers in the Installed tab
7. Apply wallpapers to your monitors

## Configuration

Configuration files are stored in:  
`%LOCALAPPDATA%\com.weave.app\`

Files include:
- `settings.json` - Application settings (theme, language, WE directory, etc.)
- `metadata.json` - Cached wallpaper metadata
- `user_accounts.enc` - Encrypted custom Steam accounts
- `cookies.json` - Steam authentication cookies  

## Project Structure

```
WEave/
├── src/                         # React frontend
│   ├── components/
│   │   ├── common/              # Reusable UI components (Dialog, Drawer, Tooltip, etc.)
│   │   ├── dialogs/             # Modal dialogs (Settings, MultiDownload, Update, etc.)
│   │   ├── installed/           # Installed wallpapers components
│   │   ├── layout/              # TitleBar, Sidebar, TopBar
│   │   ├── settings/            # Settings dialog sections
│   │   ├── tasks/               # Download/extract task drawer
│   │   ├── views/               # Main views (Workshop, Collections, Installed, Author)
│   │   └── workshop/            # Workshop-specific components (Cards, Filters, Details)
│   ├── stores/                  # Zustand state stores
│   ├── hooks/                   # React hooks (useBootstrap, useTheme, useConfirm)
│   ├── lib/                     # Utilities and helpers
│   ├── locales/                 # Frontend translations (en.json, ru.json)
│   ├── types/                   # TypeScript type definitions
│   └── assets/                  # Static assets
│
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── commands/          # Tauri command handlers
│   │   │   ├── accounts.rs    # Account management
│   │   │   ├── download.rs    # Download orchestration
│   │   │   ├── extract.rs     # Package extraction
│   │   │   ├── steam.rs       # Steam login/cookies
│   │   │   ├── translator.rs  # Description translation
│   │   │   ├── updater.rs     # Update checker
│   │   │   ├── we.rs          # Wallpaper Engine integration
│   │   │   └── workshop.rs    # Workshop browsing
│   │   ├── workshop/          # Steam Workshop scraper
│   │   ├── accounts/          # Account management with encryption
│   │   ├── config/            # Configuration management
│   │   ├── download/          # Download manager (DepotDownloaderMod wrapper)
│   │   ├── extract/           # Extract manager (RePKG wrapper)
│   │   ├── we_client/         # Wallpaper Engine client
│   │   ├── i18n/              # Backend translations
│   │   ├── metadata/          # Metadata batch initializer
│   │   ├── translator/        # Google Translate integration
│   │   └── updater/           # GitHub release checker
│   ├── locales/               # Backend translations (en.json, ru.json)
│   ├── icons/                 # App icon
│   └── capabilities/          # Tauri permissions
│
└── plugins/                   # External tools (gitignored)
    ├── DepotDownloaderMod/    # Steam depot downloader (.NET)
    └── RePKG/                 # Wallpaper Engine package extractor
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.

## Credits

- **Built with**: [Tauri](https://tauri.app/), [React](https://react.dev/), [Rust](https://www.rust-lang.org/)
- **Icons**: [Lucide](https://lucide.dev/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Download Tool**: [DepotDownloaderMod](https://gitlab.com/steamautocracks/DepotDownloaderMod)
- **Package Extractor**: [RePKG](https://github.com/notscuffed/repkg)

## Disclaimer

This application is not affiliated with or endorsed by Valve Corporation or Wallpaper Engine. Steam and Wallpaper Engine are trademarks of their respective owners.

## Support

For issues, questions, or feature requests, please open an issue on [GitHub](https://github.com/psyattack/weave-tauri/issues).

---
