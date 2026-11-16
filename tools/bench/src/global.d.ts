import type { BenchApi } from "./bench-core";

declare global {
  interface Window {
    __bench?: BenchApi;
    __benchReady?: boolean;
  }
}

export {};
