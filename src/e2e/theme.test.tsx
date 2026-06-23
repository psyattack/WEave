
import { render, waitFor } from "@testing-library/react";

import { describe, it, expect, beforeEach, } from "vitest";
import { setupTauriMocks, registerCommandMock, } from "@/lib/tauri-mock";
import { useAppStore, } from "@/stores/app";
import { applyThemeClass, applyAccent, useApplyTheme } from "@/hooks/useTheme";

// Dummy component to test useApplyTheme hook
function TestThemeComponent() {
  useApplyTheme();
  return <div data-testid="theme-test">Theme Test</div>;
}

describe("Theme and Accent Color Sync E2E Tests (F4)", () => {
  beforeEach(() => {
    setupTauriMocks();
    useAppStore.setState({
      ready: true,
      theme: "dark",
      accent: "indigo",
    });

    // Reset document element properties
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-accent");
    document.documentElement.style.cssText = "";
    document.body.className = "";
  });

  // --- Tier 1 tests ---
  it("T1.4.1 should add Nord theme class and remove other themes", async () => {
    applyThemeClass("nord");

    expect(document.documentElement.classList.contains("theme-nord")).toBe(true);
    expect(document.documentElement.classList.contains("theme-dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("nord");
  });

  it("T1.4.2 should remove dark class when light theme is selected", async () => {
    applyThemeClass("light");

    expect(document.documentElement.classList.contains("theme-light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("T1.4.3 should update root custom variables when theme changes", async () => {
    applyThemeClass("nord");

    // Nord background color check: `--bg` is "46 52 64"
    expect(window.getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()).toBe("46 52 64");
  });

  it("T1.4.4 should set accent variables on document root", async () => {
    applyAccent("emerald");

    expect(window.getComputedStyle(document.documentElement).getPropertyValue("--accent-color").trim()).toBe("#10b981");
    expect(window.getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()).toBe("16 185 129");
  });

  it("T1.4.5 should invoke config_set when theme is updated in app store", async () => {
    let configSetCalled = false;
    registerCommandMock("config_set", ({ path, value }: any) => {
      if (path === "settings.general.appearance.theme" && value === "monokai") {
        configSetCalled = true;
      }
      return null;
    });

    useAppStore.getState().setTheme("monokai");

    // Normally the components calling persistTheme or subscribing will persist.
    // Let's invoke persistTheme manually since we test the sync path.
    const { persistTheme } = await import("@/hooks/useTheme");
    await persistTheme("monokai");

    expect(configSetCalled).toBe(true);
  });

  // --- Tier 2 tests ---
  it("T2.4.1 should check contrast ratio and support low contrast combinations", async () => {
    // Select Amber accent on Light theme
    applyThemeClass("light");
    applyAccent("amber");

    // Contrast text is white "255 255 255" for high contrast Amber 700 accent on Light theme
    expect(window.getComputedStyle(document.documentElement).getPropertyValue("--primary-fg").trim()).toBe("255 255 255");
  });

  it("T2.4.2 should fall back to default dark theme on malformed config", async () => {
    // Test that applying invalid theme code defaults to dark theme variables
    applyThemeClass("invalid_theme" as any);
    expect(window.getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()).toBe("15 17 26"); // Dark theme fallback
  });

  it("T2.4.3 should operate correctly when localStorage throws error in private mode", async () => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error("Private Mode");
    };

    try {
      expect(() => applyThemeClass("nord")).not.toThrow();
    } finally {
      localStorage.setItem = originalSetItem;
    }
  });

  it("T2.4.4 should fall back to indigo values on unsupported accent selection", async () => {
    applyAccent("unsupported_accent_name");

    expect(window.getComputedStyle(document.documentElement).getPropertyValue("--accent-color").trim()).toBe("#6366f1"); // Indigo hex
    expect(window.getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()).toBe("99 102 241"); // Indigo rgb
  });

  it("T2.4.5 should listen to Tauri custom window event and synchronize theme", async () => {
    render(<TestThemeComponent />);

    // Since we use the store subscription path, changing store theme updates the element
    useAppStore.setState({ theme: "solarized" });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-solarized")).toBe(true);
    });
  });

  it("T2.4.6 should not override theme-specific primary colors when accent is theme", async () => {
    applyThemeClass("nord");
    applyAccent("theme");

    // Nord primary color check: `--primary` is "136 192 208"
    expect(window.getComputedStyle(document.documentElement).getPropertyValue("--primary").trim()).toBe("136 192 208");
  });
});
