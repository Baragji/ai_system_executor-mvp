import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import https from "node:https";
import type { IncomingMessage } from "node:http";
import { EventEmitter } from "node:events";
import {
  validateDependencies,
  DependencyPreflightError
} from "../../src/validation/dependencyPreflight.js";

// Mock https.get to control registry responses
vi.mock("node:https");

function createMockResponse(statusCode: number, data: string): IncomingMessage {
  const mockResponse = new EventEmitter() as IncomingMessage;
  mockResponse.statusCode = statusCode;
  
  // Simulate async response
  setTimeout(() => {
    mockResponse.emit("data", Buffer.from(data));
    mockResponse.emit("end");
  }, 0);
  
  return mockResponse;
}

function createMockRequest(): EventEmitter & { destroy: () => void } {
  const mockRequest = new EventEmitter() as EventEmitter & { destroy: () => void };
  mockRequest.destroy = vi.fn();
  return mockRequest;
}

describe("dependencyPreflight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validateDependencies", () => {
    it("should pass validation for valid dependencies", async () => {
      const httpsGetMock = vi.mocked(https.get);
      
      httpsGetMock.mockImplementation((_url, _options, _callback) => {
        const mockReq = createMockRequest();
        
        if (typeof _url === "string" && _url.includes("/express")) {
          const mockRes = createMockResponse(200, JSON.stringify({
            name: "express",
            versions: {
              "4.18.0": {},
              "4.18.1": {},
              "4.18.2": {},
              "4.19.0": {}
            },
            "dist-tags": { "latest": "4.19.0" }
          }));
          
          if (typeof _callback === "function") {
            _callback(mockRes);
          }
        }
        
        return mockReq as unknown as ReturnType<typeof https.get>;
      });

      await expect(
        validateDependencies({ express: "^4.18.0" })
      ).resolves.toBeUndefined();
    });

    it("should throw DependencyPreflightError for non-existent package", async () => {
      const httpsGetMock = vi.mocked(https.get);
      
      httpsGetMock.mockImplementation((_url, _options, _callback) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse(404, "Not Found");
        
        if (typeof _callback === "function") {
          _callback(mockRes);
        }
        
        return mockReq as unknown as ReturnType<typeof https.get>;
      });

      await expect(
        validateDependencies({ "non-existent-pkg-xyz": "^1.0.0" })
      ).rejects.toThrow(DependencyPreflightError);

      try {
        await validateDependencies({ "non-existent-pkg-xyz": "^1.0.0" });
      } catch (err) {
        const error = err as DependencyPreflightError;
        expect(error.errors).toHaveLength(1);
        expect(error.errors[0].reason).toBe("NOT_FOUND");
        expect(error.errors[0].package).toBe("non-existent-pkg-xyz");
      }
    });

    it("should throw for invalid semver range", async () => {
      await expect(
        validateDependencies({ express: "not-a-valid-semver" })
      ).rejects.toThrow(DependencyPreflightError);

      try {
        await validateDependencies({ express: "not-a-valid-semver" });
      } catch (err) {
        const error = err as DependencyPreflightError;
        expect(error.errors).toHaveLength(1);
        expect(error.errors[0].reason).toBe("INVALID_SEMVER");
        expect(error.errors[0].package).toBe("express");
      }
    });

    it("should throw for version range with no matching version", async () => {
      const httpsGetMock = vi.mocked(https.get);
      
      httpsGetMock.mockImplementation((_url, _options, _callback) => {
        const mockReq = createMockRequest();
        
        if (typeof _url === "string" && _url.includes("/tailwindcss")) {
          const mockRes = createMockResponse(200, JSON.stringify({
            name: "tailwindcss",
            versions: {
              "3.0.0": {},
              "3.4.0": {},
              "3.4.14": {},
              "4.0.0-alpha.1": {}
            },
            "dist-tags": { "latest": "3.4.14" }
          }));
          
          if (typeof _callback === "function") {
            _callback(mockRes);
          }
        }
        
        return mockReq as unknown as ReturnType<typeof https.get>;
      });

      await expect(
        validateDependencies({ tailwindcss: "^3.5.0" })
      ).rejects.toThrow(DependencyPreflightError);

      try {
        await validateDependencies({ tailwindcss: "^3.5.0" });
      } catch (err) {
        const error = err as DependencyPreflightError;
        expect(error.errors).toHaveLength(1);
        expect(error.errors[0].reason).toBe("NO_MATCHING_VERSION");
        expect(error.errors[0].package).toBe("tailwindcss");
        expect(error.errors[0].suggestion).toContain("No version matching");
      }
    });

    it("should throw for deprecated package (by default)", async () => {
      const httpsGetMock = vi.mocked(https.get);
      
      httpsGetMock.mockImplementation((_url, _options, _callback) => {
        const mockReq = createMockRequest();
        
        if (typeof _url === "string" && _url.includes("/old-pkg")) {
          const mockRes = createMockResponse(200, JSON.stringify({
            name: "old-pkg",
            versions: {
              "1.0.0": { deprecated: "This package is no longer maintained" }
            },
            "dist-tags": { "latest": "1.0.0" }
          }));
          
          if (typeof _callback === "function") {
            _callback(mockRes);
          }
        }
        
        return mockReq as unknown as ReturnType<typeof https.get>;
      });

      await expect(
        validateDependencies({ "old-pkg": "^1.0.0" })
      ).rejects.toThrow(DependencyPreflightError);

      try {
        await validateDependencies({ "old-pkg": "^1.0.0" });
      } catch (err) {
        const error = err as DependencyPreflightError;
        expect(error.errors).toHaveLength(1);
        expect(error.errors[0].reason).toBe("DEPRECATED");
        expect(error.errors[0].suggestion).toContain("deprecated");
      }
    });

    it("should allow deprecated package when allowDeprecated=true", async () => {
      const httpsGetMock = vi.mocked(https.get);
      
      httpsGetMock.mockImplementation((_url, _options, _callback) => {
        const mockReq = createMockRequest();
        
        if (typeof _url === "string" && _url.includes("/old-pkg")) {
          const mockRes = createMockResponse(200, JSON.stringify({
            name: "old-pkg",
            versions: {
              "1.0.0": { deprecated: "This package is no longer maintained" }
            },
            "dist-tags": { "latest": "1.0.0" }
          }));
          
          if (typeof _callback === "function") {
            _callback(mockRes);
          }
        }
        
        return mockReq as unknown as ReturnType<typeof https.get>;
      });

      await expect(
        validateDependencies({ "old-pkg": "^1.0.0" }, undefined, { allowDeprecated: true })
      ).resolves.toBeUndefined();
    });

    it("should validate both dependencies and devDependencies", async () => {
      const httpsGetMock = vi.mocked(https.get);
      
      httpsGetMock.mockImplementation((_url, _options, _callback) => {
        const mockReq = createMockRequest();
        
        if (typeof _url === "string") {
          if (_url.includes("/express")) {
            const mockRes = createMockResponse(200, JSON.stringify({
              name: "express",
              versions: { "4.18.0": {} },
              "dist-tags": { "latest": "4.18.0" }
            }));
            if (typeof _callback === "function") _callback(mockRes);
          } else if (_url.includes("/vitest")) {
            const mockRes = createMockResponse(200, JSON.stringify({
              name: "vitest",
              versions: { "1.0.0": {} },
              "dist-tags": { "latest": "1.0.0" }
            }));
            if (typeof _callback === "function") _callback(mockRes);
          }
        }
        
        return mockReq as unknown as ReturnType<typeof https.get>;
      });

      await expect(
        validateDependencies({ express: "^4.18.0" }, { vitest: "^1.0.0" })
      ).resolves.toBeUndefined();
    });

    it("should detect Tailwind v4 without @tailwindcss/cli", async () => {
      await expect(
        validateDependencies({ tailwindcss: "^4.0.0" })
      ).rejects.toThrow(DependencyPreflightError);

      try {
        await validateDependencies({ tailwindcss: "^4.0.0" });
      } catch (err) {
        const error = err as DependencyPreflightError;
        expect(error.errors.some((e) => e.reason === "TAILWIND_V4_MISCONFIGURED")).toBe(true);
      }
    });

    it("should allow Tailwind v4 with @tailwindcss/cli", async () => {
      const httpsGetMock = vi.mocked(https.get);
      
      httpsGetMock.mockImplementation((_url, _options, _callback) => {
        const mockReq = createMockRequest();
        
        if (typeof _url === "string") {
          if (_url.includes("/tailwindcss")) {
            const mockRes = createMockResponse(200, JSON.stringify({
              name: "tailwindcss",
              versions: { "4.0.0": {} },
              "dist-tags": { "latest": "4.0.0" }
            }));
            if (typeof _callback === "function") _callback(mockRes);
          } else if (_url.includes("/@tailwindcss/cli")) {
            const mockRes = createMockResponse(200, JSON.stringify({
              name: "@tailwindcss/cli",
              versions: { "4.0.0": {} },
              "dist-tags": { "latest": "4.0.0" }
            }));
            if (typeof _callback === "function") _callback(mockRes);
          }
        }
        
        return mockReq as unknown as ReturnType<typeof https.get>;
      });

      await expect(
        validateDependencies({
          tailwindcss: "^4.0.0",
          "@tailwindcss/cli": "^4.0.0"
        })
      ).resolves.toBeUndefined();
    });

    it("should handle registry timeout gracefully", async () => {
      const httpsGetMock = vi.mocked(https.get);
      
      httpsGetMock.mockImplementation((_url, _options, _callback) => {
        const mockReq = createMockRequest();
        
        // Simulate timeout after 50ms
        setTimeout(() => {
          mockReq.emit("timeout");
        }, 50);
        
        return mockReq as unknown as ReturnType<typeof https.get>;
      });

      await expect(
        validateDependencies({ express: "^4.18.0" }, undefined, { timeoutMs: 100 })
      ).rejects.toThrow(DependencyPreflightError);
    });

    it("should handle registry network error", async () => {
      const httpsGetMock = vi.mocked(https.get);
      
      httpsGetMock.mockImplementation((_url, _options, _callback) => {
        const mockReq = createMockRequest();
        
        setTimeout(() => {
          mockReq.emit("error", new Error("Network error"));
        }, 0);
        
        return mockReq as unknown as ReturnType<typeof https.get>;
      });

      await expect(
        validateDependencies({ express: "^4.18.0" })
      ).rejects.toThrow(DependencyPreflightError);
    });

    it("should aggregate multiple validation errors", async () => {
      const httpsGetMock = vi.mocked(https.get);
      
      httpsGetMock.mockImplementation((_url, _options, _callback) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse(404, "Not Found");
        
        if (typeof _callback === "function") {
          _callback(mockRes);
        }
        
        return mockReq as unknown as ReturnType<typeof https.get>;
      });

      try {
        await validateDependencies({
          "pkg-one": "^1.0.0",
          "pkg-two": "^2.0.0",
          "pkg-three": "not-valid-semver"
        });
      } catch (err) {
        const error = err as DependencyPreflightError;
        expect(error.errors.length).toBeGreaterThanOrEqual(2);
        expect(error.message).toContain("Dependency validation failed");
      }
    });
  });
});
