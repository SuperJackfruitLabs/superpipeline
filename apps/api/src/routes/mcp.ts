// MCP surface (docs/05 §2): an OAuth Resource Server in front of the Streamable HTTP endpoint.
import { protectedResourceMetadata, resolveMcpAuth, unauthorized } from '../mcp/auth';
import { handleMcpRequest } from '../mcp/server';
import { NEXT, type Next, type WorkerRequest } from './router';

export async function protectedResource({ request, env, path }: WorkerRequest): Promise<Response | Next> {
  const meta = protectedResourceMetadata(request, env, path);
  if (meta) return meta;
  return NEXT;
}

export async function mcp({ request, env }: WorkerRequest): Promise<Response> {
  const auth = await resolveMcpAuth(request, env);
  if (!auth) return unauthorized(request, env);
  return handleMcpRequest(request, env, auth);
}
