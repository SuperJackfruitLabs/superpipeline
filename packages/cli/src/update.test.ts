/**
 * `supi update` — the parts that decide WHAT to fetch and whether to trust it.
 *
 * Modelled on `agentpod/apps/node-agent/internal/selfupdate`, which this repository's sibling CLI
 * already proves in production. The lesson taken from that fleet: `agentpod-fleet` shipped without
 * a self-update verb and sat fourteen releases behind on a developer's machine while
 * `agentpod-node`, which has one, stayed current. A CLI a person runs by hand drifts MORE than a
 * service, not less, because nothing forces the upgrade.
 *
 * The network and the binary swap are not tested here. What is tested is every decision made
 * before either happens, because those are the ones that can silently fetch or trust the wrong
 * thing.
 */
import { describe, expect, it } from "vitest";

import { assetName, isNewer, parseSHA256SUMS } from "./update";

describe("assetName", () => {
  it("names the release asset for this platform and architecture", () => {
    expect(assetName("darwin", "arm64")).toBe("supi-darwin-arm64");
    expect(assetName("linux", "x64")).toBe("supi-linux-x64");
  });

  it("refuses a platform no release carries, rather than fetching a 404", () => {
    // The release matrix builds darwin and linux only, matching agentpod's. Asking GitHub for a
    // Windows asset would fail later and less clearly than refusing here.
    expect(() => assetName("win32", "x64")).toThrow(/win32/);
  });
});

describe("parseSHA256SUMS", () => {
  const sums = [
    "d1e8a70b5ccab1dc2f56bbf7e99f5f5f0b0e5f5f5f5f5f5f5f5f5f5f5f5f5f5f  supi-darwin-arm64",
    "a3f1c0de5ccab1dc2f56bbf7e99f5f5f0b0e5f5f5f5f5f5f5f5f5f5f5f5f5f5f  supi-linux-x64",
  ].join("\n");

  it("returns the digest recorded for one asset", () => {
    expect(parseSHA256SUMS(sums, "supi-linux-x64")).toBe(
      "a3f1c0de5ccab1dc2f56bbf7e99f5f5f0b0e5f5f5f5f5f5f5f5f5f5f5f5f5f5f"
    );
  });

  it("throws when the asset has no recorded digest", () => {
    // Never fall back to "no digest means no check". An unverifiable download is refused.
    expect(() => parseSHA256SUMS(sums, "supi-darwin-x64")).toThrow(/supi-darwin-x64/);
  });
});

describe("isNewer", () => {
  it("compares release tags numerically, not as strings", () => {
    // The string comparison "v0.1.9" < "v0.1.52" is false, which is how a CLI convinces itself it
    // is current forever. agentpod-fleet sat at v0.1.52 while v0.1.66 was out.
    expect(isNewer("v0.1.9", "v0.1.52")).toBe(true);
    expect(isNewer("v0.1.66", "v0.1.66")).toBe(false);
    expect(isNewer("v0.2.0", "v0.1.66")).toBe(false);
  });

  it("treats an unknown local version as out of date", () => {
    // A binary built outside the release pipeline reports no version. Offering the update is the
    // safe answer; refusing to update something unidentifiable is how drift becomes permanent.
    expect(isNewer("dev", "v0.1.66")).toBe(true);
  });
});
