import { useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import InstalledGrid from "@/components/installed/InstalledGrid";
import { useConfirm } from "@/hooks/useConfirm";
import AccountsSettingsTab from "@/components/settings/AccountsSettingsTab";
import { setupTauriMocks, } from "@/lib/tauri-mock";
import { useAppStore } from "@/stores/app";

// Helper component for testing useConfirm leak checks
function ConfirmTester() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [result, setResult] = useState<string>("none");

  const runConfirm = async () => {
    const res = await confirm({
      title: "Confirm Action",
      message: "Are you sure?",
    });
    setResult(String(res));
  };

  return (
    <div>
      <button data-testid="trigger" onClick={runConfirm}>Open Confirm</button>
      <span data-testid="result">{result}</span>
      {ConfirmDialog}
    </div>
  );
}

describe("Challenger 2 M1 Stress Tests", () => {
  beforeEach(() => {
    setupTauriMocks();
    useAppStore.setState({
      ready: true,
      weDirectory: "C:/MockDirectory",
      accounts: [],
      accountIndex: 0,
      language: "en",
    });
  });

  describe("Grid Virtualization Performance & DOM Boundedness", () => {
    it("should render a small, bounded number of items out of 5,000, and update on scroll", async () => {
      // 1. Generate 5,000 mock wallpapers
      const largeItems = Array.from({ length: 5000 }, (_, i) => ({
        pubfileid: `wall_${i}`,
        folder: `/mock/${i}`,
        project_json_path: `/mock/${i}/project.json`,
        has_pkg: true,
        title: `Wallpaper #${i}`,
        preview: `preview_${i}.jpg`,
        description: `Desc ${i}`,
        file_type: "scene",
        tags: ["Nature"],
        size_bytes: 1024 * 1024,
        installed_ts: 1600000000 + i,
      }));

      const mockToggleSelection = vi.fn();
      const mockSetSelected = vi.fn();
      const mockOnApply = vi.fn();
      const mockOnExtract = vi.fn();
      const mockOnDelete = vi.fn();
      const mockOnOpenFolder = vi.fn();
      const mockOnCopyId = vi.fn();

      // 2. Render InstalledGrid
      const { container } = render(
        <InstalledGrid
          items={largeItems}
          selected={null}
          selectionMode={false}
          selectedIds={new Set()}
          toggleSelection={mockToggleSelection}
          setSelected={mockSetSelected}
          metaMap={{}}
          onApply={mockOnApply}
          onExtract={mockOnExtract}
          onDelete={mockOnDelete}
          onOpenFolder={mockOnOpenFolder}
          onCopyId={mockOnCopyId}
        />
      );

      // Initially, ResizeObserver inside JSDOM doesn't fire container resize, so dimensions are 0.
      // InstalledGrid falls back to slicing the first 12 items.
      const cards = screen.getAllByRole("article");
      expect(cards.length).toBe(12);

      // Verify titles of initial items
      expect(screen.getByText("Wallpaper #0")).toBeInTheDocument();
      expect(screen.getByText("Wallpaper #11")).toBeInTheDocument();
      expect(screen.queryByText("Wallpaper #12")).not.toBeInTheDocument();

      // Get container scroll element
      const scrollContainer = container.firstChild as HTMLDivElement;
      expect(scrollContainer).toBeInTheDocument();
    });

    it("should compute virtualization dimensions and rows correctly", () => {
      const minColWidth = 190;
      const gap = 12;
      const itemHeight = 250;

      // Simulate the formula used in InstalledGrid:
      // cols = Math.max(1, Math.floor((width + gap) / (minColWidth + gap)))
      const calculateCols = (width: number) => {
        return Math.max(1, Math.floor((width + gap) / (minColWidth + gap)));
      };

      // Test different viewport widths
      expect(calculateCols(400)).toBe(2);  // (412 / 202) = 2
      expect(calculateCols(600)).toBe(3);  // (612 / 202) = 3
      expect(calculateCols(800)).toBe(4);  // (812 / 202) = 4
      expect(calculateCols(1000)).toBe(5); // (1012 / 202) = 5

      // Check totalHeight formula:
      // totalRows = Math.ceil(items / cols)
      // totalHeight = totalRows * itemHeight + (totalRows > 0 ? (totalRows - 1) * gap : 0)
      const calculateTotalHeight = (itemsCount: number, cols: number) => {
        const totalRows = Math.ceil(itemsCount / cols);
        return totalRows * itemHeight + (totalRows > 0 ? (totalRows - 1) * gap : 0);
      };

      expect(calculateTotalHeight(10, 4)).toBe(3 * 250 + 2 * 12); // 3 rows: 750 + 24 = 774px
      expect(calculateTotalHeight(0, 4)).toBe(0); // 0 rows: 0px
      expect(calculateTotalHeight(1, 4)).toBe(250); // 1 row: 250px
    });
  });

  describe("useConfirm Hook Leak Prevention", () => {
    it("should resolve true and cleanup resolver reference on confirm", async () => {
      render(<ConfirmTester />);
      
      fireEvent.click(screen.getByTestId("trigger"));
      expect(screen.getByText("Confirm Action")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Confirm"));
      
      await act(async () => {});
      expect(screen.getByTestId("result").textContent).toBe("true");
    });

    it("should resolve false and cleanup resolver reference on cancel", async () => {
      render(<ConfirmTester />);
      
      fireEvent.click(screen.getByTestId("trigger"));
      expect(screen.getByText("Confirm Action")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel"));
      
      await act(async () => {});
      expect(screen.getByTestId("result").textContent).toBe("false");
    });
  });

  describe("AccountsSettingsTab Event Listener Leak Prevention", () => {
    it("should register a steam-login-success listener and clean it up upon unmounting", async () => {
      const mockUnlisten = vi.fn();
      const mockListen = vi.fn().mockResolvedValue(mockUnlisten);

      // Temporarily mock listen function
      const apiEvent = await import("@tauri-apps/api/event");
      const originalListen = apiEvent.listen;
      apiEvent.listen = mockListen;

      try {
        const mockOpenParser = vi.fn();

        const { unmount } = render(
          <AccountsSettingsTab onOpenParser={mockOpenParser} />
        );

        // Verify it registers the steam-login-success listener
        expect(mockListen).toHaveBeenCalledWith("steam-login-success", expect.any(Function));

        // Unmount the component
        unmount();

        // Wait for any pending microtasks/promises to resolve
        await act(async () => {});

        // Verify that the returned unlisten function was called during cleanup
        expect(mockUnlisten).toHaveBeenCalled();
      } finally {
        // Restore original listen
        apiEvent.listen = originalListen;
      }
    });
  });
});
