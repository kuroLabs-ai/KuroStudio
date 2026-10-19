/**
 * KuroStudio Security Layer
 * Implements PRD Section 13.1 Electron Hardening rules.
 */

export const KURO_STRICT_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: file:",
  "media-src 'self' blob: file:",
  "connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com http://127.0.0.1:11434 https://cdn.kurolabs.dev",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ');

export function sanitizeFileName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim();
}
