<div align="center">
  <img src="src/assets/icon.svg" alt="WEave Logo" width="120" height="120">
  
  # WEave
  
  **Современное десктопное приложение для управления обоями Steam Workshop для Wallpaper Engine**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D6?logo=windows&logoColor=white)](https://www.microsoft.com/windows)
  [![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?logo=tauri&logoColor=white)](https://tauri.app)
  [![Rust](https://img.shields.io/badge/Rust-%3E%3D1.77-black?logo=rust&logoColor=white)](https://www.rust-lang.org)
  [![React](https://img.shields.io/badge/React-v19-61DAFB?logo=react&logoColor=black)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-v6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
  [![Vite](https://img.shields.io/badge/Vite-v8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
  [![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
  
  [English version](README.md)
</div>

---

## 📖 Обзор

WEave — мощный менеджер Wallpaper Engine Workshop, созданный на Tauri 2 и React. Открывайте, загружайте и управляйте тысячами обоев из Steam Workshop без необходимости открывать Steam или браузер.

https://github.com/user-attachments/assets/45bf371d-6b76-4ecc-93d5-9bc8d95c467a

<div align="center">
  <img src="https://github.com/user-attachments/assets/084d0710-4fb4-492c-a2eb-b9e1941a89bf" width="49%"> <img src="https://github.com/user-attachments/assets/5cd7ba5b-bb4e-4a87-be55-b4b74143cf94" width="49%">
  <img src="https://github.com/user-attachments/assets/21eb0771-b350-47e0-8057-ccbcc774c83f" width="49%"> <img src="https://github.com/user-attachments/assets/1042d7d8-8f5b-4c7a-9097-2d0d7319876f" width="49%">
</div>

---

## ✨ Основные возможности

<details open>
<summary><b>🌐 Браузер Workshop</b></summary>

- Полная поддержка фильтров и сортировки
- Детальный просмотр информации об обоях
- Поддержка коллекций и связанных коллекций
- Предзагрузка страниц для плавной навигации
- Перевод описаний (Google Translate API)

</details>

<details>
<summary><b>📥 Управление загрузками</b></summary>

- Многопоточная загрузка через DepotDownloaderMod
- Поддержка нескольких Steam аккаунтов (3 встроенных + свои)
- Отслеживание прогресса в реальном времени с возможностью отмены
- Пакетная загрузка по ID/URL
- Управление очередью с отслеживанием статусов
- Опциональное автоприменение после загрузки

</details>

<details>
<summary><b>🖼️ Установленные обои</b></summary>

- Просмотр всех установленных обоев из Wallpaper Engine
- Локальная фильтрация и сортировка
- **Режим множественного выбора с групповыми операциями** (удаление, извлечение)
- Открытие папок в Проводнике
- Извлечение .pkg файлов с помощью RePKG
- **Интерактивная панель настройки пресетов**: Кастомизация параметров обоев (частота кадров, выравнивание, громкость, аудиореактивность, цвета, яркость, контрастность, насыщенность, оттенок, пост-обработка фильтрами и индивидуальные свойства конкретной сцены)
- **Применение на лету и сохранение**: Все изменения применяются в реальном времени. Функция «Зафиксировать изменения» сохраняет настройки прямо в `project.json` (с автоматическим созданием резервной копии), а «Сбросить по умолчанию» возвращает исходное состояние

</details>

<details>
<summary><b>⚙️ Интеграция и управление Wallpaper Engine</b></summary>

- Автоопределение установки WE
- Применение обоев
- Чтение текущей конфигурации
- Определение активных обоев
- **Интегрированный центр управления медиа**: Анимированная панель управления для запуска, паузы, остановки, переключения обоев (следующие/предыдущие), включения/выключения звука и показа/скрытия ярлыков рабочего стола
- **Загрузчик плейлистов и профилей**: Быстрый импорт и применение плейлистов и профилей Wallpaper Engine по имени прямо из панели управления

</details>

<details>
<summary><b>🎨 Персонализация</b></summary>

- 6 встроенных тем
- 10 акцентных цветов
- Поддержка нескольких языков (английский, русский)
- Автоопределение системного языка при первом запуске
- Система глобальных горячих клавиш с настраиваемыми привязками

</details>

---

## 🚀 Установка

### Для пользователей

#### Требования
- **Windows 10/11** (x64)
- **Wallpaper Engine** (установленный)
- **.NET Runtime 8/9/10** (загружается автоматически при отсутствии)

#### Шаги

1. Скачайте последний релиз с [**GitHub Releases**](https://github.com/psyattack/weave/releases):
   - **Установщик (`.exe`):** Запустите установщик и следуйте инструкциям на экране.
   - **Портативная версия (`.zip`):** Распакуйте архив в любое удобное место на диске и запустите `WEave.exe`.

> [!NOTE]
> При первом входе WEave автоматически загрузит дополнительные инструменты и портативную версию .NET Runtime 9.0.17, если в системе не обнаружен .NET Runtime/SDK 8/9/10.

---

### Для разработчиков

<details>
<summary><b>Настройка для разработки</b></summary>

#### Требования
- **Node.js** (v20+)
- **Rust** (v1.77+)
- **.NET Runtime/SDK 8/9/10**
- **Wallpaper Engine**

#### Настройка & Другие опции

```bash
# Клонировать репозиторий
git clone https://github.com/psyattack/WEave.git
cd WEave

# Установить зависимости
npm install

# Запустить в режиме разработки
npm run tauri dev

# Собрать для продакшена
npm run tauri build

# Запустить тесты
npm run test  # Тесты frontend
cd src-tauri && cargo test  # Тесты backend

# Проверки backend (личная рекомендация)
cargo check
cargo machete
cargo clippy -- -W dead_code
cargo +nightly udeps

# Проверки frontend (личная рекомендация)
npx knip
npm run typecheck
npm run lint

# Сменить версию
npm run bump -- <semver>
```

</details>

---

## 🛠️ Технологический стек

<table>
<tr>
<td width="50%">

### Frontend
- **React 19** + TypeScript
- **Tauri 2** (Десктопный фреймворк)
- **Vite** (Сборщик)
- **TailwindCSS v4** (Стилизация)
- **Framer Motion** (Анимации с поддержкой режима уменьшения движения)
- **Radix UI** (Компоненты)
- **Zustand** (Управление состоянием)
- **Type-safe i18n** (Собственная система)
- **Lucide React** (Иконки)
- **Vitest** (Юнит, интеграционные и сквозные (E2E) тесты с кастомным макетированием Tauri)

</td>
<td width="50%">

### Backend
- **Rust** (Tauri backend)
- **Tokio** (Асинхронная среда)
- **Reqwest** (HTTP клиент)
- **Scraper** (Парсинг HTML)
- **zip + unrar** (Извлечение архивов)
- **AES-GCM + PBKDF2** (Шифрование)
- **Serde** (Сериализация)
- **dirs** (Платформенные директории)
- **log + env_logger** (Логирование)

</td>
</tr>
</table>

---

## 📂 Структура проекта

<details>
<summary><b>Просмотр структуры</b></summary>

```
WEave/
├── src/                              # React фронтенд
│   ├── assets/                       # Статические ресурсы (логотипы, иконки)
│   ├── components/                   # React компоненты
│   │   ├── common/                   # Переиспользуемые UI-компоненты (Select, ToastStack, SetupOverlay и др.)
│   │   │   ├── DetailsPanel.tsx      # Главная панель сведений обоев
│   │   │   └── details/              # Подкомпоненты сведений (Actions, MetaGrid, Sidebar, Presets)
│   │   ├── dialogs/                  # Модальные окна (Legal, Update, Login/2FA, MultiDownload и др.)
│   │   ├── installed/                # Компоненты установленных обоев (Grid, SelectionBar, Toolbar, WallpaperCard)
│   │   ├── layout/                   # Макет приложения (Sidebar, TitleBar, TopBar)
│   │   ├── settings/                 # Настройки (General, Accounts, Hotkeys, SettingsDialog)
│   │   ├── tasks/                    # Панель задач (TasksDrawer)
│   │   ├── views/                    # Экраны/Представления (Workshop, Collections, Installed, Author)
│   │   └── workshop/                 # Компоненты Workshop (Card, FilterBar, Pagination)
│   ├── e2e/                          # Тесты интерфейса и интеграции (Vitest + Tauri mock)
│   ├── hooks/                        # React-хуки (useWallpaperActions, useTheme, useBootstrap, useHotkeys и др.)
│   ├── i18n/                         # Типобезопасная система i18n
│   │   └── locales/                  # Файлы локализации (en.ts, ru.ts)
│   ├── lib/                          # Библиотечные утилиты (errors, logger, tauri, tauri-mock, workshop)
│   ├── stores/                       # Zustand хранилища (app, dotnet, filters, hotkeys/, и др.)
│   └── types/                        # TypeScript типы (workshop.ts)
│
└── src-tauri/                        # Rust бэкенд (Tauri)
    ├── capabilities/                 # Разрешения и безопасность Tauri v2
    └── src/                          # Исходный код бэкенда
        ├── commands/                 # Обработчики команд Tauri (вызываемые с фронтенда)
        │   ├── accounts.rs           # Команды управления аккаунтами
        │   ├── download.rs           # Команды оркестрации загрузок
        │   ├── extract.rs            # Команды извлечения пакетов (RePKG)
        │   ├── steam.rs              # Команды авторизации Steam, cookies и webview
        │   ├── we.rs                 # Команды Wallpaper Engine (установка, применение, управление)
        │   └── ...                   # Команды метаданных, конфигурации, i18n, автообновления и др.
        ├── config/                   # Конфигурация приложения
        │   ├── settings.rs           # Сервис настроек пользователя (JSON)
        │   └── metadata.rs           # Сервис кэширования метаданных
        ├── core/                     # Ядро системы
        │   ├── app_state.rs          # Глобальное состояние (AppState)
        │   ├── errors.rs             # Структурированная обработка ошибок
        │   ├── logger.rs             # Ротируемый файловый логгер
        │   └── runtime.rs            # Управление портативным .NET runtime
        ├── plugins/                  # Плагины и внешние утилиты
        │   ├── plugin_manager.rs     # Загрузка и обновление плагинов
        │   └── plugin_paths.rs       # Поиск исполняемых файлов плагинов
        ├── services/                 # Сервисы бизнес-логики
        │   ├── accounts/             # Шифрованное хранилище данных аккаунтов
        │   ├── workshop/             # Скрапер Steam Workshop, парсер и webview-авторизация
        │   ├── download.rs           # Сервис-обёртка для DepotDownloader
        │   ├── extract.rs            # Сервис-обёртка для экстрактора RePKG
        │   ├── we_client.rs          # Интеграция с API Wallpaper Engine и мониторами
        │   └── ...                   # Сервисы i18n, перевода, метаданных и др.
        ├── lib.rs                    # Инициализация Tauri и настройка сборщика
        └── main.rs                   # Точка входа исполняемого файла
```

</details>

---

## 📝 Конфигурация

Файлы конфигурации и плагины хранятся в:  
**`%LOCALAPPDATA%\WEave\`**

| Файл / Директория | Описание |
|------|----------|
| `settings.json` | Настройки приложения |
| `metadata.json` | Кэшированные метаданные обоев |
| `user_accounts.enc` | Зашифрованные Steam аккаунты |
| `SteamWebView/` | Данные Steam парсера |
| `EBWebView/` | Данные приложения |
| `plugins/` | Автозагружаемые плагины (DepotDownloaderMod, RePKG) |
| `dotnet/` | Портативный .NET Runtime 9.0.17 (если нужен) |
| `.log` | Лог-файл приложения |

---

## 🤝 Участие в разработке

Приветствуются любые вклады! Не стесняйтесь отправлять Pull Request.

---

## 📄 Лицензия

Этот проект лицензирован под [MIT License](LICENSE).

---

## 🙏 Благодарности

- **Создано с помощью:** [Tauri](https://tauri.app/), [React](https://react.dev/)
- **Иконки:** [Lucide](https://lucide.dev/)
- **UI компоненты:** [Radix UI](https://www.radix-ui.com/)
- **Инструмент загрузки:** [DepotDownloaderMod](https://github.com/SteamAutoCracks/DepotDownloaderMod)
- **Распаковщик пакетов:** [RePKG](https://github.com/notscuffed/repkg)

---

## ⚠️ Отказ от ответственности

Это приложение **не связано и не одобрено** Valve Corporation или Wallpaper Engine. Steam и Wallpaper Engine являются торговыми марками их соответствующих владельцев.

---

## 💬 Поддержка

По вопросам, проблемам или запросам функций открывайте issue на [**GitHub**](https://github.com/psyattack/weave/issues).

---