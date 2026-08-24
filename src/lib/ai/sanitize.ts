/**
 * PII scrubbing before sending text to an external LLM provider.
 * Removes phone numbers, emails and URLS — the assistant doesn't need them
 * for parsing, and Gemini calls must not leak user contact data.
 */

const PHONE_RE = /(\+?\d[\d\s\-()]{7,}\d)/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;
const URL_RE = /https?:\/\/\S+/g;

export function scrubPII(text: string): string {
  return text.replace(URL_RE, '[url]').replace(EMAIL_RE, '[email]').replace(PHONE_RE, '[phone]');
}
