from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass, field
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QPropertyAnimation, QEasingCurve, QRectF, pyqtProperty
from PyQt6.QtGui import QPainter, QColor
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QComboBox, QScrollArea,
    QSizePolicy, QFrame,
    QLineEdit, QPushButton, QCheckBox
)
from core.workshop_filters import FilterConfig
from ui.grid_items import LocalGridItem
from ui.flow_layout import AdaptiveGridWidget
from ui.details_panel import DetailsPanel
from core.resources import get_pixmap
from utils.helpers import get_directory_size, human_readable_size, get_folder_mtime
import json


@dataclass
class LocalFilters:
    search: str = ""
    sort: str = "install_date"
    sort_order: str = "desc"
    category: str = ""
    type_tag: str = ""
    age_rating: str = ""
    resolution: str = ""
    misc_tags: List[str] = field(default_factory=list)
    genre_tags: List[str] = field(default_factory=list)
    excluded_misc_tags: List[str] = field(default_factory=list)
    excluded_genre_tags: List[str] = field(default_factory=list)


class LocalFilterConfig:
    SORT_KEYS = ["install_date", "name", "rating", "size", "posted_date", "updated_date"]
    
    @classmethod
    def get_translated_sort_options(cls, translator) -> Dict[str, str]:
        translations = {
            "install_date": translator("filters.local_sort.install_date"),
            "name": translator("filters.local_sort.name"),
            "rating": translator("filters.local_sort.rating"),
            "size": translator("filters.local_sort.size"),
            "posted_date": translator("filters.local_sort.posted_date"),
            "updated_date": translator("filters.local_sort.updated_date"),
        }
        for key in cls.SORT_KEYS:
            if translations[key] == f"filters.local_sort.{key}":
                fallback = {
                    "install_date": "Install Date",
                    "name": "Name",
                    "rating": "Rating",
                    "size": "Size",
                    "posted_date": "Posted Date",
                    "updated_date": "Updated Date",
                }
                translations[key] = fallback[key]
        return translations


class AnimatedContainerLocal(QWidget):
    height_changed = pyqtSignal()
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self._animation = QPropertyAnimation(self, b"maximumHeight")
        self._animation.setDuration(250)
        self._animation.setEasingCurve(QEasingCurve.Type.InOutCubic)
        self._animation.valueChanged.connect(self._on_anim_value_changed)
        self._expanded = False
        self._content_height = 0
        self.setMaximumHeight(0)
        self._inner_layout = QVBoxLayout(self)
        self._inner_layout.setContentsMargins(0, 0, 0, 0)
        self._inner_layout.setSpacing(4)
    
    def set_content_widget(self, widget: QWidget):
        self._inner_layout.addWidget(widget)
    
    def _recalc_content_height(self):
        self._content_height = self._inner_layout.sizeHint().height()
    
    def _on_anim_value_changed(self):
        self.height_changed.emit()
    
    def toggle(self, expand: bool):
        if expand == self._expanded:
            return
        self._expanded = expand
        self._recalc_content_height()
        self._animation.stop()
        self._animation.setStartValue(self.maximumHeight())
        self._animation.setEndValue(self._content_height if expand else 0)
        self._animation.start()
    
    def is_expanded(self) -> bool:
        return self._expanded
    
    def update_height(self):
        if self._expanded:
            self._recalc_content_height()
            self.setMaximumHeight(self._content_height)


class StateTagCheckBoxLocal(QCheckBox):
    state_changed_tri = pyqtSignal()

    def __init__(self, text: str, theme_manager, parent=None):
        super().__init__(text, parent)
        self.theme = theme_manager
        self._tri_state = 0
        self.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.customContextMenuRequested.connect(self._on_right_click)
        self._apply_style()

    def _apply_style(self):
        if self._tri_state == 2:
            bg = "#c0392b"
            border = "#c0392b"
        elif self._tri_state == 1:
            bg = self.theme.get_color('primary')
            border = self.theme.get_color('primary')
        else:
            bg = self.theme.get_color('bg_tertiary')
            border = self.theme.get_color('border')
        self.setStyleSheet(f"""
            QCheckBox {{
                color: {self.theme.get_color('text_primary')};
                font-size: 10px;
                spacing: 3px;
            }}
            QCheckBox::indicator {{
                width: 12px; height: 12px;
                border-radius: 2px;
                border: 1px solid {border};
                background: {bg};
            }}
        """)

    def nextCheckState(self):
        if self._tri_state == 0:
            self._tri_state = 1
            self.setChecked(True)
        else:
            self._tri_state = 0
            self.setChecked(False)
        self._apply_style()
        self.state_changed_tri.emit()

    def _on_right_click(self):
        if self._tri_state == 2:
            self._tri_state = 0
            self.setChecked(False)
        else:
            self._tri_state = 2
            self.setChecked(True)
        self._apply_style()
        self.state_changed_tri.emit()

    def tri_state(self) -> int:
        return self._tri_state

    def reset(self):
        self._tri_state = 0
        self.setChecked(False)
        self._apply_style()


