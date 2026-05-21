import type { Accessor } from "solid-js";
import { create } from "solid-zustand";
import type { ExtractState, StoreApi } from "zustand/vanilla";

type StoreSelector<S extends StoreApi<unknown>, U> = (
  state: ExtractState<S>,
) => U;

type EqualityFn<U> = (a: U, b: U) => boolean;
type SignalSelectorResult<U> = U extends (...args: infer Args) => infer Return
  ? (...args: Args) => Return
  : Accessor<U>;

export type SolidBoundStore<S extends StoreApi<unknown>> = {
  (): Accessor<ExtractState<S>>;
  <U>(
    selector: StoreSelector<S, U>,
    equalityFn?: EqualityFn<U>,
  ): SignalSelectorResult<U>;
} & S;

// Solid consumers subscribe to the same vanilla-compatible StoreApi so runtime
// state remains shared across framework-neutral store modules.
export function createSolidStoreHook<S extends StoreApi<unknown>>(
  store: S,
): SolidBoundStore<S> {
  return create(store) as SolidBoundStore<S>;
}
