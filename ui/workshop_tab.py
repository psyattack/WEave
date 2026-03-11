import weakref
from typing import Optional, List, Dict
from PyQt6.QtCore import (
    Qt, QTimer, pyqtSignal, QSize, QPoint, QByteArray,
    QBuffer, QIODevice, QPropertyAnimation, QRectF, pyqtProperty, QEasingCurve
)
from PyQt6.QtGui import QPixmap, QMovie, QPainter, QPainterPath, QColor, QTransform
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QScrollArea, QFrame, QSizePolicy, QLineEdit,
)
from core.image_cache import ImageCache
from core.workshop_parser import WorkshopParser, WorkshopItem, WorkshopPage
from core.workshop_filters import WorkshopFilters
from ui.workshop_filters import CompactFilterBar, AnimatedContainer
from ui.grid_items import WorkshopGridItem, SkeletonGridItem
from ui.flow_layout import AdaptiveGridWidget
from ui.details_panel import DetailsPanel
from utils.helpers import hex_to_rgba, parse_file_size_to_bytes
from ui.notifications import NotificationLabel
from core.resources import get_icon, get_pixmap

class ToggleSwitch(QWidget):
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


class PreviewPopup(QWidget):
    def __init__(self, theme_manager, translator, parent=None):
        super().__init__(parent)
        self.theme = theme_manager
        self.tr = translator
        self.setWindowFlags(
            Qt.WindowType.ToolTip
            | Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.NoDropShadowWindowHint
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setFixedSize(156, 156)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)

        self.container = QWidget()
        bg_color = hex_to_rgba(self.theme.get_color('bg_secondary'), 230)
        self.container.setStyleSheet(f"""
            background-color: {bg_color};
            border-radius: 8px;
            border: 2px solid {self.theme.get_color('primary')};
        """)

        container_layout = QVBoxLayout(self.container)
        container_layout.setContentsMargins(3, 3, 3, 3)

        self.preview_label = QLabel()
        self.preview_label.setFixedSize(150, 150)
        self.preview_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.preview_label.setStyleSheet("background: transparent; border: none;")
        container_layout.addWidget(self.preview_label)

        layout.addWidget(self.container)

        self._current_url: str = ""
        self._current_movie: Optional[QMovie] = None
        self._current_buffer: Optional[QBuffer] = None

    def show_preview(self, preview_url: str, global_pos: QPoint):
        if not preview_url:
            self._stop_current_movie()
            self.preview_label.setText(self.tr.t("labels.no_preview"))
            self.show()
            return
        x_pos = global_pos.x() - self.width() - 10
        if x_pos < 0:
            x_pos = global_pos.x() + 10
        self.move(x_pos, global_pos.y() - 35)
        self.show()
        if preview_url == self._current_url:
            return
        self._current_url = preview_url
        cache = ImageCache.instance()
        gif_data = cache.get_gif(preview_url)
        if gif_data:
            self._play_gif_from_data(gif_data)
            return
        pixmap = cache.get_pixmap(preview_url)
        if pixmap:
            self._stop_current_movie()
            self._set_pixmap(pixmap.scaled(
                150, 150,
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation,
            ))
            return
        self._stop_current_movie()
        self.preview_label.setText(self.tr.t("labels.loading_dots"))
        weak_self = weakref.ref(self)
        expected_url = preview_url

        def on_loaded(url: str, data, is_gif: bool):
            self_ref = weak_self()
            if self_ref is None or not self_ref.isVisible():
                return
            if self_ref._current_url != expected_url:
                return
            if data is None:
                self_ref._show_error(self_ref.tr.t("messages.load_failed"))
                return
            if is_gif:
                self_ref._play_gif_from_data(data)
            else:
                self_ref._stop_current_movie()
                self_ref._set_pixmap(data.scaled(
                    150, 150,
                    Qt.AspectRatioMode.KeepAspectRatio,
                    Qt.TransformationMode.SmoothTransformation,
                ))

        cache.load_image(preview_url, callback=on_loaded)

    def hide_preview(self):
        self._current_url = ""
        self._stop_current_movie()
        self.hide()

    def force_cancel(self):
        self._current_url = ""
        self._stop_current_movie()

    def _play_gif_from_data(self, data: QByteArray):
        self._stop_current_movie()
        self._current_buffer = QBuffer()
        self._current_buffer.setData(data)
        self._current_buffer.open(QIODevice.OpenModeFlag.ReadOnly)
        self._current_movie = QMovie()
        self._current_movie.setDevice(self._current_buffer)
        self._current_movie.setScaledSize(
            self._calculate_scaled_size(self._current_movie)
        )
        self.preview_label.setStyleSheet("background: transparent; border: none;")
        self.preview_label.setText("")
        self.preview_label.setMovie(self._current_movie)
        self._current_movie.frameChanged.connect(self._on_gif_frame_changed)
        self._current_movie.start()

    def _on_gif_frame_changed(self, frame_number: int):
        if self._current_movie is None:
            return
        current_pixmap = self._current_movie.currentPixmap()
        if not current_pixmap.isNull():
            self.preview_label.setPixmap(
                self._create_rounded_pixmap(current_pixmap, radius=6)
            )

    def _calculate_scaled_size(self, movie: QMovie) -> QSize:
        movie.jumpToFrame(0)
        original_size = movie.currentImage().size()
        if original_size.isEmpty():
            return QSize(150, 150)
        return original_size.scaled(150, 150, Qt.AspectRatioMode.KeepAspectRatio)

    def _stop_current_movie(self):
        if self._current_movie is not None:
            self._current_movie.stop()
            self.preview_label.setMovie(None)
            self._current_movie.deleteLater()
            self._current_movie = None
        if self._current_buffer is not None:
            self._current_buffer.close()
            self._current_buffer = None

    def _set_pixmap(self, pixmap: QPixmap):
        self.preview_label.setStyleSheet("background: transparent; border: none;")
        self.preview_label.setText("")
        self.preview_label.setPixmap(self._create_rounded_pixmap(pixmap, radius=6))

    def _create_rounded_pixmap(self, pixmap: QPixmap, radius: int = 6) -> QPixmap:
        if pixmap.isNull():
            return pixmap
        rounded = QPixmap(pixmap.size())
        rounded.fill(Qt.GlobalColor.transparent)
        painter = QPainter(rounded)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
        path = QPainterPath()
        path.addRoundedRect(0, 0, pixmap.width(), pixmap.height(), radius, radius)
        painter.setClipPath(path)
        painter.drawPixmap(0, 0, pixmap)
        painter.end()
        return rounded

    def _show_error(self, message: str):
        self._stop_current_movie()
        self.preview_label.setText(message)
        self.preview_label.setStyleSheet(f"""
            background: transparent;
            border: none;
            color: {self.theme.get_color('text_disabled')};
            font-size: 11px;
        """)


