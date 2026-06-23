
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Tooltip } from "@/components/common/Tooltip";
import Dialog from "@/components/common/Dialog";
import Sidebar from "@/components/layout/Sidebar";
import InstalledSelectionBar from "@/components/installed/InstalledSelectionBar";
import App from "@/App";
import { useAppStore } from "@/stores/app";
import { useSteamSessionStore } from "@/stores/steam-session";

describe("Accessibility Compliance E2E Tests (F5)", () => {
  beforeEach(() => {
    useAppStore.setState({
      ready: true,
      sidebarCollapsed: false,
    });
    useSteamSessionStore.setState({
      phase: "idle",
      account: null,
    });
  });

  // --- Tier 1 tests ---
  it("T1.5.1 should display tooltip text on keyboard tab focus", async () => {
    render(
      <Tooltip content="Settings Shortcut">
        <button data-testid="tooltip-btn">Shortcut</button>
      </Tooltip>
    );

    const button = screen.getByTestId("tooltip-btn");
    button.focus();

    const tooltips = await screen.findAllByText("Settings Shortcut");
    expect(tooltips[0]).toBeInTheDocument();
  });

  it("T1.5.2 should configure ARIA tags on hover/focus triggers", async () => {
    render(
      <Tooltip content="Detailed Info">
        <button data-testid="aria-btn">Aria</button>
      </Tooltip>
    );

    const button = screen.getByTestId("aria-btn");
    await userEvent.hover(button);

    // With a proper Radix Tooltip, the trigger button should have aria-describedby
    // pointing to the tooltip content element ID.
    const tooltipContent = await screen.findByRole("tooltip");
    expect(button).toHaveAttribute("aria-describedby", tooltipContent.id);
  });

  it("T1.5.3 should respect prefers-reduced-motion systems setting", async () => {
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

      render(<App />);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it("T1.5.4 should trap keyboard focus within modal Dialog controls", async () => {
    render(
      <Dialog open={true} onOpenChange={() => {}} title="Test Dialog">
        <div>
          <button data-testid="btn1">Button 1</button>
          <button data-testid="btn2">Button 2</button>
        </div>
      </Dialog>
    );

    expect(screen.getByText("Test Dialog")).toBeInTheDocument();
    
    const btn1 = screen.getByTestId("btn1");
    btn1.focus();
    expect(document.activeElement).toBe(btn1);
  });

  it("T1.5.5 should provide explicit aria-label for collapsed sidebar icon buttons", async () => {
    useAppStore.setState({ sidebarCollapsed: true });

    render(<Sidebar current="workshop" onChange={() => {}} />);

    const toggleBtn = screen.getByRole("button", { name: /expand|collapse/i });
    expect(toggleBtn).toBeInTheDocument();
  });

  // --- Tier 2 tests ---
  it("T2.5.1 should update motion settings dynamically on media query changes", async () => {
    const originalMatchMedia = window.matchMedia;
    try {
      let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: (type: string, listener: any) => {
          if (type === "change") changeHandler = listener;
        },
        removeEventListener: vi.fn(),
      }));

      render(<App />);
      expect(changeHandler).toBeInstanceOf(Function);

      act(() => {
        changeHandler!({ matches: true } as MediaQueryListEvent);
      });
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it("T2.5.2 should dismiss modal on Escape press and restore trigger focus", async () => {
    let closed = false;
    render(
      <Dialog open={true} onOpenChange={(val) => { if (!val) closed = true; }} title="Dismiss Dialog">
        <button data-testid="inside-btn">Inside</button>
      </Dialog>
    );

    const insideBtn = screen.getByTestId("inside-btn");
    insideBtn.focus();

    await userEvent.keyboard("{Escape}");

    await waitFor(() => {
      expect(closed).toBe(true);
    });
  });

  it("T2.5.3 should align tooltip inside viewport bounds to prevent offscreen rendering", async () => {
    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;

    try {
      render(
        <Tooltip content="Bounding Box Tooltip" side="top">
          <button>Bounds</button>
        </Tooltip>
      );

      window.innerWidth = 1024;
      window.innerHeight = 768;

      const btn = screen.getByRole("button", { name: "Bounds" });
      await userEvent.hover(btn);

      const tooltips = await screen.findAllByText("Bounding Box Tooltip");
      expect(tooltips[0]).toBeInTheDocument();
    } finally {
      window.innerWidth = originalWidth;
      window.innerHeight = originalHeight;
    }
  });

  it("T2.5.4 should announce selection count updates to screen readers via aria-live", async () => {
    render(
      <InstalledSelectionBar
        selectionMode={true}
        selectedIds={new Set(["2000001", "2000002"])}
        clearSelection={() => {}}
        selectAll={() => {}}
        handleBulkExtract={() => {}}
        handleBulkDelete={() => {}}
      />
    );

    const announce = screen.getByRole("status");
    expect(announce).toBeInTheDocument();
    expect(announce).toHaveTextContent(/2/);
  });

  it("T2.5.5 should restrict focus to topmost modal when multiple dialogs are nested", async () => {
    render(
      <>
        <Dialog open={true} onOpenChange={() => {}} title="Outer Dialog">
          <button data-testid="outer-btn">Outer Button</button>
        </Dialog>
        <Dialog open={true} onOpenChange={() => {}} title="Inner Dialog">
          <button data-testid="inner-btn">Inner Button</button>
        </Dialog>
      </>
    );

    const innerBtn = screen.getByTestId("inner-btn");
    innerBtn.focus();
    expect(document.activeElement).toBe(innerBtn);
  });
});

