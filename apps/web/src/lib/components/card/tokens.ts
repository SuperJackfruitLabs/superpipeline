// apps/web/src/lib/components/card/tokens.ts
/**
 * Id-like spans in an agent's own words (G-3), styled for reading, never rewritten. The order of
 * the alternatives matters: prefixed ids first, then slash paths, then snake_case words. The
 * spec's original regex split `event_id/room_id/timestamp` into three; this one is verified
 * against card 4605's detail (exactly four tokens).
 */
export interface TextToken { text: string; token: boolean }
export const TOKEN_RE = /\b(?:acps|evt|run|card|brd|agt)_[\w-]+|\b[a-z][\w-]*(?:\/[\w-]+)*\/[a-z][\w-]*\b|\b[a-z]+(?:_[a-z]+)+\b/g;
/** Quiet styles only hex-tailed ids (Q-3). */
export const QUIET_TOKEN_RE = /\b[a-z]+_[0-9a-f-]{8,}\b/g;

export function splitTokens(text: string, re: RegExp = TOKEN_RE): TextToken[] {
  const out: TextToken[] = [];
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  let last = 0;
  for (const m of text.matchAll(g)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index), token: false });
    out.push({ text: m[0], token: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), token: false });
  return out;
}

/** The ACP session an agent's words name, for "Copy session id" (G-4). */
export function sessionIdOf(text: string | null | undefined): string | null {
  return text?.match(/\bacps_[0-9a-f-]{36}\b/)?.[0] ?? null;
}
