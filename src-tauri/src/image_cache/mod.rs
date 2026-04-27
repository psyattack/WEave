//! Very small HTTP image cache backed by the on-disk file system.

use std::path::{Path, PathBuf};
use std::time::Duration;

use sha2::{Digest, Sha256};

pub struct ImageCache {
    base: PathBuf,
}

impl ImageCache {
    pub fn new(base: PathBuf) -> Self {
        std::fs::create_dir_all(&base).ok();
        Self { base }
    }

    pub fn cache_path_for(&self, url: &str) -> PathBuf {
        let mut hasher = Sha256::new();
        hasher.update(url.as_bytes());
        let hex = format!("{:x}", hasher.finalize());
        let extension = extract_extension(url).unwrap_or("img".to_string());
        self.base.join(format!("{hex}.{extension}"))
    }

    pub async fn get_or_fetch(&self, url: &str) -> anyhow::Result<PathBuf> {
        let target = self.cache_path_for(url);
        if target.exists() && is_non_empty(&target) {
            return Ok(target);
        }

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(15))
            .build()?;
        let bytes = client.get(url).send().await?.bytes().await?;
        std::fs::write(&target, &bytes)?;
        Ok(target)
    }
}

fn extract_extension(url: &str) -> Option<String> {
    let path = url.split('?').next()?;
    Path::new(path)
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_ascii_lowercase())
}

fn is_non_empty(path: &Path) -> bool {
    std::fs::metadata(path)
        .map(|m| m.len() > 0)
        .unwrap_or(false)
}
