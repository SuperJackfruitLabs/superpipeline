/**
 * Claude Code adapter (docs/05 §6, docs/07 §1): translate `claude -p --output-format stream-json`
 * NDJSON lines into the normalized activity envelope the Board DO ingests. Pure and total — a bridge
 * (reference worker / harness adapter) calls this per line and POSTs each result as an activity.
 */
export interface NormalizedActivity {
  type: 'thought' | 'action' | 'response' | 'elicitation' | 'error';
  body?: string;
  action?: string;
  parameter?: unknown;
  result?: unknown;
  ephemeral?: boolean;
  usage?: { model?: string; inputTokens?: number; outputTokens?: number; costUsd?: number };
}

/**
 * The fields of a stream-json line this reads. Unchecked: a line is parsed JSON, so each field is
 * only what the CLI wrote, and the adapter passes values through as it finds them.
 */
interface ClaudeStreamUsage {
  input_tokens?: number;
  output_tokens?: number;
}
interface ClaudeStreamBlock {
  type?: string;
  text?: string;
  name?: string;
  input?: unknown;
}
interface ClaudeStreamEvent {
  type?: string;
  message?: { model?: string; usage?: ClaudeStreamUsage; content?: ClaudeStreamBlock[] };
  model?: string;
  usage?: ClaudeStreamUsage;
  total_cost_usd?: number;
  is_error?: boolean;
  result?: unknown;
}

export function normalizeClaudeStreamLine(line: string): NormalizedActivity[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  let ev: ClaudeStreamEvent;
  try {
    ev = JSON.parse(trimmed) as ClaudeStreamEvent;
  } catch {
    return [];
  }

  if (ev.type === 'assistant' && ev.message) {
    const msg = ev.message;
    const usage = msg.usage
      ? { model: msg.model, inputTokens: msg.usage.input_tokens as number, outputTokens: msg.usage.output_tokens as number }
      : undefined;
    const out: NormalizedActivity[] = [];
    for (const block of msg.content ?? []) {
      if (block.type === 'text') out.push({ type: 'thought', body: block.text, ephemeral: true });
      else if (block.type === 'tool_use') out.push({ type: 'action', action: block.name, parameter: block.input });
    }
    // Token usage is per-message — attach it to the first activity so it's counted exactly once.
    // (A content-less assistant message would drop its usage here, but the terminal `result` event
    // carries the authoritative cumulative total, so nothing is lost end-to-end.)
    if (usage && out.length > 0) out[0].usage = usage;
    return out;
  }

  if (ev.type === 'result') {
    const usage =
      ev.model !== undefined || ev.usage?.input_tokens !== undefined || ev.usage?.output_tokens !== undefined || ev.total_cost_usd !== undefined
        ? {
            model: ev.model,
            inputTokens: ev.usage?.input_tokens,
            outputTokens: ev.usage?.output_tokens,
            costUsd: ev.total_cost_usd,
          }
        : undefined;
    return [
      {
        type: ev.is_error ? 'error' : 'response',
        body: typeof ev.result === 'string' ? ev.result : undefined,
        ...(usage ? { usage } : {}),
      },
    ];
  }

  return [];
}
