/**
 * The MCP server matches treaty's tool catalog, `schemas/mcp/superpipeline.v1.json` (phase 3,
 * ruling 3): the same tools, name for name, each with the catalog's scope (`TOOL_SCOPE`) and input
 * schema; and every argument case in the catalog's cases file is answered by the real tool's own
 * validation as the case says. A tool added here fails this test until the catalog lists it, and a
 * tool the catalog lists that this server dropped fails it too.
 */
import { createBundle, mcpCatalog, unknownTools, validateToolArguments, validateToolResult, type McpCatalog } from '@superjackfruitlabs/treaty-contracts';
import catalogDoc from '@superjackfruitlabs/treaty-contracts/data/schemas/mcp/superpipeline.v1.json';
import casesDoc from '@superjackfruitlabs/treaty-contracts/data/fixtures/mcp/superpipeline.v1.cases.json';
import catalogSchema from '@superjackfruitlabs/treaty-contracts/data/schemas/treaty/mcp-catalog.v1.json';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { TOOL_SCOPE } from '../src/mcp/tools';
import { connectMcp, depsFor } from './helpers/mcp';

const CATALOG = 'schemas/mcp/superpipeline.v1.json';
const bundle = createBundle({
  [CATALOG]: catalogDoc,
  'fixtures/mcp/superpipeline.v1.cases.json': casesDoc,
  'schemas/treaty/mcp-catalog.v1.json': catalogSchema,
});

const cases = casesDoc.tools;

const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** An unscoped agent (the dev bearer's `scopes: null`): every tool is offered. */
const AUTH = { tenantId: 'tnt_mcp_catalog', agentId: 'agt_mcp_catalog', capabilities: ['code'], scopes: null };

/** Keys the SDK adds when it converts a zod shape, which carry no contract. */
function normalised(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(normalised);
  if (schema === null || typeof schema !== 'object') return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema)) if (k !== '$schema') out[k] = normalised(v);
  return out;
}

/** The catalog's input schema for a tool, `$ref`s into the catalog's `$defs` resolved. */
function catalogInput(catalog: McpCatalog, name: string): unknown {
  const at = catalog.tools.find((t) => t.name === name)?.inputSchema ?? '';
  const doc: unknown = catalogDoc;
  const resolve = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(resolve);
    if (node === null || typeof node !== 'object') return node;
    const ref = '$ref' in node ? node.$ref : undefined;
    if (typeof ref === 'string' && ref.startsWith('#/')) return resolve(pointer(doc, ref.slice(1)));
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, resolve(v)]));
  };
  return resolve(pointer(doc, at));
}

function pointer(doc: unknown, p: string): unknown {
  return p.split('/').slice(1).reduce<unknown>((n, t) => (n !== null && typeof n === 'object' ? Reflect.get(n, t.replaceAll('~1', '/').replaceAll('~0', '~')) : undefined), doc);
}

/**
 * Whether the server refused these arguments as arguments: the SDK's own input validation, before
 * any handler runs, answers `isError` with "Input validation error" (or throws). A business
 * failure (no such board) is the handler answering, so the arguments were accepted.
 */
async function refusedAsArguments(client: Client, name: string, args: unknown): Promise<boolean> {
  try {
    const r = await client.callTool({ name, arguments: args as Record<string, unknown> });
    const content: unknown = r.content;
    const first: unknown = Array.isArray(content) ? content.find((c: unknown) => isRecord(c) && c.type === 'text') : undefined;
    const text = isRecord(first) && typeof first.text === 'string' ? first.text : '';
    return r.isError === true && /input validation error|invalid arguments/i.test(text);
  } catch (error) {
    if (!(error instanceof McpError)) return false;
    // The tool's own validation, thrown rather than answered.
    if (error.message.startsWith('MCP error -32602: Input validation error')) return true;
    // Arguments that are not an object are refused earlier still, by the request's own schema
    // (`params.arguments` must be a record), before the tool is looked up: a zod issue at that path.
    return /"path":\s*\[\s*"params",\s*"arguments"\s*\]/.test(error.message);
  }
}

describe('the MCP server against treaty’s superpipeline.v1 catalog', () => {
  const catalog = mcpCatalog(bundle, 'superpipeline.v1');
  let client: Client;
  let registered: Awaited<ReturnType<Client['listTools']>>['tools'];

  beforeAll(async () => {
    client = await connectMcp(depsFor(AUTH));
    registered = (await client.listTools()).tools;
  });

  it('registers exactly the catalog’s tools, name for name', () => {
    const names = registered.map((t) => t.name);
    expect(unknownTools(catalog, names), 'tools this server registers that the catalog does not list').toEqual([]);
    expect(catalog.tools.map((t) => t.name).filter((n) => !names.includes(n)), 'catalog tools this server does not register').toEqual([]);
  });

  it('holds each tool to the catalog’s scope', () => {
    const scopes = Object.fromEntries(registered.map((t) => [t.name, TOOL_SCOPE[t.name] ?? null]));
    expect(scopes).toEqual(Object.fromEntries(catalog.tools.map((t) => [t.name, t.scope])));
    // Every scoped tool is a registered one: no stale row in the table.
    expect(Object.keys(TOOL_SCOPE).filter((n) => !registered.some((t) => t.name === n))).toEqual([]);
  });

  it('offers each tool with the catalog’s input schema', () => {
    for (const tool of registered) {
      expect({ tool: tool.name, schema: normalised(tool.inputSchema) }).toEqual({ tool: tool.name, schema: normalised(catalogInput(catalog, tool.name)) });
    }
  });

  it('every tool has argument cases, and the real tool answers each as the case says', async () => {
    expect(Object.keys(cases).toSorted()).toEqual(catalog.tools.map((t) => t.name).toSorted());
    for (const [name, c] of Object.entries(cases)) {
      for (const [label, args] of Object.entries(c.arguments.valid)) {
        expect(validateToolArguments(bundle, catalog, name, args).valid, `${name}: the catalog accepts ${label}`).toBe(true);
        expect({ name, label, refused: await refusedAsArguments(client, name, args) }).toEqual({ name, label, refused: false });
      }
      for (const { why, body } of c.arguments.invalid) {
        expect(validateToolArguments(bundle, catalog, name, body).valid, `${name}: the catalog refuses ${why}`).toBe(false);
        expect({ name, why, refused: await refusedAsArguments(client, name, body) }).toEqual({ name, why, refused: true });
      }
    }
  });

  it('a business failure carries the catalog’s error shape', async () => {
    const r = await client.callTool({ name: 'superpipeline_get_card', arguments: { boardId: 'brd_0000000000000000', cardId: 'card_0000000000000000' } });
    expect(r.isError).toBe(true);
    expect(validateToolResult(bundle, catalog, 'superpipeline_get_card', r).errors).toEqual([]);
  });
});
