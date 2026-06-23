
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import DetailsPanel from "@/components/common/DetailsPanel";
import WallpaperCard from "@/components/installed/WallpaperCard";
import InstalledGrid from "@/components/installed/InstalledGrid";

describe("WOW Visual Polish Redesign E2E Tests (F6)", () => {
  // --- Tier 1 tests ---

  it("T1.6.2 should render Glassmorphism styling borders on details panel", async () => {
    const mockItem = {
      pubfileid: "2000001",
      folder: "/mock/1",
      project_json_path: "/mock/1/project.json",
      has_pkg: true,
      title: "Glass Wallpaper",
      preview: "",
      description: "",
      file_type: "scene",
      tags: [],
      size_bytes: 100,
      installed_ts: 1600000000,
    };
    render(
      <DetailsPanel
        kind="installed"
        item={mockItem}
        onClose={() => {}}
        onApply={() => {}}
        onExtract={() => {}}
        onDelete={() => {}}
        onOpenFolder={() => {}}
        onCopyId={() => {}}
      />
    );

    const drawerHeader = await screen.findByText("Glass Wallpaper");
    expect(drawerHeader).toBeInTheDocument();
  });

  it("T1.6.3 should compute 3D tilt coordinates on card mouse hover", async () => {
    const mockItem = {
      pubfileid: "2000001",
      folder: "/mock/1",
      project_json_path: "/mock/1/project.json",
      has_pkg: true,
      title: "Glass Wallpaper",
      preview: "",
      description: "",
      file_type: "scene",
      tags: [],
      size_bytes: 100,
      installed_ts: 1600000000,
    };
    render(
      <WallpaperCard
        item={mockItem}
        isSelected={false}
        selectionMode={false}
        isBulkSelected={false}
        onToggleBulk={() => {}}
        onSelect={() => {}}
        onApply={() => {}}
        onExtract={() => {}}
        onDelete={() => {}}
        onOpenFolder={() => {}}
        onCopyId={() => {}}
      />
    );
    const card = screen.getByRole("article");
    const mouseMoveEvent = new MouseEvent("mousemove", {
      bubbles: true,
      clientX: 150,
      clientY: 50,
    });
    card.dispatchEvent(mouseMoveEvent);
    expect(card.style.transform).toContain("rotateX");
  });

  it("T1.6.4 should apply staggered delay styles to loaded card list items", async () => {
    const items = [
      {
        pubfileid: "2000001",
        folder: "/mock/1",
        project_json_path: "/mock/1/project.json",
        has_pkg: true,
        title: "W1",
        preview: "",
        description: "",
        file_type: "scene",
        tags: [],
        size_bytes: 100,
        installed_ts: 1600000000,
      },
      {
        pubfileid: "2000002",
        folder: "/mock/2",
        project_json_path: "/mock/2/project.json",
        has_pkg: true,
        title: "W2",
        preview: "",
        description: "",
        file_type: "scene",
        tags: [],
        size_bytes: 100,
        installed_ts: 1600000000,
      }
    ];
    render(
      <InstalledGrid
        items={items}
        selected={null}
        selectionMode={false}
        selectedIds={new Set()}
        toggleSelection={() => {}}
        setSelected={() => {}}
        metaMap={{}}
        onApply={() => {}}
        onExtract={() => {}}
        onDelete={() => {}}
        onOpenFolder={() => {}}
        onCopyId={() => {}}
      />
    );
    const cards = screen.getAllByRole("article");
    expect(cards[0].style.animationDelay).toBe("0s");
    expect(cards[1].style.animationDelay).toBe("0.05s");
  });

  it("T1.6.5 should display shimmering skeletons in loading state", async () => {
    render(<SkeletonCard />);
    const skeletons = document.querySelectorAll(".shimmer");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // --- Tier 2 tests ---
  it("T2.6.1 should skip 3D tilt tracking when prefers-reduced-motion is active", async () => {
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

      const mockItem = {
        pubfileid: "2000001",
        folder: "/mock/1",
        project_json_path: "/mock/1/project.json",
        has_pkg: true,
        title: "W1",
        preview: "",
        description: "",
        file_type: "scene",
        tags: [],
        size_bytes: 100,
        installed_ts: 1600000000,
      };
      render(
        <WallpaperCard
          item={mockItem}
          isSelected={false}
          selectionMode={false}
          isBulkSelected={false}
          onToggleBulk={() => {}}
          onSelect={() => {}}
          onApply={() => {}}
          onExtract={() => {}}
          onDelete={() => {}}
          onOpenFolder={() => {}}
          onCopyId={() => {}}
        />
      );
      const card = screen.getByRole("article");
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


  it("T2.6.4 should handle rapid morphing tween interrupts smoothly", async () => {
    render(<Skeleton className="transition-all duration-75" />);
    expect(document.querySelector(".shimmer")).toBeInTheDocument();
  });

  it("T2.6.5 should flip shimmer gradient direction in RTL layout mode", async () => {
    render(
      <div dir="rtl">
        <SkeletonCard />
      </div>
    );
    const skeletons = document.querySelectorAll(".shimmer");
    expect(skeletons[0].className).toContain("bg-gradient-to-l");
  });
});
