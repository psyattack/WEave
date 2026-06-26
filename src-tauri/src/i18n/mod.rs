//! Simplified i18n service that just returns available languages.
//! All translation logic is now handled on the frontend with i18next.

pub struct I18nService;

impl Default for I18nService {
    fn default() -> Self {
        Self::new()
    }
}

impl I18nService {
    pub fn new() -> Self {
        Self
    }

    pub fn available(&self) -> Vec<(String, String)> {
        vec![
            ("en".into(), "English".into()),
            ("ru".into(), "Русский".into()),
        ]
    }
}