class ToggleSwitchLocal(QWidget):
    toggled = pyqtSignal(bool)

    def __init__(self, checked=True, theme_manager=None, parent=None):
        super().__init__(parent)
        self.theme = theme_manager
        self._checked = checked
        self._handle_pos = 1.0 if checked else 0.0
        self.setFixedSize(36, 18)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self._animation = QPropertyAnimation(self, b"handlePos")
        self._animation.setDuration(150)

    def _get_primary_color(self) -> str:
        if self.theme:
            return self.theme.get_color('primary')
        return '#4A7FD9'

    def _get_bg_color(self) -> str:
        if self.theme:
            return self.theme.get_color('bg_tertiary')
        return '#252938'

    def get_handle_pos(self):
        return self._handle_pos

    def set_handle_pos(self, pos):
        self._handle_pos = pos
        self.update()

    handlePos = pyqtProperty(float, get_handle_pos, set_handle_pos)

    def isChecked(self):
        return self._checked

    def mousePressEvent(self, event):
        self._checked = not self._checked
        self._animation.setStartValue(self._handle_pos)
        self._animation.setEndValue(1.0 if self._checked else 0.0)
        self._animation.start()
        self.toggled.emit(self._checked)

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        w, h = self.width(), self.height()
        radius = h / 2
        if self._checked:
            bg_color = QColor(self._get_primary_color())
        else:
            bg_color = QColor(self._get_bg_color())
        p.setBrush(bg_color)
        p.setPen(Qt.PenStyle.NoPen)
        p.drawRoundedRect(QRectF(0, 0, w, h), radius, radius)
        handle_diameter = h - 4
        x = 2 + self._handle_pos * (w - handle_diameter - 4)
        p.setBrush(QColor("white"))
        p.drawEllipse(QRectF(x, 2, handle_diameter, handle_diameter))
        p.end()


