import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type CDPSession, type Page } from "playwright";
import type { BenchArgs, VariantId } from "../src/bench-core";
import { generateReport } from "./report";
import { startStaticServer } from "./server";
import { fmt, median, stdev } from "./stats";
import type {
  BootAggregate,
  BootSample,
  MemoryAggregate,
  OpAggregate,
  OpSample,
  PageInfo,
  RunResult,
  Target,
} from "./types";

const here = path.dirname(fileURLToPath(import.meta.url));
const benchRoot = path.resolve(here, "..");
const workspaceRoot = path.resolve(benchRoot, "..", "..");
const distDir = path.join(benchRoot, "dist");
const resultsDir = path.join(benchRoot, "results");

interface ScenarioConfig {
  count: number;
  iterations: number;
}

interface CliOptions {
  target: Target;
  report: boolean;
  iterations: number | null;
  cpu: number;
  channel: "chrome" | "msedge" | null;
  skipBoot: boolean;
  skipMemory: boolean;
  quick: boolean;
  variants: string[] | null;
  scenarios: string[] | null;
  headed: boolean;
  help: boolean;
}

const HELP = `用法：vpx ./runner/main.ts [选项]

选项：
  --target local|npm   选择被测对象，默认 local
  --report             只根据 results/*.json 重新生成报告
  --quick              快速模式：5 次采样、跳过内存与启动
  --iterations <n>    覆盖每个场景的采样次数
  --cpu <n>            CPU 降速倍数，默认 1
  --channel chrome    使用本机 Chrome / Edge（默认用 Playwright 自带 Chromium）
  --headed            显示浏览器窗口，方便排查
  --variant <a,b>     只跑指定变体
  --scenario <a,b>    只跑指定场景
  --skip-boot         跳过启动测量
  --skip-memory       跳过内存测量
  -h, --help          显示本帮助

第一次运行前：
  vp install
  vp run -F @sanguo-dev/bench install:browser
`;

function parseArgs(argv: readonly string[]): CliOptions {
  const options: CliOptions = {
    target: "local",
    report: false,
    iterations: null,
    cpu: 1,
    channel: null,
    skipBoot: false,
    skipMemory: false,
    quick: false,
    variants: null,
    scenarios: null,
    headed: false,
    help: false,
  };

  const nextValue = (index: number, name: string): string => {
    const value = argv[index];
    if (value === undefined) throw new Error(`${name} 缺少值`);
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    const [name, inlineValue] = arg.split("=", 2) as [string, string | undefined];
    const readValue = (): string => {
      if (inlineValue !== undefined) return inlineValue;
      const value = nextValue(i + 1, name);
      i += 1;
      return value;
    };

    switch (name) {
      case "--target": {
        const value = readValue();
        if (value !== "local" && value !== "npm") throw new Error(`未知 target：${value}`);
        options.target = value;
        break;
      }
      case "--report":
        options.report = true;
        break;
      case "--quick":
        options.quick = true;
        break;
      case "--iterations":
        options.iterations = Number(readValue());
        break;
      case "--cpu":
        options.cpu = Number(readValue());
        break;
      case "--channel": {
        const value = readValue();
        if (value !== "chrome" && value !== "msedge") throw new Error(`未知 channel：${value}`);
        options.channel = value;
        break;
      }
      case "--variant":
        options.variants = readValue().split(",").filter(Boolean);
        break;
      case "--scenario":
        options.scenarios = readValue().split(",").filter(Boolean);
        break;
      case "--skip-boot":
        options.skipBoot = true;
        break;
      case "--skip-memory":
        options.skipMemory = true;
        break;
      case "--headed":
        options.headed = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`未知参数：${arg}`);
    }
  }

  if (options.quick) {
    options.iterations = options.iterations ?? 5;
    options.skipBoot = true;
    options.skipMemory = true;
  }
  if (
    options.iterations !== null &&
    (!Number.isInteger(options.iterations) || options.iterations < 1)
  ) {
    throw new Error("--iterations 必须是正整数");
  }
  if (!Number.isFinite(options.cpu) || options.cpu < 1) {
    throw new Error("--cpu 必须大于等于 1");
  }
  return options;
}

