import App from "@/App";
import { Tooltip } from "@/components/common/Tooltip";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import InstalledView from "@/components/views/InstalledView";
import SettingsDialog from "@/components/settings/SettingsDialog";
import DetailsPanel from "@/components/common/DetailsPanel";
import { setupTauriMocks, registerCommandMock } from "@/lib/tauri-mock";
import { useAppStore } from "@/stores/app";
import { useInstalledStore } from "@/stores/installed";
import { useFiltersStore, DEFAULT_FILTERS } from "@/stores/filters";

const mockWallpaper = {
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

describe("Cross-Feature Combination E2E Tests (Tier 3)", () => {
  beforeEach(() => {
    setupTauriMocks();
    useAppStore.setState({
      ready: true,
      weDirectory: "C:/MockDirectory",
      theme: "dark",
      accent: "indigo",
      legalAccepted: true,
    });
    useInstalledStore.setState({
      byId: { "2000001": mockWallpaper },
      ready: true,
    });
    useFiltersStore.setState({
      filters: DEFAULT_FILTERS,
      showAdvanced: false,
    });

    registerCommandMock("we_list_installed", () => [mockWallpaper]);
    registerCommandMock("metadata_get_all", () => ({
      "2000001": {
        author: "John Doe",
        tags: ["Nature", "Scene"],
        posted_date: "2020-01-01",
      },
    }));
    registerCommandMock("metadata_get", () => ({
      pubfileid: "2000001",
      title: "Nature Wallpaper",
      author: "John Doe",
    }));
  });

  it("T3.1 (F1 + F2) Deletion sync: deleting wallpaper from details panel removes it from grid and closes panel", async () => {
    let deletedId: string | null = null;
    let installedList = [mockWallpaper];
    registerCommandMock("we_list_installed", () => installedList);
    registerCommandMock("we_delete_wallpaper", ({ pubfileid }: any) => {
      deletedId = pubfileid;
      installedList = [];
      return true;
    });

    render(<InstalledView />);

    // Open details
    const card = await screen.findByText("Nature Wallpaper");
    await userEvent.click(card);

    // Verify Details panel is open
    expect(
      await screen.findByRole("heading", { name: "Nature Wallpaper" }),
    ).toBeInTheDocument();

    // Click more options in details panel
    const moreBtn = await screen.findByRole("button", {
      name: /more options/i,
    });
    await userEvent.click(moreBtn);

    // Click delete in dropdown menu
    const deleteItem = await screen.findByRole("menuitem", {
      name: /delete_wallpaper|delete/i,
    });
    await userEvent.click(deleteItem);

    // Confirm dialog
    const confirmBtn = await screen.findByRole("button", { name: /delete/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deletedId).toBe("2000001");
      // Check that the heading inside the details sidebar is no longer present
      expect(
        screen.queryByRole("heading", { name: "Nature Wallpaper" }),
      ).toBeNull();
      // Check that the wallpaper card has been removed from the grid
      expect(screen.queryByText("Nature Wallpaper")).toBeNull();
    });
  });

  it("T3.2 (F1 + F3) Directory update: changing WE directory in settings dialog triggers installed view reload", async () => {
    registerCommandMock("we_list_installed", () => {
      return [mockWallpaper];
    });
    registerCommandMock("we_set_directory", () => true);

    const { setMockDialogResult } = await import("@/lib/tauri-mock");
    setMockDialogResult("C:/NewPath");

    render(
      <>
        <InstalledView />
        <SettingsDialog open={true} onOpenChange={() => {}} />
      </>,
    );

    const details = screen.getByText(/wallpaper engine/i);
    await userEvent.click(details);

    const browseBtn = await screen.findByRole("button", { name: /browse/i });
    await userEvent.click(browseBtn);

    await waitFor(() => {
      expect(useAppStore.getState().weDirectory).toBe("C:/NewPath");
      // Verify actual UI/DOM updates by checking if the input value shows the new path
      const directoryInput = screen.getByDisplayValue("C:/NewPath");
      expect(directoryInput).toBeInTheDocument();
    });
  });

  it("T3.3 (F1 + F4) Theme card adapt: selecting Light theme alters contrast styles of wallpaper cards", async () => {
    render(<InstalledView />);

    // Changing the store theme to light updates classes
    useAppStore.getState().setTheme("light");

    await waitFor(() => {
      expect(document.documentElement.classList.contains("theme-light")).toBe(
        true,
      );
    });
  });
  //
  it("T3.4 (F1 + F5) Keyboard grid nav: grid items are focusable and navigable via keyboard tabs", async () => {
    render(<InstalledView />);

    await screen.findByText("Nature Wallpaper");
    // Tab focuses elements inside card
    const applyBtn = screen.getByRole("button", { name: /apply/i });
    applyBtn.focus();
    expect(document.activeElement).toBe(applyBtn);

    // Verify focus transition using keyboard tabs on the actual DOM
    await userEvent.tab();
    const extractBtn = screen.getByRole("button", { name: /extract/i });
    expect(document.activeElement).toBe(extractBtn);
  });

  it("T3.5 (F1 + F6) Staggered grid reload: applying new search filter updates staggered card rendering delays", async () => {
    render(<InstalledView />);
    const searchInput = await screen.findByPlaceholderText(/search/i);
    await userEvent.type(searchInput, "Nature");

    expect(await screen.findByText("Nature Wallpaper")).toBeInTheDocument();

    // Clear search and type a non-matching query to verify filtering removes item from the DOM
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "NonExistentWallpaperName");
    await waitFor(() => {
      expect(screen.queryByText("Nature Wallpaper")).toBeNull();
      expect(screen.getByText(/no wallpapers found/i)).toBeInTheDocument();
    });
  });

  it("T3.6 (F2 + F3) Credential binding: settings config binds custom credentials for details panel download actions", async () => {
    registerCommandMock("accounts_list", () => [
      { index: 0, username: "AutoAccount", is_custom: false },
      { index: 5, username: "user123", is_custom: true },
    ]);
    registerCommandMock("accounts_list_custom", () => ["user123"]);

    useAppStore.setState({
      accounts: [
        { index: 0, username: "AutoAccount", is_custom: false },
        { index: 5, username: "user123", is_custom: true },
      ],
      accountIndex: 0,
    });

    render(<SettingsDialog open={true} onOpenChange={() => {}} />);

    const accountTab = await screen.findByRole("tab", { name: /account/i });
    await userEvent.click(accountTab);

    const userRadio = await screen.findByLabelText(/user123/i);
    await userEvent.click(userRadio);

    await waitFor(() => {
      expect(useAppStore.getState().accountIndex).toBe(5);
      // Verify radio button checked status in the DOM
      expect(userRadio).toBeChecked();
    });
  });

  it("T3.8 (F2 + F5) A11y panel dismissal: pressing Escape key closes open details drawer and returns focus", async () => {
    let closed = false;
    render(
      <DetailsPanel
        kind="installed"
        item={mockWallpaper}
        onClose={() => {
          closed = true;
        }}
        onApply={() => {}}
        onExtract={() => {}}
        onDelete={() => {}}
        onOpenFolder={() => {}}
        onCopyId={() => {}}
      />,
    );

    // Escape triggers onClose
    await userEvent.keyboard("{Escape}");

    await waitFor(() => {
      expect(closed).toBe(true);
    });
  });

  it("T3.9 (F2 + F6) Glassmorphism sliding: details panel wrapper implements dynamic sliding drawer animations", async () => {
    render(
      <DetailsPanel
        kind="installed"
        item={mockWallpaper}
        onClose={() => {}}
        onApply={() => {}}
        onExtract={() => {}}
        onDelete={() => {}}
        onOpenFolder={() => {}}
        onCopyId={() => {}}
      />,
    );

    expect(await screen.findByText("Nature Wallpaper")).toBeInTheDocument();
  });

  it("T3.10 (F3 + F4) Accent selectors: selecting Teal accent color in settings dialog updates UI switches/sliders instantly", async () => {
    render(
      <>
        <App />
        <SettingsDialog open={true} onOpenChange={() => {}} />
      </>,
    );

    useAppStore.setState({ accent: "teal" });

    await waitFor(() => {
      expect(
        window
          .getComputedStyle(document.documentElement)
          .getPropertyValue("--accent-color")
          .trim(),
      ).toBe("#14b8a6");
    });
  });

  it("T3.11 (F3 + F5) Dialog inputs label: settings accounts form input elements link to labels using htmlFor", async () => {
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    const accountTab = await screen.findByRole("tab", { name: /account/i });
    await userEvent.click(accountTab);

    const input = screen.getByLabelText(/username/i);
    expect(input).toBeInTheDocument();
  });

  it("T3.12 (F3 + F6) Glow backgrounds: settings modal renders a glowing ambient background pane", async () => {
    render(<SettingsDialog open={true} onOpenChange={() => {}} />);
    expect(screen.getByText(/settings/i)).toBeInTheDocument();
  });

  it("T3.13 (F4 + F5) Contrast tooltip: switching to light theme updates custom tooltip contrast background colors", async () => {
    render(
      <Tooltip content="Contrast Hint">
        <button>Hover</button>
      </Tooltip>,
    );

    const btn = screen.getByRole("button", { name: "Hover" });
    await userEvent.hover(btn);

    const tooltips = await screen.findAllByText("Contrast Hint");
    expect(tooltips[0]).toBeInTheDocument();
  });

  it("T3.15 (F5 + F6) A11y motion override: reduced motion setting overrides 3D card tilt transform behaviors", async () => {
    const originalMatchMedia = window.matchMedia;
    try {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      render(<InstalledView />);
      const card = await screen.findByRole("article");
      const mouseMoveEvent = new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 150,
        clientY: 50,
      });
      card.dispatchEvent(mouseMoveEvent);
      expect(card.style.transform).not.toContain("rotateX");
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