class LocalFilterBar(QWidget):
    filters_changed = pyqtSignal(object)
    refresh_requested = pyqtSignal()
    
    def __init__(self, theme_manager, translator, parent=None):
        super().__init__(parent)
        self.theme = theme_manager
        self.tr = translator
        self._current_filters = LocalFilters()
        self._setup_ui()
    
    def _setup_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 10)
        main_layout.setSpacing(4)
        
        row1 = self._create_row1()
        main_layout.addWidget(row1)

        row2 = self._create_row2()
        main_layout.addWidget(row2)

        self.tags_animated = AnimatedContainerLocal(self)
        self.tags_container = self._create_tags_section()
        self.tags_animated.set_content_widget(self.tags_container)
        main_layout.addWidget(self.tags_animated)
    
    def _create_row1(self) -> QFrame:
        frame = QFrame()
        frame.setStyleSheet(f"""
            QFrame {{
                background-color: {self.theme.get_color('bg_secondary')};
                border-radius: 8px;
                padding: 0px;
            }}
        """)
        
        layout = QHBoxLayout(frame)
        layout.setContentsMargins(10, 4, 10, 4)
        layout.setSpacing(8)
        
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText(self.tr.t("labels.search_placeholder"))
        self.search_input.setFixedWidth(200)
        self.search_input.setFixedHeight(26)
        self.search_input.setStyleSheet(self._input_style())
        self.search_input.textChanged.connect(self._emit_filters)
        layout.addWidget(self.search_input)
        
        search_icon = QLabel()
        search_icon.setPixmap(get_pixmap("ICON_SEARCH", 18))
        search_icon.setFixedSize(26, 26)
        search_icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
        search_icon.setStyleSheet("background: transparent; border: none;")
        layout.addWidget(search_icon)
        
        layout.addSpacing(10)
        
        layout.addWidget(self._label(self.tr.t("labels.sort")))
        self.sort_combo = self._create_combo(LocalFilterConfig.get_translated_sort_options(self.tr.t), 120)
        self.sort_combo.currentTextChanged.connect(self._emit_filters)
        layout.addWidget(self.sort_combo)
        
        layout.addStretch()
        
        self.expand_btn = QPushButton(self.tr.t("labels.more_filters"))
        self.expand_btn.setFixedSize(100, 26)
        self.expand_btn.setStyleSheet(self._button_style("#5B8DEF"))
        self.expand_btn.clicked.connect(self._toggle_expanded)
        layout.addWidget(self.expand_btn)
        
        return frame
    
    def _create_row2(self) -> QFrame:
        frame = QFrame()
        frame.setStyleSheet(f"""
            QFrame {{
                background-color: {self.theme.get_color('bg_secondary')};
                border-radius: 10px;
            }}
        """)
        
        layout = QHBoxLayout(frame)
        layout.setContentsMargins(10, 4, 10, 4)
        layout.setSpacing(10)

        layout.addWidget(self._label(self.tr.t("labels.category")))
        self.category_combo = self._create_combo(FilterConfig.get_translated_categories(self.tr.t), 100)
        self.category_combo.currentTextChanged.connect(self._emit_filters)
        layout.addWidget(self.category_combo)

        layout.addWidget(self._label(self.tr.t("labels.type")))
        self.type_combo = self._create_combo(FilterConfig.get_translated_types(self.tr.t), 100)
        self.type_combo.currentTextChanged.connect(self._emit_filters)
        layout.addWidget(self.type_combo)
        
        layout.addWidget(self._label(self.tr.t("labels.age")))
        self.age_combo = self._create_combo(FilterConfig.get_translated_age_ratings(self.tr.t), 100)
        self.age_combo.currentTextChanged.connect(self._emit_filters)
        layout.addWidget(self.age_combo)

        layout.addWidget(self._label(self.tr.t("labels.resolution")))
        self.resolution_combo = self._create_combo(FilterConfig.get_translated_resolutions(self.tr.t), 110)
        self.resolution_combo.currentTextChanged.connect(self._emit_filters)
        layout.addWidget(self.resolution_combo)
        
        layout.addStretch()
        
        clear_btn = QPushButton(self.tr.t("labels.clear"))
        clear_btn.setFixedSize(65, 24)
        clear_btn.setStyleSheet(self._button_style("#666"))
        clear_btn.clicked.connect(self._clear_filters)
        layout.addWidget(clear_btn)
        
        return frame
    
    def _create_tags_section(self) -> QFrame:
        frame = QFrame()
        frame.setStyleSheet(f"""
        QFrame {{
            background-color: {self.theme.get_color('bg_secondary')};
            border-radius: 10px;
        }}
        """)
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(10, 4, 10, 4)
        layout.setSpacing(4)

        misc_frame = QFrame()
        misc_layout = QHBoxLayout(misc_frame)
        misc_layout.setContentsMargins(0, 0, 0, 0)
        misc_layout.setSpacing(6)
        misc_layout.addWidget(self._label(self.tr.t("labels.miscellaneous"), bold=True))

        misc_scroll = QScrollArea()
        misc_scroll.setWidgetResizable(True)
        misc_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        misc_scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        misc_scroll.setFixedHeight(26)
        misc_scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        misc_content = QWidget()
        misc_content_layout = QHBoxLayout(misc_content)
        misc_content_layout.setContentsMargins(0, 0, 0, 0)
        misc_content_layout.setSpacing(4)
        self.misc_checkboxes = {}
        misc_translations = FilterConfig.get_translated_misc_tags(self.tr.t)
        for tag in FilterConfig.MISC_TAG_KEYS:
            translated_tag = misc_translations.get(tag, tag)
            cb = StateTagCheckBoxLocal(translated_tag, self.theme)
            cb.state_changed_tri.connect(self._emit_filters)
            self.misc_checkboxes[tag] = cb
            misc_content_layout.addWidget(cb)
        misc_scroll.setWidget(misc_content)
        misc_layout.addWidget(misc_scroll, 1)
        layout.addWidget(misc_frame)
        
        genre_frame = QFrame()
        genre_layout = QHBoxLayout(genre_frame)
        genre_layout.setContentsMargins(0, 0, 0, 0)
        genre_layout.setSpacing(6)
        genre_layout.addWidget(self._label(self.tr.t("labels.genre"), bold=True))

        genre_scroll = QScrollArea()
        genre_scroll.setWidgetResizable(True)
        genre_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        genre_scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        genre_scroll.setFixedHeight(26)
        genre_scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        genre_content = QWidget()
        genre_content_layout = QHBoxLayout(genre_content)
        genre_content_layout.setContentsMargins(0, 0, 0, 0)
        genre_content_layout.setSpacing(4)
        self.genre_checkboxes = {}
        genre_translations = FilterConfig.get_translated_genre_tags(self.tr.t)
        for tag in FilterConfig.GENRE_TAG_KEYS:
            translated_tag = genre_translations.get(tag, tag)
            cb = StateTagCheckBoxLocal(translated_tag, self.theme)
            cb.state_changed_tri.connect(self._emit_filters)
            self.genre_checkboxes[tag] = cb
            genre_content_layout.addWidget(cb)
        genre_scroll.setWidget(genre_content)
        genre_layout.addWidget(genre_scroll, 1)
        layout.addWidget(genre_frame)
        
        return frame
    
    def _create_combo(self, options: Dict[str, str], width: int) -> QComboBox:
        combo = QComboBox()
        combo.setFixedWidth(width)
        combo.setStyleSheet(self._combo_style())
        
        for value, label in options.items():
            combo.addItem(label, value)
        
        return combo
    
    def _label(self, text: str, bold: bool = False) -> QLabel:
        label = QLabel(text)
        weight = "600" if bold else "normal"
        label.setStyleSheet(f"""
            color: {self.theme.get_color('text_secondary')};
            font-weight: {weight};
            font-size: 12px;
            background: transparent;
        """)
        return label
    
    def _input_style(self) -> str:
        return f"""
            QLineEdit {{
                background-color: {self.theme.get_color('bg_tertiary')};
                border: 1px solid {self.theme.get_color('border')};
                border-radius: 4px;
                padding: 2px 8px;
                color: {self.theme.get_color('text_primary')};
                font-size: 11px;
            }}
            QLineEdit:focus {{
                border-color: {self.theme.get_color('primary')};
            }}
        """

    def _combo_style(self) -> str:
        return f"""
            QComboBox {{
                background-color: {self.theme.get_color('bg_tertiary')};
                color: {self.theme.get_color('text_primary')};
                border: 1px solid {self.theme.get_color('border')};
                border-radius: 4px;
                padding: 2px 6px;
                font-size: 11px;
                min-height: 20px;
            }}
            QComboBox::drop-down {{ border: none; width: 16px; }}
            QComboBox QAbstractItemView {{
                background-color: {self.theme.get_color('bg_elevated')};
                color: {self.theme.get_color('text_primary')};
                selection-background-color: {self.theme.get_color('primary')};
                border: 1px solid {self.theme.get_color('border')};
                border-radius: 4px;
            }}
        """
    
    def _button_style(self, color: str = None) -> str:
        c = color or self.theme.get_color('primary')
        return f"""
            QPushButton {{
                background-color: {c};
                color: white;
                border: none;
                border-radius: 6px;
                font-weight: 600;
                font-size: 11px;
                padding: 0px;
            }}
            QPushButton:hover {{
                background-color: {self.theme.get_color('primary_hover')};
            }}
        """
    
    def _toggle_expanded(self):
        expanding = not self.tags_animated.is_expanded()
        self.tags_animated.toggle(expanding)
        self.expand_btn.setText(self.tr.t("labels.less_filters") if expanding else self.tr.t("labels.more_filters"))
    
    def _clear_filters(self):
        self.search_input.clear()
        self.sort_combo.setCurrentIndex(0)
        self.category_combo.setCurrentIndex(0)
        self.type_combo.setCurrentIndex(0)
        self.age_combo.setCurrentIndex(0)
        self.resolution_combo.setCurrentIndex(0)
        self._current_filters.sort_order = "desc"
        
        for cb in self.misc_checkboxes.values():
            cb.reset()
        for cb in self.genre_checkboxes.values():
            cb.reset()

        self.refresh_requested.emit()
    
    def _emit_filters(self):
        filters = self.get_current_filters()
        self.filters_changed.emit(filters)
    
    def get_current_filters(self) -> LocalFilters:
        misc_tags = [t for t, cb in self.misc_checkboxes.items() if cb.tri_state() == 1]
        excluded_misc = [t for t, cb in self.misc_checkboxes.items() if cb.tri_state() == 2]
        genre_tags = [t for t, cb in self.genre_checkboxes.items() if cb.tri_state() == 1]
        excluded_genre = [t for t, cb in self.genre_checkboxes.items() if cb.tri_state() == 2]
        
        return LocalFilters(
            search=self.search_input.text().strip(),
            sort=self.sort_combo.currentData() or "install_date",
            sort_order=self._current_filters.sort_order,
            category=self.category_combo.currentData() or "",
            type_tag=self.type_combo.currentData() or "",
            age_rating=self.age_combo.currentData() or "",
            resolution=self.resolution_combo.currentData() or "",
            misc_tags=misc_tags,
            genre_tags=genre_tags,
            excluded_misc_tags=excluded_misc,
            excluded_genre_tags=excluded_genre,
        )


