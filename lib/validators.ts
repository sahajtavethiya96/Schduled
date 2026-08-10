// ── Text sanitization ────────────────────────────────────────────────────────

/**
 * Strip HTML tags from user-supplied text.
 * Protects email templates and stored content from reflected XSS.
 */
export function sanitizeText(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

/**
 * Escape the five HTML-significant characters so user-supplied text can be
 * safely interpolated into an HTML document/email without injecting markup.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Field validators ─────────────────────────────────────────────────────────
// Each validator returns null on success, or an error string on failure.

export function validateEmail(email: string): string | null {
  if (!email?.trim()) {
    return "Email is required";
  }
  if (email.trim().length > 254) {
    return "Email address is too long";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Invalid email address";
  }
  return null;
}

const RESERVED_USERNAMES = new Set([
  "orbit",
  "api",
  "admin",
  "dashboard",
  "settings",
  "login",
  "signup",
  "post-auth",
  "onboarding",
  "privacy",
  "terms",
  "cookies",
  "cancel",
  "reschedule",
  "help",
  "support",
  "about",
  "pricing",
  "contact",
  "careers",
  "jobs",
  "blog",
  "docs",
  "status",
  "app",
  "www",
  "mail",
  "ftp",
  "cdn",
  "assets",
  "static",
]);

export function validateUsername(username: string): string | null {
  if (!username) {
    return "Username is required";
  }
  const u = username.toLowerCase().trim();
  if (u.length < 3) {
    return "At least 3 characters required";
  }
  if (u.length > 30) {
    return "Max 30 characters";
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(u)) {
    return "Only letters, numbers, and hyphens. Cannot start or end with a hyphen.";
  }
  if (RESERVED_USERNAMES.has(u)) {
    return "That username is reserved";
  }
  return null;
}

export function validateUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "URL must use http or https";
    }
    return null;
  } catch {
    return "Invalid URL";
  }
}

/** Returns true if `tz` is a valid IANA timezone identifier. */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
