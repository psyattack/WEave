from dataclasses import dataclass, field


@dataclass
class SystemSettings:
    """System-level configuration."""
    directory: str = ""  # Wallpaper Engine installation directory
    account_number: int = 3  # Default account index for downloads


@dataclass
class AppearanceSettings:
    """UI appearance preferences."""
    language: str = "en"
    theme: str = "dark"
    show_id_section: bool = True
    alternative_tag_display: bool = False


@dataclass
class BehaviorSettings:
    """Application behavior preferences."""
    minimize_on_apply: bool = False
    preload_next_page: bool = True


@dataclass
class DebugSettings:
    """Debug and development options."""
    debug_mode: bool = False


@dataclass
class GeneralSettings:
    """General user preferences."""
    appearance: AppearanceSettings = field(default_factory=AppearanceSettings)
    behavior: BehaviorSettings = field(default_factory=BehaviorSettings)
    debug: DebugSettings = field(default_factory=DebugSettings)


@dataclass
class ApplicationSettings:
    """Root settings container."""
    system: SystemSettings = field(default_factory=SystemSettings)
    general: GeneralSettings = field(default_factory=GeneralSettings)