//! Tests for configuration modules

#[cfg(test)]
mod settings_tests {
    use super::super::settings::*;
    use serde_json::json;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_settings_load_default() {
        let temp_dir = TempDir::new().unwrap();
        let settings_path = temp_dir.path().join("settings.json");

        let settings = SettingsService::load(&settings_path).unwrap();

        // Check default values
        assert_eq!(settings.get_language(), "en");
        assert_eq!(settings.get_theme(), "dark");
        assert_eq!(settings.get_account_number(), 0);
    }

    #[test]
    fn test_settings_load_existing() {
        let temp_dir = TempDir::new().unwrap();
        let settings_path = temp_dir.path().join("settings.json");

        // Write initial settings
        let initial_data = json!({
            "general": {
                "appearance": {
                    "language": "ru",
                    "theme": "light"
                }
            }
        });
        fs::write(
            &settings_path,
            serde_json::to_string_pretty(&initial_data).unwrap(),
        )
        .unwrap();

        let settings = SettingsService::load(&settings_path).unwrap();

        assert_eq!(settings.get_language(), "ru");
        assert_eq!(settings.get_theme(), "light");
    }

    #[test]
    fn test_settings_save() {
        let temp_dir = TempDir::new().unwrap();
        let settings_path = temp_dir.path().join("settings.json");

        let settings = SettingsService::load(&settings_path).unwrap();
        settings.set_language("de");

        // Reload and verify
        let reloaded = SettingsService::load(&settings_path).unwrap();
        assert_eq!(reloaded.get_language(), "de");
    }

    #[test]
    fn test_settings_set_get() {
        let temp_dir = TempDir::new().unwrap();
        let settings_path = temp_dir.path().join("settings.json");

        let settings = SettingsService::load(&settings_path).unwrap();

        settings.set("test.value", json!("test_string")).unwrap();
        let value = settings.get("test.value").unwrap();

        assert_eq!(value.as_str().unwrap(), "test_string");
    }

    #[test]
    fn test_settings_remove() {
        let temp_dir = TempDir::new().unwrap();
        let settings_path = temp_dir.path().join("settings.json");

        let settings = SettingsService::load(&settings_path).unwrap();

        settings.set("test.value", json!("test")).unwrap();
        assert!(settings.get("test.value").is_some());

        settings.remove("test.value").unwrap();
        assert!(settings.get("test.value").is_none());
    }

    #[test]
    fn test_settings_directory() {
        let temp_dir = TempDir::new().unwrap();
        let settings_path = temp_dir.path().join("settings.json");

        let settings = SettingsService::load(&settings_path).unwrap();

        assert!(settings.get_directory().is_none());

        settings.set_directory("/test/path");
        assert_eq!(settings.get_directory().unwrap(), "/test/path");
    }

    #[test]
    fn test_settings_account_number() {
        let temp_dir = TempDir::new().unwrap();
        let settings_path = temp_dir.path().join("settings.json");

        let settings = SettingsService::load(&settings_path).unwrap();

        assert_eq!(settings.get_account_number(), 0);

        settings.set_account_number(12345);
        assert_eq!(settings.get_account_number(), 12345);
    }

    #[test]
    fn test_window_geometry() {
        let temp_dir = TempDir::new().unwrap();
        let settings_path = temp_dir.path().join("settings.json");

        let settings = SettingsService::load(&settings_path).unwrap();

        let geom = WindowGeometry {
            x: 100,
            y: 200,
            width: 1920,
            height: 1080,
            is_maximized: true,
        };

        settings.set_window_geometry(geom.clone());

        let saved_geom = settings.get("general.behavior.window_geometry").unwrap();
        assert_eq!(saved_geom["x"].as_i64().unwrap(), 100);
        assert_eq!(saved_geom["y"].as_i64().unwrap(), 200);
        assert_eq!(saved_geom["width"].as_i64().unwrap(), 1920);
        assert_eq!(saved_geom["height"].as_i64().unwrap(), 1080);
        assert_eq!(saved_geom["is_maximized"].as_bool().unwrap(), true);
    }

    #[test]
    fn test_settings_invalid_json() {
        let temp_dir = TempDir::new().unwrap();
        let settings_path = temp_dir.path().join("settings.json");

        // Write invalid JSON
        fs::write(&settings_path, "{ invalid json }").unwrap();

        // Should fall back to defaults
        let settings = SettingsService::load(&settings_path).unwrap();
        assert_eq!(settings.get_language(), "en");
    }
}

#[cfg(test)]
mod config_utils_tests {
    use super::super::*;
    use serde_json::json;

    #[test]
    fn test_deep_merge() {
        let base = json!({
            "a": 1,
            "b": {
                "c": 2,
                "d": 3
            }
        });

        let override_val = json!({
            "b": {
                "c": 99
            },
            "e": 5
        });

        let merged = deep_merge(base, override_val);

        assert_eq!(merged["a"].as_i64().unwrap(), 1);
        assert_eq!(merged["b"]["c"].as_i64().unwrap(), 99);
        assert_eq!(merged["b"]["d"].as_i64().unwrap(), 3);
        assert_eq!(merged["e"].as_i64().unwrap(), 5);
    }

    #[test]
    fn test_resolve_value() {
        let data = json!({
            "level1": {
                "level2": {
                    "level3": "value"
                }
            }
        });

        let result = resolve_value(&data, "level1.level2.level3");
        assert_eq!(result.unwrap().as_str().unwrap(), "value");

        let none_result = resolve_value(&data, "nonexistent.path");
        assert!(none_result.is_none());
    }

    #[test]
    fn test_set_value() {
        let mut data = json!({
            "existing": {
                "key": "old_value"
            }
        });

        set_value(&mut data, "existing.key", json!("new_value"));
        assert_eq!(data["existing"]["key"].as_str().unwrap(), "new_value");

        set_value(&mut data, "new.nested.key", json!(42));
        assert_eq!(data["new"]["nested"]["key"].as_i64().unwrap(), 42);
    }

    #[test]
    fn test_remove_value() {
        let mut data = json!({
            "level1": {
                "level2": {
                    "key1": "value1",
                    "key2": "value2"
                }
            }
        });

        remove_value(&mut data, "level1.level2.key1");
        assert!(data["level1"]["level2"]["key1"].is_null());
        assert_eq!(data["level1"]["level2"]["key2"].as_str().unwrap(), "value2");
    }

    #[test]
    fn test_normalize_settings_path() {
        use super::super::settings::normalize_settings_path;

        assert_eq!(normalize_settings_path("settings.path"), "path");
        assert_eq!(normalize_settings_path("path"), "path");
        assert_eq!(
            normalize_settings_path("settings.nested.path"),
            "nested.path"
        );
    }
}
