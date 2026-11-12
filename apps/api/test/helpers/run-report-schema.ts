/**
 * The vendored superwitness run-report schema (superwitness app spec §3.2, §8 "Contracts").
 *
 * The file is a byte-for-byte copy of superwitness's `internal/contracts/run-report.schema.json`.
 * The sha256 below pins it: editing the copy here without the same edit in superwitness is the
 * drift this exists to stop. To change the contract, change superwitness first, copy the file,
 * and update the pin in the same commit.
 */
import { Validator } from '@cfworker/json-schema';
import schemaRaw from '../contracts/run-report.schema.json?raw';

export const RUN_REPORT_SCHEMA_RAW: string = schemaRaw;
export const RUN_REPORT_SCHEMA_SHA256 = 'b2444841f2d0a31ca6abc38aad13aedb99b9a653eec182344974f827a7c042fa';

const validator = new Validator(JSON.parse(schemaRaw) as object, '2020-12', false);

export function validateRunReportBody(x: unknown): { valid: boolean; errors: string[] } {
  const r = validator.validate(x);
  return { valid: r.valid, errors: r.errors.map((e) => `${e.instanceLocation}: ${e.error}`) };
}

export async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
