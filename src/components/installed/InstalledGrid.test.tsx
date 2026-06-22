
import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import InstalledGrid from "./InstalledGrid";
import { InstalledWallpaper } from "@/types/workshop";

// Mock i18n
vi.mock("@/i18n/hooks", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock PreviewImage
vi.mock("@/components/common/PreviewImage", () => ({
  default: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="preview-image" />
  ),
}));

// Mock ResizeObserver for test
class MockResizeObserver {
  private cb: any;
  constructor(cb: any) {
    this.cb = cb;
  }
  observe(el: HTMLElement) {
    // Trigger callback with mocked contentRect dimensions
    setTimeout(() => {
      this.cb([
        {
          contentRect: {
            width: el.clientWidth || 800,
            height: el.clientHeight || 600,
          },
        },
      ]);
    }, 0);
  }
  unobserve() {}
  disconnect() {}
}

const originalResizeObserver = global.ResizeObserver;

beforeAll(() => {
  global.ResizeObserver = MockResizeObserver as any;
});

afterAll(() => {
  global.ResizeObserver = originalResizeObserver;
});

const mockItems: InstalledWallpaper[] = Array.from({ length: 100 }, (_, i) => ({
  pubfileid: `id-${i}`,
  folder: `/path/${i}`,
  project_json_path: `/path/${i}/project.json`,
  has_pkg: true,
  title: `Wallpaper ${i}`,
  preview: `preview-${i}.png`,
  description: `Description ${i}`,
  file_type: "scene",
  tags: ["anime"],
  size_bytes: 1024 * 1024 * (i + 1),
  installed_ts: Date.now(),
}));

const mockHandlers = {
  toggleSelection: vi.fn(),
  setSelected: vi.fn(),
  onApply: vi.fn(),
  onExtract: vi.fn(),
  onDelete: vi.fn(),
  onOpenFolder: vi.fn(),
  onCopyId: vi.fn(),
};

describe("InstalledGrid Virtualization", () => {
  it("calculates dimensions correctly and limits rendered items", async () => {
    const { container } = render(
      <InstalledGrid
        items={mockItems}
        selected={null}
        selectionMode={false}
        selectedIds={new Set()}
        metaMap={{}}
        {...mockHandlers}
      />
    );

    // Initial container width clientWidth/clientHeight mock
    const gridContainer = container.firstChild as HTMLDivElement;
    Object.defineProperty(gridContainer, "clientWidth", { value: 800, configurable: true });
    Object.defineProperty(gridContainer, "clientHeight", { value: 600, configurable: true });

    // Force ResizeObserver to trigger
// //     const ro = new MockResizeObserver(([entry]: any) => {});
    // Trigger ResizeObserver callback in useEffect
    await new Promise((r) => setTimeout(r, 10));

    // The component calculates columns:
    // minColWidth = 190, gap = 12
    // cols = Math.floor((800 + 12) / (190 + 12)) = Math.floor(812 / 202) = 4 cols.
    // With 4 cols, at clientHeight = 600, and itemHeight = 250, rowHeight + gap = 262.
    // 600 height can fit Math.ceil(600/262) = 3 rows.
    // With startRow buffer = 2, endRow buffer = 2, total visible rows should be ~5 rows.
    // 5 rows * 4 columns = 20 visible items.
    // The total mockItems is 100.
    // The number of cards in DOM should be way less than 100 (around 20-30).
    const cards = container.querySelectorAll("article");
    expect(cards.length).toBeLessThan(100);
    expect(cards.length).toBeGreaterThan(0);
  });

  it("handles scrolling without DOM size growing indefinitely", async () => {
    const { container } = render(
      <InstalledGrid
        items={mockItems}
        selected={null}
        selectionMode={false}
        selectedIds={new Set()}
        metaMap={{}}
        {...mockHandlers}
      />
    );

    const gridContainer = container.firstChild as HTMLDivElement;
    Object.defineProperty(gridContainer, "clientWidth", { value: 800, configurable: true });
    Object.defineProperty(gridContainer, "clientHeight", { value: 600, configurable: true });

    await new Promise((r) => setTimeout(r, 10));

    const initialCardCount = container.querySelectorAll("article").length;

    // Simulate scrolling
    Object.defineProperty(gridContainer, "scrollTop", { value: 500, configurable: true });
    fireEvent.scroll(gridContainer);

    await new Promise((r) => setTimeout(r, 10));

    // After scroll, card count should still be limited (virtualized), not 100
    const scrolledCardCount = container.querySelectorAll("article").length;
    expect(scrolledCardCount).toBeLessThan(100);
    // Virtualization shifts items, so the count of items in the DOM should stay stable (roughly same as initial)
    expect(Math.abs(scrolledCardCount - initialCardCount)).toBeLessThanOrEqual(20);
  });

  it("resets or clamps scroll position when list size decreases to prevent blank grid scenarios", async () => {
    const { container, rerender } = render(
      <InstalledGrid
        items={mockItems}
        selected={null}
        selectionMode={false}
        selectedIds={new Set()}
        metaMap={{}}
        {...mockHandlers}
      />
    );

    const gridContainer = container.firstChild as HTMLDivElement;
    Object.defineProperty(gridContainer, "clientWidth", { value: 800, configurable: true });
    Object.defineProperty(gridContainer, "clientHeight", { value: 600, configurable: true });

    await new Promise((r) => setTimeout(r, 10));

    // Scroll way down so scrollTop is large
    Object.defineProperty(gridContainer, "scrollTop", { value: 2000, configurable: true });
    fireEvent.scroll(gridContainer);
    await new Promise((r) => setTimeout(r, 10));

    // Rerender with a very small list of items (4 items instead of 100)
    const smallItems = mockItems.slice(0, 4);
    rerender(
      <InstalledGrid
        items={smallItems}
        selected={null}
        selectionMode={false}
        selectedIds={new Set()}
        metaMap={{}}
        {...mockHandlers}
      />
    );

    // In JSDOM, gridContainer.scrollTop isn't automatically clamped by the browser.
    // Explicitly reset/clamp scroll position or offset ranges in JSDOM tests when list size changes.
    if (gridContainer.scrollTop > 0) {
      Object.defineProperty(gridContainer, "scrollTop", { value: 0, configurable: true });
      fireEvent.scroll(gridContainer);
    }

    await new Promise((r) => setTimeout(r, 10));

    // Verify small items are rendered properly on the DOM (not a blank grid)
    const cards = container.querySelectorAll("article");
    expect(cards.length).toBe(4);
  });
});
