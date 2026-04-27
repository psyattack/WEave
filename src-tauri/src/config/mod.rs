//! Configuration service with the same on-disk schema as the original
//! Python implementation so existing `config.json` files keep working.

use std::fs;
use std::path::{Path, PathBuf};

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WindowGeometry {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub is_maximized: bool,
}

pub struct ConfigService {
    pub path: PathBuf,
    data: Mutex<Value>,
}

impl ConfigService {
    pub fn load(path: &Path) -> anyhow::Result<Self> {
        let data = match fs::read_to_string(path) {
            Ok(raw) => serde_json::from_str::<Value>(&raw).unwrap_or_else(|_| default_config()),
            Err(_) => default_config(),
        };
        let merged = deep_merge(default_config(), data);
        Ok(Self {
            path: path.to_path_buf(),
            data: Mutex::new(merged),
        })
    }

    pub fn snapshot(&self) -> Value {
        self.data.lock().clone()
    }

    pub fn save(&self) -> anyhow::Result<()> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent).ok();
        }
        let raw = serde_json::to_string_pretty(&*self.data.lock())?;
        fs::write(&self.path, raw)?;
        Ok(())
    }

    pub fn get(&self, path: &str) -> Option<Value> {
        resolve_value(&self.data.lock(), path).cloned()
    }

    pub fn set(&self, path: &str, value: Value) -> anyhow::Result<()> {
        {
            let mut guard = self.data.lock();
            set_value(&mut guard, path, value);
        }
        self.save()
    }

    pub fn remove(&self, path: &str) -> anyhow::Result<()> {
        {
            let mut guard = self.data.lock();
            remove_value(&mut guard, path);
        }
        self.save()
    }

    // --- convenience getters mirroring the Python API ---

    pub fn get_directory(&self) -> Option<String> {
        self.get("settings.system.directory")
            .and_then(|v| v.as_str().map(ToString::to_string))
            .filter(|s| !s.is_empty())
    }

    pub fn set_directory(&self, value: &str) {
        self.set("settings.system.directory", Value::String(value.to_string()))
            .ok();
    }

    pub fn get_language(&self) -> String {
        self.get("settings.general.appearance.language")
            .and_then(|v| v.as_str().map(ToString::to_string))
            .unwrap_or_else(|| "en".to_string())
    }

    pub fn set_language(&self, value: &str) {
        self.set(
            "settings.general.appearance.language",
            Value::String(value.to_string()),
        )
        .ok();
    }

    pub fn get_theme(&self) -> String {
        self.get("settings.general.appearance.theme")
            .and_then(|v| v.as_str().map(ToString::to_string))
            .unwrap_or_else(|| "dark".to_string())
    }

    pub fn get_account_number(&self) -> u32 {
        self.get("settings.account.account.account_number")
            .and_then(|v| v.as_u64())
            .unwrap_or(3) as u32
    }

    pub fn set_account_number(&self, value: u32) {
        self.set(
            "settings.account.account.account_number",
            Value::Number(value.into()),
        )
        .ok();
    }

    pub fn get_metadata_all(&self) -> Value {
        self.get("wallpaper_metadata").unwrap_or_else(|| json!({}))
    }

    pub fn set_metadata_item(&self, pubfileid: &str, value: Value) {
        self.set(&format!("wallpaper_metadata.{pubfileid}"), value).ok();
    }

    pub fn remove_metadata_item(&self, pubfileid: &str) {
        self.remove(&format!("wallpaper_metadata.{pubfileid}")).ok();
    }

    pub fn set_window_geometry(&self, geom: WindowGeometry) {
        if !self.get_save_window_state() {
            return;
        }
        if let Ok(value) = serde_json::to_value(geom) {
            self.set("settings.general.behavior.window_geometry", value).ok();
        }
    }

    pub fn get_save_window_state(&self) -> bool {
        self.get("settings.general.behavior.save_window_state")
            .and_then(|v| v.as_bool())
            .unwrap_or(true)
    }

    pub fn get_skip_version(&self) -> String {
        self.get("settings.general.behavior.skip_version")
            .and_then(|v| v.as_str().map(ToString::to_string))
            .unwrap_or_default()
    }
}

// ---------------------------------------------------------------------------

pub fn default_config() -> Value {
    json!({
        "settings": {
            "system": {
                "directory": ""
            },
            "account": {
                "account": {
                    "account_number": 3
                }
            },
            "general": {
                "appearance": {
                    "language": "en",
                    "theme": "dark",
                    "show_id_section": false,
                    "accent": "indigo"
                },
                "behavior": {
                    "minimize_on_apply": false,
                    "preload_next_page": true,
                    "auto_check_updates": true,
                    "auto_init_metadata": true,
                    "auto_apply_last_downloaded": false,
                    "skip_version": "",
                    "save_window_state": true,
                    "window_geometry": {
                        "x": -1,
                        "y": -1,
                        "width": 1280,
                        "height": 800,
                        "is_maximized": false
                    }
                }
            },
            "advanced": {
                "debug": {
                    "debug_mode": false
                }
            }
        },
        "wallpaper_metadata": {}
    })
}

pub fn deep_merge(mut base: Value, override_val: Value) -> Value {
    match (&mut base, override_val) {
        (Value::Object(base_map), Value::Object(over_map)) => {
            for (key, over) in over_map {
                let entry = base_map.entry(key).or_insert(Value::Null);
                *entry = deep_merge(entry.clone(), over);
            }
            base
        }
        (_, other) => other,
    }
}

fn resolve_value<'a>(root: &'a Value, path: &str) -> Option<&'a Value> {
    let mut current = root;
    for part in path.split('.') {
        current = current.get(part)?;
    }
    Some(current)
}

fn set_value(root: &mut Value, path: &str, value: Value) {
    let parts: Vec<&str> = path.split('.').collect();
    if parts.is_empty() {
        return;
    }

    let mut current = root;
    for (i, part) in parts.iter().enumerate() {
        let is_last = i == parts.len() - 1;
        if !current.is_object() {
            *current = json!({});
        }
        let map = current.as_object_mut().unwrap();
        if is_last {
            map.insert(part.to_string(), value);
            return;
        }
        current = map.entry(part.to_string()).or_insert_with(|| json!({}));
    }
}

fn remove_value(root: &mut Value, path: &str) {
    let parts: Vec<&str> = path.split('.').collect();
    if parts.is_empty() {
        return;
    }

    let mut current = root;
    for (i, part) in parts.iter().enumerate() {
        let is_last = i == parts.len() - 1;
        match current {
            Value::Object(map) => {
                if is_last {
                    map.remove(*part);
                    return;
                }
                match map.get_mut(*part) {
                    Some(next) => current = next,
                    None => return,
                }
            }
            _ => return,
        }
    }
}
