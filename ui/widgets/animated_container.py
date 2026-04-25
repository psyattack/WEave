from PyQt6.QtCore import QEasingCurve, QPropertyAnimation, pyqtProperty, pyqtSignal
from PyQt6.QtWidgets import QWidget


class AnimatedDetailsContainer(QWidget):
    """Animated container for details panel with smooth width transitions."""
    
    animation_finished = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._target_width = 320
        self._current_width = 320
        self._is_panel_visible = True

        # Setup animation with cubic easing for smooth transitions
        self._animation = QPropertyAnimation(self, b"panelWidth")
        self._animation.setDuration(250)
        self._animation.setEasingCurve(QEasingCurve.Type.InOutCubic)
        self._animation.finished.connect(self._on_animation_finished)

        self.setFixedWidth(self._target_width)
        self.setMinimumWidth(0)

    def get_panel_width(self) -> int:
        return self._current_width

    def set_panel_width(self, width: int) -> None:
        self._current_width = width
        self.setFixedWidth(max(0, width))

    panelWidth = pyqtProperty(int, get_panel_width, set_panel_width)

    def set_target_width(self, width: int) -> None:
        """Set the target width when panel is visible."""
        self._target_width = width
        if self._is_panel_visible:
            self._current_width = width
            self.setFixedWidth(width)

    def is_panel_visible(self) -> bool:
        return self._is_panel_visible

    def show_panel(self) -> None:
        """Animate panel expansion from 0 to target width."""
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

    def hide_panel(self) -> None:
        """Animate panel collapse from current width to 0."""
        if not self._is_panel_visible:
            return
        self._is_panel_visible = False
        self._animation.stop()
        self._animation.setStartValue(self._current_width)
        self._animation.setEndValue(0)
        self._animation.start()

    def _on_animation_finished(self) -> None:
        """Hide widget after collapse animation completes."""
        if not self._is_panel_visible:
            self.setVisible(False)
        self.animation_finished.emit()
