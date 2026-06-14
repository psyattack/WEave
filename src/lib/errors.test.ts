import { describe, it, expect, vi } from "vitest";
import {
  WEaveError,
  NetworkError,
  FileSystemError,
  ConfigError,
  WorkshopError,
  ValidationError,
  Ok,
  Err,
  wrapAsync,
  wrap,
  handleErrors,
  parseCommandError,
  assert,
  getUserMessage,
} from "./errors";

describe("Error Classes", () => {
  it("should create a base WEaveError", () => {
    const error = new WEaveError("Test error");
    expect(error.message).toBe("Test error");
    expect(error.name).toBe("WEaveError");
  });

  it("should include context in error", () => {
    const error = new WEaveError("Test error", "TestContext");
    expect(error.context).toBe("TestContext");
    expect(error.getFullMessage()).toBe("[TestContext] Test error");
  });

  it("should create specific error types", () => {
    const networkError = new NetworkError("Connection failed");
    expect(networkError.name).toBe("NetworkError");
    expect(networkError.context).toBe("Network");

    const fsError = new FileSystemError("File not found");
    expect(fsError.name).toBe("FileSystemError");
    expect(fsError.context).toBe("FileSystem");

    const configError = new ConfigError("Invalid config");
    expect(configError.name).toBe("ConfigError");
    expect(configError.context).toBe("Config");
  });
});

describe("Result Type", () => {
  it("should create Ok result", () => {
    const result = Ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it("should create Err result", () => {
    const error = new WEaveError("Test error");
    const result = Err(error);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(error);
    }
  });
});

describe("wrapAsync", () => {
  it("should wrap successful promise", async () => {
    const result = await wrapAsync(Promise.resolve(42));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it("should wrap failed promise", async () => {
    const result = await wrapAsync(Promise.reject(new Error("Failed")));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(WEaveError);
    }
  });

  it("should use custom error factory", async () => {
    const result = await wrapAsync(
      Promise.reject(new Error("Network failed")),
      (_err) => new NetworkError("Custom network error"),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NetworkError);
      expect(result.error.message).toBe("Custom network error");
    }
  });
});

describe("wrap", () => {
  it("should wrap successful function", () => {
    const result = wrap(() => 42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it("should wrap failed function", () => {
    const result = wrap(() => {
      throw new Error("Failed");
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(WEaveError);
    }
  });
});

describe("handleErrors", () => {
  it("should return value on success", async () => {
    const result = await handleErrors(Promise.resolve(42));
    expect(result).toBe(42);
  });

  it("should return undefined on error", async () => {
    const result = await handleErrors(Promise.reject(new Error("Failed")));
    expect(result).toBeUndefined();
  });

  it("should call error callback", async () => {
    const onError = vi.fn();
    await handleErrors(Promise.reject(new Error("Failed")), onError);
    expect(onError).toHaveBeenCalled();
  });
});

describe("parseCommandError", () => {
  it("should parse network error", () => {
    const error = parseCommandError("Network error: Connection timeout");
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toBe("Connection timeout");
  });

  it("should parse file system error", () => {
    const error = parseCommandError("File system error: File not found");
    expect(error).toBeInstanceOf(FileSystemError);
    expect(error.message).toBe("File not found");
  });

  it("should parse config error", () => {
    const error = parseCommandError("Configuration error: Invalid value");
    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).toBe("Invalid value");
  });

  it("should parse workshop error", () => {
    const error = parseCommandError("Workshop error: Item not found");
    expect(error).toBeInstanceOf(WorkshopError);
    expect(error.message).toBe("Item not found");
  });

  it("should handle generic string error", () => {
    const error = parseCommandError("Unknown error occurred");
    expect(error).toBeInstanceOf(WEaveError);
    expect(error.message).toBe("Unknown error occurred");
  });

  it("should handle Error object", () => {
    const error = parseCommandError(new Error("Test error"));
    expect(error).toBeInstanceOf(WEaveError);
    expect(error.message).toBe("Test error");
  });

  it("should handle unknown error type", () => {
    const error = parseCommandError({ unknown: "data" });
    expect(error).toBeInstanceOf(WEaveError);
    expect(error.message).toBe("Unknown error");
  });
});

describe("assert", () => {
  it("should not throw on true condition", () => {
    expect(() => assert(true, "Should not throw")).not.toThrow();
  });

  it("should throw ValidationError on false condition", () => {
    expect(() => assert(false, "Validation failed")).toThrow(ValidationError);
  });
});

describe("getUserMessage", () => {
  it("should get message from WEaveError", () => {
    const error = new WEaveError("Test error");
    expect(getUserMessage(error)).toBe("Test error");
  });

  it("should get message from Error", () => {
    const error = new Error("Test error");
    expect(getUserMessage(error)).toBe("Test error");
  });

  it("should return string directly", () => {
    expect(getUserMessage("Test error")).toBe("Test error");
  });

  it("should return default message for unknown type", () => {
    expect(getUserMessage(null)).toBe("An unexpected error occurred");
  });
});
