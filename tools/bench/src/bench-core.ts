export type Target = "local" | "npm";

export type BenchTheme = "light" | "dark" | "auto";

export type VariantId = "vanilla" | "single" | "no-header" | "adapter" | "range-2";

export type ScenarioId =
  | "create"
  | "create100"
  | "nextMonth"
  | "nextMonth60"
  | "select"
  | "select42"
  | "theme"
  | "idle"
  | "destroy100";

export interface VariantInfo {
  id: VariantId;
  label: string;
}

export interface LibraryInfo {
  target: Target;
  label: string;
}

export interface BenchArgs {
  variant: VariantId;
  scenario: ScenarioId;
  count: number;
}

export interface MeasureResult {
  syncMs: number;
  frameMs: number;
  nodes: number;
}

export interface MemorySnapshot {
  nodes: number;
  instances: number;
}

export interface BootSnapshot {
  mountMs: number;
  paintMs: number;
  nodes: number;
  instances: number;
}

export interface BenchInfo {
  userAgent: string;
  hardwareConcurrency: number;
  devicePixelRatio: number;
  viewport: string;
  crossOriginIsolated: boolean;
}

export interface BenchApi {
  prepare(args: BenchArgs): Promise<void>;
  measure(args: BenchArgs): Promise<MeasureResult>;
  createForMemory(args: { variant: VariantId; count: number }): Promise<MemorySnapshot>;
  variants: readonly VariantInfo[];
  scenarios: Record<ScenarioId, { count: number; iterations: number }>;
  info: BenchInfo;
  library: LibraryInfo;
  boot: BootSnapshot;
}

export interface BenchInstance {
  el: HTMLElement;
  nextMonth(): void;
  setTheme(theme: BenchTheme): void;
  destroy(): void;
}

export type BenchFactory = (host: HTMLElement, options: Record<string, unknown>) => BenchInstance;

interface Handle {
  prepareSelect(): void;
  nextMonth(): void;
  selectOne(): void;
  selectAll(): void;
  setTheme(theme: BenchTheme): void;
  destroy(): void;
}

const stageEl = document.getElementById("stage")!;
if (!stageEl) throw new Error("[bench] 页面缺少 #stage");

const live: Handle[] = [];
let calendarFactory: BenchFactory | null = null;

export const VARIANTS: readonly VariantInfo[] = [
  { id: "vanilla", label: "原生 DOM 基线" },
  { id: "single", label: "calendar-ui 默认" },
  { id: "no-header", label: "无头部" },
  { id: "adapter", label: "适配器 + popup" },
  { id: "range-2", label: "范围双月" },
];

export const SCENARIOS: Record<ScenarioId, { count: number; iterations: number }> = {
  create: { count: 1, iterations: 20 },
  create100: { count: 100, iterations: 10 },
  nextMonth: { count: 1, iterations: 20 },
  nextMonth60: { count: 60, iterations: 10 },
  select: { count: 1, iterations: 20 },
  select42: { count: 42, iterations: 10 },
  theme: { count: 1, iterations: 20 },
  idle: { count: 1, iterations: 20 },
  destroy100: { count: 100, iterations: 10 },
};

const SETUP_ONE: ReadonlySet<ScenarioId> = new Set<ScenarioId>([
  "nextMonth",
  "nextMonth60",
  "select",
  "select42",
  "theme",
  "idle",
]);

/** 等这一帧画完：rAF 之后再排一个宏任务，防止只测到布局的一半。 */
function afterPaint(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      resolve();
    };
    requestAnimationFrame(() => setTimeout(finish, 0));
    setTimeout(finish, 500);
  });
}

/** 把排队的样式 / 布局全部算掉，不留给下一次测量。 */
async function settle(): Promise<void> {
  await afterPaint();
  void document.body.offsetHeight;
  void getComputedStyle(stageEl).height;
}

function reset(): void {
  for (const handle of live.splice(0)) {
    try {
      handle.destroy();
    } catch {
      // 已销毁
    }
  }
  stageEl.replaceChildren();
}

