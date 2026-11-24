/**
 * Bodies other products answer, read through treaty's contracts (phase 3) rather than cast: the
 * hub's fleet list (`agentpod.fleet-api`, `fleet.v1`) and SuperLibrary's API
 * (`superlibrary.api`, `api.v1`). A body the contract refuses is not read; each caller decides what
 * that means for the UI (nothing to show, or the preview's retryable error), never a crash.
 *
 * Loaded on first use, not with the app: the validators and documents are only needed once a
 * person opens the picker or a preview, and a failure to load them reads as a refused body.
 */
import type { Api, Bundle } from '@superjackfruitlabs/treaty-contracts';

const FLEET = 'schemas/http/agentpod/fleet.v1.openapi.json';
const LIBRARY = 'schemas/http/superlibrary/api.v1.openapi.json';

/** The SuperLibrary operations this app reads, by the contract's operation id. */
export type LibraryOperation = 'getItem' | 'embedItem' | 'me' | 'widenItemScope' | 'relatedWork';

type Check = (api: 'fleet' | 'library', operation: string, status: number, body: unknown) => boolean;

let loading: Promise<Check> | undefined;

function load(): Promise<Check> {
  loading ??= (async () => {
    const [contracts, fleet, library, bearerError, flatError] = await Promise.all([
      import('@superjackfruitlabs/treaty-contracts'),
      import('@superjackfruitlabs/treaty-contracts/data/schemas/http/agentpod/fleet.v1.openapi.json'),
      import('@superjackfruitlabs/treaty-contracts/data/schemas/http/superlibrary/api.v1.openapi.json'),
      import('@superjackfruitlabs/treaty-contracts/data/schemas/common/oauth-bearer-error.v1.json'),
      import('@superjackfruitlabs/treaty-contracts/data/schemas/common/flat-error.v1.json'),
    ]);
    const bundle: Bundle = contracts.createBundle({
      [FLEET]: fleet.default,
      [LIBRARY]: library.default,
      'schemas/common/oauth-bearer-error.v1.json': bearerError.default,
      'schemas/common/flat-error.v1.json': flatError.default,
    });
    const apis: Record<'fleet' | 'library', Api> = { fleet: contracts.openApi(bundle, FLEET), library: contracts.openApi(bundle, LIBRARY) };
    return (api, operation, status, body) => contracts.validateResponse(bundle, apis[api], operation, status, body).valid;
  })();
  // A failed load is tried again next time, rather than refusing every body for the tab's life.
  loading.catch(() => { loading = undefined; });
  return loading;
}

async function check(api: 'fleet' | 'library', operation: string, status: number, body: unknown): Promise<boolean> {
  try {
    return (await load())(api, operation, status, body);
  } catch {
    return false;
  }
}

/** Whether `body` is what `fleet.v1` says `GET /api/fleet/dispatchable` answers with `status`. */
export function isFleetBody(status: number, body: unknown): Promise<boolean> {
  return check('fleet', 'listDispatchableAgents', status, body);
}

/** Whether `body` is what SuperLibrary's `api.v1` says `operation` answers with `status`. */
export function isLibraryBody(operation: LibraryOperation, status: number, body: unknown): Promise<boolean> {
  return check('library', operation, status, body);
}
