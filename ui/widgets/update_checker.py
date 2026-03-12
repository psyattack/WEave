from PyQt6.QtCore import QThread, pyqtSignal

from services.update_service import UpdateService


class UpdateCheckWorker(QThread):
    completed = pyqtSignal(object)

    def __init__(self, skipped_version: str = "", parent=None):
        super().__init__(parent)
        self.skipped_version = skipped_version

    def run(self):
        result = UpdateService.check_for_updates(skipped_version=self.skipped_version)
        self.completed.emit(result)