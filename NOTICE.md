# Third-Party Notices & Licenses

This document contains attribution notices and license details for third-party software, tools, and direct dependencies used in **WEave**.

---

## 1. External Tools & Executables

| Component | License | Repository | Role |
| :--- | :--- | :--- | :--- |
| **DepotDownloaderMod** | GNU General Public License v2.0 (GPL-2.0) | [DepotDownloaderMod](https://github.com/SteamAutoCracks/DepotDownloaderMod) | Steam Workshop & Depot downloading tool |
| **RePKG** | MIT License | [RePKG](https://github.com/notscuffed/repkg) | Wallpaper Engine `.pkg` package parser & extractor |

---

## 2. Direct Frontend Dependencies (NPM)

| Package | Version | License | Repository |
| :--- | :--- | :--- | :--- |
| `@radix-ui/react-dialog` | `^1.1.17` | MIT | [https://github.com/radix-ui/primitives](https://github.com/radix-ui/primitives) |
| `@radix-ui/react-dropdown-menu` | `^2.1.18` | MIT | [https://github.com/radix-ui/primitives](https://github.com/radix-ui/primitives) |
| `@radix-ui/react-progress` | `^1.1.10` | MIT | [https://github.com/radix-ui/primitives](https://github.com/radix-ui/primitives) |
| `@radix-ui/react-select` | `^2.3.1` | MIT | [https://github.com/radix-ui/primitives](https://github.com/radix-ui/primitives) |
| `@radix-ui/react-switch` | `^1.3.1` | MIT | [https://github.com/radix-ui/primitives](https://github.com/radix-ui/primitives) |
| `@radix-ui/react-tabs` | `^1.1.15` | MIT | [https://github.com/radix-ui/primitives](https://github.com/radix-ui/primitives) |
| `@radix-ui/react-tooltip` | `^1.2.10` | MIT | [https://github.com/radix-ui/primitives](https://github.com/radix-ui/primitives) |
| `@tauri-apps/api` | `~2.11.1` | MIT / Apache-2.0 | [https://github.com/tauri-apps/tauri](https://github.com/tauri-apps/tauri) |
| `@tauri-apps/plugin-dialog` | `^2.7.1` | MIT / Apache-2.0 | [https://github.com/tauri-apps/plugins-workspace](https://github.com/tauri-apps/plugins-workspace) |
| `@tauri-apps/plugin-opener` | `^2.5.4` | MIT / Apache-2.0 | [https://github.com/tauri-apps/plugins-workspace](https://github.com/tauri-apps/plugins-workspace) |
| `clsx` | `^2.1.1` | MIT | [https://github.com/lukeed/clsx](https://github.com/lukeed/clsx) |
| `framer-motion` | `^12.42.0` | MIT | [https://github.com/motiondivision/motion](https://github.com/motiondivision/motion) |
| `i18next` | `^26.3.3` | MIT | [https://github.com/i18next/i18next](https://github.com/i18next/i18next) |
| `lucide-react` | `^1.21.0` | ISC | [https://github.com/lucide-icons/lucide](https://github.com/lucide-icons/lucide) |
| `react` | `^19.2.7` | MIT | [https://github.com/facebook/react](https://github.com/facebook/react) |
| `react-dom` | `^19.2.7` | MIT | [https://github.com/facebook/react](https://github.com/facebook/react) |
| `react-i18next` | `^17.0.8` | MIT | [https://github.com/i18next/react-i18next](https://github.com/i18next/react-i18next) |
| `tailwind-merge` | `^3.6.0` | MIT | [https://github.com/dcastil/tailwind-merge](https://github.com/dcastil/tailwind-merge) |
| `zustand` | `^5.0.14` | MIT | [https://github.com/pmndrs/zustand](https://github.com/pmndrs/zustand) |

---

## 3. Direct Backend Dependencies (Rust Crates)

| Crate | Version | License | Description |
| :--- | :--- | :--- | :--- |
| `tauri` | `2.11.3` | MIT / Apache-2.0 | Application framework for desktop apps |
| `tauri-plugin-shell` | `2.3.5` | MIT / Apache-2.0 | Process spawning and shell operations |
| `tauri-plugin-dialog` | `2.7.1` | MIT / Apache-2.0 | Native OS file and message dialogs |
| `tauri-plugin-opener` | `2.5.4` | MIT / Apache-2.0 | System URL and file opening plugin |
| `tauri-plugin-os` | `2.3.2` | MIT / Apache-2.0 | Operating system info plugin |
| `tauri-plugin-single-instance` | `2.4.2` | MIT / Apache-2.0 | Single instance lock plugin |
| `serde` / `serde_json` | `1.0` | MIT / Apache-2.0 | Serialization and deserialization framework |
| `tokio` | `1.52` | MIT | Asynchronous runtime |
| `reqwest` | `0.13` | MIT / Apache-2.0 | HTTP Client with TLS and compression |
| `scraper` / `ego-tree` | `0.27` / `0.11` | MIT | HTML parsing and CSS tree querying |
| `url` / `urlencoding` | `2.5` / `2.1` | MIT / Apache-2.0 | URL parsing and percent-encoding |
| `anyhow` / `thiserror` | `1.0` / `2.0` | MIT / Apache-2.0 | Rust error handling and custom error derive |
| `dirs` | `6.0` | MIT / Apache-2.0 | Standard directory path resolution |
| `sysinfo` | `0.39` | MIT | System metrics and process monitoring |
| `chrono` | `0.4` | MIT / Apache-2.0 | Date and time handling |
| `base64` | `0.22` | MIT / Apache-2.0 | Base64 encoding/decoding |
| `sha2` / `aes-gcm` / `pbkdf2` | `0.11` / `0.10` / `0.13` | MIT / Apache-2.0 | Cryptographic primitives and encryption |
| `rand` | `0.10` | MIT / Apache-2.0 | Random number generation |
| `log` / `env_logger` | `0.4` / `0.11` | MIT / Apache-2.0 | Logging facades and environmental loggers |
| `regex` | `1.12` | MIT / Apache-2.0 | Regular expression engine |
| `parking_lot` | `0.12` | MIT / Apache-2.0 | High-performance synchronization primitives |
| `once_cell` | `1.21` | MIT / Apache-2.0 | Single assignment cells and lazy initialization |
| `lru` | `0.18` | MIT | Least-Recently-Used cache datastructure |
| `zip` | `8.6` | MIT | ZIP archive creation and extraction |
| `unrar` | `0.5` | GPL-2.0 | RAR archive extraction bindings |

---

## 4. Open Source License Summaries

### MIT License
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.

### Apache License 2.0
Licensed under the Apache License, Version 2.0. You may obtain a copy of the License at `http://www.apache.org/licenses/LICENSE-2.0`.

### GNU General Public License v2.0 (GPL-2.0)
This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; version 2.
