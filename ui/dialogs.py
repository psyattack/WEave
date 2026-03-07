from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QColor
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, 
    QPushButton, QTextEdit, QFrame, QGraphicsDropShadowEffect, QWidget, QMessageBox, QComboBox, QLineEdit, QApplication
)
from resources.icons import get_icon,get_pixmap
import re
from utils.helpers import restart_application
from ui.notifications import NotificationLabel

class CustomDialog(QDialog):
    def __init__(self, title: str = "Dialog", parent=None):
        super().__init__(parent)
        
        self.setWindowFlags(
            Qt.WindowType.Dialog |
            Qt.WindowType.FramelessWindowHint
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        
        self.container = QFrame(self)
        self.container.setStyleSheet("""
            QFrame {
                background-color: #1A1D2E;
                border-radius: 12px;
                border: 2px solid #3A3F52;
            }
        """)
        
        shadow = QGraphicsDropShadowEffect()
        shadow.setBlurRadius(30)
        shadow.setColor(QColor(0, 0, 0, 120))
        shadow.setOffset(0, 8)
        self.container.setGraphicsEffect(shadow)

        self.main_layout = QVBoxLayout(self)
        self.main_layout.setContentsMargins(0, 0, 0, 0)
        self.main_layout.addWidget(self.container)
        
        self.content_layout = QVBoxLayout(self.container)
        self.content_layout.setContentsMargins(20, 20, 20, 20)
        self.content_layout.setSpacing(15)
        
        self._create_title_bar(title)
        
        # For moving
        self.old_pos = None
    
    def _create_title_bar(self, title):
        title_bar = QWidget()
        title_bar.setFixedHeight(40)
        title_bar.setStyleSheet("QWidget { background: transparent; border: none; }")
        title_layout = QHBoxLayout(title_bar)
        title_layout.setContentsMargins(0, 0, 0, 10)

        title_label = QLabel(title)
        title_label.setStyleSheet("""
        font-size: 16px;
        font-weight: 700;
        color: white;
        background: transparent;
        """)

        close_btn = QPushButton()
        close_btn.setFixedSize(32, 32)
        close_btn.setIcon(get_icon("ICON_CLOSE"))
        close_btn.setIconSize(QSize(20, 20))
        close_btn.setStyleSheet("""
        QPushButton {
            background-color: transparent;
            border: none;
            border-radius: 16px;
            padding: 0px;
        }
        QPushButton:hover {
            background-color: rgba(239, 91, 91, 0.2);
        }
        QPushButton:pressed {
            background-color: rgba(239, 91, 91, 0.3);
        }
        """)
        close_btn.clicked.connect(self.reject)

        title_layout.addWidget(title_label)
        title_layout.addStretch()
        title_layout.addWidget(close_btn)
        self.content_layout.addWidget(title_bar)
    
    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.old_pos = event.globalPosition().toPoint()
    
    def mouseMoveEvent(self, event):
        if self.old_pos and event.buttons() == Qt.MouseButton.LeftButton:
            delta = event.globalPosition().toPoint() - self.old_pos
            self.move(self.pos() + delta)
            self.old_pos = event.globalPosition().toPoint()
    
    def mouseReleaseEvent(self, event):
        self.old_pos = None

class BatchDownloadDialog(CustomDialog):
    def __init__(self, translator, parent=None):
        super().__init__(translator.t("dialog.batch_download"), parent)
        
        self.tr = translator
        self.pubfileids = []
        
        self.setFixedSize(450, 350)

        label = QLabel(self.tr.t("messages.batch_input_placeholder"))
        label.setStyleSheet("color: white; background: transparent;")
        label.setWordWrap(True)
        self.content_layout.addWidget(label)

        self.text_edit = QTextEdit()
        self.text_edit.setPlaceholderText(self.tr.t("labels.id_url_placeholder"))
        self.text_edit.setStyleSheet("""
            QTextEdit {
                background-color: #252938;
                color: white;
                border: 2px solid #3A3F52;
                border-radius: 8px;
                padding: 10px;
                font-size: 13px;
            }
        """)
        self.content_layout.addWidget(self.text_edit)
        
        btn_layout = QHBoxLayout()
        
        download_btn = QPushButton(self.tr.t("buttons.download_all"))
        download_btn.setFixedHeight(40)
        download_btn.setStyleSheet("""
            QPushButton {
                background-color: #4A7FD9;
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
            }
            QPushButton:hover {
                background-color: #5B8FE9;
            }
        """)
        download_btn.clicked.connect(self._on_download)
        
        btn_layout.addWidget(download_btn)
        
        self.content_layout.addLayout(btn_layout)
    
    def _on_download(self):
        text = self.text_edit.toPlainText().strip()
        if not text:
            return
        
        tokens = re.split(r'\s+', text.replace('\n', ' ').replace('\r', ' '))
        
        seen = set()
        valid_ids = []
        
        for token in tokens:
            token = token.strip()
            if not token:
                continue
            
            pubfileid = None
            
            if token.isdigit() and len(token) >= 8:
                pubfileid = token
            else:
                match = re.search(r'[?&]id=(\d{8,})', token)
                if match:
                    pubfileid = match.group(1)
            
            if pubfileid and pubfileid not in seen:
                valid_ids.append(pubfileid)
                seen.add(pubfileid)
        
        self.pubfileids = valid_ids
        
        if valid_ids:
            self.accept()
        else:
            QMessageBox.warning(self, self.tr.t("dialog.warning"), self.tr.t("messages.invalid_input"))
    
    def get_pubfileids(self):
        return self.pubfileids

class InfoDialog(CustomDialog):
    def __init__(self, translator, parent=None):
        super().__init__(translator.t("dialog.about"), parent)
        
        self.tr = translator
        self.setMinimumSize(400, 280)
        self.adjustSize()
        
        icon = QLabel()
        icon.setPixmap(get_pixmap("ICON_APP", size=128))
        icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
        icon.setStyleSheet("""
            border: none;
            margin-bottom: -10px;
            margin-top: -10px;
        """)
        self.content_layout.addWidget(icon)
        
        info_text = QLabel(
            f"{self.tr.t('info.version')}\n\n"
            f"{self.tr.t('info.description')}\n\n"
            f"{self.tr.t('info.developed')}"
        )
        info_text.setStyleSheet("""
            color: white;
            font-size: 13px;
            background: transparent;
        """)
        info_text.setWordWrap(True)
        info_text.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.content_layout.addWidget(info_text)

        github_container = QHBoxLayout()
        github_container.setAlignment(Qt.AlignmentFlag.AlignCenter)
        github_container.setSpacing(8)

        github_icon = QLabel()
        github_icon.setPixmap(get_pixmap("ICON_GITHUB", size=34)) 
        github_icon.setStyleSheet("border: none; margin-right: -5px;")
        
        github_link = QLabel('<a href="https://github.com/psyattack/we-workshop-manager" style="color: #4A7FD9; text-decoration: none;">GitHub</a>')
        github_link.setOpenExternalLinks(True)
        github_link.setStyleSheet("border: none; font-size: 14px; font-weight: bold;")

        github_container.addWidget(github_icon)
        github_container.addWidget(github_link)

        self.content_layout.addLayout(github_container)

        ok_btn = QPushButton(self.tr.t("buttons.ok"))
        ok_btn.setFixedHeight(40)
        ok_btn.setStyleSheet("""
            QPushButton {
                background-color: #4A7FD9;
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: 600;
            }
            QPushButton:hover {
                background-color: #5B8FE9;
            }
        """)
        ok_btn.clicked.connect(self.accept)
        self.content_layout.addWidget(ok_btn)

class SettingsPopup(CustomDialog):
    def __init__(self, config, accounts, translator, theme_manager, main_window, parent=None):
        super().__init__(translator.t("settings.title"), parent)
        
        self.config = config
        self.accounts = accounts
        self.tr = translator
        self.theme = theme_manager
        self.main_window = main_window
        
        self.setFixedSize(360, 720)
        
        self.container.setStyleSheet("""
            QFrame {
                background-color: #1A1D2E;
                border-radius: 12px;
                border: 2px solid #3A3F52;
            }
        """)
        
        self._setup_ui()
    
    def _setup_ui(self):
        self.content_layout.setSpacing(16)
        
        divider = QFrame()
        divider.setFrameShape(QFrame.Shape.HLine)
        divider.setStyleSheet("background-color: #3A3F52; max-height: 2px;")
        self.content_layout.addWidget(divider)

        self._add_section(self.content_layout, self.tr.t("settings.theme_dev"), self._create_theme_combo())
        self._add_section(self.content_layout, self.tr.t("settings.account"), self._create_account_combo())
        self._add_section(self.content_layout, self.tr.t("settings.language"), self._create_language_combo())
        self._add_section(self.content_layout, self.tr.t("settings.other") + ": " + self.tr.t("labels.minimize_on_apply"), self._create_minimize_combo())
        self._add_section(self.content_layout, self.tr.t("settings.steam_login"), self._create_steam_login_section())
        
        self.content_layout.addStretch()
    
    def _add_section(self, layout, title, widget):
        section_label = QLabel(title)
        section_label.setStyleSheet("""
            font-size: 13px;
            font-weight: 700;
            color: white;
            background: transparent;
            margin-top: 2px;
            border-radius: 5px;
        """)
        layout.addWidget(section_label)
        layout.addWidget(widget)
    
    def _create_account_combo(self):
        combo = QComboBox()
        last_loggin_acc = 1
        for i in range(len(self.accounts.get_accounts()) - last_loggin_acc):
            combo.addItem(f"{self.tr.t('labels.account')} {i + 1}")
        combo.setCurrentIndex(self.config.get_account_number())
        combo.currentIndexChanged.connect(lambda idx: self.config.set_account_number(idx))
        combo.setStyleSheet(self._combo_style())
        return combo
    
    def _create_theme_combo(self):
        combo = QComboBox()
        
        self._theme_keys = list(self.theme.THEMES.keys())

        display_names = []
        for key in self._theme_keys:
            tr_key = f"labels.theme_{key}"
            translated = self.tr.t(tr_key)
            if translated == tr_key:
                translated = key.capitalize()
            display_names.append(translated)
        
        combo.addItems(display_names)

        current = self.config.get_theme()
        if current in self._theme_keys:
            combo.setCurrentIndex(self._theme_keys.index(current))
        else:
            combo.setCurrentIndex(0)
        
        combo.currentIndexChanged.connect(self._on_theme_changed)
        combo.setStyleSheet(self._combo_style())
        return combo
    
    def _create_language_combo(self):
        combo = QComboBox()
        combo.addItems(["English", "Русский"])
        combo.setCurrentIndex(0 if self.config.get_language() == "en" else 1)
        combo.currentIndexChanged.connect(self._on_language_changed)
        combo.setStyleSheet(self._combo_style())
        return combo
    
    def _create_minimize_combo(self):
        combo = QComboBox()
        combo.addItems([self.tr.t("labels.disabled"), self.tr.t("labels.enabled")])
        combo.setCurrentIndex(1 if self.config.get_minimize_on_apply() else 0)
        combo.currentIndexChanged.connect(self._on_minimize_changed)
        combo.setStyleSheet(self._combo_style())
        return combo
    
    def _create_steam_login_section(self):
        container = QWidget()
        container.setStyleSheet("background-color: #1A1D2E;")
        layout = QVBoxLayout(container)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(10)
    
        self.login_input = QLineEdit()
        self.login_input.setPlaceholderText(self.tr.t("settings.login_placeholder"))
        self.login_input.setStyleSheet("""
            QLineEdit {
                background-color: #252938;
                color: white;
                border: 2px solid #3A3F52;
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 13px;
            }
            QLineEdit:focus {
                border-color: #4A7FD9;
            }
        """)
        layout.addWidget(self.login_input)
        
        self.password_input = QLineEdit()
        self.password_input.setPlaceholderText(self.tr.t("settings.password_placeholder"))
        self.password_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.password_input.setStyleSheet("""
            QLineEdit {
                background-color: #252938;
                color: white;
                border: 2px solid #3A3F52;
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 13px;
            }
            QLineEdit:focus {
                border-color: #4A7FD9;
            }
        """)
        layout.addWidget(self.password_input)

        btn_layout = QHBoxLayout()
        btn_layout.setSpacing(10)
        
        login_btn = QPushButton(self.tr.t("settings.login_button"))
        login_btn.setFixedHeight(36)
        login_btn.setStyleSheet(self._button_style())
        login_btn.clicked.connect(self._on_login_clicked)
        
        reset_btn = QPushButton(self.tr.t("settings.reset_button"))
        reset_btn.setFixedHeight(36)
        reset_btn.setStyleSheet("""
            QPushButton {
                background-color: #252938;
                color: white;
                border: 2px solid #3A3F52;
                border-radius: 8px;
                font-weight: 600;
                font-size: 13px;
            }
            QPushButton:hover {
                border-color: #4A7FD9;
            }
        """)
        reset_btn.clicked.connect(self._on_reset_clicked)
        
        btn_layout.addWidget(login_btn)
        btn_layout.addWidget(reset_btn)
        layout.addLayout(btn_layout)
        
        return container
    
    def _on_login_clicked(self):
        login = self.login_input.text().strip()
        password = self.password_input.text()
        
        if not login or not password:
            QMessageBox.warning(
                self,
                self.tr.t("dialog.warning"),
                self.tr.t("messages.fill_all_fields")
            )
            return
        
        msg_box = QMessageBox(self)
        msg_box.setWindowTitle(self.tr.t("settings.restart_required"))
        msg_box.setText(self.tr.t("settings.restart_message"))
        msg_box.setIcon(QMessageBox.Icon.Question)
        
        yes_btn = msg_box.addButton(self.tr.t("buttons.yes"), QMessageBox.ButtonRole.YesRole)
        no_btn = msg_box.addButton(self.tr.t("buttons.no"), QMessageBox.ButtonRole.NoRole)
        msg_box.setDefaultButton(yes_btn)
        
        msg_box.exec()
        
        if msg_box.clickedButton() == yes_btn:
            self._clear_cookies()
            restart_application(quit_app=True, login=login, password=password)
    
    def _on_reset_clicked(self):
        msg_box = QMessageBox(self)
        msg_box.setWindowTitle(self.tr.t("settings.reset_button"))
        msg_box.setText(self.tr.t("settings.reset_success"))
        msg_box.setIcon(QMessageBox.Icon.Information)
        msg_box.addButton(self.tr.t("buttons.ok"), QMessageBox.ButtonRole.AcceptRole)
        msg_box.exec()
        
        self._clear_cookies()
        restart_application()
    
    def _clear_cookies(self):
        try:
            if self.main_window and hasattr(self.main_window, 'workshop_tab'):
                workshop_tab = self.main_window.workshop_tab
                if hasattr(workshop_tab, 'parser') and workshop_tab.parser:
                    workshop_tab.parser.clear_cookies()
        except Exception as e:
            print(f"Error clearing cookies: {e}")
    
    def _combo_style(self):
        return """
            QComboBox {
                background-color: #252938;
                color: white;
                border: 2px solid #3A3F52;
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 13px;
                font-weight: 600;
            }
            QComboBox:hover {
                border-color: #4A7FD9;
            }
            QComboBox::drop-down {
                border: none;
            }
            QComboBox QAbstractItemView {
                background-color: #1A1D2E;
                color: white;
                selection-background-color: #4A7FD9;
                border: 2px solid #3A3F52;
                border-radius: 6px;
            }
        """
    
    def _button_style(self):
        return """
            QPushButton {
                background-color: #4A7FD9;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px;
                font-weight: 700;
                font-size: 12px;
            }
            QPushButton:hover {
                background-color: #5B8FE9;
            }
        """
    
    def _on_theme_changed(self, index):
        if 0 <= index < len(self._theme_keys):
            theme = self._theme_keys[index]
        else:
            theme = "dark"
        
        current_theme = self.config.get_theme()

        if theme == current_theme:
            return
        
        self.config.set_theme(theme)

        reply = QMessageBox.question(
            self,
            self.tr.t("messages.restart_title"),
            self.tr.t("messages.restart_theme_message"),
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            restart_application()
    
    def _on_language_changed(self, index):
        lang = "en" if index == 0 else "ru"
        self.config.set_language(lang)
        self.tr.set_language(lang)

        has_downloads = False
        has_extractions = False
        dm = None
        
        if self.main_window and hasattr(self.main_window, 'dm'):
            dm = self.main_window.dm
            has_downloads = len(dm.downloading) > 0
            has_extractions = len(dm.extracting) > 0
        
        if has_downloads or has_extractions:
            if has_downloads and has_extractions:
                msg = self.tr.t("messages.restart_with_tasks")
            elif has_downloads:
                msg = self.tr.t("messages.restart_with_downloads_only")
            else:
                msg = self.tr.t("messages.restart_with_extractions_only")
        else:
            msg = self.tr.t("messages.restart_now_question")
        
        msg_box = QMessageBox(self)
        msg_box.setWindowTitle(self.tr.t("messages.language_changed"))
        msg_box.setText(msg)
        msg_box.setIcon(QMessageBox.Icon.Question)
        
        yes_btn = msg_box.addButton(self.tr.t("buttons.yes"), QMessageBox.ButtonRole.YesRole)
        no_btn = msg_box.addButton(self.tr.t("buttons.no"), QMessageBox.ButtonRole.NoRole)
        msg_box.setDefaultButton(yes_btn)
        
        msg_box.exec()
        
        if msg_box.clickedButton() == yes_btn:
            if dm:
                dm.cleanup_all()

            if self.main_window and hasattr(self.main_window, 'workshop_tab'):
                self.main_window.workshop_tab.cleanup()

            restart_application()
    
    def _on_minimize_changed(self, index):
        value = index == 1
        self.config.set_minimize_on_apply(value)