function parseVariant(value: string | null): VariantId {
  const found = VARIANTS.find((variant) => variant.id === value);
  return found ? found.id : "single";
}

/* ------------------------------------------------------------------ */
/* 原生 DOM 基线                                                       */
/* ------------------------------------------------------------------ */

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const WEEKDAYS_LONG = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function createVanilla(host: HTMLElement): Handle {
  const root = document.createElement("div");
  root.className = "cui";
  root.dataset.theme = "light";
  root.dataset.size = "normal";

  const header = document.createElement("div");
  header.className = "cui__header";
  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "cui__nav";
  prev.dataset.direction = "prev";
  prev.setAttribute("aria-label", "上个月");
  const title = document.createElement("div");
  title.className = "cui__title";
  const yearButton = document.createElement("button");
  yearButton.type = "button";
  yearButton.className = "cui__title-part";
  const monthButton = document.createElement("button");
  monthButton.type = "button";
  monthButton.className = "cui__title-part";
  title.append(yearButton, monthButton);
  const next = document.createElement("button");
  next.type = "button";
  next.className = "cui__nav";
  next.dataset.direction = "next";
  next.setAttribute("aria-label", "下个月");
  header.append(prev, title, next);

  const weekdays = document.createElement("div");
  weekdays.className = "cui__weekdays";
  for (let i = 0; i < 7; i++) {
    const cell = document.createElement("div");
    cell.className = "cui__weekday";
    cell.textContent = WEEKDAYS[i] ?? "";
    cell.title = WEEKDAYS_LONG[i] ?? "";
    weekdays.append(cell);
  }

  const viewport = document.createElement("div");
  viewport.className = "cui__viewport";
  const grid = document.createElement("div");
  grid.className = "cui__grid";
  const cells: HTMLButtonElement[] = [];
  for (let row = 0; row < 6; row++) {
    const rowEl = document.createElement("div");
    rowEl.className = "cui__week";
    for (let column = 0; column < 7; column++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cui__day";
      const tag = document.createElement("span");
      tag.className = "cui__day-tag";
      tag.hidden = true;
      const num = document.createElement("span");
      num.className = "cui__day-num";
      const sub = document.createElement("span");
      sub.className = "cui__day-sub";
      const dot = document.createElement("span");
      dot.className = "cui__day-dot";
      dot.hidden = true;
      cell.append(tag, num, sub, dot);
      rowEl.append(cell);
      cells.push(cell);
    }
    grid.append(rowEl);
  }
  viewport.append(grid);
  root.append(header, weekdays, viewport);
  host.append(root);

  let year = 2026;
  let month = 1;
  let selectedKey = "2026-01-15";
  let selectTarget: HTMLButtonElement | null = null;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

  const applySelection = (): void => {
    for (const cell of cells) {
      const selected = cell.dataset.date === selectedKey;
      cell.classList.toggle("is-selected", selected);
      if (selected) cell.setAttribute("aria-pressed", "true");
      else cell.removeAttribute("aria-pressed");
    }
  };

  const selectCell = (cell: HTMLButtonElement): void => {
    const key = cell.dataset.date;
    if (!key || key === selectedKey) return;
    selectedKey = key;
    applySelection();
  };

  for (const cell of cells) {
    cell.addEventListener("click", () => selectCell(cell));
  }

  const render = (): void => {
    yearButton.textContent = String(year);
    monthButton.textContent = `${month}月`;
    const first = new Date(year, month - 1, 1);
    const offset = (first.getDay() - 1 + 7) % 7;
    const cursor = new Date(year, month - 1, 1 - offset);

    for (let i = 0; i < 42; i++) {
      const cell = cells[i];
      if (!cell) continue;
      const inMonth = cursor.getMonth() === month - 1;
      const key = `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}-${pad2(cursor.getDate())}`;
      if (cell.dataset.date !== key) {
        cell.dataset.date = key;
        const tag = cell.firstElementChild as HTMLElement;
        const num = tag.nextElementSibling as HTMLElement;
        if (tag.textContent !== "") tag.textContent = "";
        if (!tag.hidden) tag.hidden = true;
        const text = String(cursor.getDate());
        if (num.textContent !== text) num.textContent = text;
        const weekday = cursor.getDay();
        cell.classList.toggle("is-weekend", weekday === 0 || weekday === 6);
      }
      cell.classList.toggle("is-outside", !inMonth);
      cell.classList.toggle("is-today", key === todayKey);
      cell.tabIndex = inMonth ? 0 : -1;
      cell.setAttribute("aria-label", key);
      cursor.setDate(cursor.getDate() + 1);
    }
    applySelection();
  };
  render();

  return {
    prepareSelect() {
      selectTarget = null;
      for (const cell of cells) {
        if (!cell.classList.contains("is-outside")) {
          selectTarget = cell;
          break;
        }
      }
    },
    nextMonth() {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      render();
    },
    selectOne() {
      selectTarget?.click();
    },
    selectAll() {
      for (const cell of cells) cell.click();
    },
    setTheme(theme) {
      root.dataset.theme = theme;
    },
    destroy() {
      root.remove();
    },
  };
}

