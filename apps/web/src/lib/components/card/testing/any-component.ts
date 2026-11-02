import type { Component } from 'svelte';

/**
 * Any card layout or panel. The every-vibe tests and the shared panel contracts mount several
 * components, whose props differ, from one fixture; the props are checked by what renders.
 */
// oxlint-disable-next-line typescript/no-explicit-any -- a component of any props: Component<unknown> or <never> is not mountable
export type AnyComponent = Component<any>;
