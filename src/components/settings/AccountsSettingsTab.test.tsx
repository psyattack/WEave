
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import AccountsSettingsTab from "./AccountsSettingsTab";

const { mockListen, mockUnlisten, mockSetAccounts, mockSetAccountIndex } = vi.hoisted(() => {
  const mockUnlisten = vi.fn();
  const mockListen = vi.fn().mockResolvedValue(mockUnlisten);
  const mockSetAccounts = vi.fn();
  const mockSetAccountIndex = vi.fn();
  return { mockListen, mockUnlisten, mockSetAccounts, mockSetAccountIndex };
});

// Mocks
vi.mock("@/stores/app", () => {
  return {
    useAppStore: vi.fn((selector) => {
      const state = {
        accounts: [
          { index: 0, username: "Auto", is_custom: false },
          { index: 1, username: "CustomUser", is_custom: true },
        ],
        accountIndex: 0,
        setAccounts: mockSetAccounts,
        setAccountIndex: mockSetAccountIndex,
      };
      if (selector) return selector(state);
      return state;
    }),
  };
});

vi.mock("@/i18n/hooks", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/tauri", () => ({
  inTauri: true,
  invoke: vi.fn().mockResolvedValue(undefined),
  tryInvoke: vi.fn().mockResolvedValue([]),
  tryInvokeOk: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/stores/toasts", () => ({
  pushToast: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: mockListen,
}));

describe("AccountsSettingsTab Event Listener Leak Fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers steam-login-success listener on mount and unregisters on unmount", async () => {
    const { unmount } = render(<AccountsSettingsTab onOpenParser={() => {}} />);

    // Should call listen on mount
    expect(mockListen).toHaveBeenCalledWith("steam-login-success", expect.any(Function));

    // Wait for the mockListen promise to resolve and set the unlisten callback
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Now unmount the component
    unmount();

    // Verify that the unlisten function was called, preventing listener leaks
    expect(mockUnlisten).toHaveBeenCalled();
  });
});
