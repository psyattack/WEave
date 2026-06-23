if (typeof window !== "undefined") {
  (window as any).__TAURI_INTERNALS__ =
    (window as any).__TAURI_INTERNALS__ || {};
  window.Element.prototype.hasPointerCapture =
    window.Element.prototype.hasPointerCapture || (() => false);
  window.Element.prototype.setPointerCapture =
    window.Element.prototype.setPointerCapture || (() => {});
  window.Element.prototype.releasePointerCapture =
    window.Element.prototype.releasePointerCapture || (() => {});
  window.HTMLElement.prototype.scrollIntoView =
    window.HTMLElement.prototype.scrollIntoView || (() => {});
  window.HTMLElement.prototype.scrollTo =
    window.HTMLElement.prototype.scrollTo || (() => {});
  window.Element.prototype.scrollTo =
    window.Element.prototype.scrollTo || (() => {});
}

import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Suppress console errors in tests unless explicitly needed
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") ||
        args[0].includes("Not implemented: HTMLFormElement.prototype.submit"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterEach(() => {
  console.error = originalError;
});

// Parse src/index.css to support computed styles in JSDOM tests
import fs from "node:fs";
import path from "node:path";

const cssPath = path.resolve(__dirname, "../index.css");
const parsedRules: { selector: string; variables: Record<string, string> }[] =
  [];

try {
  const cssContent = fs.readFileSync(cssPath, "utf-8");
  const cleanCss = cssContent.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectorStack: string[] = [];
  let currentText = "";
  let i = 0;

  while (i < cleanCss.length) {
    const char = cleanCss[i];
    if (char === "{") {
      selectorStack.push(currentText.trim());
      currentText = "";
      i++;
    } else if (char === "}") {
      const declarations = currentText.trim();
      const selector = selectorStack.pop() || "";
      currentText = "";
      i++;

      const variables: Record<string, string> = {};
      const varRegex = /(--[\w-]+)\s*:\s*([^;/\n]+)/g;
      let varMatch;
      while ((varMatch = varRegex.exec(declarations)) !== null) {
        variables[varMatch[1].trim()] = varMatch[2].trim();
      }

      if (Object.keys(variables).length > 0) {
        const activeSelectors = selector.split(",").map((s) => s.trim());
        for (const sel of activeSelectors) {
          if (sel.startsWith("@") || sel.includes("%") || sel.includes("(")) {
            continue;
          }
          parsedRules.push({ selector: sel, variables });
        }
      }
    } else {
      currentText += char;
      i++;
    }
  }
} catch (err) {
  console.error("Failed to parse index.css in test-setup:", err);
}

// Override window.getComputedStyle for JSDOM
const originalGetComputedStyle = window.getComputedStyle;
Object.defineProperty(window, "getComputedStyle", {
  writable: true,
  value: (elt: HTMLElement) => {
    const style = originalGetComputedStyle(elt);
    if (elt !== document.documentElement) {
      return style;
    }

    const computedVars: Record<string, string> = {};
    for (const rule of parsedRules) {
      try {
        if (rule.selector === ":root" || elt.matches(rule.selector)) {
          Object.assign(computedVars, rule.variables);
        }
      } catch {
        // Ignore invalid selectors
      }
    }

    // Inline style overrides (highest precedence in CSS cascade)
    const inlineStyles: Record<string, string> = {};
    for (let i = 0; i < elt.style.length; i++) {
      const name = elt.style[i];
      inlineStyles[name] = elt.style.getPropertyValue(name);
    }
    Object.assign(computedVars, inlineStyles);

    return {
      getPropertyValue: (prop: string) => {
        if (prop.startsWith("--")) {
          return computedVars[prop] || "";
        }
        return style.getPropertyValue(prop);
      },
    } as any;
  },
});

vi.mock("@tauri-apps/api/core", async () => {
  const { mockCommands } = await import("./tauri-mock");
  return {
    invoke: vi.fn().mockImplementation(async (cmd, args) => {
      if (mockCommands.has(cmd)) {
        const handler = mockCommands.get(cmd);
        return typeof handler === "function" ? handler(args) : handler;
      }
      if (cmd === "config_get") return true;
      if (cmd === "we_list_installed") return [];
      return null;
    }),
    convertFileSrc: vi
      .fn()
      .mockImplementation((path) => `asset://localhost/${path}`),
  };
});

vi.mock("@tauri-apps/api/event", async () => {
  const { eventListeners } = await import("./tauri-mock");
  return {
    listen: vi.fn().mockImplementation(async (event, callback) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
      }
      eventListeners.get(event)!.push(callback);
      return () => {
        const list = eventListeners.get(event);
        if (list) {
          eventListeners.set(
            event,
            list.filter((cb) => cb !== callback),
          );
        }
      };
    }),
  };
});

vi.mock("@tauri-apps/api/window", async () => {
  const { mockWindowInstance } = await import("./tauri-mock");
  return {
    getCurrentWindow: vi.fn().mockImplementation(() => mockWindowInstance),
  };
});

vi.mock("@tauri-apps/plugin-dialog", async () => {
  const { getMockDialogResult } = await import("./tauri-mock");
  return {
    open: vi.fn().mockImplementation(async () => {
      return getMockDialogResult();
    }),
  };
});

vi.mock("@tauri-apps/plugin-opener", async () => {
  const { mockOpenUrlFn } = await import("./tauri-mock");
  return {
    openUrl: vi.fn().mockImplementation(async (url) => {
      mockOpenUrlFn(url);
    }),
  };
});

vi.mock("react-i18next", async () => {
  const enTranslations = (await import("../i18n/locales/en")).default;
  const translate = (key: string, options?: any): string => {
    if (!key) return "";
    const parts = key.split(".");
    let current: any = enTranslations;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return key;
      }
    }
    if (typeof current === "string") {
      let result = current;
      if (options && typeof options === "object") {
        for (const [k, v] of Object.entries(options)) {
          result = result.replace(
            new RegExp(`{{\\s*${k}\\s*}}`, "g"),
            String(v),
          );
        }
      }
      return result;
    }
    return key;
  };

  return {
    useTranslation: () => ({
      t: translate,
      i18n: {
        changeLanguage: async () => {},
        t: translate,
        exists: (key: string) => {
          const parts = key.split(".");
          let current: any = enTranslations;
          for (const part of parts) {
            if (current && typeof current === "object" && part in current) {
              current = current[part];
            } else {
              return false;
            }
          }
          return typeof current === "string";
        },
      },
    }),
    initReactI18next: {
      type: "3rdParty",
      init: () => {},
    },
  };
});
