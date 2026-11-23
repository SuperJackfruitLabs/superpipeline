/** Signs a body the way GitHub does (`X-Hub-Signature-256: sha256=<hex>`), for tests of the inbound webhook. */
import { hmacSha256Hex } from '../../src/crypto/hmac';

export async function githubSignatureHeader(secret: string, body: string): Promise<string> {
  return `sha256=${await hmacSha256Hex(secret, body)}`;
}
