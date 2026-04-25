from pathlib import Path
from typing import Any, Optional

from infrastructure.persistence.app_settings_repository import AppSettingsRepository
from infrastructure.persistence.metadata_repository import MetadataRepository
from infrastructure.persistence.backgrounds_repository import BackgroundsRepository
from shared.filesystem import get_app_data_dir


class ConfigService:
    """
    Central configuration service for application settings, metadata, and backgrounds.
    
    Manages three separate repositories:
    - App settings (user preferences, system config)
    - Wallpaper metadata (cached workshop data)
    - Background images (UI customization)
    """
    
    def __init__(self, base_path: Path | None = None):
        if base_path is None:
            base_path = get_app_data_dir()
        
        self.app_settings_repo = AppSettingsRepository(base_path / "app_settings.json")
        self.metadata_repo = MetadataRepository(base_path / "metadata.json")
        self.backgrounds_repo = BackgroundsRepository(base_path / "backgrounds.json")
        
        self.app_settings = self.app_settings_repo.load()
        self.backgrounds = self.backgrounds_repo.load()

    def reload(self) -> None:
        """Reload all settings from disk."""
        self.app_settings = self.app_settings_repo.load()
        self.backgrounds = self.backgrounds_repo.load()

    def save(self) -> bool:
        """Save all settings to disk."""
        return self.app_settings_repo.save(self.app_settings) and \
               self.backgrounds_repo.save(self.backgrounds)

    def get(self, key: str, default: Any = None) -> Any:
        """
        Get setting value by dot-notation key.
        
        Example: get("settings.general.appearance.theme")
        """
        value = self.app_settings
        for part in key.split("."):
            if not isinstance(value, dict):
                return default
            value = value.get(part)
            if value is None:
                return default
        return value

    def set(self, key: str, value: Any) -> None:
        """
        Set setting value by dot-notation key.
        
        Creates nested dictionaries as needed.
        """
        parts = key.split(".")
        current = self.app_settings
        for part in parts[:-1]:
            existing = current.get(part)
            if not isinstance(existing, dict):
                current[part] = {}
            current = current[part]
        current[parts[-1]] = value
        self.save()

    def remove(self, key: str) -> None:
        """Remove setting by dot-notation key."""
        parts = key.split(".")
        current = self.app_settings
        for part in parts[:-1]:
            if not isinstance(current, dict):
                return
            current = current.get(part)
            if current is None:
                return
        if isinstance(current, dict) and parts[-1] in current:
            del current[parts[-1]]
            self.save()

    # Wallpaper Engine directory
    def get_directory(self) -> str:
        return self.get("settings.system.directory", "")

    def set_directory(self, path: str) -> None:
        self.set("settings.system.directory", path)

    # Account settings
    def get_account_number(self) -> int:
        return self.get("settings.account.account.account_number", 3)

    def set_account_number(self, number: int) -> None:
        self.set("settings.account.account.account_number", number)

    # Appearance settings
    def get_language(self) -> str:
        return self.get("settings.general.appearance.language", "en")

    def set_language(self, language: str) -> None:
        self.set("settings.general.appearance.language", language)

    def get_theme(self) -> str:
        return self.get("settings.general.appearance.theme", "dark")

    def set_theme(self, theme: str) -> None:
        self.set("settings.general.appearance.theme", theme)

    def get_show_id_section(self) -> bool:
        return self.get("settings.general.appearance.show_id_section", True)

    def set_show_id_section(self, value: bool) -> None:
        self.set("settings.general.appearance.show_id_section", value)

    def get_alternative_tag_display(self) -> bool:
        return self.get("settings.general.appearance.alternative_tag_display", False)

    def set_alternative_tag_display(self, value: bool) -> None:
        self.set("settings.general.appearance.alternative_tag_display", value)

    # Behavior settings
    def get_minimize_on_apply(self) -> bool:
        return self.get("settings.general.behavior.minimize_on_apply", False)

    def set_minimize_on_apply(self, value: bool) -> None:
        self.set("settings.general.behavior.minimize_on_apply", value)

    def get_preload_next_page(self) -> bool:
        return self.get("settings.general.behavior.preload_next_page", True)

    def set_preload_next_page(self, value: bool) -> None:
        self.set("settings.general.behavior.preload_next_page", value)

    def get_auto_check_updates(self) -> bool:
        return self.get("settings.general.behavior.auto_check_updates", True)

    def set_auto_check_updates(self, value: bool) -> None:
        self.set("settings.general.behavior.auto_check_updates", value)

    def get_skip_version(self) -> str:
        return self.get("settings.general.behavior.skip_version", "")

    def set_skip_version(self, value: str) -> None:
        self.set("settings.general.behavior.skip_version", value)

    def get_save_window_state(self) -> bool:
        return self.get("settings.general.behavior.save_window_state", True)

    def set_save_window_state(self, value: bool) -> None:
        self.set("settings.general.behavior.save_window_state", value)

    def get_window_geometry(self) -> dict:
        return self.get(
            "settings.general.behavior.window_geometry",
            {
                "x": -1,
                "y": -1,
                "width": 1200,
                "height": 730,
                "is_maximized": False,
            },
        )

    def set_window_geometry(self, x: int, y: int, width: int, height: int, is_maximized: bool) -> None:
        self.set(
            "settings.general.behavior.window_geometry",
            {
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "is_maximized": is_maximized,
            },
        )

    def get_auto_init_metadata(self) -> bool:
        return self.get("settings.general.behavior.auto_init_metadata", False)

    def set_auto_init_metadata(self, value: bool) -> None:
        self.set("settings.general.behavior.auto_init_metadata", value)

    def get_auto_apply_last_downloaded(self) -> bool:
        return self.get("settings.general.behavior.auto_apply_last_downloaded", False)

    def set_auto_apply_last_downloaded(self, value: bool) -> None:
        self.set("settings.general.behavior.auto_apply_last_downloaded", value)

    # Debug settings
    def get_debug_mode(self) -> bool:
        return self.get("settings.advanced.debug.debug_mode", False)

    def set_debug_mode(self, value: bool) -> None:
        self.set("settings.advanced.debug.debug_mode", value)

    # Wallpaper metadata management
    def get_wallpaper_metadata(self, pubfileid: str) -> Optional[dict]:
        return self.metadata_repo.get(pubfileid)

    def get_all_wallpaper_metadata(self) -> dict[str, dict]:
        return self.metadata_repo.get_all()

    def set_wallpaper_metadata(self, pubfileid: str, data: dict) -> None:
        self.metadata_repo.set(pubfileid, data)

    def remove_wallpaper_metadata(self, pubfileid: str) -> None:
        self.metadata_repo.remove(pubfileid)

    # Background image settings
    def get_background_image(self, area: str) -> str:
        return self.backgrounds.get(area, {}).get("image", "")

    def set_background_image(self, area: str, b64: str) -> None:
        if area not in self.backgrounds:
            self.backgrounds[area] = {"image": "", "blur": 0, "opacity": 100}
        self.backgrounds[area]["image"] = b64
        self.backgrounds_repo.save(self.backgrounds)

    def get_background_blur(self, area: str) -> int:
        return self.backgrounds.get(area, {}).get("blur", 0)

    def set_background_blur(self, area: str, v: int) -> None:
        if area not in self.backgrounds:
            self.backgrounds[area] = {"image": "", "blur": 0, "opacity": 100}
        self.backgrounds[area]["blur"] = v
        self.backgrounds_repo.save(self.backgrounds)

    def get_background_opacity(self, area: str) -> int:
        return self.backgrounds.get(area, {}).get("opacity", 100)

    def set_background_opacity(self, area: str, v: int) -> None:
        if area not in self.backgrounds:
            self.backgrounds[area] = {"image": "", "blur": 0, "opacity": 100}
        self.backgrounds[area]["opacity"] = v
        self.backgrounds_repo.save(self.backgrounds)

    def get_background_extend_titlebar(self) -> bool:
        return self.backgrounds.get("extend_to_titlebar", False)

    def set_background_extend_titlebar(self, v: bool) -> None:
        self.backgrounds["extend_to_titlebar"] = v
        self.backgrounds_repo.save(self.backgrounds)