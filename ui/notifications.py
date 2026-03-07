from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QColor
from PyQt6.QtWidgets import (
    QLabel, QGraphicsDropShadowEffect
)

class NotificationLabel(QLabel):
    def __init__(self, message: str, theme_manager=None, parent=None):
        super().__init__(message, parent)
        self.theme = theme_manager
        
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._apply_style()
        
        QTimer.singleShot(2000, self.deleteLater)
    
    def _get_primary_color(self) -> str:
        if self.theme:
            return self.theme.get_color('primary')
        return '#4A7FD9'
    
    def _get_primary_rgb(self) -> tuple:
        color = QColor(self._get_primary_color())
        return color.red(), color.green(), color.blue()
    
    def _apply_style(self):
        r, g, b = self._get_primary_rgb()
        
        self.setStyleSheet(f"""
            QLabel {{
                background-color: rgba({r}, {g}, {b}, 240);
                color: white;
                padding: 12px 20px;
                border-radius: 10px;
                font-size: 14px;
                font-weight: 700;
            }}
        """)
        
        # Shadow
        shadow = QGraphicsDropShadowEffect()
        shadow.setBlurRadius(15)
        shadow.setColor(QColor(r, g, b, 120))
        shadow.setOffset(0, 4)
        self.setGraphicsEffect(shadow)
    
    @staticmethod
    def show_notification(parent, message: str, x: int = 935, y: int = 15, theme_manager=None):
        if not parent or not message:
            return
        
        if theme_manager is None:
            theme_manager = NotificationLabel._find_theme_manager(parent)
        
        notification = NotificationLabel(message, theme_manager, parent)
        notification.adjustSize()
        
        if notification.width() < 200:
            notification.setFixedWidth(200)
        
        notification.move(x, y)
        notification.show()
        notification.raise_()
    
    @staticmethod
    def _find_theme_manager(widget):
        current = widget
        while current:
            if hasattr(current, 'theme'):
                return current.theme
            current = current.parent() if hasattr(current, 'parent') else None
        return None
