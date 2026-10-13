/**
 * What happens when the server says the session is gone. It renews quietly first (POST /hub/session,
 * one renewal shared by every concurrent 401), then restores the page. Only when that fails does the
 * app ask the person to sign in again. The person stays signed in on screen throughout: Landing is
 * for people who were never signed in.
 */
import { renewSession, type RenewReason, type RenewResult } from './api';

export type AuthRecoveryState = 'ok' | 'renewing' | 'expired';
export const RETRY_MS = 5000;
export const RETRIES = 3;

export interface RecoveryDeps {
  renew: () => Promise<RenewResult>;
  /** Reload the person and the board after a renewal; false when the person cannot be read back. */
  restore: () => Promise<boolean>;
  sleep: (ms: number) => Promise<void>;
  onExpired?: () => void;
}

export class AuthRecovery {
  state = $state<AuthRecoveryState>('ok');
  reason = $state<RenewReason | null>(null);
  issuer = $state<string | null>(null);
  #deps: RecoveryDeps;
  #inflight: Promise<boolean> | null = null;
  #restoring = false;
  #refusedAgain = false;

  constructor(deps: RecoveryDeps) { this.#deps = deps; }
  configure(deps: Partial<RecoveryDeps>): void { this.#deps = { ...this.#deps, ...deps }; }

  noteUnauthorized(): void {
    if (this.state === 'expired') return;
    if (this.#restoring) { this.#refusedAgain = true; return; }
    void this.recover();
  }

  recover(): Promise<boolean> {
    this.#inflight ??= this.#run().finally(() => { this.#inflight = null; });
    return this.#inflight;
  }

  /** Signed in again elsewhere (another tab): nothing to recover any more. */
  resolved(): void {
    this.state = 'ok';
    this.reason = null;
    this.issuer = null;
  }

  async #run(): Promise<boolean> {
    this.state = 'renewing';
    let r = await this.#deps.renew();
    for (let i = 0; !r.ok && r.reason === 'plane_unavailable' && i < RETRIES; i++) {
      await this.#deps.sleep(RETRY_MS);
      r = await this.#deps.renew();
    }
    if (!r.ok) return this.#expire(r.reason, r.issuer ?? null);
    this.#restoring = true;
    this.#refusedAgain = false;
    let restored = false;
    try { restored = await this.#deps.restore(); } finally { this.#restoring = false; }
    if (!restored || this.#refusedAgain) return this.#expire('unauthorized_after_renew', null);
    this.resolved();
    return true;
  }

  #expire(reason: RenewReason, issuer: string | null): false {
    this.state = 'expired';
    this.reason = reason;
    this.issuer = issuer;
    this.#deps.onExpired?.();
    return false;
  }
}

export const auth = new AuthRecovery({
  renew: renewSession,
  restore: async () => false,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
});
