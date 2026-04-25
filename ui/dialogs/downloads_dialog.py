import webbrowser
import weakref

from PyQt6.QtCore import QPoint, QTimer, Qt, QSize, pyqtSignal, QByteArray, QBuffer, QIODevice
from PyQt6.QtGui import QMovie, QPainter, QPainterPath, QPixmap
from PyQt6.QtWidgets import QHBoxLayout, QLabel, QScrollArea, QVBoxLayout, QWidget, QPushButton

from infrastructure.cache.image_cache import ImageCache
from infrastructure.resources.resource_manager import get_icon
from ui.dialogs.base_dialog import BaseDialog
from ui.widgets.progress import SmallCircularProgress


class DownloadsDialog(BaseDialog):
    download_cancelled = pyqtSignal(str)

    def __init__(self, translator, theme_manager, download_service, parser, parent=None):
        super().__init__(translator.t("dialog.tasks"), parent, theme_manager, icon="ICON_TASK")

        self.tr = translator
        self.dm = download_service
        self.parser = parser

        self._preview_url_cache: dict[str, str] = {}
        self._file_size_cache: dict[str, int] = {}

        self.setFixedSize(400, 400)

        self._setup_content()
        self._setup_update_timer()

    def set_caches(self, preview_cache: dict, size_cache: dict) -> None:
        self._preview_url_cache = preview_cache
        self._file_size_cache = size_cache

    def showAt(self, global_pos: QPoint) -> None:
        self.move(global_pos)
        self.show()

    def showEvent(self, event):
        super().showEvent(event)
        self.update_timer.start()
        self._update_list()

    def hideEvent(self, event):
        self.update_timer.stop()
        super().hideEvent(event)

    def _setup_content(self) -> None:
        scroll = QScrollArea(self)
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll.setStyleSheet(
            f"""
            QScrollArea {{
                background: transparent;
                border: none;
            }}

            QScrollBar:vertical {{
                background: {self.c_bg_tertiary};
                width: 6px;
                border-radius: 3px;
            }}

            QScrollBar::handle:vertical {{
                background: {self.c_border_light};
                border-radius: 3px;
                min-height: 30px;
            }}

            QScrollBar::handle:vertical:hover {{
                background: {self.c_primary};
            }}

            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
                height: 0px;
            }}
            """
        )

        self.scroll_container = QWidget(scroll)
        self.scroll_container.setStyleSheet("background: transparent;")

        self.scroll_layout = QVBoxLayout(self.scroll_container)
        self.scroll_layout.setContentsMargins(5, 5, 5, 5)
        self.scroll_layout.setSpacing(6)
        self.scroll_layout.setAlignment(Qt.AlignmentFlag.AlignTop)

        scroll.setWidget(self.scroll_container)
        self.content_layout.addWidget(scroll)

    def _setup_update_timer(self) -> None:
        self.update_timer = QTimer()
        self.update_timer.timeout.connect(self._update_list)
        self.update_timer.setInterval(500)

    def _update_list(self) -> None:
        while self.scroll_layout.count():
            child = self.scroll_layout.takeAt(0)
            if child is not None and child.widget() is not None:
                try:
                    child.widget().deleteLater()
                except RuntimeError:
                    pass

        all_tasks = []

        for pubfileid, info in self.dm.downloading.items():
            all_tasks.append(("download", pubfileid, info))

        for pubfileid, info in self.dm.extracting.items():
            all_tasks.append(("extract", pubfileid, info))

        if not all_tasks:
            label = QLabel(self.tr.t("labels.no_tasks"), self.scroll_container)
            label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            label.setStyleSheet(
                f"""
                color: {self.c_text_secondary};
                font-size: 13px;
                background-color: {self.c_bg_tertiary};
                padding: 12px 16px;
                border-radius: 8px;
                """
            )
            label.setFixedHeight(60)
            self.scroll_layout.addWidget(label)
            self.scroll_layout.addStretch()
            return

        for task_type, pubfileid, info in all_tasks:
            self._create_task_item(task_type, pubfileid, info)

        self.scroll_layout.addStretch()

    def _create_task_item(self, task_type: str, pubfileid: str, info) -> None:
        item_widget = QWidget(self.scroll_container)
        item_widget.setFixedHeight(68)
        item_widget.setStyleSheet(
            f"""
            QWidget {{
                background-color: {self.c_bg_tertiary};
                border: 2px solid {self.c_border_light};
                border-radius: 8px;
            }}
            """
        )

        item_layout = QHBoxLayout(item_widget)
        item_layout.setContentsMargins(8, 8, 10, 8)
        item_layout.setSpacing(10)

        preview_url = self._preview_url_cache.get(pubfileid)
        if not preview_url and self.parser:
            cached_item = self.parser.get_cached_item(pubfileid)
            if cached_item and cached_item.preview_url:
                preview_url = cached_item.preview_url
                self._preview_url_cache[pubfileid] = preview_url

        preview_label = QLabel(item_widget)
        preview_label.setFixedSize(52, 52)
        preview_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        preview_label.setStyleSheet("background: transparent; border: none;")
        
        if preview_url:
            self._load_preview_for_label(preview_label, preview_url)
        else:
            preview_label.setText("")
        
        item_layout.addWidget(preview_label)

        progress = SmallCircularProgress(
            size=52,
            line_width=3,
            theme_manager=self.theme,
            parent=item_widget,
        )
        progress.setStyleSheet("border: none;")

        status_text = getattr(info, "status", "")
        file_size_bytes = self._file_size_cache.get(pubfileid, 0)
        is_extraction = task_type == "extract"

        progress.update_from_status(status_text, file_size_bytes, is_extraction)
        item_layout.addWidget(progress)

        text_container = QWidget(item_widget)
        text_container.setStyleSheet("background: transparent; border: none;")

        text_layout = QVBoxLayout(text_container)
        text_layout.setContentsMargins(0, 0, 0, 0)
        text_layout.setSpacing(2)

        short_id = pubfileid[:12] + "..." if len(pubfileid) > 12 else pubfileid

        if task_type == "download":
            prefix = self.tr.t("labels.download_prefix", id=short_id)
        else:
            prefix = self.tr.t("labels.extract_prefix", id=short_id)

        title_label = QLabel(prefix, text_container)
        title_label.setStyleSheet(
            f"""
            color: {self.c_text_primary};
            font-size: 12px;
            font-weight: 600;
            background: transparent;
            border: none;
            """
        )
        title_label.setWordWrap(True)
        title_label.setCursor(Qt.CursorShape.PointingHandCursor)
        title_label.mousePressEvent = lambda e, pid=pubfileid: self._on_open_browser(pid)
        text_layout.addWidget(title_label)

        display_status = status_text[:40] + "..." if len(status_text) > 40 else status_text
        if not display_status:
            display_status = self.tr.t("labels.starting")

        status_label = QLabel(display_status, text_container)
        status_label.setStyleSheet(
            f"""
            color: {self.c_text_disabled};
            font-size: 10px;
            background: transparent;
            border: none;
            """
        )
        status_label.setWordWrap(True)
        text_layout.addWidget(status_label)

        item_layout.addWidget(text_container, 1)

        if task_type == "download":
            delete_btn = QPushButton(item_widget)
            delete_btn.setIcon(get_icon("ICON_DELETE"))
            delete_btn.setIconSize(QSize(28, 28))
            delete_btn.setFixedSize(36, 36)
            delete_btn.setStyleSheet("QPushButton { background: transparent; border: none; }")
            delete_btn.clicked.connect(lambda checked=False, pid=pubfileid: self._cancel_download(pid))
            item_layout.addWidget(delete_btn)

        self.scroll_layout.addWidget(item_widget)

    def _load_preview_for_label(self, label: QLabel, preview_url: str) -> None:
        cache = ImageCache.instance()

        gif_data = cache.get_gif(preview_url)
        if gif_data:
            self._play_gif_in_label(label, gif_data)
            return

        pixmap = cache.get_pixmap(preview_url)
        if pixmap:
            self._set_pixmap_in_label(
                label,
                pixmap.scaled(
                    52,
                    52,
                    Qt.AspectRatioMode.KeepAspectRatio,
                    Qt.TransformationMode.SmoothTransformation,
                )
            )
            return

        label.setText("")

        weak_label = weakref.ref(label)
        expected_url = preview_url

        def on_loaded(url: str, data, is_gif: bool):
            label_ref = weak_label()
            if label_ref is None:
                return

            if data is None:
                return

            if is_gif:
                self._play_gif_in_label(label_ref, data)
            else:
                self._set_pixmap_in_label(
                    label_ref,
                    data.scaled(
                        52,
                        52,
                        Qt.AspectRatioMode.KeepAspectRatio,
                        Qt.TransformationMode.SmoothTransformation,
                    )
                )

        cache.load_image(preview_url, callback=on_loaded)

    def _play_gif_in_label(self, label: QLabel, data: QByteArray) -> None:
        buffer = QBuffer(label)
        buffer.setData(data)
        buffer.open(QIODevice.OpenModeFlag.ReadOnly)

        movie = QMovie(label)
        movie.setDevice(buffer)
        
        movie.jumpToFrame(0)
        original_size = movie.currentImage().size()
        if not original_size.isEmpty():
            scaled_size = original_size.scaled(52, 52, Qt.AspectRatioMode.KeepAspectRatio)
            movie.setScaledSize(scaled_size)

        label.setStyleSheet("background: transparent; border: none;")
        label.setText("")
        label.setMovie(movie)
        
        movie.frameChanged.connect(lambda frame_num: self._on_label_gif_frame_changed(label, movie))
        movie.start()

    def _on_label_gif_frame_changed(self, label: QLabel, movie: QMovie) -> None:
        if movie is None:
            return

        current_pixmap = movie.currentPixmap()
        if not current_pixmap.isNull():
            label.setPixmap(self._create_rounded_pixmap(current_pixmap, radius=6))

    def _set_pixmap_in_label(self, label: QLabel, pixmap: QPixmap) -> None:
        label.setStyleSheet("background: transparent; border: none;")
        label.setText("")
        label.setPixmap(self._create_rounded_pixmap(pixmap, radius=6))

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

    def _on_open_browser(self, pubfileid: str) -> None:
        webbrowser.open(f"https://steamcommunity.com/sharedfiles/filedetails/?id={pubfileid}")

    def _cancel_download(self, pubfileid: str) -> None:
        self.download_cancelled.emit(pubfileid)
        QTimer.singleShot(100, self._update_list)