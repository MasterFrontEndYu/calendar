export type Target = "local" | "npm";

export interface PageInfo {
  userAgent: string;
  hardwareConcurrency: number;
  devicePixelRatio: number;
  viewport: string;
  crossOriginIsolated: boolean;
}

export interface OpSample {
  syncMs: number;
  frameMs: number;
  nodes: number;
  scriptMs: number;
  styleMs: number;
  layoutMs: number;
  taskMs: number;
  layoutCount: number;
  recalcCount: number;
}

export interface OpAggregate {
  count: number;
  iterations: number;
  syncMs: number;
  syncSd: number;
  frameMs: number;
  frameSd: number;
  scriptMs: number;
  styleMs: number;
  layoutMs: number;
  taskMs: number;
  layoutCount: number;
  totalMs: number;
  nodes: number;
  samples: OpSample[];
}

export interface MemoryAggregate {
  perInstanceKB: number;
  heap100MB: number;
  deltaMB: number;
  baseHeapMB: number;
  baseNodes: number;
  nodes100: number;
}

export interface BootSample {
  mountMs: number;
  paintMs: number;
  heapMB: number;
  nodes: number;
}

export interface BootAggregate {
  mountMs: number;
  paintMs: number;
  heapMB: number;
  nodes: number;
  samples: BootSample[];
}

export interface LibraryMeta {
  name: string;
  version: string;
  source: string;
}

export interface RunMeta {
  target: Target;
  library: LibraryMeta;
  generatedAt: string;
  browser: { name: string; version: string };
  playwright: string;
  node: string;
  viewport: string;
  cpuThrottle: number;
  iterations: number | null;
}

export interface RunResult {
  meta: RunMeta;
  pageInfo: PageInfo;
  variants: readonly { id: string; label: string }[];
  scenarios: Record<string, { count: number; iterations: number }>;
  ops: Record<string, OpAggregate>;
  memory: Record<string, MemoryAggregate>;
  boot: Record<string, BootAggregate>;
  errors: string[];
}