class AnimatedDetailsContainerLocal(QWidget):
    animation_finished = pyqtSignal()
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self._target_width = 320
        self._current_width = 320
        self._is_panel_visible = True
        
        self._animation = QPropertyAnimation(self, b"panelWidth")
        self._animation.setDuration(250)
        self._animation.setEasingCurve(QEasingCurve.Type.InOutCubic)
        self._animation.finished.connect(self._on_animation_finished)
        
        self.setFixedWidth(self._target_width)
        self.setMinimumWidth(0)
    
    def get_panel_width(self) -> int:
        return self._current_width
    
    def set_panel_width(self, width: int):
        self._current_width = width
        self.setFixedWidth(max(0, width))
    
    panelWidth = pyqtProperty(int, get_panel_width, set_panel_width)
    
    def set_target_width(self, width: int):
        self._target_width = width
        if self._is_panel_visible:
            self._current_width = width
            self.setFixedWidth(width)
    
    def is_panel_visible(self) -> bool:
        return self._is_panel_visible
    
    def show_panel(self):
        if self._is_panel_visible:
            return
        
        self._is_panel_visible = True
        self.setVisible(True)
        
        for child in self.findChildren(QWidget):
            child.setVisible(True)
        
        self._animation.stop()
        self._animation.setStartValue(0)
        self._animation.setEndValue(self._target_width)
        self._animation.start()
    
    def hide_panel(self):
        if not self._is_panel_visible:
            return
        
        self._is_panel_visible = False
        self._animation.stop()
        self._animation.setStartValue(self._current_width)
        self._animation.setEndValue(0)
        self._animation.start()
    
    def _on_animation_finished(self):
        if not self._is_panel_visible:
            self.setVisible(False)
        self.animation_finished.emit()


