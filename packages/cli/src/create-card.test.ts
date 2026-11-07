import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `supi create-card --stage --project`. The create route has always accepted `stageKey` and
 * `projectId`; the CLI sent neither, so an agent queueing a card that must start mid-board (an X
 * post lane) or belong to a project (an approval subject needs one) could not. Modelled on
 * `edit-card.test.ts`: a mocked `fetch` and `process.argv`, asserting the request sent.
 */
const fetchMock = vi.fn<typeof fetch>();
const jwt = (exp: number) => `e30.${Buffer.from(JSON.stringify({ sub: "human", principalKind: "human", exp })).toString("base64url")}.sig`;

class ExitSignal extends Error {
  constructor(public code: unknown) {
    super("process.exit");
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  vi.stubEnv("SUPERPIPELINE_TOKEN", jwt(Math.floor(Date.now() / 1000) + 300));
  vi.stubEnv("AGENTPOD_TOKEN", "");
  vi.stubEnv("SUPERPIPELINE_URL", "https://work.example");
  vi.spyOn(process.stdout, "write").mockReturnValue(true);
  vi.spyOn(process.stderr, "write").mockReturnValue(true);
  vi.spyOn(process, "exit").mockImplementation((code) => {
    throw new ExitSignal(code);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function run(argv: string[]): Promise<unknown> {
  vi.resetModules();
  vi.spyOn(process, "argv", "get").mockReturnValue(["bun", "supi", ...argv]);
  try {
    await import("./index");
  } catch (e) {
    if (e instanceof ExitSignal) return e.code;
    throw e;
  }
  return 0;
}

/** The JSON body of the one POST the verb sent. */
function sentBody(): unknown {
  const body = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")?.[1]?.body;
  expect(typeof body, "no POST with a JSON body was sent").toBe("string");
  return typeof body === "string" ? JSON.parse(body) : undefined;
}

const created = () => new Response(JSON.stringify({ card: { id: "card_1" } }), { status: 201 });

describe("supi create-card", () => {
  it("sends --stage and --project in the create itself", async () => {
    fetchMock.mockResolvedValue(created());
    const code = await run(["create-card", "brd_1", "X", "post:", "the", "release", "--stage", "x-post", "--project", "prj_34b48f840daa4309"]);
    expect(code).toBe(0);
    expect(sentBody()).toMatchObject({ title: "X post: the release", stageKey: "x-post", projectId: "prj_34b48f840daa4309" });
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(0);
  });

  it("without them, sends neither — the board's first stage and no project, as before", async () => {
    fetchMock.mockResolvedValue(created());
    await run(["create-card", "brd_1", "A", "card"]);
    const body = sentBody();
    expect(body).not.toHaveProperty("stageKey");
    expect(body).not.toHaveProperty("projectId");
  });
});