/* ------------------------------------------------------------------ */
/* calendar-ui 适配器（模拟农历：每天副标题 + 部分角标 + popup）        */
/* ------------------------------------------------------------------ */

const SUBTITLES = [
  "初一",
  "初二",
  "初三",
  "初四",
  "初五",
  "初六",
  "初七",
  "初八",
  "初九",
  "初十",
  "十一",
  "十二",
  "十三",
  "十四",
  "十五",
  "十六",
  "十七",
  "十八",
  "十九",
  "二十",
  "廿一",
  "廿二",
  "廿三",
  "廿四",
  "廿五",
  "廿六",
  "廿七",
  "廿八",
  "廿九",
  "三十",
  "立春",
  "雨水",
];

interface BenchDate {
  year: number;
  month: number;
  day: number;
}

interface BenchDecoration {
  subtitle: string;
  badge: { text: string; tone: string } | null;
  data: { serial: number };
}

const benchAdapter = {
  id: "bench-adapter",
  decorateMonth(input: { days: readonly BenchDate[] }): ReadonlyArray<BenchDecoration> {
    return input.days.map((date, index) => {
      const serial = date.year * 372 + date.month * 31 + date.day;
      return {
        subtitle: SUBTITLES[serial % SUBTITLES.length] ?? "初一",
        badge:
          index % 6 === 0
            ? { text: index % 12 === 0 ? "休" : "班", tone: index % 12 === 0 ? "rest" : "work" }
            : null,
        data: { serial },
      };
    });
  },
};

const POPUP_DATA = new Map<number, readonly (readonly [string, string, string])[]>();
for (let day = 1; day <= 31; day += 3) {
  POPUP_DATA.set(day, [["全天", `事件 ${day}`, "10 月 1 日 - 10 月 7 日放假调休，共 7 天"]]);
}

function mountCalendar(variant: VariantId, host: HTMLElement): Handle {
  if (variant === "vanilla") return createVanilla(host);

  if (!calendarFactory) throw new Error("[bench] createBench() 还没有初始化");

  const options: Record<string, unknown> = {
    initialDate: "2026-01-15",
    theme: "light",
    locale: "zh-CN",
  };

  if (variant === "no-header") {
    options.header = false;
  } else if (variant === "adapter") {
    options.adapter = benchAdapter;
    options.popup = {
      trigger: "hover",
      render: (day: { day: number }) => POPUP_DATA.get(day.day) ?? [],
    };
  } else if (variant === "range-2") {
    options.mode = "range";
    options.months = 2;
  }

  const instance = calendarFactory(host, options);
  let selectTarget: HTMLButtonElement | null = null;

  return {
    prepareSelect() {
      selectTarget = instance.el.querySelector<HTMLButtonElement>(".cui__day:not(.is-outside)");
    },
    nextMonth: () => instance.nextMonth(),
    selectOne: () => selectTarget?.click(),
    selectAll: () => {
      const cells = instance.el.querySelectorAll<HTMLButtonElement>(".cui__day");
      const count = Math.min(cells.length, 42);
      for (let i = 0; i < count; i++) cells[i]?.click();
    },
    setTheme: (theme) => instance.setTheme(theme),
    destroy: () => instance.destroy(),
  };
}

