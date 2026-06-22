<div align="center">
  <img src="src/assets/icon.svg" alt="WEave Logo" width="120" height="120">
  
  # WEave
  
  **Современное десктопное приложение для управления обоями Steam Workshop для Wallpaper Engine**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Platform](https://img.shields.io/badge/Platform-Windows%2010%2F11-blue)](https://www.microsoft.com/windows)
  
  [English version](README.md)
</div>

---

## 📖 Обзор

WEave — мощный менеджер Wallpaper Engine Workshop, созданный на Tauri 2 и React. Открывайте, загружайте и управляйте тысячами обоев из Steam Workshop без необходимости открывать Steam или браузер.

https://github.com/user-attachments/assets/9d04b5a6-9893-44e4-9b1b-5938c16d4698

---

## ✨ Основные возможности

<details open>
<summary><b>🌐 Браузер Workshop</b></summary>

- Полная поддержка фильтров и сортировки
- Превью изображений с ленивой загрузкой и кэшированием
- Детальный просмотр с рейтингами, описаниями и информацией об авторах
- Поддержка коллекций и связанных коллекций
- Предзагрузка страниц для плавной навигации
- Перевод описаний (Google Translate API)

</details>

<details>
<summary><b>📥 Управление загрузками</b></summary>

- Многопоточная загрузка через DepotDownloaderMod
- Поддержка нескольких Steam аккаунтов
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
- Применение обоев на конкретные мониторы
- Определение активных обоев
- Открытие папок в Проводнике
- Извлечение .pkg файлов с помощью RePKG

</details>

<details>
<summary><b>⚙️ Интеграция с Wallpaper Engine</b></summary>

- Автоопределение установки WE
- Применение обоев на мониторы
- Чтение текущей конфигурации
- Определение активных обоев на всех мониторах

</details>

<details>
<summary><b>🎨 Персонализация</b></summary>

- 4 встроенных тем
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

1. Скачайте последний релиз с [**GitHub Releases**](https://github.com/psyattack/weave/releases)
2. Распакуйте архив в любое удобное место на диске
3. Запустите `WEave.exe`

> **Примечание:** При первом входе WEave автоматически загрузит дополнительные инструменты и портативную версию .NET Runtime 9.0.17, если в системе не обнаружен .NET Runtime/SDK 8/9/10.

---

### Для разработчиков

<details>
<summary><b>Настройка для разработки</b></summary>

#### Требования
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (v1.77+)
- [.NET 9 Runtime](https://dotnet.microsoft.com/download/dotnet/9.0)
- Wallpaper Engine

#### Настройка

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
```

</details>

---

## 📚 Использование

1. **Запустите WEave** и примите лицензионное соглашение (при первом запуске)
2. **Настройте** путь к Wallpaper Engine в Настройках (определяется автоматически)
3. **Выберите** Steam аккаунт для загрузок (если текущий не работает)
4. **Просматривайте** вкладку Workshop для поиска обоев
5. **Устанавливайте** обои одним кликом
6. **Управляйте** установленными обоями во вкладке Installed
7. **Применяйте** обои на ваши мониторы

---

## 🛠️ Технологический стек

<table>
<tr>
<td width="50%">

### Frontend
- **React 18** + TypeScript
- **Tauri 2** (Десктопный фреймворк)
- **Vite** (Сборщик)
- **TailwindCSS** (Стилизация)
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
- **Tracing** (Логирование)

</td>
</tr>
</table>

---

## 📂 Структура проекта

<details>
<summary><b>Просмотр структуры</b></summary>

```
WEave/
├── src/                              # React frontend
│   ├── components/
│   │   ├── common/                   # Переиспользуемые UI (Dialog, Drawer, SetupOverlay и др.)
│   │   │   └── details/              # Подкомпоненты панели подробностей (Кнопки действий, Мета-сетка, Боковая панель)
│   │   ├── dialogs/                  # Модальные окна (Legal, Update и др.)
│   │   ├── installed/                # Компоненты установленных обоев (Сетка, Панель инструментов, Панель выбора, Карточка)
│   │   ├── layout/                   # TitleBar, Sidebar, TopBar
│   │   ├── settings/                 # Вкладки настроек (General, Accounts, Appearance и др.)
│   │   ├── tasks/                    # Панель задач загрузки/извлечения
│   │   ├── views/                    # Основные представления (Workshop, Collections, Installed)
│   │   └── workshop/                 # Компоненты Workshop (Cards, Filters, Details)
│   ├── stores/                       # Zustand хранилища состояний (dotnet, plugins и др.)
│   ├── hooks/                        # React хуки (useBootstrap, useTheme, useWallpaperActions, useDetailsMeta, useConfirm)
│   ├── lib/                          # Утилиты (errors, logger, helpers, tauri-mock)
│   ├── i18n/                         # Типобезопасная система i18n
│   ├── types/                        # TypeScript определения типов
│   ├── e2e/                          # Сквозные (E2E) и интеграционные тесты (доступность, стресс-тесты, сценарии)
│   └── assets/                       # Статические ресурсы
│
├── src-tauri/                        # Rust backend
│   ├── src/
│   │   ├── commands/                 # Обработчики Tauri команд
│   │   │   ├── accounts.rs           # Управление аккаунтами
│   │   │   ├── download.rs           # Оркестрация загрузок
│   │   │   ├── extract.rs            # Извлечение пакетов
│   │   │   ├── steam.rs              # Steam логин/cookies/отображение webview
│   │   │   ├── dotnet.rs             # Управление .NET runtime
│   │   │   ├── plugins.rs            # Инициализация плагинов
│   │   │   ├── logging.rs            # Интеграция логирования
│   │   │   └── ...
│   │   ├── workshop/                 # Парсер Steam Workshop (аватары, отображаемые имена)
│   │   ├── accounts/                 # Шифрованное хранилище аккаунтов
│   │   ├── config/                   # Управление конфигурацией
│   │   ├── download/                 # Менеджер загрузок (обёртка DepotDownloader)
│   │   ├── extract/                  # Менеджер извлечения (обёртка RePKG)
│   │   ├── runtime.rs                # Загрузчик .NET runtime
│   │   ├── plugin_manager.rs         # Автозагрузчик плагинов (GitHub releases)
│   │   ├── plugin_paths.rs           # Разрешение путей к бинарникам плагинов
│   │   ├── we_client/                # Клиент Wallpaper Engine
│   │   ├── metadata/                 # Инициализатор пакетных метаданных
│   │   ├── logger.rs                 # Ротирующий файловый логгер
│   │   ├── errors.rs                 # Структурированные типы ошибок
│   │   └── ...
│   └── locales/                      # Переводы backend
│
└── plugins/                          # Внешние инструменты (автозагрузка)
    ├── depot_downloader_mod/         # Загрузчик Steam депо (.NET)
    ├── repkg/                        # Распаковщик пакетов WE
    └── dotnet/                       # Портативный .NET runtime (автозагрузка)
```

</details>

---

## 📝 Конфигурация

Файлы конфигурации и плагины хранятся в:  
**`%LOCALAPPDATA%\WEave\`**

| Файл / Директория | Описание |
|------|----------|
| `settings.json` | Настройки приложения (тема, язык, директория WE и др.) |
| `metadata.json` | Кэшированные метаданные обоев |
| `user_accounts.enc` | Зашифрованные Steam аккаунты |
| `SteamWebView/` | Данные WebView2 (сохранённые cookies) |
| `plugins/` | Автозагружаемые плагины (DepotDownloaderMod, RePKG) |
| `dotnet/` | Портативный .NET Runtime 9.0.17 (автозагрузка при необходимости) |
| `weave.log` | Ротирующий лог-файл (10MB, 5 файлов) |

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

По вопросам, проблемам или запросам функций открывайте issue на [**GitHub**](https://github.com/psyattack/weave-tauri/issues).

---