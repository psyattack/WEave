# Changelog

## [4.12.0](https://github.com/psyattack/WEave/compare/v4.11.1...v4.12.0) - 2026-09-16

### Added
- Advanced search options in the Steam Workshop, including exact match, all-words search, any-word search, and support for Boolean search syntax.
- Filter Workshop items by creation date or last update.
- Dedicated controls in the drop-down menu and on the toolbar to view and clear active filters.
- Advanced filters.
- An option in General Settings to enable or disable the display of the active filters panel.

<details><summary>Detailed Changelog</summary>

### Added
- **workshop:** Add advanced search filters and date range parameters (by @psyattack in 9a5b96d)

### Changed
- **release:** Use short hashes and issue references for commit links in bump script (by @psyattack in b92c958)
- **release:** Add comprehensive technical commit filters to bump script (by @psyattack in e4350ce)

</details>

## [4.11.1](https://github.com/psyattack/WEave/compare/v4.11.0...v4.11.1) - 2026-07-25

### Fixed
- Fixed an issue where selecting an option from a dropdown menu in Settings would unexpectedly close the entire dialog.

<details><summary>Detailed Changelog</summary>

### Changed
- **release:** Switch release workflow to tag-based GitHub releases (by @psyattack in 830e16c)
- **ci:** Integrate semantic-release and refactor bump script (by @psyattack in c4bde98)
- **release:** Extract release notes directly from CHANGELOG.md (by @psyattack in ac0d1ed)

### Fixed
- **settings:** Prevent select dropdown from closing parent dialog (by @psyattack in 62b4c1e)

</details>

## [4.11.0] - 2026-07-24

### Added
- Direct button to download updates and view release notes on GitHub from the update dialog.

### Fixed
- Prevented a brief blank window flash when launching the application.
- Fixed update detection on startup to reliably display the update dialog whenever a new version is available.

### Improved
- Polished UI elements including cleaner dropdown outlines, improved pagination spacing, and simplified hotkey tooltips.
- Updated Legal and Info dialogs to include comprehensive third-party software licensing details.

<details><summary>Detailed Changelog</summary>

### Added
- feat(updater): Improve update dialog, auto-check flow and focus handling ([edc286c](https://github.com/psyattack/WEave/commit/edc286c)) by @psyattack

### Changed
- chore(release): bump version to 4.11.0 ([3ec8041](https://github.com/psyattack/WEave/commit/3ec8041)) by @psyattack
- style(pagination): Improve spacing around page slash separator ([1ca2259](https://github.com/psyattack/WEave/commit/1ca2259)) by @psyattack
- style(ui): Remove focus outline from selects and tooltip from hotkeys ([2fb28dd](https://github.com/psyattack/WEave/commit/2fb28dd)) by @psyattack
- refactor(dialogs): Update Legal and Info dialogs and add NOTICE.md ([73607bc](https://github.com/psyattack/WEave/commit/73607bc)) by @psyattack
- chore: remove knip from repository ([1189551](https://github.com/psyattack/WEave/commit/1189551)) by @psyattack

### Fixed
- fix(window): Prevent blank window flash on app startup ([406ff22](https://github.com/psyattack/WEave/commit/406ff22)) by @psyattack

</details>

## [4.10.3] - 2026-07-23

### Changed
- Filtered `cookie_store` logs from logger output to reduce log noise.
- Updated documentation structure and feature descriptions in README files.

### CI/CD
- Added GitHub Actions workflows for CI and automated releases.

<details><summary>Detailed Changelog</summary>

### Changed
- chore(release): bump version to 4.10.3 ([78219c8](https://github.com/psyattack/WEave/commit/78219c8)) by @psyattack
- ci(release): skip version header in generated release body ([eac2d0a](https://github.com/psyattack/WEave/commit/eac2d0a)) by @psyattack
- chore(release): bump version to 4.10.2 ([bfa471d](https://github.com/psyattack/WEave/commit/bfa471d)) by @psyattack
- ci: add GitHub Actions workflows for CI and release ([ed6ce39](https://github.com/psyattack/WEave/commit/ed6ce39)) by @psyattack
- docs(readme): Update features description and formatting ([9b68fb1](https://github.com/psyattack/WEave/commit/9b68fb1)) by @psyattack
- chore: Update documentation structure and filter cookie store logs ([dde6819](https://github.com/psyattack/WEave/commit/dde6819)) by @psyattack

</details>