class AnimatedIconLabel(QWidget):
    
    def __init__(self, icon_name: str, size: int = 48, parent=None):
        super().__init__(parent)
        self._icon_name = icon_name
        self._size = size
        self._rotation = 0.0
        self._direction = 1
        
        self.setFixedSize(size, size)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setStyleSheet("background: transparent; border: none;")
        
        self._label = QLabel(self)
        self._label.setFixedSize(size, size)
        self._label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._label.setStyleSheet("background: transparent; border: none;")
        
        self._base_pixmap = get_pixmap(icon_name, size)
        self._update_pixmap()
        
        self._animation = QPropertyAnimation(self, b"rotation")
        self._animation.setDuration(1000)
        self._animation.setStartValue(0.0)
        self._animation.setEndValue(30.0)
        self._animation.setEasingCurve(QEasingCurve.Type.InOutSine)
        self._animation.finished.connect(self._on_animation_finished)
    
    def get_rotation(self) -> float:
        return self._rotation
    
    def set_rotation(self, value: float):
        self._rotation = value
        self._update_pixmap()
    
    rotation = pyqtProperty(float, get_rotation, set_rotation)
    
    def _update_pixmap(self):
        if self._base_pixmap.isNull():
            return
        transform = QTransform()
        transform.rotate(self._rotation)
        rotated = self._base_pixmap.transformed(transform, Qt.TransformationMode.SmoothTransformation)
        x = (rotated.width() - self._size) // 2
        y = (rotated.height() - self._size) // 2
        cropped = rotated.copy(x, y, self._size, self._size)
        self._label.setPixmap(cropped)
    
    def _on_animation_finished(self):
        self._direction *= -1
        self._animation.setStartValue(self._rotation)
        self._animation.setEndValue(30.0 * self._direction)
        self._animation.start()
    
    def start_animation(self):
        self._animation.start()
    
    def stop_animation(self):
        self._animation.stop()
        self._rotation = 0.0
        self._update_pixmap()


