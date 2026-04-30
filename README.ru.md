<div align="center">
  <img src="src/assets/icon.svg" alt="WEave Logo" width="128" height="128">
  
  # WEave
  
  > Современное десктопное приложение для просмотра, загрузки и управления обоями Steam Workshop для Wallpaper Engine
  
  [English version](README.md)
</div>

## Обзор

WEave — это мощный менеджер Steam Workshop для Wallpaper Engine, созданный на Tauri 2 и React. Приложение предоставляет удобный интерфейс для поиска, загрузки и управления тысячами обоев из Steam Workshop без необходимости открывать Steam или веб-браузер.

<div align="center">
  <img src="public/main_window.png" alt="Превью интерфейса WEave" width="100%">
</div>

## Возможности

### Браузер Workshop
- Просмотр обоев Steam Workshop с расширенным поиском
- Поиск по ключевым словам, сортировка по популярности/новизне с диапазонами дат
- Фильтры по категориям, типам, возрастным рейтингам, разрешениям, тегам
- Трёхстороннее фильтрование (включить/исключить/игнорировать) для всех типов фильтров
- Превью изображений с ленивой загрузкой и кэшированием
- Просмотр деталей, рейтингов, описаний и информации об авторах
- Поддержка коллекций и связанных коллекций
- Предзагрузка страниц для быстрой навигации
- Поддержка перевода описаний (Google Translate API)

### Управление загрузками
- Многопоточная система загрузки через DepotDownloaderMod
- Поддержка нескольких Steam аккаунтов (6 встроенных + пользовательские)
- Отслеживание прогресса в реальном времени с возможностью отмены
- Пакетная загрузка по ID/URL
- Управление очередью
- Автоматическое применение загруженных обоев (опционально)

### Установленные обои
- Просмотр всех установленных обоев из Wallpaper Engine
- Локальная фильтрация и сортировка (дата, название, размер, тип)
- Фильтрация по тегам с трёхсторонней поддержкой
- Применение обоев на конкретные мониторы
- Удаление обоев с определением активных
- Открытие папок обоев в Проводнике
- Извлечение .pkg файлов

### Интеграция с Wallpaper Engine
- Автоопределение установки Wallpaper Engine
- Применение обоев на мониторы
- Запуск Wallpaper Engine
- Чтение текущей конфигурации обоев
- Определение активных обоев на всех мониторах

### Коллекции и авторы
- Просмотр коллекций Steam Workshop
- Просмотр содержимого и метаданных коллекций
- Профили авторов с их работами и коллекциями
- Поиск связанных коллекций

### Персонализация
- 5 встроенных тем (Dark, Light, Nord, Monokai, Solarized)
- 10 акцентных цветов
- Поддержка нескольких языков (английский, русский)

### Дополнительные возможности
- Аутентификация Steam с сохранением cookies
- Шифрованное хранилище аккаунтов (PBKDF2 + AES-256-GCM)
- Кэширование метаданных для офлайн-доступа
- Автопроверка обновлений через GitHub releases
- Управление задачами с историей и отслеживанием статуса
- Система кэширования изображений с LRU кэшем
- Запрет множественных экземпляров
- Сохранение геометрии окна
- Перевод описаний (Google Translate API)

## Технологический стек

### Frontend
- **React 18** с TypeScript
- **Tauri 2** - Десктопный фреймворк
- **Vite** - Сборщик
- **TailwindCSS** - Стилизация
- **Framer Motion** - Анимации
- **Radix UI** - Доступные компоненты
- **Zustand** - Управление состоянием
- **i18next** - Интернационализация
- **Lucide React** - Иконки

### Backend
- **Rust** - Tauri backend
- **Tokio** - Асинхронная среда выполнения
- **Reqwest** - HTTP клиент
- **Scraper** - Парсинг HTML
- **AES-GCM + PBKDF2** - Шифрование
- **Serde** - Сериализация

## Поддержка платформ

**Только Windows** - Это приложение разработано исключительно для Windows 10/11, так как требует:
- Wallpaper Engine
- Windows-специфичные исполняемые файлы
- Интеграция с файловой системой Windows

Linux и macOS не поддерживаются.

## Установка

### Для конечных пользователей

