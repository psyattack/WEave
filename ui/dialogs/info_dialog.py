import os

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import QHBoxLayout, QLabel, QPushButton

from infrastructure.resources.resource_manager import get_pixmap
from shared.constants import APP_FULL_NAME
from shared.filesystem import get_app_data_dir
from ui.dialogs.base_dialog import BaseDialog


class InfoDialog(BaseDialog):
    def __init__(self, translator, parent=None, theme_manager=None, main_window=None):
        super().__init__(translator.t("dialog.about"), parent, theme_manager)
        self.tr = translator
        self.main_window = main_window

        self.setMinimumSize(400, 330)
        self.adjustSize()

        icon = QLabel()
        icon.setPixmap(get_pixmap("ICON_APP", size=96))
        icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
        icon.setStyleSheet("border: none; background: none;")
        self.content_layout.addWidget(icon)

        info_text = QLabel(
            f"{APP_FULL_NAME}\n\n"
            f"{self.tr.t('info.description')}\n\n"
            f"{self.tr.t('info.developed')}"
        )
        info_text.setStyleSheet(
            f"""
            color: {self.c_text_primary};
            font-size: 13px;
            background: transparent;
            """
        )
        info_text.setWordWrap(True)
        info_text.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.content_layout.addWidget(info_text)

        github_container = QHBoxLayout()
        github_container.setAlignment(Qt.AlignmentFlag.AlignCenter)
        github_container.setSpacing(8)

        github_icon = QLabel()
        github_icon.setPixmap(get_pixmap("ICON_GITHUB", size=34))
        github_icon.setStyleSheet("border: none; margin-right: -5px;")

        github_link = QLabel(
            f'<a href="https://github.com/psyattack/we-workshop-manager" '
            f'style="color: {self.c_primary}; text-decoration: none;">GitHub</a>'
        )
        github_link.setOpenExternalLinks(True)
        github_link.setStyleSheet("border: none; font-size: 14px; font-weight: bold;")

        github_container.addWidget(github_icon)
        github_container.addWidget(github_link)
        self.content_layout.addLayout(github_container)

        buttons_layout = QHBoxLayout()
        buttons_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        buttons_layout.setSpacing(8)

        check_updates_btn = QPushButton(self.tr.t("buttons.check_updates"))
        check_updates_btn.setFixedHeight(38)
        check_updates_btn.setMinimumWidth(175)
        check_updates_btn.setStyleSheet(
            f"""
            QPushButton {{
                background-color: {self.c_bg_tertiary};
                color: {self.c_text_primary};
                border: 2px solid {self.c_border_light};
                border-radius: 8px;
                font-weight: 600;
            }}
            QPushButton:hover {{
                border-color: {self.c_primary};
                background-color: {self.c_bg_secondary};
            }}
            """
        )
        check_updates_btn.clicked.connect(self._on_check_updates_clicked)
        buttons_layout.addWidget(check_updates_btn)

        open_data_folder_btn = QPushButton(self.tr.t("buttons.open_data_folder"))
        open_data_folder_btn.setFixedHeight(38)
        open_data_folder_btn.setMinimumWidth(175)
        open_data_folder_btn.setStyleSheet(
            f"""
            QPushButton {{
                background-color: {self.c_bg_tertiary};
                color: {self.c_text_primary};
                border: 2px solid {self.c_border_light};
                border-radius: 8px;
                font-weight: 600;
            }}
            QPushButton:hover {{
                border-color: {self.c_primary};
                background-color: {self.c_bg_secondary};
            }}
            """
        )
        open_data_folder_btn.clicked.connect(self._on_open_data_folder_clicked)
        buttons_layout.addWidget(open_data_folder_btn)

        self.content_layout.addLayout(buttons_layout)

        ok_btn = QPushButton(self.tr.t("buttons.ok"))
        ok_btn.setFixedHeight(40)
        ok_btn.setStyleSheet(
            f"""
            QPushButton {{
                background-color: {self.c_primary};
                color: {self.c_text_primary};
                border: none;
                border-radius: 8px;
                font-weight: 600;
            }}
            QPushButton:hover {{
                background-color: {self.c_primary_hover};
            }}
            """
        )
        ok_btn.clicked.connect(self.accept)
        self.content_layout.addWidget(ok_btn)

    def _on_check_updates_clicked(self) -> None:
        if self.main_window and hasattr(self.main_window, "check_for_updates"):
            self.main_window.check_for_updates(silent=False)

    def _on_open_data_folder_clicked(self) -> None:
        app_data_path = get_app_data_dir()
        if app_data_path.exists():
            os.startfile(app_data_path)