from PyQt6.QtCore import Qt, QTimer, QPropertyAnimation, QEasingCurve, pyqtProperty
from PyQt6.QtWidgets import QLabel, QMessageBox
from shared.formatting import hex_to_rgb

class NotificationLabel(QLabel):
    _active_notifications: list["NotificationLabel"] = []

    def __init__(self, message: str, theme_service=None, parent=None):
        super().__init__(message, parent)
        self.theme_service = theme_service
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._opacity_value = 1.0
        self._fade_anim = None
        self._apply_style()

        NotificationLabel._active_notifications.append(self)

        self._fade_timer = QTimer(self)
        self._fade_timer.setSingleShot(True)
        self._fade_timer.timeout.connect(self._start_fade_out)
        self._fade_timer.start(2500)

    def _get_primary_color(self) -> str:
        if self.theme_service:
            return self.theme_service.get_color("primary")
        return "#4A7FD9"

    def _get_bg_color(self) -> str:
        if self.theme_service:
            return self.theme_service.get_color("bg_elevated")
        return "#2A2F42"

    def _get_border_color(self) -> str:
        if self.theme_service:
            return self.theme_service.get_color("border_light")
        return "#3A3F52"

    def _get_text_color(self) -> str:
        if self.theme_service:
            return self.theme_service.get_color("text_primary")
        return "#FFFFFF"

    def get_opacity_value(self):
        return self._opacity_value

    def set_opacity_value(self, v):
        self._opacity_value = v
        self.setStyleSheet(self._build_style(v))

    opacity_value = pyqtProperty(float, get_opacity_value, set_opacity_value)

    def _build_style(self, opacity: float = 1.0) -> str:
        alpha_bg = int(230 * opacity)
        alpha_border = int(180 * opacity)
        alpha_text = int(255 * opacity)
        pr, pg, pb = hex_to_rgb(self._get_primary_color())
        br, bg_, bb = hex_to_rgb(self._get_bg_color())
        bdr, bdg, bdb = hex_to_rgb(self._get_border_color())
        tr, tg, tb = hex_to_rgb(self._get_text_color())

        return f"""
            QLabel {{
                background-color: rgba({br}, {bg_}, {bb}, {alpha_bg});
                color: rgba({tr}, {tg}, {tb}, {alpha_text});
                border: 1px solid rgba({bdr}, {bdg}, {bdb}, {alpha_border});
                border-left: 3px solid rgba({pr}, {pg}, {pb}, {alpha_border});
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 12px;
                font-weight: 600;
            }}
        """

    def _apply_style(self) -> None:
        self.setStyleSheet(self._build_style(1.0))

    def _start_fade_out(self):
        if self._fade_anim is not None:
            return

        anim = QPropertyAnimation(self, b"opacity_value")
        anim.setDuration(400)
        anim.setStartValue(self._opacity_value)
        anim.setEndValue(0.0)
        anim.setEasingCurve(QEasingCurve.Type.InCubic)
        anim.finished.connect(self._cleanup)
        self._fade_anim = anim
        anim.start()

    def _cleanup(self):
        try:
            NotificationLabel._active_notifications.remove(self)
        except ValueError:
            pass
        self.deleteLater()

    def deleteLater(self):
        if self._fade_anim is not None:
            try:
                self._fade_anim.stop()
            except Exception:
                pass
            self._fade_anim = None
        if self._fade_timer is not None:
            try:
                self._fade_timer.stop()
            except Exception:
                pass
        try:
            NotificationLabel._active_notifications.remove(self)
        except ValueError:
            pass
        super().deleteLater()

    @staticmethod
    def _find_theme_service(widget):
        current = widget
        while current:
            if hasattr(current, "theme"):
                return current.theme
            current = current.parent() if hasattr(current, "parent") else None
        return None

    @staticmethod
    def _find_main_window(widget):
        current = widget
        while current:
            if hasattr(current, "title_bar") and hasattr(current, "side_nav"):
                return current
            current = current.parent() if hasattr(current, "parent") else None
        return None

    @staticmethod
    def show_notification(
        parent, message: str, x: int = -1, y: int = -1, theme_service=None
    ) -> None:
        if not parent or not message:
            return

        if theme_service is None:
            theme_service = NotificationLabel._find_theme_service(parent)

        main_window = NotificationLabel._find_main_window(parent)

        if main_window:
            notif_parent = main_window.centralWidget() or main_window
        else:
            notif_parent = parent

        for existing in list(NotificationLabel._active_notifications):
            try:
                if existing.parent() is notif_parent:
                    existing._fade_timer.stop()
                    if existing._fade_anim is not None:
                        existing._fade_anim.stop()
                        existing._fade_anim = None
                    try:
                        NotificationLabel._active_notifications.remove(existing)
                    except ValueError:
                        pass
                    existing.deleteLater()
            except RuntimeError:
                try:
                    NotificationLabel._active_notifications.remove(existing)
                except ValueError:
                    pass

        notification = NotificationLabel(message, theme_service, notif_parent)
        notification.adjustSize()
        min_w = max(180, notification.sizeHint().width() + 20)
        notification.setMinimumWidth(min_w)
        notification.adjustSize()

        if main_window:
            try:
                btn_area_width = 3 * 38 + 2 * 2 + 20
                window_width = notif_parent.width()
                nx = window_width - btn_area_width - notification.width()
                ny = 12
                if nx < 5:
                    nx = 5
                notification.move(nx, ny)
            except Exception:
                notification.move(
                    notif_parent.width() - notification.width() - 160, 12
                )
        elif x >= 0 and y >= 0:
            notification.move(x, y)
        else:
            notification.move(
                notif_parent.width() - notification.width() - 160, 12
            )

        notification.show()
        notification.raise_()


