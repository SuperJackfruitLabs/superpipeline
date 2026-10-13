// Dev and test ports. Two checkouts can run their servers side by side by setting SP_API_PORT
// and SP_WEB_PORT; with neither set, the ports are the long-standing 8787 and 5173.
export const DEFAULT_API_PORT = 8787;
export const DEFAULT_WEB_PORT = 5173;

function port(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`${name} must be a port number (1-65535), got "${raw}"`);
  return n;
}

export function resolvePorts(env: Record<string, string | undefined> = process.env): { api: number; web: number; apiUrl: string; webUrl: string } {
  const api = port(env.SP_API_PORT, DEFAULT_API_PORT, 'SP_API_PORT');
  const web = port(env.SP_WEB_PORT, DEFAULT_WEB_PORT, 'SP_WEB_PORT');
  return { api, web, apiUrl: `http://localhost:${api}`, webUrl: `http://localhost:${web}` };
}

export const PORTS = resolvePorts();