class LoadingOverlay(QWidget):
    
    def __init__(self, theme_manager, parent=None):
        super().__init__(parent)
        self.theme = theme_manager
        
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        self.setStyleSheet("background: transparent;")
        
        self._container = QWidget(self)
        self._container.setFixedSize(80, 80)
        self._container.setStyleSheet(f"""
            background-color: rgba(0, 0, 0, 150);
            border-radius: 16px;
        """)
        
        container_layout = QVBoxLayout(self._container)
        container_layout.setContentsMargins(0, 0, 0, 0)
        container_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        self._icon = AnimatedIconLabel("ICON_HOURGLASS", 48, self._container)
        container_layout.addWidget(self._icon, alignment=Qt.AlignmentFlag.AlignCenter)
        
        self.hide()
    
    def showEvent(self, event):
        super().showEvent(event)
        self._icon.start_animation()
        self._center_container()
    
    def hideEvent(self, event):
        super().hideEvent(event)
        self._icon.stop_animation()
    
    def resizeEvent(self, event):
        super().resizeEvent(event)
        self._center_container()
    
    def _center_container(self):
        if self.parent():
            parent_rect = self.parent().rect()
            self.setGeometry(parent_rect)
            
            x = (self.width() - self._container.width()) // 2
            y = (self.height() - self._container.height()) // 2
            self._container.move(x, y)
    
    def update_position(self):
        self._center_container()

class AnimatedDetailsContainer(QWidget):
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


