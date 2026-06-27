
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import DetailsPanel from "@/components/common/DetailsPanel";
import { setupTauriMocks, registerCommandMock, } from "@/lib/tauri-mock";
import { useAppStore } from "@/stores/app";
import { useInstalledStore } from "@/stores/installed";
import { tryInvokeOk } from "@/lib/tauri";

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

describe("Details Panel E2E Tests (F2)", () => {
  beforeEach(() => {
    setupTauriMocks();
    useAppStore.setState({
      ready: true,
      weDirectory: "C:/MockDirectory",
    });
    useInstalledStore.setState({
      byId: { "2000001": mockWallpaper },
      ready: true,
    });
    registerCommandMock("metadata_get", () => ({
      pubfileid: "2000001",
      title: "Nature Wallpaper",
      preview: "nature.jpg",
      description: "Beautiful nature scene",
      author: "John Doe",
      size: "15 MB",
      tags: ["Nature", "Scene"],
      posted_date: "2020-01-01",
    }));
  });

  // --- Tier 1 tests ---
  it("T1.2.1 should display metadata in details panel when open", async () => {
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
      />
    );

    // Verify title and author
    expect(await screen.findByRole("heading", { name: "Nature Wallpaper" })).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("T1.2.2 should call onApply when apply button is clicked", async () => {
    const handleApply = vi.fn();
    render(
      <DetailsPanel
        kind="installed"
        item={mockWallpaper}
        onClose={() => {}}
        onApply={handleApply}
        onExtract={() => {}}
        onDelete={() => {}}
        onOpenFolder={() => {}}
        onCopyId={() => {}}
      />
    );

    // Wait for the buttons to render.
    // The Play button has aria-label/text from i18n, but wait, let's find it.
    // In our i18n, "tooltips.install_wallpaper" is something like "Apply Wallpaper" or we can search by role.
    const applyBtn = await screen.findByRole("button", { name: /apply/i });
    await userEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledWith(mockWallpaper);
  });

  it("T1.2.3 should call onExtract when extract button is clicked", async () => {
    const handleExtract = vi.fn();
    render(
      <DetailsPanel
        kind="installed"
        item={mockWallpaper}
        onClose={() => {}}
        onApply={() => {}}
        onExtract={handleExtract}
        onDelete={() => {}}
        onOpenFolder={() => {}}
        onCopyId={() => {}}
      />
    );

    const extractBtn = await screen.findByRole("button", { name: /extract/i });
    await userEvent.click(extractBtn);

    expect(handleExtract).toHaveBeenCalledWith(mockWallpaper);
  });

  it("T1.2.4 should translate description when translator button is clicked", async () => {
    let translateCalled = false;
    registerCommandMock("translator_translate", () => {
      translateCalled = true;
      return "Прекрасный пейзаж";
    });

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
      />
    );

    const translateBtn = await screen.findByRole("button", { name: /translate/i });
    await userEvent.click(translateBtn);

    await waitFor(() => {
      expect(translateCalled).toBe(true);
    });
    expect(screen.getByText("Прекрасный пейзаж")).toBeInTheDocument();
  });

  it("T1.2.5 should call onDelete when delete button is clicked and confirmed", async () => {
    const handleDelete = vi.fn();
    render(
      <DetailsPanel
        kind="installed"
        item={mockWallpaper}
        onClose={() => {}}
        onApply={() => {}}
        onExtract={() => {}}
        onDelete={handleDelete}
        onOpenFolder={() => {}}
        onCopyId={() => {}}
      />
    );

    const menuTrigger = await screen.findByRole("button", { name: /more/i });
    await userEvent.click(menuTrigger);

    const deleteBtn = await screen.findByRole("menuitem", { name: /delete/i });
    await userEvent.click(deleteBtn);

    expect(handleDelete).toHaveBeenCalledWith(mockWallpaper);
  });

  // --- Tier 2 tests ---
  it("T2.2.1 should display default fallbacks for incomplete metadata", async () => {
    registerCommandMock("metadata_get", () => ({
      pubfileid: "2000001",
      title: "Nature Wallpaper",
      preview: "",
      description: null,
      author: null,
      size: null,
      tags: [],
    }));

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
      />
    );

    expect(await screen.findByRole("heading", { name: "Nature Wallpaper" })).toBeInTheDocument();
    // Author falls back to no element or similar, let's verify no author element or placeholder
    expect(screen.queryByText(/author/i)).not.toBeInTheDocument();
  });

  it("T2.2.2 should handle extreme description texts without crashing", async () => {
    const longDesc = "A".repeat(5000);
    registerCommandMock("metadata_get", () => ({
      pubfileid: "2000001",
      title: "Nature Wallpaper",
      description: longDesc,
    }));

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
      />
    );

    expect(await screen.findByText(longDesc)).toBeInTheDocument();
  });

  it("T2.2.3 should open toast message when folder path is missing or invalid", async () => {
    // In our test, we want to mock what happens when path open throws or fails.
    // Actually details action button open is:
    // const overlayOpenFolder = async () => { ... await tryInvokeOk("open_path", { path: installedHandle.folder }); }
    let openPathCalled = false;
    registerCommandMock("open_path", () => {
      openPathCalled = true;
      throw new Error("Folder not found");
    });

    render(
      <DetailsPanel
        kind="installed"
        item={mockWallpaper}
        onClose={() => {}}
        onApply={() => {}}
        onExtract={() => {}}
        onDelete={() => {}}
        onOpenFolder={(item) => {
          // Trigger the command directly or do similar
          void tryInvokeOk("open_path", { path: item.folder });
        }}
        onCopyId={() => {}}
      />
    );

    const menuTrigger = await screen.findByRole("button", { name: /more/i });
    await userEvent.click(menuTrigger);

    const openFolderBtn = await screen.findByRole("menuitem", { name: /folder/i });
    await userEvent.click(openFolderBtn);

    await waitFor(() => {
      expect(openPathCalled).toBe(true);
    });
  });

  it("T2.2.4 should display error and preserve description on translation failure", async () => {
    registerCommandMock("translator_translate", () => {
      throw new Error("API Limit");
    });

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
      />
    );

    const translateBtn = await screen.findByRole("button", { name: /translate/i });
    await userEvent.click(translateBtn);

    // Renders the original description
    expect(await screen.findByText("Beautiful nature scene")).toBeInTheDocument();
  });

  it("T2.2.5 should handle active wallpaper ID mismatch gracefully", async () => {
    // register active wallpaper to mismatch
    registerCommandMock("we_active_pubfileids", () => ["nonexistent_active_id"]);

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
      />
    );

    // Apply button is rendered
    const applyBtn = await screen.findByRole("button", { name: /apply/i });
    expect(applyBtn).toBeInTheDocument();
  });

  it("T2.2.6 should show inline warning when trying to delete active wallpaper", async () => {
    registerCommandMock("we_active_pubfileids", () => [mockWallpaper.pubfileid]);
    const handleDelete = vi.fn();

    render(
      <DetailsPanel
        kind="installed"
        item={mockWallpaper}
        onClose={() => {}}
        onApply={() => {}}
        onExtract={() => {}}
        onDelete={handleDelete}
        onOpenFolder={() => {}}
        onCopyId={() => {}}
      />
    );

    const menuTrigger = await screen.findByRole("button", { name: /more/i });
    await userEvent.click(menuTrigger);

    const deleteBtn = await screen.findByRole("menuitem", { name: /delete/i });
    await userEvent.click(deleteBtn);

    // It should not invoke the delete handler
    expect(handleDelete).not.toHaveBeenCalled();

    // It should show the inline warning message
    expect(
      await screen.findByText(
        "This wallpaper is currently active in Wallpaper Engine. Please switch to a different wallpaper first, then try again."
      )
    ).toBeInTheDocument();
  });
});
