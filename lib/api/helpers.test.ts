import { describe, expect, it } from "vitest";
import { getClientIp, rateLimitKey, safeReturnTo } from "./helpers";

// safeReturnTo guards every post-login/logout redirect against open-redirect
// attacks (a malicious "?next=" or "?returnTo=" param). This is the one place
// in the codebase where getting the regex wrong has a real security cost.
describe("safeReturnTo", () => {
  it("allows a plain relative path", () => {
    expect(safeReturnTo("/dashboard")).toBe("/dashboard");
    expect(safeReturnTo("/bookings/abc123")).toBe("/bookings/abc123");
  });

  it("falls back to the default for null/undefined/empty input", () => {
    expect(safeReturnTo(null)).toBe("/dashboard");
    expect(safeReturnTo(undefined)).toBe("/dashboard");
    expect(safeReturnTo("")).toBe("/dashboard");
    expect(safeReturnTo("/settings", "/custom-fallback")).toBe("/settings");
    expect(safeReturnTo(null, "/custom-fallback")).toBe("/custom-fallback");
  });

  it("rejects protocol-relative URLs (//evil.com)", () => {
    expect(safeReturnTo("//evil.com")).toBe("/dashboard");
    expect(safeReturnTo("//evil.com/phish")).toBe("/dashboard");
  });

  it("rejects backslash host-injection tricks (/\\evil.com)", () => {
    expect(safeReturnTo("/\\evil.com")).toBe("/dashboard");
  });

  it("rejects absolute URLs with a scheme", () => {
    expect(safeReturnTo("https://evil.com")).toBe("/dashboard");
    expect(safeReturnTo("javascript://evil.com")).toBe("/dashboard");
    expect(safeReturnTo("/redirect?to=https://evil.com")).toBe("/dashboard");
  });

  it("rejects a path that doesn't start with a slash", () => {
    expect(safeReturnTo("dashboard")).toBe("/dashboard");
    expect(safeReturnTo("evil.com/dashboard")).toBe("/dashboard");
  });
});

describe("getClientIp", () => {
  function makeRequest(headers: Record<string, string>): Request {
    return new Request("http://localhost/api/test", { headers });
  }

  it("prefers cf-connecting-ip when present", () => {
    const req = makeRequest({
      "cf-connecting-ip": "1.2.3.4",
      "x-real-ip": "5.6.7.8",
      "x-forwarded-for": "9.9.9.9, 8.8.8.8",
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when cf-connecting-ip is absent", () => {
    const req = makeRequest({
      "x-real-ip": "5.6.7.8",
      "x-forwarded-for": "9.9.9.9",
    });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("uses the rightmost x-forwarded-for entry (the trusted upstream proxy)", () => {
    const req = makeRequest({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" });
    expect(getClientIp(req)).toBe("3.3.3.3");
  });

  it("returns 'unknown' when no trusted header is present", () => {
    expect(getClientIp(makeRequest({}))).toBe("unknown");
  });
});

describe("rateLimitKey", () => {
  it("scopes the key by route and client IP", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "cf-connecting-ip": "1.2.3.4" },
    });
    expect(rateLimitKey("POST:/api/bookings", req)).toBe(
      "POST:/api/bookings:1.2.3.4"
    );
  });
});
