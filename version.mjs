#!/usr/bin/env node

/**
 * Usage:
 *   node version.mjs 4.5.0
 *
 * Updates the version string in all four locations:
 *   1. package.json
 *   2. src-tauri/Cargo.toml
 *   3. src-tauri/tauri.conf.json
 *   4. src-tauri/src/constants.rs
 *
 * Then runs:
 *   - `npm install --package-lock-only` to sync package-lock.json
 *   - `cargo check` to sync Cargo.lock
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const newVersion = process.argv[2];

if (!newVersion || !/^\d+\.\d+\.\d+/.test(newVersion)) {
  console.error(
    "Usage: node version.mjs <semver>  (e.g. node version.mjs 4.5.0)",
  );
  process.exit(1);
}

const files = [
  {
    path: "package.json",
    // "version": "x.y.z"
    pattern: new RegExp('("version"\\s*:\\s*")\\d+\\.\\d+\\.\\d+(")'),
    replace: `$1${newVersion}$2`,
  },
  {
    path: "src-tauri/Cargo.toml",
    // version = "x.y.z"
    pattern: new RegExp('^(version\\s*=\\s*")\\d+\\.\\d+\\.\\d+(")', "m"),
    replace: `$1${newVersion}$2`,
  },
  {
    path: "src-tauri/tauri.conf.json",
    // "version": "x.y.z"
    pattern: new RegExp('("version"\\s*:\\s*")\\d+\\.\\d+\\.\\d+(")'),
    replace: `$1${newVersion}$2`,
  },
  {
    path: "src-tauri/src/core/constants.rs",
    // pub const APP_VERSION: &str = "x.y.z";
    pattern: new RegExp(
      '^(pub const APP_VERSION: &str = ")\\d+\\.\\d+\\.\\d+(")',
      "m",
    ),
    replace: `$1${newVersion}$2`,
  },
];

for (const file of files) {
  const content = readFileSync(file.path, "utf-8");

  if (!file.pattern.test(content)) {
    console.error(`ERROR: Could not find version pattern in ${file.path}`);
    process.exit(1);
  }

  const updated = content.replace(file.pattern, file.replace);
  writeFileSync(file.path, updated, "utf-8");

  // Extract old version for display
  const oldMatch = content.match(file.pattern);
  const oldVersion = oldMatch
    ? (oldMatch[0].match(/\d+\.\d+\.\d+/)?.[0] ?? "???")
    : "???";

  console.log(`  ${file.path}: ${oldVersion} → ${newVersion}`);
}

console.log(`\nSyncing package-lock.json...`);
execSync("npm install --package-lock-only --ignore-scripts", {
  stdio: "inherit",
});

console.log(`\nSyncing Cargo.lock...`);
execSync("cargo check", { cwd: "src-tauri", stdio: "inherit" });

console.log(`\nVersion updated to ${newVersion}`);