class MessageBox(QMessageBox):
    Icon = QMessageBox.Icon
    StandardButton = QMessageBox.StandardButton
    ButtonRole = QMessageBox.ButtonRole

    def __init__(self, theme_service, title, text, icon=QMessageBox.Icon.Information, parent=None):
        super().__init__(parent)
        self.theme_service = theme_service
        self._setup_colors()
        self.setWindowTitle(title)
        self.setText(text)
        self.setIcon(icon)
        self.setWindowFlags(Qt.WindowType.Dialog | Qt.WindowType.FramelessWindowHint)
        self._apply_style()

    def _setup_colors(self) -> None:
        if self.theme_service:
            self.c_bg_primary = self.theme_service.get_color("bg_primary")
            self.c_bg_secondary = self.theme_service.get_color("bg_secondary")
            self.c_bg_tertiary = self.theme_service.get_color("bg_tertiary")
            self.c_border = self.theme_service.get_color("border")
            self.c_border_light = self.theme_service.get_color("border_light")
            self.c_text_primary = self.theme_service.get_color("text_primary")
            self.c_text_secondary = self.theme_service.get_color("text_secondary")
            self.c_primary = self.theme_service.get_color("primary")
            self.c_primary_hover = self.theme_service.get_color("primary_hover")
            self.c_accent_red = self.theme_service.get_color("accent_red")
        else:
            self.c_bg_primary = "#0F111A"
            self.c_bg_secondary = "#1A1D2E"
            self.c_bg_tertiary = "#252938"
            self.c_border = "#2A2F42"
            self.c_border_light = "#3A3F52"
            self.c_text_primary = "#FFFFFF"
            self.c_text_secondary = "#B4B7C3"
            self.c_primary = "#4A7FD9"
            self.c_primary_hover = "#5B8FE9"
            self.c_accent_red = "#EF5B5B"

    def _apply_style(self) -> None:
        self.setStyleSheet(f"""
            QMessageBox {{ background-color: {self.c_bg_secondary}; border: 2px solid {self.c_border_light}; }}
            QMessageBox QLabel {{ color: {self.c_text_primary}; background: transparent; font-size: 13px; }}
            QMessageBox QPushButton {{ background-color: {self.c_primary}; color: {self.c_text_primary}; border: none;
                border-radius: 8px; padding: 8px 20px; font-weight: 600; min-width: 80px; }}
            QMessageBox QPushButton:hover {{ background-color: {self.c_primary_hover}; }}
        """)

    @staticmethod
    def _find_theme_service(widget):
        current = widget
        while current:
            if hasattr(current, "theme"):
                return current.theme
            current = current.parent() if hasattr(current, "parent") else None
        return None

    @staticmethod
    def show(parent, title: str, text: str, icon=QMessageBox.Icon.Information,
             buttons=QMessageBox.StandardButton.Ok, default_button=None, theme_service=None):
        if theme_service is None and parent:
            theme_service = MessageBox._find_theme_service(parent)
        msg_box = MessageBox(theme_service, title, text, icon, parent)
        msg_box.setStandardButtons(buttons)
        if default_button:
            msg_box.setDefaultButton(default_button)
        return msg_box.exec()

    @staticmethod
    def information(parent, title: str, text: str, buttons=QMessageBox.StandardButton.Ok, theme_service=None):
        return MessageBox.show(parent, title, text, QMessageBox.Icon.Information, buttons, theme_service=theme_service)

    @staticmethod
    def warning(parent, title: str, text: str, buttons=QMessageBox.StandardButton.Ok, theme_service=None):
        return MessageBox.show(parent, title, text, QMessageBox.Icon.Warning, buttons, theme_service=theme_service)

    @staticmethod
    def critical(parent, title: str, text: str, buttons=QMessageBox.StandardButton.Ok, theme_service=None):
        return MessageBox.show(parent, title, text, QMessageBox.Icon.Critical, buttons, theme_service=theme_service)

    @staticmethod
    def question(parent, title: str, text: str,
                 buttons=QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                 default_button=QMessageBox.StandardButton.Yes, theme_service=None):
        return MessageBox.show(parent, title, text, QMessageBox.Icon.Question, buttons, default_button, theme_service)

    @staticmethod
    def confirm(parent, title: str, text: str, theme_service=None) -> bool:
        result = MessageBox.question(
            parent, title, text,
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.Yes, theme_service,
        )
        return result == QMessageBox.StandardButton.Yes