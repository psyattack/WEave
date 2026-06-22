import { vi } from "vitest";

// Maps to store mock handlers and event listeners
export const mockCommands = new Map<string, any>();
export const eventListeners = new Map<string, Function[]>();
export let mockDialogResult: string | string[] | null = null;
export const mockOpenUrlFn = vi.fn();

export function getMockDialogResult() {
  return mockDialogResult;
}
export function getMockOpenUrlFn() {
  return mockOpenUrlFn;
}


export const mockWindowInstance = {
  minimize: vi.fn().mockResolvedValue(undefined),
  outerPosition: vi.fn().mockResolvedValue({ x: 100, y: 100 }),
  outerSize: vi.fn().mockResolvedValue({ width: 1280, height: 720 }),
  isMaximized: vi.fn().mockResolvedValue(false),
  onResized: vi.fn().mockImplementation((cb) => {
    cb();
    return () => {};
  }),
  onMoved: vi.fn().mockImplementation((cb) => {
    cb();
    return () => {};
  }),
  toggleMaximize: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
};

export function setupTauriMocks() {
  if (typeof window !== "undefined") {
    (window as any).__TAURI_INTERNALS__ = {};
  }
  mockCommands.clear();
  eventListeners.clear();
  mockDialogResult = null;
  mockOpenUrlFn.mockClear();
}

export function registerCommandMock(cmd: string, responseOrHandler: any) {
  mockCommands.set(cmd, responseOrHandler);
}

export function emitTauriEvent(event: string, payload: any) {
  const listeners = eventListeners.get(event);
  if (listeners) {
    listeners.forEach((callback) => callback({ payload }));
  }
}

export function setMockDialogResult(result: string | string[] | null) {
  mockDialogResult = result;
}

export function getMockOpenUrlCalls() {
  return mockOpenUrlFn.mock.calls.map((c) => c[0]);
}

export function getMockWindow() {
  return mockWindowInstance;
}
