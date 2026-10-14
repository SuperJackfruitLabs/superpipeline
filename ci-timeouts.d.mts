export function timeouts(env?: Record<string, string | undefined>): {
  vitest: { testTimeout: number; hookTimeout: number };
  playwright: { test: number; expect: number; action: number; navigation: number; apiServer: number; webServer: number };
};