#### Требования
- [.NET 8 Runtime](https://dotnet.microsoft.com/download/dotnet/8.0) или [.NET 9 Runtime](https://dotnet.microsoft.com/download/dotnet/9.0)
- Wallpaper Engine

#### Шаги установки

1. Установите .NET 8 или .NET 9 Runtime, если ещё не установлен
2. Скачайте последний релиз с [GitHub Releases](https://github.com/psyattack/weave-tauri/releases)
3. Распакуйте архив (включает исполняемый файл WEave, DepotDownloaderMod и RePKG)
4. Запустите `weave.exe`

### Для разработчиков

#### Требования
- [Node.js](https://nodejs.org/) (v18 или выше)
- [Rust](https://www.rust-lang.org/) (v1.77 или выше)
- [.NET 8 Runtime](https://dotnet.microsoft.com/download/dotnet/8.0) или [.NET 9 Runtime](https://dotnet.microsoft.com/download/dotnet/9.0)
- Wallpaper Engine

#### Настройка для разработки

1. Клонируйте репозиторий:
```bash
git clone https://github.com/psyattack/weave-tauri.git
cd weave-tauri
```

2. Скачайте необходимые инструменты:
   - [DepotDownloaderMod](https://github.com/mmvanheusden/DepotDownloaderMod/releases) - Поместите в директорию `plugins/`
   - [RePKG](https://github.com/notscuffed/repkg/releases) - Поместите в директорию `plugins/`

3. Установите зависимости:
```bash
npm install
```

4. Запустите в режиме разработки:
```bash
npm run tauri dev
```

#### Сборка

Соберите приложение:
```bash
npm run tauri build
```

Скомпилированное приложение будет в `src-tauri/target/release/`.

## Использование

1. Запустите WEave
2. Настройте путь к Wallpaper Engine в Настройках (определяется автоматически)
3. Выберите Steam аккаунт для загрузок в Настройках
4. Просматривайте вкладку Workshop для поиска обоев
5. Нажмите Install для загрузки и извлечения обоев
6. Просматривайте установленные обои во вкладке Installed
7. Применяйте обои на ваши мониторы

## Конфигурация

Файлы конфигурации хранятся в:  
`%LOCALAPPDATA%\com.weave.app\`

Файлы включают:
- `settings.json` - Настройки приложения (тема, язык, директория WE и др.)
- `metadata.json` - Кэшированные метаданные обоев
- `user_accounts.enc` - Зашифрованные пользовательские Steam аккаунты
- `cookies.json` - Cookies аутентификации Steam

## Структура проекта

```
WEave/
├── src/                         # React frontend
│   ├── components/
│   │   ├── common/              # Переиспользуемые UI компоненты (Dialog, Drawer, Tooltip и др.)
│   │   ├── dialogs/             # Модальные окна (Settings, MultiDownload, Update и др.)
│   │   ├── installed/           # Компоненты установленных обоев
│   │   ├── layout/              # TitleBar, Sidebar, TopBar
│   │   ├── settings/            # Секции диалога настроек
│   │   ├── tasks/               # Панель задач загрузки/извлечения
│   │   ├── views/               # Основные представления (Workshop, Collections, Installed, Author)
│   │   └── workshop/            # Компоненты Workshop (Cards, Filters, Details)
│   ├── stores/                  # Zustand хранилища состояний
│   ├── hooks/                   # React хуки (useBootstrap, useTheme, useConfirm)
│   ├── lib/                     # Утилиты и хелперы
│   ├── locales/                 # Переводы frontend (en.json, ru.json)
│   ├── types/                   # TypeScript определения типов
│   └── assets/                  # Статические ресурсы
│
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── commands/          # Обработчики Tauri команд
│   │   │   ├── accounts.rs    # Управление аккаунтами
│   │   │   ├── download.rs    # Оркестрация загрузок
│   │   │   ├── extract.rs     # Извлечение пакетов
│   │   │   ├── steam.rs       # Steam логин/cookies
│   │   │   ├── translator.rs  # Перевод описаний
│   │   │   ├── updater.rs     # Проверка обновлений
│   │   │   ├── we.rs          # Интеграция с Wallpaper Engine
│   │   │   └── workshop.rs    # Просмотр Workshop
│   │   ├── workshop/          # Парсер Steam Workshop
│   │   ├── accounts/          # Управление аккаунтами с шифрованием
│   │   ├── config/            # Управление конфигурацией
│   │   ├── download/          # Менеджер загрузок (обёртка DepotDownloaderMod)
│   │   ├── extract/           # Менеджер извлечения (обёртка RePKG)
│   │   ├── we_client/         # Клиент Wallpaper Engine
│   │   ├── i18n/              # Переводы backend
│   │   ├── metadata/          # Инициализатор пакетных метаданных
│   │   ├── translator/        # Интеграция Google Translate
│   │   └── updater/           # Проверка релизов GitHub
│   ├── locales/               # Переводы backend (en.json, ru.json)
│   ├── icons/                 # Иконка приложения
│   └── capabilities/          # Разрешения Tauri
│
└── plugins/                   # Внешние инструменты (gitignored)
    ├── DepotDownloaderMod/    # Загрузчик Steam депо (.NET)
    └── RePKG/                 # Распаковщик пакетов Wallpaper Engine
```

## Участие в разработке

Приветствуются любые вклады! Не стесняйтесь отправлять Pull Request.

## Лицензия

Этот проект лицензирован под MIT License.

## Благодарности

- **Создано с помощью**: [Tauri](https://tauri.app/), [React](https://react.dev/), [Rust](https://www.rust-lang.org/)
- **Иконки**: [Lucide](https://lucide.dev/)
- **UI компоненты**: [Radix UI](https://www.radix-ui.com/)
- **Инструмент загрузки**: [DepotDownloaderMod](https://gitlab.com/steamautocracks/DepotDownloaderMod)
- **Распаковщик пакетов**: [RePKG](https://github.com/notscuffed/repkg)

## Отказ от ответственности

Это приложение не связано и не одобрено Valve Corporation или Wallpaper Engine. Steam и Wallpaper Engine являются торговыми марками их соответствующих владельцев.

## Поддержка

По вопросам, проблемам или запросам функций открывайте issue на [GitHub](https://github.com/psyattack/weave-tauri/issues).

---