class WorkshopTab(QWidget):
    download_requested = pyqtSignal(str)

    def __init__(self, config_manager, account_manager, download_manager,
                 wallpaper_engine, translator, theme_manager, parent=None):
        super().__init__(parent)
        self.config = config_manager
        self.accounts = account_manager
        self.dm = download_manager
        self.we = wallpaper_engine
        self.tr = translator
        self.theme = theme_manager

        self.current_page = 1
        self.total_pages = 1
        self.selected_pubfileid: Optional[str] = None
        self.grid_items: List[WorkshopGridItem] = []
        self.skeleton_items: List[SkeletonGridItem] = []
        self._current_page_data: Optional[WorkshopPage] = None

        self._is_loading_page = False
        self._is_loading_details = False

        self._preview_url_cache: Dict[str, str] = {}
        self._file_size_cache: Dict[str, int] = {}
        
        self._details_panel_margin = 15
        self._loading_overlay: Optional[LoadingOverlay] = None

        self._setup_ui()
        self._setup_parser()
        self._setup_downloads_dialog()

        self.dm.download_completed.connect(self._on_download_completed)

        self._status_timer = QTimer()
        self._status_timer.timeout.connect(self._update_item_statuses)
        self._status_timer.start(1000)

    def _setup_ui(self):
        main_layout = QHBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(5)

        self.left_panel = self._create_left_panel()
        main_layout.addWidget(self.left_panel, 1)

        self.details_container = AnimatedDetailsContainer(self)
        self.details_container.set_target_width(320)
        self.details_container.animation_finished.connect(self._on_details_animation_finished)
        
        details_layout = QVBoxLayout(self.details_container)
        details_layout.setContentsMargins(0, 0, 0, 0)
        
        self.details_scroll = QScrollArea()
        self.details_scroll.setWidgetResizable(True)
        self.details_scroll.setHorizontalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff
        )
        self.details_scroll.setStyleSheet(
            "QScrollArea { border: none; background: transparent; }"
        )
        
        self.details_panel = DetailsPanel(
            self.we, self.dm, self.tr, self.theme, self.config, self
        )
        self.details_panel.panel_collapse_requested.connect(self._on_collapse_requested)
        
        self.details_scroll.setWidget(self.details_panel)
        details_layout.addWidget(self.details_scroll)
        
        main_layout.addWidget(self.details_container)

        self.preview_popup = PreviewPopup(self.theme, self.tr, self)

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

    def _setup_parser(self):
        self.parser = WorkshopParser(self.accounts, self.config, self)
        self.parser.page_loaded.connect(self._on_page_loaded)
        self.parser.item_details_loaded.connect(self._on_item_details_loaded)
        self.parser.page_loading_started.connect(self._on_page_loading_started)
        self.parser.error_occurred.connect(self._on_error)
        self.parser.login_successful.connect(self._on_login_success)
        self.parser.login_failed.connect(self._on_login_failed)
        self.parser.ensure_logged_in(account_index=6)

    def _setup_downloads_dialog(self):
        from ui.dialogs import DownloadsDialog
        self.downloads_dialog = DownloadsDialog(
            self.tr, self.theme, self.dm, self.parser, self
        )
        self.downloads_dialog.download_cancelled.connect(self._on_download_cancelled)

    def _on_download_cancelled(self, pubfileid: str):
        self.dm.cancel_download(pubfileid)
        self._update_item_statuses()

    def _create_left_panel(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(15, 10, 5, 10)
        layout.setSpacing(0)

        self.filter_bar = CompactFilterBar(self.theme, self.tr, self)
        self.filter_bar.filters_changed.connect(self._on_filters_changed)
        self.filter_bar.refresh_requested.connect(self._on_refresh_requested)

        self.filter_animated = AnimatedContainer(self)
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
        
        self._loading_overlay = LoadingOverlay(self.theme, self.scroll_area)
        layout.addWidget(self.scroll_area, 1)
        layout.addSpacing(10)
        layout.addWidget(self._create_pagination_bar())
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

        self.results_label = QLabel(self.tr.t("labels.loading_dots"))
        self.results_label.setStyleSheet(f"""
            color: {self.theme.get_color('text_secondary')};
            font-size: 10px;
            font-weight: 600;
        """)
        layout.addWidget(self.results_label)
        layout.addStretch()

        self.filter_toggle_label = QLabel(self.tr.t("labels.filters"))
        self.filter_toggle_label.setStyleSheet(f"""
            color: {self.theme.get_color('text_secondary')};
            font-size: 10px;
            font-weight: 600;
        """)
        layout.addWidget(self.filter_toggle_label)

        self.filter_toggle = ToggleSwitch(
            checked=False, theme_manager=self.theme, parent=bar
        )
        self.filter_toggle.toggled.connect(self._on_filter_toggle)
        layout.addWidget(self.filter_toggle)
        return bar

    def _on_filter_toggle(self, checked: bool):
        self.filter_animated.toggle(checked)

    def _create_pagination_bar(self) -> QFrame:
        bar = QFrame()
        bar.setFixedHeight(40)
        bar.setStyleSheet(f"""
            QFrame {{
                background-color: {self.theme.get_color('bg_secondary')};
                border-radius: 10px;
            }}
        """)
        layout = QHBoxLayout(bar)
        layout.setContentsMargins(12, 4, 12, 4)

        self.first_btn = self._create_page_btn("ICON_ARROW_DOUBLE_LEFT")
        self.first_btn.clicked.connect(lambda: self._go_to_page(1))
        layout.addWidget(self.first_btn)

        self.prev_btn = self._create_page_btn("ICON_ARROW_LEFT")
        self.prev_btn.clicked.connect(lambda: self._go_to_page(self.current_page - 1))
        layout.addWidget(self.prev_btn)

        layout.addStretch()

        self.page_label1 = QLabel(self.tr.t("labels.page"))
        self.page_label1.setStyleSheet(f"""
            color: {self.theme.get_color('text_primary')};
            font-weight: 600;
            font-size: 13px;
            background: transparent;
        """)
        layout.addWidget(self.page_label1)

        self.page_input = QLineEdit()
        self.page_input.setFixedWidth(50)
        self.page_input.setPlaceholderText(self.tr.t("labels.page"))
        self.page_input.setStyleSheet(f"""
            QLineEdit {{
                background-color: {self.theme.get_color('bg_tertiary')};
                border: 2px solid {self.theme.get_color('border')};
                border-radius: 6px;
                padding: 2px 8px;
                color: {self.theme.get_color('text_primary')};
                font-size: 12px;
                text-align: center;
            }}
            QLineEdit:focus {{
                border-color: {self.theme.get_color('primary')};
            }}
        """)
        self.page_input.returnPressed.connect(self._on_page_input)
        layout.addWidget(self.page_input)

        self.page_label2 = QLabel(self.tr.t("labels.of", total=1))
        self.page_label2.setStyleSheet(f"""
            color: {self.theme.get_color('text_primary')};
            font-weight: 600;
            font-size: 13px;
            background: transparent;
        """)
        layout.addWidget(self.page_label2)

        layout.addStretch()

        self.next_btn = self._create_page_btn("ICON_ARROW_RIGHT")
        self.next_btn.clicked.connect(lambda: self._go_to_page(self.current_page + 1))
        layout.addWidget(self.next_btn)

        self.last_btn = self._create_page_btn("ICON_ARROW_DOUBLE_RIGHT")
        self.last_btn.clicked.connect(lambda: self._go_to_page(self.total_pages))
        layout.addWidget(self.last_btn)

        return bar

    def _create_page_btn(self, icon_name: str) -> QPushButton:
        btn = QPushButton()
        btn.setIcon(get_icon(icon_name))
        btn.setIconSize(QSize(18, 18))
        btn.setFixedSize(32, 28)
        btn.setStyleSheet(f"""
            QPushButton {{
                background-color: rgba(0, 0, 0, 0.2);
                border: none;
                border-radius: 6px;
            }}
            QPushButton:hover {{
                background-color: {self.theme.get_color('primary')};
            }}
            QPushButton:disabled {{
                background-color: transparent;
            }}
        """)
        btn.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        return btn

    def _on_page_input(self):
        self.page_input.clearFocus()
        try:
            page = int(self.page_input.text().strip())
            if 1 <= page <= self.total_pages:
                self._go_to_page(page)
            self.page_input.clear()
        except ValueError:
            self.page_input.clear()
            NotificationLabel.show_notification(self, self.tr.t("messages.invalid_page_number"))

    def _go_to_page(self, page: int):
        if self._is_loading_page:
            return
        self.page_input.clearFocus()
        page = max(1, min(page, self.total_pages))
        if page != self.current_page:
            self.current_page = page
            self.selected_pubfileid = None
            filters = self.filter_bar.get_current_filters()
            filters.page = page
            self.filter_bar.set_page(page)
            self.parser.load_page(filters)
            self.scroll_area.verticalScrollBar().setValue(0)

    def _on_login_success(self):
        self._initial_load()

    def _on_login_failed(self, error: str):
        print("[Workshop Tab]: Login failed (May be lie)")
        self._initial_load()

    def _initial_load(self):
        self.parser.load_page(self.filter_bar.get_current_filters())

    def _on_refresh_requested(self, filters: WorkshopFilters):
        if self._is_loading_page:
            return
        filters.page = self.current_page
        self.filter_bar.set_page(self.current_page)
        self.selected_pubfileid = None
        self.parser.load_page(filters)

    def _on_filters_changed(self, filters: WorkshopFilters):
        if self._is_loading_page:
            return
        self.current_page = 1
        filters.page = 1
        self.filter_bar.set_page(1)
        self.selected_pubfileid = None
        self.parser.load_page(filters)

    def _on_page_loading_started(self):
        self._is_loading_page = True
        self._show_skeleton_grid()
        self._update_pagination_buttons()

    def _on_page_loaded(self, page_data: WorkshopPage):
        self._is_loading_page = False
        self._current_page_data = page_data
        self.current_page = page_data.current_page
        self.total_pages = max(1, page_data.total_pages)

        if self._loading_overlay:
            self._loading_overlay.hide()

        cache = ImageCache.instance()
        cache.preload([item.preview_url for item in page_data.items if item.preview_url])

        self._clear_grid()
        self._populate_grid(page_data.items)
        self._update_pagination()
        
        QTimer.singleShot(50, self._force_grid_update)

        if page_data.items and not self.selected_pubfileid and self.details_container.is_panel_visible():
            self._select_item(page_data.items[0].pubfileid)

        self._try_preload_next_page()

    def _force_grid_update(self):
        self.grid_widget.update_layout()
        self.grid_widget.updateGeometry()
        self.scroll_area.updateGeometry()

    def _try_preload_next_page(self):
        if not self.config.get_preload_next_page():
            return
        
        if not self._current_page_data or not self._current_page_data.filters:
            return
        
        if self.current_page >= self.total_pages:
            return
        
        self.parser.preload_next_page(self._current_page_data.filters)

    def _on_item_details_loaded(self, item: WorkshopItem):
        self._is_loading_details = False
        if item.preview_url:
            self._preview_url_cache[item.pubfileid] = item.preview_url
        if item.file_size:
            size_bytes = parse_file_size_to_bytes(item.file_size)
            if size_bytes > 0:
                self._file_size_cache[item.pubfileid] = size_bytes
                for grid_item in self.grid_items:
                    try:
                        if grid_item and grid_item.pubfileid == item.pubfileid:
                            grid_item.set_file_size_bytes(size_bytes)
                            break
                    except RuntimeError:
                        pass
        self.details_panel.set_workshop_item(item)

    def _on_error(self, error_msg: str):
        print(f"[WorkshopTab] Error: {error_msg}")
        self._is_loading_page = False
        self._is_loading_details = False
        
        if self._loading_overlay:
            self._loading_overlay.hide()
        
        NotificationLabel.show_notification(self, f"Error: {error_msg}")
        self._clear_skeleton_grid()
        self._update_pagination_buttons()

    def _on_download_completed(self, pubfileid: str, success: bool):
        if success:
            if self.we.is_installed(pubfileid):
                cached_item = self.parser.get_cached_item(pubfileid)
                if cached_item:
                    self._save_workshop_metadata_on_download(cached_item)
            self._update_item_statuses()
            if self.selected_pubfileid == pubfileid:
                self.details_panel.refresh_after_state_change()

    def _is_fully_installed(self, pubfileid: str) -> bool:
        return self.we.is_installed(pubfileid) and not self.dm.is_downloading(pubfileid)

    def _show_skeleton_grid(self):
        self._clear_grid()

        if self._loading_overlay:
            self._loading_overlay.show()
            self._loading_overlay.raise_()
            self._loading_overlay.update_position()

        item_size = self.grid_widget.get_current_item_size()

        for i in range(30):
            skeleton = SkeletonGridItem(item_size, self.theme, self)
            self.grid_widget.add_item(skeleton)
            self.skeleton_items.append(skeleton)

        QTimer.singleShot(50, self._force_grid_update)

    def _clear_skeleton_grid(self):
        for item in self.skeleton_items:
            try:
                if item is not None:
                    item.setParent(None)
                    item.deleteLater()
            except RuntimeError:
                pass
        self.skeleton_items.clear()

    def _populate_grid(self, items: List[WorkshopItem]):
        self._clear_skeleton_grid()

        if not items:
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

        for item_data in items:
            grid_item = WorkshopGridItem(
                pubfileid=item_data.pubfileid,
                title=item_data.title,
                preview_url=item_data.preview_url,
                item_size=item_size,
                theme_manager=self.theme,
                parent=self,
            )

            cached_size = self._file_size_cache.get(item_data.pubfileid, 0)
            if cached_size > 0:
                grid_item.set_file_size_bytes(cached_size)

            if self.dm.is_downloading(item_data.pubfileid):
                status_text = self.dm.get_download_status(item_data.pubfileid)
                grid_item.set_status(WorkshopGridItem.STATUS_DOWNLOADING, status_text)
            elif self._is_fully_installed(item_data.pubfileid):
                grid_item.set_status(WorkshopGridItem.STATUS_INSTALLED)
            else:
                grid_item.set_status(WorkshopGridItem.STATUS_AVAILABLE)

            grid_item.clicked.connect(self._select_item)
            self.grid_widget.add_item(grid_item)
            self.grid_items.append(grid_item)

    def _clear_grid(self):
        for item in self.grid_items:
            try:
                if item is not None and hasattr(item, 'release_resources'):
                    item.release_resources()
            except RuntimeError:
                pass
        self._clear_skeleton_grid()
        self.grid_widget.clear_items()
        self.grid_items.clear()

    def _select_item(self, pubfileid: str):
        if not self.details_container.is_panel_visible():
            self.details_container.show_panel()
            self._update_grid_margin(True)
        
        self.selected_pubfileid = pubfileid
        if self._is_fully_installed(pubfileid):
            folder_path = self.we.projects_path / pubfileid
            self.details_panel.set_installed_folder(str(folder_path))
            return
        self.parser.load_item_details(pubfileid)

    def _update_item_statuses(self):
        for item in self.grid_items:
            try:
                if item is None:
                    continue
                if self.dm.is_downloading(item.pubfileid):
                    status_text = self.dm.get_download_status(item.pubfileid)
                    item.set_status(WorkshopGridItem.STATUS_DOWNLOADING, status_text)
                elif self._is_fully_installed(item.pubfileid):
                    item.set_status(WorkshopGridItem.STATUS_INSTALLED)
                else:
                    item.set_status(WorkshopGridItem.STATUS_AVAILABLE)
            except RuntimeError:
                pass

    def _update_pagination(self):
        self.page_label2.setText(self.tr.t("labels.of", total=self.total_pages))
        self.page_input.setText(str(self.current_page))
        self._update_pagination_buttons()

        if self._current_page_data:
            total_items = self._current_page_data.total_items
            current_count = len(self._current_page_data.items)
            start_item = (self.current_page - 1) * 15 + 1
            end_item = min(start_item + current_count - 1, total_items)
            if total_items > 0:
                self.results_label.setText(
                    self.tr.t("labels.showing_wallpapers", start=start_item, end=end_item, total=total_items)
                )
            else:
                self.results_label.setText(self.tr.t("labels.no_wallpapers_found"))
        else:
            self.results_label.setText(self.tr.t("labels.loading_dots"))

    def _update_pagination_buttons(self):
        can_go_back = self.current_page > 1 and not self._is_loading_page
        can_go_forward = self.current_page < self.total_pages and not self._is_loading_page
        self.first_btn.setEnabled(can_go_back)
        self.prev_btn.setEnabled(can_go_back)
        self.next_btn.setEnabled(can_go_forward)
        self.last_btn.setEnabled(can_go_forward)

    def start_download(self, pubfileid: str):
        if self.dm.is_downloading(pubfileid):
            return
        cached_item = self.parser.get_cached_item(pubfileid)
        if cached_item and cached_item.preview_url:
            self._preview_url_cache[pubfileid] = cached_item.preview_url
        if cached_item and cached_item.file_size:
            size_bytes = parse_file_size_to_bytes(cached_item.file_size)
            if size_bytes > 0:
                self._file_size_cache[pubfileid] = size_bytes
                for grid_item in self.grid_items:
                    try:
                        if grid_item and grid_item.pubfileid == pubfileid:
                            grid_item.set_file_size_bytes(size_bytes)
                            break
                    except RuntimeError:
                        pass
        self.dm.start_download(pubfileid, self.config.get_account_number())
        self._update_item_statuses()
        NotificationLabel.show_notification(
            self.details_panel, self.tr.t("messages.download_started"), 55, 15
        )

    def show_downloads_popup(self, button_pos):
        self.downloads_dialog.set_caches(self._preview_url_cache, self._file_size_cache)
        self.downloads_dialog.show()

    def hide_downloads_popup(self):
        self.downloads_dialog.hide()

    def _save_workshop_metadata_on_download(self, item):
        if not self.config or not item.pubfileid:
            return
        
        rating = 0
        rating_star_file = getattr(item, 'rating_star_file', '')
        if rating_star_file:
            rating_map = {
                "5-star_large": 5,
                "4-star_large": 4,
                "3-star_large": 3,
                "2-star_large": 2,
                "1-star_large": 1,
            }
            rating = rating_map.get(rating_star_file, 0)

        posted_timestamp = 0
        updated_timestamp = 0

        if item.posted_date:
            posted_timestamp = self._parse_date_to_timestamp(item.posted_date)
        if item.updated_date:
            updated_timestamp = self._parse_date_to_timestamp(item.updated_date)

        metadata = {
            "title": item.title or item.pubfileid,
            "tags": item.tags or {},
            "rating": rating,
            "num_ratings": getattr(item, 'num_ratings', ''),
            "rating_star_file": rating_star_file,
            "file_size": item.file_size or "",
            "posted_date": posted_timestamp,
            "posted_date_str": item.posted_date or "",
            "updated_date": updated_timestamp,
            "updated_date_str": item.updated_date or "",
            "author": item.author or "",
            "description": item.description or "",
            "preview_url": item.preview_url or "",
        }

        self.config.set_wallpaper_metadata(item.pubfileid, metadata)

    def _parse_date_to_timestamp(self, date_str: str) -> int:
        from datetime import datetime

        if not date_str:
            return 0

        formats = [
            "%d %b, %Y @ %I:%M%p",
            "%d %b @ %I:%M%p",
            "%b %d, %Y @ %I:%M%p",
            "%b %d @ %I:%M%p",
            "%Y-%m-%d",
            "%d.%m.%Y",
        ]

        for fmt in formats:
            try:
                dt = datetime.strptime(date_str.strip(), fmt)
                if dt.year == 1900:
                    dt = dt.replace(year=datetime.now().year)
                return int(dt.timestamp())
            except ValueError:
                continue

        return 0

    def cleanup(self):
        if hasattr(self, '_status_timer'):
            self._status_timer.stop()
        if hasattr(self, 'parser'):
            self.parser.cleanup()
        
        if self._loading_overlay:
            self._loading_overlay.hide()
        
        ImageCache.instance().clear()
        self._preview_url_cache.clear()
        self._file_size_cache.clear()
        self._clear_grid()