const readJson = async <T>(file: string): Promise<T> =>
  JSON.parse(await readFile(file, "utf8")) as T;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function readInstalledVersion(name: string): Promise<string> {
  const candidates = [
    path.join(benchRoot, "node_modules", name, "package.json"),
    path.join(workspaceRoot, "node_modules", name, "package.json"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const pkg = await readJson<{ version?: string }>(file);
    return pkg.version ?? "unknown";
  }
  return "unknown";
}

async function readLibrary(target: Target): Promise<RunResult["meta"]["library"]> {
  if (target === "local") {
    const pkg = await readJson<{ name?: string; version?: string }>(
      path.join(workspaceRoot, "packages", "calendar-ui", "package.json"),
    );
    return {
      name: pkg.name ?? "@sanguo-dev/calendar-ui",
      version: pkg.version ?? "unknown",
      source: "workspace dist",
    };
  }

  const candidates = [
    path.join(benchRoot, "node_modules", "calendar-ui-npm", "package.json"),
    path.join(workspaceRoot, "node_modules", "calendar-ui-npm", "package.json"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const pkg = await readJson<{ name?: string; version?: string }>(file);
    return {
      name: pkg.name ?? "@sanguo-dev/calendar-ui",
      version: pkg.version ?? "unknown",
      source: "npm alias",
    };
  }
  throw new Error(
    "找不到 calendar-ui-npm，请先执行 vp install；npm 模式依赖 package.json 里的 npm 别名",
  );
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch("https://registry.npmjs.org/@sanguo-dev%2fcalendar-ui", {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { "dist-tags"?: { latest?: string } };
    return data["dist-tags"]?.latest ?? null;
  } catch {
    return null;
  }
}

async function checkLocalDist(): Promise<void> {
  const distFile = path.join(workspaceRoot, "packages", "calendar-ui", "dist", "index.mjs");
  if (!existsSync(distFile)) {
    throw new Error(
      "缺少 packages/calendar-ui/dist，请先执行 vp run -F @sanguo-dev/calendar-ui build",
    );
  }

  try {
    const sourceRoot = path.join(workspaceRoot, "packages", "calendar-ui", "src");
    const entries = await readdir(sourceRoot, { recursive: true, withFileTypes: true });
    const distStat = await stat(distFile);
    let newest = 0;
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
      const fileStat = await stat(path.join(entry.parentPath, entry.name));
      if (fileStat.mtimeMs > newest) newest = fileStat.mtimeMs;
    }
    if (newest > distStat.mtimeMs) {
      console.warn(
        "⚠ packages/calendar-ui/dist 比 src 旧，本地模式测到的是旧构建；先运行 vp run -F @sanguo-dev/calendar-ui build",
      );
    }
  } catch {
    // 文件遍历失败不阻塞基准
  }
}

function ensureDist(target: Target): void {
  const entry = path.join(distDir, `${target}.html`);
  if (!existsSync(entry)) {
    throw new Error(
      `缺少 ${path.relative(benchRoot, entry)}，请先执行 vp run -F @sanguo-dev/bench build`,
    );
  }
}

const readMetrics = async (session: CDPSession): Promise<Record<string, number>> => {
  const { metrics } = await session.send("Performance.getMetrics");
  return Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
};

const diffMetrics = (
  before: Record<string, number>,
  after: Record<string, number>,
): Omit<OpSample, "syncMs" | "frameMs" | "nodes"> => {
  const duration = (name: string): number => ((after[name] ?? 0) - (before[name] ?? 0)) * 1000;
  const count = (name: string): number => (after[name] ?? 0) - (before[name] ?? 0);
  return {
    scriptMs: duration("ScriptDuration"),
    styleMs: duration("RecalcStyleDuration"),
    layoutMs: duration("LayoutDuration"),
    taskMs: duration("TaskDuration"),
    layoutCount: count("LayoutCount"),
    recalcCount: count("RecalcStyleCount"),
  };
};

async function navigate(page: Page, origin: string, target: Target, query = ""): Promise<void> {
  await page.goto(`${origin}/${target}.html${query}`, {
    waitUntil: "load",
    timeout: 30000,
  });
  await page.waitForFunction(() => window.__benchReady === true, undefined, {
    timeout: 30000,
  });
}

async function runScenario(
  page: Page,
  session: CDPSession,
  origin: string,
  target: Target,
  variantId: string,
  scenarioId: string,
  config: ScenarioConfig,
  iterations: number,
): Promise<OpAggregate> {
  await navigate(page, origin, target);
  const args: BenchArgs = {
    variant: variantId as VariantId,
    scenario: scenarioId as BenchArgs["scenario"],
    count: config.count,
  };

  for (let i = 0; i < 2; i++) {
    await page.evaluate((value) => window.__bench?.prepare(value), args);
    await page.evaluate((value) => window.__bench?.measure(value), args);
  }

  const samples: OpSample[] = [];
  for (let i = 0; i < iterations; i++) {
    await page.evaluate((value) => window.__bench?.prepare(value), args);
    const before = await readMetrics(session);
    const result = await page.evaluate((value) => window.__bench?.measure(value), args);
    const after = await readMetrics(session);
    if (!result) throw new Error("页面没有返回测量结果");
    samples.push({ ...result, ...diffMetrics(before, after) });
  }

  const per = (key: keyof OpSample): number[] =>
    samples.map((sample) => sample[key] / config.count);

  return {
    count: config.count,
    iterations,
    syncMs: median(per("syncMs")),
    syncSd: stdev(per("syncMs")),
    frameMs: median(per("frameMs")),
    frameSd: stdev(per("frameMs")),
    scriptMs: median(per("scriptMs")),
    styleMs: median(per("styleMs")),
    layoutMs: median(per("layoutMs")),
    taskMs: median(per("taskMs")),
    layoutCount: median(samples.map((sample) => sample.layoutCount / config.count)),
    totalMs: median(samples.map((sample) => sample.frameMs)),
    nodes: median(samples.map((sample) => sample.nodes)),
    samples,
  };
}

async function measureMemory(
  page: Page,
  session: CDPSession,
  origin: string,
  target: Target,
  variantId: string,
): Promise<MemoryAggregate> {
  await navigate(page, origin, target);
  for (let i = 0; i < 2; i++) {
    await session.send("HeapProfiler.collectGarbage");
    await sleep(60);
  }
  const base = await readMetrics(session);
  const baseNodes = await page.evaluate(() => document.querySelectorAll("*").length);
  const created = await page.evaluate((value) => window.__bench?.createForMemory(value), {
    variant: variantId as VariantId,
    count: 100,
  });
  if (!created) throw new Error("createForMemory 没有返回结果");

  await session.send("HeapProfiler.collectGarbage");
  await sleep(80);
  await session.send("HeapProfiler.collectGarbage");
  await sleep(40);
  await session.send("HeapProfiler.collectGarbage");
  const loaded = await readMetrics(session);

  const baseHeapMB = (base.JSHeapUsedSize ?? 0) / 1024 / 1024;
  const heap100MB = (loaded.JSHeapUsedSize ?? 0) / 1024 / 1024;
  return {
    perInstanceKB: ((heap100MB - baseHeapMB) * 1024) / 100,
    heap100MB,
    deltaMB: heap100MB - baseHeapMB,
    baseHeapMB,
    baseNodes,
    nodes100: created.nodes,
  };
}

async function measureBoot(
  page: Page,
  session: CDPSession,
  origin: string,
  target: Target,
  variantId: string,
): Promise<BootAggregate> {
  const samples: BootSample[] = [];
  for (let i = 0; i < 3; i++) {
    await navigate(page, origin, target, `?boot=50&variant=${variantId}`);
    const boot = await page.evaluate(() => window.__bench?.boot);
    if (!boot) throw new Error("页面没有返回启动数据");
    await session.send("HeapProfiler.collectGarbage");
    const metrics = await readMetrics(session);
    samples.push({
      mountMs: boot.mountMs,
      paintMs: boot.paintMs,
      heapMB: (metrics.JSHeapUsedSize ?? 0) / 1024 / 1024,
      nodes: boot.nodes,
    });
  }

  const pick = (key: keyof BootSample): number => median(samples.map((sample) => sample[key]));
  return {
    mountMs: pick("mountMs"),
    paintMs: pick("paintMs"),
    heapMB: pick("heapMB"),
    nodes: pick("nodes"),
    samples,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
    return;
  }

  await mkdir(resultsDir, { recursive: true });

  if (options.report) {
    const files = await generateReport(resultsDir);
    console.log(`报告：${files.join("、")}`);
    return;
  }

  ensureDist(options.target);
  const library = await readLibrary(options.target);
  if (options.target === "local") await checkLocalDist();
  if (options.target === "npm") {
    const latest = await fetchLatestVersion();
    if (latest && latest !== library.version) {
      console.warn(
        `⚠ npm 别名当前是 ${library.version}，registry latest 是 ${latest}；先运行 vp run -F @sanguo-dev/bench refresh:npm 再测`,
      );
    }
  }
  console.log(`被测对象：${library.name}@${library.version}（${library.source}）`);

  const server = await startStaticServer(distDir);
  let browser: Browser | null = null;

  try {
    // vp run 会给脚本套一层只允许写 workspace 的沙箱；Playwright 默认往系统临时目录写，
    // 在 vp run + vpx 的组合下会 EPERM。把临时目录指到仓库内即可，也避免污染系统 temp。
    const benchTemp = path.join(benchRoot, ".tmp");
    await mkdir(benchTemp, { recursive: true });
    process.env.TEMP = benchTemp;
    process.env.TMP = benchTemp;
    process.env.TMPDIR = benchTemp;

    browser = await chromium.launch({
      headless: !options.headed,
      channel: options.channel ?? undefined,
      args: ["--disable-features=BackForwardCache", "--hide-scrollbars"],
    });

    const context = await browser.newContext({
      viewport: { width: 1400, height: 1000 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    const session = await context.newCDPSession(page);
    await session.send("Performance.enable");
    await session.send("HeapProfiler.enable");
    if (options.cpu > 1) {
      await session.send("Emulation.setCPUThrottlingRate", { rate: options.cpu });
    }

    await navigate(page, server.origin, options.target);
    const pageInfo = await page.evaluate(() => window.__bench?.info);
    const variants = await page.evaluate(() => window.__bench?.variants);
    const scenarios = await page.evaluate(() => window.__bench?.scenarios);
    if (!pageInfo || !variants || !scenarios) throw new Error("页面没有初始化 __bench");

    const selectedVariants = variants.filter(
      (variant) => !options.variants || options.variants.includes(variant.id),
    );
    const selectedScenarios = Object.entries(scenarios).filter(
      ([id]) => !options.scenarios || options.scenarios.includes(id),
    );
    if (selectedVariants.length === 0) throw new Error("没有匹配的变体");
    if (selectedScenarios.length === 0) throw new Error("没有匹配的场景");

    const result: RunResult = {
      meta: {
        target: options.target,
        library,
        generatedAt: new Date().toISOString(),
        browser: { name: browser.browserType().name(), version: browser.version() },
        playwright: await readInstalledVersion("playwright"),
        node: process.version,
        viewport: "1400x1000 dpr1",
        cpuThrottle: options.cpu,
        iterations: options.iterations,
      },
      pageInfo: pageInfo as PageInfo,
      variants: selectedVariants,
      scenarios: Object.fromEntries(selectedScenarios),
      ops: {},
      memory: {},
      boot: {},
      errors,
    };

    for (const [scenarioId, config] of selectedScenarios) {
      for (const variant of selectedVariants) {
        const iterations = options.iterations ?? config.iterations;
        const aggregate = await runScenario(
          page,
          session,
          server.origin,
          options.target,
          variant.id,
          scenarioId,
          config,
          iterations,
        );
        result.ops[`${variant.id}|${scenarioId}`] = aggregate;
        console.log(
          `${variant.id.padEnd(10)} ${scenarioId.padEnd(11)} ` +
            `sync=${fmt(aggregate.syncMs)}ms frame=${fmt(aggregate.frameMs)}ms ` +
            `style=${fmt(aggregate.styleMs)} layout=${fmt(aggregate.layoutMs)}`,
        );
      }
    }

    if (!options.skipMemory) {
      for (const variant of selectedVariants) {
        const memory = await measureMemory(
          page,
          session,
          server.origin,
          options.target,
          variant.id,
        );
        result.memory[variant.id] = memory;
        console.log(
          `mem  ${variant.id.padEnd(10)} ${fmt(memory.perInstanceKB, 1)}KB/实例 ` +
            `heap100=${fmt(memory.heap100MB, 2)}MB nodes100=${memory.nodes100}`,
        );
      }
    }

    if (!options.skipBoot) {
      for (const variant of selectedVariants) {
        const boot = await measureBoot(page, session, server.origin, options.target, variant.id);
        result.boot[variant.id] = boot;
        console.log(
          `boot ${variant.id.padEnd(10)} mount=${fmt(boot.mountMs, 1)}ms ` +
            `paint=${fmt(boot.paintMs, 1)}ms heap=${fmt(boot.heapMB, 2)}MB`,
        );
      }
    }

    const isPartial =
      options.quick ||
      options.variants !== null ||
      options.scenarios !== null ||
      options.iterations !== null;
    const outFile = path.join(resultsDir, `${options.target}${isPartial ? "-partial" : ""}.json`);
    await writeFile(outFile, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`\n写入 ${outFile}`);
    if (errors.length > 0) console.warn(`页面错误 ${errors.length} 条：${errors.join("；")}`);

    const files = await generateReport(resultsDir);
    console.log(`报告：${files.join("、")}`);
  } finally {
    await browser?.close();
    await server.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `\n${error.message}` : error);
  process.exitCode = 1;
});
