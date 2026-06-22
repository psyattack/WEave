
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, } from "vitest";
import App from "@/App";
import { setupTauriMocks, registerCommandMock, emitTauriEvent, setMockDialogResult } from "@/lib/tauri-mock";
import { useAppStore } from "@/stores/app";
import { useInstalledStore } from "@/stores/installed";
import { useTasksStore } from "@/stores/tasks";
import { useFiltersStore, DEFAULT_FILTERS } from "@/stores/filters";

describe("Real-World Scenarios E2E Tests (Tier 4)", () => {
  beforeEach(() => {
    setupTauriMocks();
    useAppStore.setState({
      ready: false,
      weDirectory: "",
      theme: "dark",
      accent: "indigo",
      language: "en",
      legalAccepted: true,
    });
    useInstalledStore.setState({
      byId: {},
      ready: false,
    });
    useTasksStore.setState({
      tasks: {},
      history: [],
    });
    useFiltersStore.setState({
      filters: DEFAULT_FILTERS,
      showAdvanced: false,
    });

    // Mock all bootstrap commands to let App boot
    registerCommandMock("config_get_all", () => ({}));
    registerCommandMock("i18n_get_available_languages", () => [
      { code: "en", label: "English" },
      { code: "ru", label: "Русский" },
    ]);
    registerCommandMock("we_get_directory", () => "C:/MockDirectory");
    registerCommandMock("config_get", () => 0);
    registerCommandMock("accounts_list", () => []);
    registerCommandMock("accounts_list_custom", () => []);
    registerCommandMock("steam_auto_login", () => true);
    registerCommandMock("steam_is_logged_in", () => true);
    registerCommandMock("steam_current_account", () => ({ persona_name: "SteamUser" }));
    registerCommandMock("app_restore_window_geometry", () => null);
    registerCommandMock("dotnet_init", () => null);
    registerCommandMock("plugins_init", () => null);
    registerCommandMock("we_list_installed", () => []);
    registerCommandMock("metadata_get_all", () => ({}));
  });

  it("T4.1 Scenario 1: First-Time Setup & Wallpaper Discovery", async () => {
    // Setup initial directory to null for first-time setup
    registerCommandMock("we_get_directory", () => null);
    registerCommandMock("we_set_directory", () => true);
    setMockDialogResult("C:/NewWallpaperDirectory");

    // Mock workshop search
    registerCommandMock("workshop_search", () => [
      {
        pubfileid: "3000001",
        title: "Cyberpunk City Skyline",
        preview: "cyber.jpg",
        author: "NeoArtist",
        tags: ["Cyberpunk", "City"],
      }
    ]);

    render(<App />);

    // Wait for boot to complete
    await waitFor(() => {
      expect(useAppStore.getState().ready).toBe(true);
    });

    // Open settings dialog to set directory
    const settingsBtn = screen.getByRole("button", { name: /settings/i });
    await userEvent.click(settingsBtn);

    // Click Browse
    const browseBtn = await screen.findByRole("button", { name: /browse/i });
    await userEvent.click(browseBtn);

    // Setup completes after weDirectory updates
    await waitFor(() => {
      expect(useAppStore.getState().weDirectory).toBe("C:/NewWallpaperDirectory");
    });
  });

  it("T4.2 Scenario 2: High-Latency Steam Auth & Restricted Browsing", async () => {
    let checkCount = 0;
    registerCommandMock("steam_is_logged_in", () => {
      checkCount++;
      return checkCount >= 2; // Return true on 2nd request
    });
    registerCommandMock("steam_login_show", () => null);
    registerCommandMock("steam_sync_cookies", () => 0);

    render(<App />);

    // Wait until App is ready
    await waitFor(() => {
      expect(useAppStore.getState().ready).toBe(true);
    });

    // Open settings dialog
    const settingsBtn = screen.getByRole("button", { name: /settings/i });
    await userEvent.click(settingsBtn);

    const accountTab = await screen.findByRole("tab", { name: /account/i });
    await userEvent.click(accountTab);

    // Clicking Steam web login triggers login show
    const openLoginBtn = await screen.findByRole("button", { name: /open parser/i });
    await userEvent.click(openLoginBtn);

    // Simulate login success event from Tauri background
    emitTauriEvent("steam-login-success", {});

    await waitFor(() => {
      expect(screen.getByText(/signed in/i)).toBeInTheDocument();
    });
  });

  it("T4.3 Scenario 3: Bulk Library Cleanup Under Stress", async () => {
    const list = Array.from({ length: 40 }, (_, i) => ({
      pubfileid: `anime_${i}`,
      folder: `/mock/${i}`,
      project_json_path: `/mock/${i}/project.json`,
      has_pkg: true,
      title: `Anime Wallpaper #${i}`,
      preview: "",
      description: "",
      file_type: "scene",
      tags: ["Anime"],
      size_bytes: 1000,
      installed_ts: 1600000000,
    }));
    registerCommandMock("we_list_installed", () => list);
    registerCommandMock("we_active_pubfileids", () => []);
    
    let deleteCount = 0;
    registerCommandMock("we_delete_wallpaper", () => {
      deleteCount++;
      return true;
    });

    render(<App />);

    // Go to installed tab
    const installedTab = await screen.findByRole("button", { name: /installed/i });
    await userEvent.click(installedTab);

    // Click select mode / bulk edit
    const selectModeBtn = await screen.findByRole("button", { name: /select/i });
    await userEvent.click(selectModeBtn);

    // Click select all
    const selectAllBtn = await screen.findByRole("button", { name: /select all/i });
    await userEvent.click(selectAllBtn);

    // Delete selected
    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    await userEvent.click(deleteBtn);

    // Confirm
    const confirmBtn = await screen.findByRole("button", { name: /delete/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteCount).toBe(40);
    });
  });

  it("T4.4 Scenario 4: A11y Theme Switcher & Accent Compliance", async () => {
    render(<App />);

    // Wait until App is ready
    await waitFor(() => {
      expect(useAppStore.getState().ready).toBe(true);
    });

    // Open settings
    const settingsBtn = screen.getByRole("button", { name: /settings/i });
    await userEvent.click(settingsBtn);

    // Change theme to Light and accent to Amber
    useAppStore.setState({ theme: "light", accent: "amber" });

    await waitFor(() => {
      expect(window.getComputedStyle(document.documentElement).getPropertyValue("--accent-color").trim()).toBe("#b45309");
    });
  });

  it("T4.5 Scenario 5: Fault-Tolerant Extraction & Retry Loop", async () => {
    let extractCalled = 0;
    registerCommandMock("extract_start", () => {
      extractCalled++;
      if (extractCalled === 1) {
        throw new Error("Missing dotnet runtime");
      }
      return true;
    });
    setMockDialogResult("C:/ExtractDir");

    const wallpaperItem = {
      pubfileid: "2000001",
      folder: "/mock/projects/myprojects/2000001",
      project_json_path: "/mock/projects/myprojects/2000001/project.json",
      has_pkg: true,
      title: "Nature Wallpaper",
      preview: "nature.jpg",
      description: "Beautiful nature scene",
      file_type: "scene",
      tags: ["Nature", "Scene"],
      size_bytes: 1024 * 1024 * 15,
      installed_ts: 1600000000,
    };

    registerCommandMock("we_list_installed", () => [wallpaperItem]);

    render(<App />);

    // Go to installed view
    const installedTab = await screen.findByRole("button", { name: /installed/i });
    await userEvent.click(installedTab);

    // Click card to open DetailsPanel
    const card = await screen.findByText("Nature Wallpaper");
    await userEvent.click(card);

    // Click Extract Resources
    const extractBtn = await screen.findByRole("button", { name: /extract/i });
    await userEvent.click(extractBtn);

    // First call fails, toast pops up. Retrying should trigger extract again
    await userEvent.click(extractBtn);

    await waitFor(() => {
      expect(extractCalled).toBe(2);
    });
  });
});
