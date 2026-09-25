/**
 * `supi update` — replacing this binary with the newest published release.
 *
 * Why a hand-run CLI needs this at all: `agentpod-fleet` shipped without it and sat at v0.1.52
 * on a developer's machine while v0.1.66 was current, because nothing ever asked it to upgrade.
 * Its sibling `agentpod-node`, which self-updates, was current on the same machine. The binary a
 * person invokes drifts more than the one a service runs, not less.
 *
 * The shape follows `agentpod/apps/node-agent/internal/selfupdate`, deliberately: resolve the
 * latest tag, download the asset for this platform, verify it against the release's SHA256SUMS,
 * and swap it in atomically. A download this code cannot verify is refused rather than installed.
 */
import { chmodSync, createWriteStream, mkdtempSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";

const REPO = "SuperJackfruitLabs/superpipeline";
const API_BASE = "https://api.github.com";
const DOWNLOAD_BASE = "https://github.com";

/**
 * The version this binary was built as. Replaced at compile time by the release workflow
 * (`bun build --define SUPI_VERSION=…`); a binary built any other way reports `dev`, which
 * `isNewer` treats as out of date.
 */
declare const SUPI_VERSION: string | undefined;
// `typeof` on a name that was never declared is legal and yields "undefined" — which is what
// happens under vitest and `bun src/index.ts`, where no --define ran. Reading it as a property of
// globalThis would NOT work: --define substitutes bare identifiers, not member expressions.
export const VERSION: string = typeof SUPI_VERSION === "string" ? SUPI_VERSION : "dev";

/** Release assets exist for the platforms the workflow builds, and for no others. */
export function assetName(platform: string, arch: string): string {
  if (platform !== "darwin" && platform !== "linux") {
    throw new Error(
      `supi update: no release binary is published for ${platform}. Build from source instead.`
    );
  }
  return `supi-${platform}-${arch}`;
}

/**
 * The digest a release recorded for one asset. Throws when the asset is absent: a missing entry
 * must never degrade into an unverified install, which is the one failure mode that matters here.
 */
export function parseSHA256SUMS(data: string, asset: string): string {
  for (const line of data.split("\n")) {
    const fields = line.trim().split(/\s+/);
    if (fields.length >= 2 && fields[1].replace(/^\*/, "") === asset) return fields[0];
  }
  throw new Error(`supi update: ${asset} has no digest in SHA256SUMS; refusing to install it.`);
}

/** Numeric, segment by segment. String ordering would rank v0.1.9 above v0.1.52 and never update. */
export function isNewer(current: string, latest: string): boolean {
  const parse = (v: string): number[] | null => {
    const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  };
  const a = parse(current);
  const b = parse(latest);
  // An unparseable local version (a `dev` build) is treated as older, so the update is offered
  // rather than silently withheld from a binary nobody can identify.
  if (!b) return false;
  if (!a) return true;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

async function latestTag(): Promise<string> {
  const res = await fetch(`${API_BASE}/repos/${REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "supi-update" },
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`supi update: could not read the latest release (HTTP ${res.status}).`);
  const tag = ((await res.json()) as { tag_name?: unknown }).tag_name;
  if (typeof tag !== "string" || tag.trim() === "") {
    throw new Error("supi update: the latest release carries no tag.");
  }
  return tag.trim();
}

async function download(url: string, dest: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "supi-update" },
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok || !res.body) throw new Error(`supi update: download failed (HTTP ${res.status}).`);
  const hash = createHash("sha256");
  const body = Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]);
  body.on("data", (chunk) => hash.update(chunk));
  await pipeline(body, createWriteStream(dest));
  return hash.digest("hex");
}

export interface UpdateOptions {
  check?: boolean;
  force?: boolean;
}

/** Returns a line to print. Throws with a message meant to be shown as-is. */
export async function runUpdate(opts: UpdateOptions = {}): Promise<string> {
  const tag = await latestTag();
  if (!opts.force && !isNewer(VERSION, tag)) {
    return `supi ${VERSION} is current (latest release ${tag}).`;
  }
  if (opts.check) {
    return `supi ${tag} is available; you have ${VERSION}. Run \`supi update\` to install it.`;
  }

  const asset = assetName(process.platform, process.arch);
  // The running binary's own location: the file being replaced, and the directory the replacement
  // is staged in, so the final rename is atomic rather than a cross-device copy.
  const target = process.execPath;
  const staging = mkdtempSync(join(dirname(target), ".supi-update-"));
  try {
    const sumsRes = await fetch(`${DOWNLOAD_BASE}/${REPO}/releases/download/${tag}/SHA256SUMS`, {
      headers: { "User-Agent": "supi-update" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!sumsRes.ok) {
      throw new Error(`supi update: ${tag} publishes no SHA256SUMS; refusing to install unverified.`);
    }
    const expected = parseSHA256SUMS(await sumsRes.text(), asset);

    const staged = join(staging, asset);
    const actual = await download(
      `${DOWNLOAD_BASE}/${REPO}/releases/download/${tag}/${asset}`,
      staged
    );
    if (actual !== expected) {
      throw new Error(`supi update: ${asset} failed its checksum; nothing was installed.`);
    }

    chmodSync(staged, 0o755);
    // Staged in the target's own directory, so this rename is atomic rather than a cross-device
    // copy: on Linux /tmp is frequently tmpfs, and rename(2) across filesystems fails with EXDEV.
    renameSync(staged, target);
    return `supi updated to ${tag}.`;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
