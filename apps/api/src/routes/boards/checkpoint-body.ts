/** Content-Length is untrusted. Retain at most 64 KiB and stop reading excess. */
export async function checkpointBody(request: Request): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const bytes = new Uint8Array(65536);
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) return bytes.slice(0, size);
      if (next.value.byteLength > bytes.length - size) {
        await reader.cancel();
        return null;
      }
      bytes.set(next.value, size);
      size += next.value.byteLength;
    }
  } finally { reader.releaseLock(); }
}
