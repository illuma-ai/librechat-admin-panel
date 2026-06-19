/**
 * Heuristic: does this string contain markdown worth rendering?
 *
 * Ported in spirit from Opik's `isStringMarkdown`. Serialized JSON (objects /
 * arrays that parse) is explicitly rejected so raw payloads render as plain
 * text/JSON rather than mangled markdown.
 */
const MARKDOWN_PATTERNS: RegExp[] = [
  /^#{1,6}\s+\S/m, // headings
  /\*\*[^*\n]+\*\*/, // bold
  /(^|\s)\*[^*\n]+\*(\s|$)/, // italic
  /\[[^\]]+\]\([^)]+\)/, // links
  /^\s*[-*+]\s+\S/m, // unordered list
  /^\s*\d+\.\s+\S/m, // ordered list
  /^\s*>\s+\S/m, // blockquote
  /```[\s\S]*?```/, // fenced code
  /`[^`\n]+`/, // inline code
  /^\s*\|.+\|.*\|/m, // table row
];

export function isStringMarkdown(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const looksJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));
  if (looksJson) {
    try {
      JSON.parse(trimmed);
      return false;
    } catch {
      // not valid JSON — fall through to markdown detection
    }
  }
  return MARKDOWN_PATTERNS.some((pattern) => pattern.test(trimmed));
}