function mountMany(variant: VariantId, count: number): Handle[] {
  const handles: Handle[] = [];
  for (let i = 0; i < count; i++) {
    const host = document.createElement("div");
    host.className = "cui-host";
    stageEl.append(host);
    const handle = mountCalendar(variant, host);
    handles.push(handle);
    live.push(handle);
  }
  return handles;
}

async function prepare({ variant, scenario, count }: BenchArgs): Promise<void> {
  reset();
  if (scenario === "destroy100") {
    mountMany(variant, count);
  } else if (SETUP_ONE.has(scenario)) {
    const handle = mountMany(variant, 1)[0];
    handle?.prepareSelect();
  }
  await settle();
}

async function measure({ variant, scenario, count }: BenchArgs): Promise<MeasureResult> {
  if (scenario === "create" || scenario === "create100") {
    const start = performance.now();
    mountMany(variant, count);
    const syncMs = performance.now() - start;
    await afterPaint();
    return {
      syncMs,
      frameMs: performance.now() - start,
      nodes: document.querySelectorAll("*").length,
    };
  }

  if (scenario === "destroy100") {
    const start = performance.now();
    for (const handle of live.splice(0)) handle.destroy();
    const syncMs = performance.now() - start;
    await afterPaint();
    return {
      syncMs,
      frameMs: performance.now() - start,
      nodes: document.querySelectorAll("*").length,
    };
  }

  const handle = live[0];
  if (!handle) throw new Error("[bench] prepare() 没有挂载实例");

  const start = performance.now();
  if (scenario === "nextMonth") {
    handle.nextMonth();
  } else if (scenario === "nextMonth60") {
    for (let i = 0; i < count; i++) handle.nextMonth();
  } else if (scenario === "select") {
    handle.selectOne();
  } else if (scenario === "select42") {
    handle.selectAll();
  } else if (scenario === "theme") {
    handle.setTheme("dark");
  } else if (scenario === "idle") {
    // 空操作：只等一帧，作为计时基线
  } else {
    throw new Error("[bench] 未知场景");
  }
  const syncMs = performance.now() - start;
  await afterPaint();
  return {
    syncMs,
    frameMs: performance.now() - start,
    nodes: document.querySelectorAll("*").length,
  };
}

async function createForMemory({
  variant,
  count,
}: {
  variant: VariantId;
  count: number;
}): Promise<MemorySnapshot> {
  reset();
  mountMany(variant, count);
  await settle();
  return { nodes: document.querySelectorAll("*").length, instances: live.length };
}

/** 初始化当前页面的基准 API；入口只负责注入 library 与工厂。 */
export async function createBench(factory: BenchFactory, library: LibraryInfo): Promise<void> {
  calendarFactory = factory;

  const params = new URLSearchParams(location.search);
  const bootCount = params.has("boot") ? Number(params.get("boot")) || 50 : 0;
  const bootVariant = parseVariant(params.get("variant"));
  const boot: BootSnapshot = { mountMs: 0, paintMs: 0, nodes: 0, instances: 0 };

  if (bootCount > 0) {
    const start = performance.now();
    mountMany(bootVariant, bootCount);
    boot.mountMs = performance.now() - start;
    await afterPaint();
    boot.paintMs = performance.now();
    boot.nodes = document.querySelectorAll("*").length;
    boot.instances = live.length;
  }

  window.__bench = {
    prepare,
    measure,
    createForMemory,
    variants: VARIANTS,
    scenarios: SCENARIOS,
    info: {
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      devicePixelRatio: window.devicePixelRatio,
      viewport: `${innerWidth}x${innerHeight}`,
      crossOriginIsolated: window.crossOriginIsolated,
    },
    library,
    boot,
  };
  window.__benchReady = true;
}
