from PyQt6.QtCore import QEvent, QPoint, QRect, QRectF, Qt, pyqtSignal
from PyQt6.QtGui import QColor, QPainter, QPainterPath, QPen
from PyQt6.QtWidgets import QApplication, QDialog, QFrame, QGraphicsDropShadowEffect, QVBoxLayout


class PopupPanel(QDialog):
    closed = pyqtSignal()

    def __init__(self, theme_manager, title: str = "", parent=None):
        super().__init__(parent)
        self.theme = theme_manager
        self._anchor_widget = None
        self._outside_filter_installed = False
        self._side = "right"

        self._seam_right = False
        self._seam_rect_top = 0
        self._seam_rect_height = 0

        self._shadow_margin = 18

        self.setWindowFlags(
            Qt.WindowType.Dialog
            | Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.NoDropShadowWindowHint
        )
        self.setModal(False)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setObjectName("popupPanelDialog")

        self._main_layout = QVBoxLayout(self)
        self._main_layout.setContentsMargins(
            self._shadow_margin,
            self._shadow_margin,
            self._shadow_margin,
            self._shadow_margin,
        )
        self._main_layout.setSpacing(0)

        self.container = QFrame(self)
        self.container.setObjectName("popupPanelContainer")
        self.container.setStyleSheet("background: transparent; border: none;")

        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(28)
        shadow.setOffset(0, 8)
        shadow.setColor(QColor(0, 0, 0, 110))
        self.container.setGraphicsEffect(shadow)

        self._content_layout = QVBoxLayout(self.container)
        self._content_layout.setContentsMargins(0, 0, 0, 0)
        self._content_layout.setSpacing(0)

        self._main_layout.addWidget(self.container)

        self.hide()

    def body_layout(self) -> QVBoxLayout:
        return self._content_layout

    def set_title(self, title: str) -> None:
        pass

    def set_right_seam(self, enabled: bool, top: int = 0, height: int = 0) -> None:
        self._seam_right = enabled
        self._seam_rect_top = top
        self._seam_rect_height = height
        self.update()

    def _screen_geometry_for_anchor(self):
        if self._anchor_widget is not None:
            window = self._anchor_widget.window().windowHandle()
            if window is not None and window.screen() is not None:
                return window.screen().availableGeometry()

            screen = QApplication.screenAt(
                self._anchor_widget.mapToGlobal(self._anchor_widget.rect().center())
            )
            if screen is not None:
                return screen.availableGeometry()

        screen = QApplication.primaryScreen()
        return screen.availableGeometry() if screen else None

    def _fit_to_screen(self, x: int, y: int) -> QPoint:
        available = self._screen_geometry_for_anchor()
        if not available:
            return QPoint(x, y)

        margin = 8
        x = max(
            available.left() + margin,
            min(x, available.right() - self.width() - margin),
        )
        y = max(
            available.top() + margin,
            min(y, available.bottom() - self.height() - margin),
        )
        return QPoint(x, y)

    def show_below(self, anchor_widget, x_offset: int = 0, y_overlap: int = 1) -> None:
        if anchor_widget is None:
            return

        self._anchor_widget = anchor_widget
        self.adjustSize()

        anchor_rect = anchor_widget.rect()
        anchor_global = anchor_widget.mapToGlobal(anchor_rect.bottomLeft())

        x = anchor_global.x() + x_offset
        y = anchor_global.y() - y_overlap

        fitted = self._fit_to_screen(x, y)
        self.move(fitted)
        self.show()
        self.raise_()
        self.activateWindow()

    def show_right_of(
        self,
        anchor_widget,
        x_overlap: int = 6,
        y_offset: int = 0,
        x_gap: int | None = None,
    ) -> None:
        if anchor_widget is None:
            return

        self._anchor_widget = anchor_widget
        self.adjustSize()

        anchor_rect = anchor_widget.rect()
        anchor_top_right = anchor_widget.mapToGlobal(anchor_rect.topRight())
        anchor_top_left = anchor_widget.mapToGlobal(anchor_rect.topLeft())

        if x_gap is not None:
            right_x = anchor_top_right.x() + x_gap
            left_x = anchor_top_left.x() - self.width() - x_gap
        else:
            right_x = anchor_top_right.x() - x_overlap
            left_x = anchor_top_left.x() - self.width() + x_overlap

        y = anchor_top_right.y() + y_offset

        self._side = "right"
        x = right_x

        available = self._screen_geometry_for_anchor()
        if available is not None:
            margin = 8
            if right_x + self.width() > available.right() - margin:
                self._side = "left"
                x = left_x

        fitted = self._fit_to_screen(x, y)
        self.move(fitted)
        self.show()
        self.raise_()
        self.activateWindow()

    def hide_and_emit(self) -> None:
        self.hide()
        self.closed.emit()

    def showEvent(self, event) -> None:
        super().showEvent(event)
        if not self._outside_filter_installed:
            QApplication.instance().installEventFilter(self)
            self._outside_filter_installed = True

    def hideEvent(self, event) -> None:
        super().hideEvent(event)
        if self._outside_filter_installed:
            QApplication.instance().removeEventFilter(self)
            self._outside_filter_installed = False

    def eventFilter(self, obj, event):
        if not self.isVisible():
            return False

        if event.type() == QEvent.Type.MouseButtonPress:
            try:
                global_pos = event.globalPosition().toPoint()
            except Exception:
                return False

            inside_popup = self.frameGeometry().contains(global_pos)

            inside_anchor = False
            if self._anchor_widget is not None:
                local_pos = self._anchor_widget.mapFromGlobal(global_pos)
                inside_anchor = self._anchor_widget.rect().contains(local_pos)

            if not inside_popup and not inside_anchor:
                self.hide_and_emit()

            return False

        if event.type() == QEvent.Type.KeyPress and event.key() == Qt.Key.Key_Escape:
            self.hide_and_emit()
            return True

        return False

    def _build_popup_path(self, rect: QRectF, radius: float) -> QPainterPath:
        left = rect.left()
        top = rect.top()
        right = rect.right()
        bottom = rect.bottom()

        path = QPainterPath()

        if self._side == "right":
            path.moveTo(left, top)
            path.lineTo(right - radius, top)
            path.arcTo(QRectF(right - 2 * radius, top, 2 * radius, 2 * radius), 90, -90)
            path.lineTo(right, bottom - radius)
            path.arcTo(QRectF(right - 2 * radius, bottom - 2 * radius, 2 * radius, 2 * radius), 0, -90)
            path.lineTo(left + radius, bottom)
            path.arcTo(QRectF(left, bottom - 2 * radius, 2 * radius, 2 * radius), 270, -90)
            path.lineTo(left, top)
            path.closeSubpath()
        else:
            path.moveTo(left + radius, top)
            path.lineTo(right, top)
            path.lineTo(right, bottom - radius)
            path.arcTo(QRectF(right - 2 * radius, bottom - 2 * radius, 2 * radius, 2 * radius), 0, -90)
            path.lineTo(left + radius, bottom)
            path.arcTo(QRectF(left, bottom - 2 * radius, 2 * radius, 2 * radius), 270, -90)
            path.lineTo(left, top + radius)
            path.arcTo(QRectF(left, top, 2 * radius, 2 * radius), 180, -90)
            path.lineTo(right, top)
            path.closeSubpath()

        return path

    def paintEvent(self, event) -> None:
        super().paintEvent(event)

        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        rect = QRectF(self.container.geometry())
        radius = 10

        cutout_width = 26
        cutout_height = 43
        cutout_offset_x = 8
        cutout_offset_y = 8

        if self._side == "right":
            cutout_rect = QRectF(
                rect.left() - cutout_offset_x,
                rect.top() - cutout_offset_y,
                cutout_width,
                cutout_height,
            )
        else:
            cutout_rect = QRectF(
                rect.right() - cutout_width + cutout_offset_x,
                rect.top() - cutout_offset_y,
                cutout_width,
                cutout_height,
            )

        for i in range(10, 0, -1):
            alpha = max(0, 22 - i * 2)
            shadow_color = QColor(0, 0, 0, alpha)

            shadow_rect = rect.adjusted(-i, -i + 2, i, i + 2)
            shadow_path = self._build_popup_path(shadow_rect, radius + 1)

            painter.save()
            clip_path = QPainterPath()
            clip_path.addRect(QRectF(self.rect()))
            cut_path = QPainterPath()
            cut_path.addRect(cutout_rect)
            clip_path = clip_path.subtracted(cut_path)

            painter.setClipPath(clip_path)
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(shadow_color)
            painter.drawPath(shadow_path)
            painter.restore()

        bg_path = self._build_popup_path(rect, radius)

        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QColor(self.theme.get_color("bg_tertiary")))
        painter.drawPath(bg_path)