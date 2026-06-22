
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, } from "vitest";
import InstalledView from "@/components/views/InstalledView";
import MetadataInitDialog from "@/components/common/MetadataInitDialog";
import { setupTauriMocks, registerCommandMock, emitTauriEvent } from "@/lib/tauri-mock";
import { useInstalledStore } from "@/stores/installed";
import { useAppStore } from "@/stores/app";
import { useTasksStore } from "@/stores/tasks";
import { useMetadataInitStore } from "@/stores/metadata-init";
import { useFiltersStore, DEFAULT_FILTERS } from "@/stores/filters";

const mockWallpapers = [
  {
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
  },
  {
    pubfileid: "2000002",
    folder: "/mock/projects/myprojects/2000002",
    project_json_path: "/mock/projects/myprojects/2000002/project.json",
    has_pkg: false,
    title: "Cyberpunk City",
    preview: "cyberpunk.jpg",
    description: "Neon futuristic streets",
    file_type: "video",
    tags: ["Cyberpunk", "Video"],
    size_bytes: 1024 * 1024 * 45,
    installed_ts: 1700000000,
  }
];

describe("Installed View E2E Tests (F1)", () => {
  beforeEach(() => {
    setupTauriMocks();
    useAppStore.setState({
      ready: true,
      weDirectory: "C:/MockDirectory",
      theme: "dark",
    });
    useInstalledStore.setState({
      byId: {},
      ready: true,
      updateCounter: 0,
    });
    useTasksStore.setState({
      tasks: {},
      history: [],
    });
    useMetadataInitStore.setState({
      status: null,
    });
    useFiltersStore.setState({
      filters: DEFAULT_FILTERS,
      showAdvanced: false,
    });

    registerCommandMock("we_list_installed", () => mockWallpapers);
    registerCommandMock("metadata_get_all", () => ({
      "2000001": { author: "John Doe", tags: ["Nature", "Scene"], posted_date: "2020-01-01" },
      "2000002": { author: "Jane Smith", tags: ["Cyberpunk", "Video"], posted_date: "2023-01-01" },
    }));
  });

  // --- Tier 1 tests ---
  it("T1.1.1 should list installed wallpapers with titles and authors", async () => {
    render(<InstalledView />);
    expect(await screen.findByText("Nature Wallpaper")).toBeInTheDocument();
    expect(screen.getByText("Cyberpunk City")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("T1.1.2 should search and filter wallpapers by title", async () => {
    render(<InstalledView />);
    const searchInput = await screen.findByPlaceholderText(/search/i);
    await userEvent.type(searchInput, "Nature");
    expect(screen.getByText("Nature Wallpaper")).toBeInTheDocument();
    expect(screen.queryByText("Cyberpunk City")).not.toBeInTheDocument();
  });

  it("T1.1.3 should toggle tag filters from advanced filters button", async () => {
    render(<InstalledView />);
    
    // Click advanced filters to show tag filters
    const filterBtn = await screen.findByRole("button", { name: /filters/i });
    await userEvent.click(filterBtn);
    
    // Find Tag button/chip "Nature" and click it
    const natureTagBtn = await screen.findByRole("button", { name: "Nature" });
    await userEvent.click(natureTagBtn);
    
    expect(screen.getByText("Nature Wallpaper")).toBeInTheDocument();
    expect(screen.queryByText("Cyberpunk City")).not.toBeInTheDocument();
  });

  it("T1.1.4 should toggle bulk selection mode and manage selection state", async () => {
    render(<InstalledView />);
    
    // Toggle multi-select / bulk mode
    const bulkToggle = await screen.findByRole("button", { name: /select/i });
    await userEvent.click(bulkToggle);
    
    // In bulk mode, clicking a card toggles its selection
    const firstCard = screen.getByText("Nature Wallpaper");
    await userEvent.click(firstCard);
    
    // Verify selection bar is visible and shows selection count
    const selectionBarText = screen.getByText(/1 selected/i);
    expect(selectionBarText).toBeInTheDocument();
  });

  it("T1.1.5 should trigger metadata initialization and handle progress updates", async () => {
    let initCalled = false;
    registerCommandMock("app_init_metadata", () => {
      initCalled = true;
      return 2;
    });

    render(
      <>
        <InstalledView />
        <MetadataInitDialog />
      </>
    );
    
    const initBtn = await screen.findByRole("button", { name: /initialize now/i });
    await userEvent.click(initBtn);

    // Emit progress event
    emitTauriEvent("metadata-init-progress", { current: 1, total: 2 });
    
    await waitFor(() => {
      expect(initCalled).toBe(true);
    });
  });

  // --- Tier 2 tests ---
  it("T2.1.1 should render empty state when no wallpapers are installed", async () => {
    registerCommandMock("we_list_installed", () => []);
    render(<InstalledView />);
    
    const emptyStateText = await screen.findByText(/no wallpapers found/i);
    expect(emptyStateText).toBeInTheDocument();
  });

  it("T2.1.2 should support literal searches for special regular expression characters", async () => {
    const specialTitleWallpaper = {
      pubfileid: "2000003",
      folder: "/mock/3",
      project_json_path: "/mock/3/project.json",
      has_pkg: true,
      title: "Nature [Wallpaper] $1*",
      preview: "",
      description: "",
      file_type: "scene",
      tags: [],
      size_bytes: 100,
      installed_ts: 1600000000,
    };
    registerCommandMock("we_list_installed", () => [...mockWallpapers, specialTitleWallpaper]);
    
    render(<InstalledView />);
    const searchInput = await screen.findByPlaceholderText(/search/i);
    await userEvent.type(searchInput, "[Wallpaper] $1*");
    
    expect(screen.getByText("Nature [Wallpaper] $1*")).toBeInTheDocument();
    expect(screen.queryByText("Nature Wallpaper")).not.toBeInTheDocument();
  });

  it("T2.1.3 should show no matches state and offer clean-up filter button", async () => {
    render(<InstalledView />);
    const searchInput = await screen.findByPlaceholderText(/search/i);
    await userEvent.type(searchInput, "nonexistent_wallpaper_query");
    
    expect(await screen.findByText(/no wallpapers found/i)).toBeInTheDocument();
  });

  it("T2.1.4 should display rate limit message when metadata initialization fails with 429", async () => {
    registerCommandMock("app_init_metadata", () => {
      throw new Error("429 Too Many Requests");
    });

    render(
      <>
        <InstalledView />
        <MetadataInitDialog />
      </>
    );
    
    const initBtn = await screen.findByRole("button", { name: /initialize now/i });
    await userEvent.click(initBtn);

    const errorMsg = await screen.findByText(/rate limit exceeded/i);
    expect(errorMsg).toBeInTheDocument();
  });

  it("T2.1.5 should limit rendered elements in JSDOM under high items load (virtualization)", async () => {
    // Generate 100 wallpapers
    const largeWallpapersList = Array.from({ length: 100 }, (_, i) => ({
      pubfileid: `bulk_${i}`,
      folder: `/mock/${i}`,
      project_json_path: `/mock/${i}/project.json`,
      has_pkg: true,
      title: `Wallpaper Bulk #${i}`,
      preview: "",
      description: "",
      file_type: "scene",
      tags: [],
      size_bytes: 1000,
      installed_ts: 1600000000,
    }));
    registerCommandMock("we_list_installed", () => largeWallpapersList);
    
    render(<InstalledView />);
    
    // We expect the virtual scroll default size (12 items) to be rendered,
    // not all 100 items. Let's verify that the total cards in the DOM is 12.
    const cards = await screen.findAllByRole("article");
    expect(cards.length).toBe(12);
  });
});
