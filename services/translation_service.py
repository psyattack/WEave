import json
from pathlib import Path
from typing import Any


class TranslationService:
    """
    Manages application translations and localization.
    
    Loads translation files from localization/ directory and provides
    dot-notation access to translated strings with variable substitution.
    """
    
    SUPPORTED_LANGUAGES = {
        "en": "English",
        "ru": "Русский",
    }

    def __init__(self, language: str = "en"):
        self.current_language = language
        self.translations: dict[str, dict] = {}
        self._load_translations()

    def _load_translations(self) -> None:
        """Load all translation files from localization directory."""
        localization_dir = Path(__file__).resolve().parent.parent / "localization"

        for language_code in self.SUPPORTED_LANGUAGES.keys():
            file_path = localization_dir / f"{language_code}.json"
            if not file_path.exists():
                self.translations[language_code] = {}
                continue

            try:
                with file_path.open("r", encoding="utf-8") as file:
                    self.translations[language_code] = json.load(file)
            except Exception:
                self.translations[language_code] = {}

    def set_language(self, language: str) -> None:
        """Change current language."""
        if language in self.SUPPORTED_LANGUAGES:
            self.current_language = language

    def get_language(self) -> str:
        """Get current language code."""
        return self.current_language

    def get_available_languages(self) -> dict[str, str]:
        """Get dictionary of language codes to display names."""
        return dict(self.SUPPORTED_LANGUAGES)

    def t(self, key: str, **kwargs: Any) -> str:
        """Shorthand for translate()."""
        return self.translate(key, **kwargs)

    def translate(self, key: str, **kwargs: Any) -> str:
        """
        Translate key to current language with variable substitution.
        
        Uses dot-notation for nested keys (e.g., "dialog.settings.title").
        Falls back to English if key not found in current language.
        Supports Python format string substitution with kwargs.
        
        Args:
            key: Translation key in dot notation
            **kwargs: Variables for format string substitution
            
        Returns:
            Translated string or key if translation not found
        """
        translated = self._resolve(self.translations.get(self.current_language, {}), key)

        # Fallback to English
        if translated is None:
            translated = self._resolve(self.translations.get("en", {}), key)

        # Return key if no translation found
        if translated is None:
            return key

        if not isinstance(translated, str):
            return str(translated)

        # Apply variable substitution
        if kwargs:
            try:
                return translated.format(**kwargs)
            except Exception:
                return translated

        return translated

    def _resolve(self, source: dict, key: str):
        """Resolve dot-notation key in nested dictionary."""
        current = source
        for part in key.split("."):
            if not isinstance(current, dict):
                return None
            current = current.get(part)
            if current is None:
                return None
        return current