class WallpapersTab(QWidget):

    def __init__(self, config_manager, download_manager, wallpaper_engine, translator, theme_manager, parent=None):
        super().__init__(parent)

        self.config = config_manager
        self.dm = download_manager
        self.we = wallpaper_engine
        self.tr = translator
        self.theme = theme_manager

        self.selected_folder = None
        self.grid_items: List[LocalGridItem] = []
        self._is_refreshing = False
        self._all_wallpapers_data: List[Dict[str, Any]] = []
        
        self._details_panel_margin = 15

        self._setup_ui()

        self.dm.download_completed.connect(self._on_download_completed)

        self.load_wallpapers()

    def _setup_ui(self):
        main_layout = QHBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(5)

        self.left_panel = self._create_left_panel()
        main_layout.addWidget(self.left_panel, 1)

        self.details_container = AnimatedDetailsContainerLocal(self)
        self.details_container.set_target_width(320)
        self.details_container.animation_finished.connect(self._on_details_animation_finished)
        
        details_layout = QVBoxLayout(self.details_container)
        details_layout.setContentsMargins(0, 0, 0, 0)
        
        self.details_scroll = QScrollArea()
        self.details_scroll.setWidgetResizable(True)
        self.details_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.details_scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")

        self.details_panel = DetailsPanel(
            self.we, self.dm, self.tr, self.theme, self.config, self
        )
        self.details_panel.panel_collapse_requested.connect(self._on_collapse_requested)
        
        self.details_scroll.setWidget(self.details_panel)
        details_layout.addWidget(self.details_scroll)
        
        main_layout.addWidget(self.details_container)

    def _on_collapse_requested(self):
        self.details_container.hide_panel()
        self._update_grid_margin(False)

    def _on_details_animation_finished(self):
        self.grid_widget.schedule_layout_update(50)

    def _update_grid_margin(self, panel_visible: bool):
        layout = self.left_panel.layout()
        if panel_visible:
            layout.setContentsMargins(15, 10, 5, 10)
        else:
            layout.setContentsMargins(15, 10, self._details_panel_margin, 10)

    def _create_left_panel(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(15, 10, 5, 10)
        layout.setSpacing(0)

        self.filter_bar = LocalFilterBar(self.theme, self.tr, self)
        self.filter_bar.filters_changed.connect(self._on_filters_changed)
        self.filter_bar.refresh_requested.connect(self._on_refresh_requested)

        self.filter_animated = AnimatedContainerLocal(self)
        self.filter_animated.set_content_widget(self.filter_bar)
        layout.addWidget(self.filter_animated)

        self.filter_bar.tags_animated.height_changed.connect(
            self.filter_animated.update_height
        )

        self.info_bar = self._create_info_bar()
        layout.addWidget(self.info_bar)

        layout.addSpacing(10)

        self.scroll_area = QScrollArea()
        self.scroll_area.setWidgetResizable(True)
        self.scroll_area.setHorizontalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff
        )
        self.scroll_area.setStyleSheet(f"""
            QScrollArea {{
                border: none;
                background-color: transparent;
            }}
            QScrollBar:vertical {{
                background-color: {self.theme.get_color('bg_secondary')};
                width: 10px;
                margin: 2px 2px 2px 2px;
                border-radius: 4px;
            }}
            QScrollBar::handle:vertical {{
                background-color: {self.theme.get_color('border')};
                min-height: 30px;
                border-radius: 4px;
            }}
            QScrollBar::handle:vertical:hover {{
                background-color: {self.theme.get_color('primary')};
            }}
            QScrollBar::handle:vertical:pressed {{
                background-color: {self.theme.get_color('primary_hover')};
            }}
            QScrollBar::add-line:vertical,
            QScrollBar::sub-line:vertical {{
                height: 0px;
            }}
            QScrollBar::add-page:vertical,
            QScrollBar::sub-page:vertical {{
                background: none;
            }}
        """)

        self.grid_widget = AdaptiveGridWidget()
        self.grid_widget.set_item_size_range(160, 240, 185)
        self.grid_widget.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Preferred)

        self.scroll_area.setWidget(self.grid_widget)

        layout.addWidget(self.scroll_area)
        return widget

    def _create_info_bar(self) -> QFrame:
        bar = QFrame()
        bar.setFixedHeight(30)
        bar.setStyleSheet(f"""
            QFrame {{
                background-color: {self.theme.get_color('bg_elevated')};
                border-radius: 8px;
                padding: 0px;
            }}
        """)
        layout = QHBoxLayout(bar)
        layout.setContentsMargins(12, 0, 12, 0)
        layout.setSpacing(8)

        self.results_label = QLabel()
        self.results_label.setStyleSheet(f"""
            color: {self.theme.get_color('text_secondary')};
            font-size: 10px;
            font-weight: 600;
        """)
        layout.addWidget(self.results_label)

        layout.addStretch()

        self.size_label = QLabel()
        self.size_label.setStyleSheet(f"""
            color: {self.theme.get_color('text_secondary')};
            font-size: 10px;
            font-weight: 600;
        """)
        layout.addWidget(self.size_label)

        layout.addSpacing(10)

        self.filter_toggle_label = QLabel(self.tr.t("labels.filters"))
        self.filter_toggle_label.setStyleSheet(f"""
            color: {self.theme.get_color('text_secondary')};
            font-size: 10px;
            font-weight: 600;
        """)
        layout.addWidget(self.filter_toggle_label)

        self.filter_toggle = ToggleSwitchLocal(
            checked=False, theme_manager=self.theme, parent=bar
        )
        self.filter_toggle.toggled.connect(self._on_filter_toggle)
        layout.addWidget(self.filter_toggle)

        return bar

    def _on_filter_toggle(self, checked: bool):
        self.filter_animated.toggle(checked)

    def _on_filters_changed(self, filters: LocalFilters):
        self._apply_filters_and_display(filters)

    def _on_refresh_requested(self):
        self.load_wallpapers()

    def _on_download_completed(self, pubfileid: str, success: bool):
        if success and not self._is_refreshing:
            QTimer.singleShot(800, self._safe_refresh)

    def _safe_refresh(self):
        if self._is_refreshing:
            return
        try:
            self._is_refreshing = True
            self.refresh()
        finally:
            QTimer.singleShot(500, self._reset_refresh_flag)

    def _reset_refresh_flag(self):
        self._is_refreshing = False

    def _load_wallpaper_data(self, wallpaper_path: Path) -> Dict[str, Any]:
        pubfileid = wallpaper_path.name
        
        data = {
            "path": wallpaper_path,
            "pubfileid": pubfileid,
            "title": pubfileid,
            "install_date": get_folder_mtime(wallpaper_path),
            "size": get_directory_size(wallpaper_path),
            "tags": {},
            "rating": 0,
            "posted_date": 0,
            "updated_date": 0,
        }
        
        project_json = wallpaper_path / "project.json"
        if project_json.exists():
            try:
                with open(project_json, "r", encoding="utf-8") as f:
                    project_data = json.load(f)
                data["title"] = project_data.get("title", pubfileid)
            except:
                pass
        
        metadata = self.config.get_wallpaper_metadata(pubfileid)
        if metadata:
            data["tags"] = metadata.get("tags", {})
            data["rating"] = metadata.get("rating", 0)
            data["posted_date"] = metadata.get("posted_date", 0)
            data["updated_date"] = metadata.get("updated_date", 0)
        
        return data

    def _extract_tags_from_metadata(self, tags_dict: Dict) -> Dict[str, List[str]]:
        result = {
            "category": "",
            "type": "",
            "age_rating": "",
            "resolution": "",
            "misc": [],
            "genre": [],
        }
        
        if not tags_dict:
            return result
        
        result["category"] = tags_dict.get("Category", "")
        result["type"] =        result["type"] = tags_dict.get("Type", "")
        result["age_rating"] = tags_dict.get("Age Rating", "")
        result["resolution"] = tags_dict.get("Resolution", "")
        
        misc_value = tags_dict.get("Miscellaneous", "")
        if misc_value:
            result["misc"] = [t.strip() for t in misc_value.split(",") if t.strip()]
        
        genre_value = tags_dict.get("Genre", "")
        if genre_value:
            result["genre"] = [t.strip() for t in genre_value.split(",") if t.strip()]
        
        return result

    def _matches_filters(self, wallpaper_data: Dict[str, Any], filters: LocalFilters) -> bool:
        if filters.search:
            search_lower = filters.search.lower()
            title = wallpaper_data.get("title", "").lower()
            pubfileid = wallpaper_data.get("pubfileid", "").lower()
            if search_lower not in title and search_lower not in pubfileid:
                return False
        
        tags = self._extract_tags_from_metadata(wallpaper_data.get("tags", {}))
        
        if filters.category and tags["category"] != filters.category:
            return False
        
        if filters.type_tag and tags["type"] != filters.type_tag:
            return False
        
        if filters.age_rating and tags["age_rating"] != filters.age_rating:
            return False
        
        if filters.resolution and tags["resolution"] != filters.resolution:
            return False
        
        for required_tag in filters.misc_tags:
            if required_tag not in tags["misc"]:
                return False
        
        for excluded_tag in filters.excluded_misc_tags:
            if excluded_tag in tags["misc"]:
                return False
        
        for required_tag in filters.genre_tags:
            if required_tag not in tags["genre"]:
                return False
        
        for excluded_tag in filters.excluded_genre_tags:
            if excluded_tag in tags["genre"]:
                return False
        
        return True

    def _sort_wallpapers(self, wallpapers: List[Dict[str, Any]], filters: LocalFilters) -> List[Dict[str, Any]]:
        reverse = filters.sort_order == "desc"
        
        if filters.sort == "name":
            return sorted(wallpapers, key=lambda w: w.get("title", "").lower(), reverse=reverse)
        elif filters.sort == "rating":
            return sorted(wallpapers, key=lambda w: w.get("rating", 0), reverse=reverse)
        elif filters.sort == "size":
            return sorted(wallpapers, key=lambda w: w.get("size", 0), reverse=reverse)
        elif filters.sort == "posted_date":
            return sorted(wallpapers, key=lambda w: w.get("posted_date", 0), reverse=reverse)
        elif filters.sort == "updated_date":
            return sorted(wallpapers, key=lambda w: w.get("updated_date", 0), reverse=reverse)
        else:
            return sorted(wallpapers, key=lambda w: w.get("install_date", 0), reverse=reverse)

    def _apply_filters_and_display(self, filters: LocalFilters):
        filtered = [w for w in self._all_wallpapers_data if self._matches_filters(w, filters)]
        sorted_wallpapers = self._sort_wallpapers(filtered, filters)
        self._display_wallpapers(sorted_wallpapers)

    def load_wallpapers(self):
        self._clear_grid()

        wallpaper_paths = [
            w for w in self.we.get_installed_wallpapers()
            if w.name not in self.dm.downloading and w.exists()
        ]

        self._all_wallpapers_data = [self._load_wallpaper_data(p) for p in wallpaper_paths]

        filters = self.filter_bar.get_current_filters()
        filtered = [w for w in self._all_wallpapers_data if self._matches_filters(w, filters)]
        sorted_wallpapers = self._sort_wallpapers(filtered, filters)

        self._display_wallpapers(sorted_wallpapers)

        total_size = get_directory_size(self.we.projects_path)
        self._update_info(len(sorted_wallpapers), len(self._all_wallpapers_data), total_size)

        QTimer.singleShot(50, self._force_grid_update)

        if sorted_wallpapers and not self.selected_folder:
            self._on_item_clicked(str(sorted_wallpapers[0]["path"]))

    def _force_grid_update(self):
        self.grid_widget.update_layout()
        self.grid_widget.updateGeometry()
        self.scroll_area.updateGeometry()

    def _display_wallpapers(self, wallpapers: List[Dict[str, Any]]):
        self._clear_grid()

        if not wallpapers:
            self._update_info(0, len(self._all_wallpapers_data), get_directory_size(self.we.projects_path))
            label = QLabel(self.tr.t("labels.no_wallpapers_found"))
            label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            label.setStyleSheet(f"""
                color: {self.theme.get_color('text_secondary')};
                font-size: 16px;
                padding: 50px;
            """)
            self.grid_widget.add_item(label)
            return

        item_size = self.grid_widget.get_current_item_size()

        for wallpaper_data in wallpapers:
            item = LocalGridItem(str(wallpaper_data["path"]), item_size, self.theme, self)
            item.clicked.connect(self._on_item_clicked)
            self.grid_widget.add_item(item)
            self.grid_items.append(item)

        total_size = get_directory_size(self.we.projects_path)
        self._update_info(len(wallpapers), len(self._all_wallpapers_data), total_size)
        
        QTimer.singleShot(50, self._force_grid_update)

    def _clear_grid(self):
        for item in self.grid_items:
            if hasattr(item, 'release_resources'):
                try:
                    item.release_resources()
                except RuntimeError:
                    pass

        self.grid_widget.clear_items()
        self.grid_items.clear()

    def _update_info(self, filtered_count: int, total_count: int, total_size: int):
        self.results_label.setText(
            self.tr.t("labels.wallpapers_filtered", filtered=filtered_count, total=total_count)
        )
        self.size_label.setText(
            self.tr.t("labels.total_size", size=human_readable_size(total_size))
        )

    def _on_item_clicked(self, folder_path: str):
        if not self.details_container.is_panel_visible():
            self.details_container.show_panel()
            self._update_grid_margin(True)
        
        if not Path(folder_path).exists():
            return
        self.selected_folder = folder_path
        self.details_panel.set_installed_folder(folder_path)

    def refresh(self):
        selected = self.selected_folder
        self.load_wallpapers()
        if selected and Path(selected).exists():
            self._on_item_clicked(selected)
        else:
            self.selected_folder = None

    def release_resources_for_folder(self, folder_path: str):
        if hasattr(self, 'details_panel') and self.details_panel.folder_path == folder_path:
            self.details_panel.release_resources()

        for item in self.grid_items:
            if hasattr(item, 'folder_path') and item.folder_path == folder_path:
                if hasattr(item, 'release_resources'):
                    try:
                        item.release_resources()
                    except RuntimeError:
                        pass

        if self.selected_folder == folder_path:
            self.selected_folder = None