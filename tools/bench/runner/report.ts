import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BootAggregate, MemoryAggregate, OpAggregate, RunResult, Target } from "./types";

const SCENARIO_META: Record<string, { label: string; unit: string }> = {
  create: { label: "创建 1 个", unit: "ms" },
  create100: { label: "创建 100 个（每实例）", unit: "ms" },
  nextMonth: { label: "翻到下一月", unit: "ms" },
  nextMonth60: { label: "连续翻月 ×60（每操作）", unit: "ms" },
  select: { label: "点选 1 天", unit: "ms" },
  select42: { label: "连续点选 42 格（每操作）", unit: "ms" },
  theme: { label: "切换主题", unit: "ms" },
  idle: { label: "空操作（帧基线）", unit: "ms" },
  destroy100: { label: "销毁 100 个（每实例）", unit: "ms" },
};

const CORE = ["create", "nextMonth", "select", "theme"] as const;

const SHORT: Record<string, string> = {
  create: "创建",
  nextMonth: "翻月",
  select: "点选",
  theme: "主题",
};
const THROUGHPUT = ["create100", "nextMonth60", "select42", "destroy100"] as const;
const TARGETS: readonly Target[] = ["local", "npm"] as const;

const esc = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const fmt = (value: number | undefined, digits = 3): string =>
  value === undefined ? "—" : value.toFixed(digits);

const delta = (base: number | undefined, next: number | undefined): string => {
  if (base === undefined || next === undefined || base === 0) return "—";
  const change = (next / base - 1) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`;
};

const bar = (value: number | undefined, max: number, accent = false): string => {
  if (value === undefined || max <= 0) return "";
  const width = Math.max((value / max) * 100, 0.8);
  return `<span class="bar${accent ? " accent" : ""}" style="width:${width.toFixed(2)}%"></span>`;
};

interface Loaded {
  runs: Partial<Record<Target, RunResult>>;
  variants: readonly { id: string; label: string }[];
}

async function loadRuns(resultsDir: string): Promise<Loaded> {
  const runs: Partial<Record<Target, RunResult>> = {};
  for (const target of TARGETS) {
    const file = path.join(resultsDir, `${target}.json`);
    if (!existsSync(file)) continue;
    runs[target] = JSON.parse(await readFile(file, "utf8")) as RunResult;
  }
  const first = runs.local ?? runs.npm;
  if (!first) {
    throw new Error("还没有结果文件，先运行 bench:local 或 bench:npm");
  }
  return { runs, variants: first.variants };
}

const opOf = (
  run: RunResult | undefined,
  variant: string,
  scenario: string,
): OpAggregate | undefined => run?.ops[`${variant}|${scenario}`];

const memOf = (run: RunResult | undefined, variant: string): MemoryAggregate | undefined =>
  run?.memory[variant];

const bootOf = (run: RunResult | undefined, variant: string): BootAggregate | undefined =>
  run?.boot[variant];

function libraryLabel(run: RunResult): string {
  return `${run.meta.library.name}@${run.meta.library.version}（${run.meta.library.source}）`;
}

function summaryCard(label: string, value: string, detail: string): string {
  return `<div class="card">
    <div class="card-kicker">${esc(label)}</div>
    <div class="card-value">${value}</div>
    <div class="card-foot">${detail}</div>
  </div>`;
}

function compareTable(runs: Loaded["runs"], variantId: string): string {
  const rows = [...CORE, ...THROUGHPUT]
    .map((scenario) => {
      const local = opOf(runs.local, variantId, scenario);
      const npm = opOf(runs.npm, variantId, scenario);
      if (!local && !npm) return "";
      return `<tr>
      <td>${esc(SCENARIO_META[scenario]?.label ?? scenario)}</td>
      <td>${fmt(local?.syncMs)}</td>
      <td>${fmt(npm?.syncMs)}</td>
      <td class="delta">${delta(local?.syncMs, npm?.syncMs)}</td>
      <td>${fmt(local?.frameMs)}</td>
      <td>${fmt(npm?.frameMs)}</td>
    </tr>`;
    })
    .join("");

  return `<table>
    <thead><tr><th>操作</th><th>本地 JS</th><th>npm JS</th><th>JS 变化</th><th>本地到帧</th><th>npm 到帧</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function targetTable(run: RunResult, variants: readonly { id: string; label: string }[]): string {
  const maxMemory = Math.max(
    ...variants.map((variant) => memOf(run, variant.id)?.perInstanceKB ?? 0),
  );
  const rows = variants
    .map((variant) => {
      const cells = CORE.map((scenario) => {
        const aggregate = opOf(run, variant.id, scenario);
        return `<td><div class="kv"><b>${fmt(aggregate?.syncMs)}</b><span>${fmt(aggregate?.frameMs)}</span></div></td>`;
      }).join("");
      const memory = memOf(run, variant.id);
      const boot = bootOf(run, variant.id);
      return `<tr>
      <th class="rowhead">${esc(variant.label)}</th>
      ${cells}
      <td>
        <div class="kv"><b>${fmt(memory?.perInstanceKB, 1)}</b><span>KB</span></div>
        <div class="track">${bar(memory?.perInstanceKB, maxMemory)}</div>
      </td>
      <td>${fmt(boot?.mountMs, 1)}</td>
    </tr>`;
    })
    .join("");

  return `<table>
    <thead><tr><th>变体</th>${CORE.map((scenario) => `<th>${esc(SCENARIO_META[scenario]?.label ?? scenario)}<br><small>JS / 到帧</small></th>`).join("")}<th>内存 / 实例</th><th>启动 50 个</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function ratioTable(run: RunResult, variants: readonly { id: string; label: string }[]): string {
  const rows = variants
    .map((variant) => {
      const cells = CORE.map((scenario) => {
        const value = opOf(run, variant.id, scenario)?.syncMs;
        const base = opOf(run, "vanilla", scenario)?.syncMs;
        const ratio =
          value !== undefined && base !== undefined && base > 0
            ? `${(value / base).toFixed(2)}×`
            : "—";
        return `<td>${ratio}</td>`;
      }).join("");
      return `<tr><th class="rowhead">${esc(variant.label)}</th>${cells}</tr>`;
    })
    .join("");
  return `<table>
    <thead><tr><th>变体</th>${CORE.map((scenario) => `<th>${esc(SHORT[scenario] ?? scenario)} 相对基线</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function memoryCompareTable(
  runs: Loaded["runs"],
  variants: readonly { id: string; label: string }[],
): string {
  if (!runs.local || !runs.npm) return "";
  const rows = variants
    .map((variant) => {
      const local = memOf(runs.local, variant.id);
      const npm = memOf(runs.npm, variant.id);
      return `<tr>
      <th class="rowhead">${esc(variant.label)}</th>
      <td>${fmt(local?.heap100MB, 2)} MB</td>
      <td>${fmt(npm?.heap100MB, 2)} MB</td>
      <td>${fmt(local?.perInstanceKB, 1)} KB</td>
      <td>${fmt(npm?.perInstanceKB, 1)} KB</td>
      <td class="delta">${delta(local?.perInstanceKB, npm?.perInstanceKB)}</td>
      <td>${local?.nodes100 ?? "—"}</td>
      <td>${npm?.nodes100 ?? "—"}</td>
    </tr>`;
    })
    .join("");
  return `<table>
    <thead><tr><th>变体</th><th>本地 heap 100</th><th>npm heap 100</th><th>本地 / 实例</th><th>npm / 实例</th><th>变化</th><th>本地 DOM</th><th>npm DOM</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function bootCompareTable(
  runs: Loaded["runs"],
  variants: readonly { id: string; label: string }[],
): string {
  if (!runs.local || !runs.npm) return "";
  const rows = variants
    .map((variant) => {
      const local = bootOf(runs.local, variant.id);
      const npm = bootOf(runs.npm, variant.id);
      return `<tr>
      <th class="rowhead">${esc(variant.label)}</th>
      <td>${fmt(local?.mountMs, 1)} ms</td>
      <td>${fmt(npm?.mountMs, 1)} ms</td>
      <td>${fmt(local?.paintMs, 1)} ms</td>
      <td>${fmt(npm?.paintMs, 1)} ms</td>
      <td>${fmt(local?.heapMB, 2)} MB</td>
      <td>${fmt(npm?.heapMB, 2)} MB</td>
    </tr>`;
    })
    .join("");
  return `<table>
    <thead><tr><th>变体</th><th>本地挂载 50</th><th>npm 挂载 50</th><th>本地到画完</th><th>npm 到画完</th><th>本地 heap</th><th>npm heap</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function methodList(runs: Loaded["runs"]): string {
  const local = runs.local;
  const npm = runs.npm;
  const items = [
    "每个场景独立加载页面；每次采样前销毁实例、清空容器并等待渲染完成；2 次预热。",
    "JS 为 performance.now() 包住操作本身；样式 / 布局来自 CDP Performance.getMetrics；到帧为操作开始到浏览器画完这一帧。",
    "空操作（帧基线）在同一页面下测得，约 14–16 ms（60 Hz 的 rAF 节奏）；比较交互增量看「到帧 − 基线」。",
    "内存为强制 GC 后的 JSHeapUsedSize，不含 C++ DOM 对象本身；DOM 节点数为实时节点数。",
    "local 使用 workspace 构建后的 dist；npm 使用 package.json 中的 calendar-ui-npm 别名（npm:@sanguo-dev/calendar-ui@latest），两个 target 各自独立页面，避免 CSS / DOM 互相影响。",
    "推送新版本后，先运行 vp run -F @sanguo-dev/bench refresh:npm 更新 latest 别名，再跑 bench:npm。",
    "headless Chromium 的帧调度与真实显示器不同，绝对值随机器和浏览器版本变化；相对倍数与趋势更可靠。",
  ];
  if (local && local.meta.cpuThrottle > 1) {
    items.push(`本次运行使用了 ${local.meta.cpuThrottle}× CPU 降速。`);
  }
  if (npm && npm.meta.cpuThrottle !== local?.meta.cpuThrottle) {
    items.push(
      `注意：local 与 npm 的 CPU 降速不同（${local?.meta.cpuThrottle} vs ${npm.meta.cpuThrottle}）。`,
    );
  }
  return `<ul class="sub">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function metaLine(runs: Loaded["runs"]): string {
  const pieces: string[] = [];
  for (const target of TARGETS) {
    const run = runs[target];
    if (run) pieces.push(`${target}: ${libraryLabel(run)}`);
  }
  const any = runs.local ?? runs.npm;
  if (any) {
    pieces.push(`${any.meta.browser.name} ${any.meta.browser.version}`);
    pieces.push(`Playwright ${any.meta.playwright}`);
    pieces.push(
      new Date(any.meta.generatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
    );
  }
  return pieces.map((piece) => `<span>${esc(piece)}</span>`).join(" · ");
}

/** 读取 results 目录，生成 report.html 与 REPORT.md。 */
export async function generateReport(resultsDir: string): Promise<string[]> {
  const { runs, variants } = await loadRuns(resultsDir);
  const defaultVariant = variants.find((variant) => variant.id === "single") ?? variants[0];
  const hasBoth = Boolean(runs.local && runs.npm);
  const sameVersion =
    hasBoth && runs.local?.meta.library.version === runs.npm?.meta.library.version;
  const htmlFile = path.join(resultsDir, "report.html");
  const mdFile = path.join(resultsDir, "REPORT.md");

  const summaryRun = runs.local ?? runs.npm;
  const cards = defaultVariant
    ? [
        summaryCard(
          "创建 1 个",
          `${fmt(opOf(summaryRun, defaultVariant.id, "create")?.syncMs)}<span>ms JS</span>`,
          `到帧 ${fmt(opOf(summaryRun, defaultVariant.id, "create")?.frameMs)} ms`,
        ),
        summaryCard(
          "翻到下一月",
          `${fmt(opOf(summaryRun, defaultVariant.id, "nextMonth")?.syncMs)}<span>ms JS</span>`,
          `布局 ${fmt(opOf(summaryRun, defaultVariant.id, "nextMonth")?.layoutMs)} ms`,
        ),
        summaryCard(
          "点选 1 天",
          `${fmt(opOf(summaryRun, defaultVariant.id, "select")?.syncMs)}<span>ms JS</span>`,
          `到帧 ${fmt(opOf(summaryRun, defaultVariant.id, "select")?.frameMs)} ms`,
        ),
        summaryCard(
          "内存 / 实例",
          `${fmt(memOf(summaryRun, defaultVariant.id)?.perInstanceKB, 1)}<span>KB</span>`,
          `100 实例 ${fmt(memOf(summaryRun, defaultVariant.id)?.heap100MB, 2)} MB`,
        ),
      ].join("")
    : "";

  const sections = TARGETS.map((target) => {
    const run = runs[target];
    if (!run) return "";
    return `<h2>${target === "local" ? "本地构建" : "npm latest"}</h2>
      <div class="scroll">${targetTable(run, variants)}</div>
      <p class="sub">相对基线 = 变体 JS / 原生基线 JS；同一次运行内比较，受机器状态影响更小。</p>
      <div class="scroll">${ratioTable(run, variants)}</div>`;
  }).join("");

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>calendar-ui 性能基准</title>
<style>
  :root { --ink:#18212b; --muted:#68737f; --line:#e3e8ee; --bg:#f6f8fa; --card:#fff; --accent:#0a7c6a; --accent-soft:#e3f4ef; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font: 15px/1.65 "Segoe UI", "Microsoft YaHei", system-ui, sans-serif; }
  main { max-width: 1180px; margin: 0 auto; padding: 40px 28px 80px; }
  h1 { font-size: 30px; letter-spacing:-.5px; margin: 0 0 6px; }
  h2 { font-size: 20px; margin: 40px 0 12px; }
  p { margin: 8px 0; }
  .sub { color: var(--muted); font-size: 13px; }
  .meta { color: var(--muted); font-size: 13px; border-left: 3px solid var(--accent); padding-left: 12px; margin: 20px 0 8px; display: flex; flex-direction: column; gap: 2px; }
  .cards { display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 14px; margin: 18px 0 8px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
  .card-kicker { font-size: 12px; color: var(--muted); letter-spacing:.04em; }
  .card-value { font-size: 26px; font-weight: 700; letter-spacing:-.5px; margin: 4px 0 2px; color: var(--accent); }
  .card-value span { font-size: 12px; font-weight: 500; color: var(--muted); margin-left: 4px; }
  .card-foot { font-size: 12px; color: var(--ink); }
  .muted { color: var(--muted); }
  table { width:100%; border-collapse: collapse; background: var(--card); border:1px solid var(--line); border-radius: 12px; overflow: hidden; font-size: 13px; }
  th, td { padding: 10px 12px; border-bottom: 1px solid var(--line); text-align: right; vertical-align: middle; }
  thead th { background:#fbfcfd; color: var(--muted); font-weight: 600; font-size: 12px; }
  tbody th, .rowhead { text-align: left; font-weight: 600; }
  tbody tr:last-child td, tbody tr:last-child th { border-bottom: 0; }
  .kv { display:flex; align-items: baseline; justify-content: flex-end; gap: 4px; }
  .kv b { font-size: 14px; }
  .kv span { font-size: 11px; color: var(--muted); }
  .track { height: 4px; background:#eef1f4; border-radius: 2px; margin-top: 6px; overflow:hidden; }
  .bar { display:block; height: 100%; background:#b9c6d2; border-radius: 2px; }
  .bar.accent { background: var(--accent); }
  .delta { font-variant-numeric: tabular-nums; color: var(--muted); }
  .notes { background: #f2faf7; border: 1px solid #cfe9df; border-radius: 12px; padding: 6px 20px; }
  .scroll { overflow-x: auto; }
  code { background:#eef1f4; border-radius: 4px; padding: 1px 5px; font-size: 12px; }
  @media print { body { background: #fff; } .card, table { box-shadow:none; } }
</style>
</head>
<body>
<main>
  <h1>calendar-ui 性能基准</h1>
  <div class="meta">${metaLine(runs)}</div>
  ${cards ? `<div class="cards">${cards}</div>` : ""}

  ${
    hasBoth
      ? `<h2>本地 vs npm latest</h2>
    <div class="scroll">${compareTable(runs, defaultVariant?.id ?? "single")}</div>
    <p class="sub">默认配置（单日历）；JS 变化 = npm 相对本地，正数表示 npm 更慢。创建 100 个、销毁 100 个为每实例均摊。${sameVersion ? "本次 local 与 npm 版本号相同（" + runs.local?.meta.library.version + "）；local 是工作区当前代码，npm 是已发布产物，差异可能包含未发布改动与运行噪声。" : ""}</p>`
      : ""
  }

  ${sections}

  ${
    hasBoth
      ? `<h2>内存对比</h2><div class="scroll">${memoryCompareTable(runs, variants)}</div>
  <h2>启动对比</h2><div class="scroll">${bootCompareTable(runs, variants)}</div>`
      : ""
  }

  <h2>方法</h2>
  ${methodList(runs)}
</main>
</body>
</html>`;

  await writeFile(htmlFile, html, "utf8");

  const md: string[] = ["# calendar-ui 性能基准", "", metaLine(runs).replace(/<[^>]+>/g, ""), ""];

  if (hasBoth && defaultVariant) {
    md.push(`## 本地 vs npm latest（${defaultVariant.label}）`, "");
    md.push("| 操作 | 本地 JS | npm JS | 变化 | 本地到帧 | npm 到帧 |");
    md.push("| --- | ---: | ---: | ---: | ---: | ---: |");
    for (const scenario of [...CORE, ...THROUGHPUT]) {
      const local = opOf(runs.local, defaultVariant.id, scenario);
      const npm = opOf(runs.npm, defaultVariant.id, scenario);
      if (!local && !npm) continue;
      md.push(
        `| ${SCENARIO_META[scenario]?.label ?? scenario} | ${fmt(local?.syncMs)} | ${fmt(npm?.syncMs)} | ${delta(local?.syncMs, npm?.syncMs)} | ${fmt(local?.frameMs)} | ${fmt(npm?.frameMs)} |`,
      );
    }
    md.push("");
    if (sameVersion) {
      md.push(
        `> 本次 local 与 npm 都是 ${runs.local?.meta.library.version}，上表差异应视为运行间噪声。`,
      );
      md.push("");
    }
  }

  for (const target of TARGETS) {
    const run = runs[target];
    if (!run) continue;
    md.push(`## ${target === "local" ? "本地构建" : "npm latest"}`, "");
    md.push(
      `| 变体 | ${CORE.map((scenario) => `${SHORT[scenario] ?? scenario} JS`).join(" | ")} | ${CORE.map((scenario) => `${SHORT[scenario] ?? scenario} 到帧`).join(" | ")} | 内存/实例 | 启动 50 个 |`,
    );
    md.push(
      `| --- | ${CORE.map(() => "---:").join(" | ")} | ${CORE.map(() => "---:").join(" | ")} | ---: | ---: |`,
    );
    for (const variant of variants) {
      const js = CORE.map((scenario) => fmt(opOf(run, variant.id, scenario)?.syncMs));
      const frames = CORE.map((scenario) => fmt(opOf(run, variant.id, scenario)?.frameMs));
      md.push(
        `| ${variant.label} | ${js.join(" | ")} | ${frames.join(" | ")} | ${fmt(memOf(run, variant.id)?.perInstanceKB, 1)} KB | ${fmt(bootOf(run, variant.id)?.mountMs, 1)} ms |`,
      );
    }
    md.push("");
    md.push("相对基线（JS / 原生基线 JS）：");
    md.push("");
    md.push(`| 变体 | ${CORE.map((scenario) => SHORT[scenario] ?? scenario).join(" | ")} |`);
    md.push(`| --- | ${CORE.map(() => "---:").join(" | ")} |`);
    for (const variant of variants) {
      const cells = CORE.map((scenario) => {
        const value = opOf(run, variant.id, scenario)?.syncMs;
        const base = opOf(run, "vanilla", scenario)?.syncMs;
        return value !== undefined && base !== undefined && base > 0
          ? `${(value / base).toFixed(2)}×`
          : "—";
      });
      md.push(`| ${variant.label} | ${cells.join(" | ")} |`);
    }
    md.push("");
  }

  if (hasBoth) {
    md.push("## 内存对比", "");
    md.push("| 变体 | 本地 heap 100 | npm heap 100 | 本地/实例 | npm/实例 | 变化 |");
    md.push("| --- | ---: | ---: | ---: | ---: | ---: |");
    for (const variant of variants) {
      const local = memOf(runs.local, variant.id);
      const npm = memOf(runs.npm, variant.id);
      md.push(
        `| ${variant.label} | ${fmt(local?.heap100MB, 2)} MB | ${fmt(npm?.heap100MB, 2)} MB | ${fmt(local?.perInstanceKB, 1)} KB | ${fmt(npm?.perInstanceKB, 1)} KB | ${delta(local?.perInstanceKB, npm?.perInstanceKB)} |`,
      );
    }
    md.push("");
    md.push("## 启动对比", "");
    md.push("| 变体 | 本地挂载 50 | npm 挂载 50 | 本地到画完 | npm 到画完 |");
    md.push("| --- | ---: | ---: | ---: | ---: |");
    for (const variant of variants) {
      const local = bootOf(runs.local, variant.id);
      const npm = bootOf(runs.npm, variant.id);
      md.push(
        `| ${variant.label} | ${fmt(local?.mountMs, 1)} ms | ${fmt(npm?.mountMs, 1)} ms | ${fmt(local?.paintMs, 1)} ms | ${fmt(npm?.paintMs, 1)} ms |`,
      );
    }
    md.push("");
  }

  md.push("## 方法", "");
  md.push(
    "- 每个场景独立加载页面；每次采样前销毁实例、清空容器并等待渲染完成；2 次预热。",
    "- JS 为 performance.now() 包住操作本身；样式 / 布局来自 CDP Performance.getMetrics；到帧为操作开始到浏览器画完这一帧。",
    "- 空操作（帧基线）在同一页面下测得，约 14–16 ms（60 Hz 的 rAF 节奏）；比较交互增量看「到帧 − 基线」。",
    "- 内存为强制 GC 后的 JSHeapUsedSize，不含 C++ DOM 对象本身；DOM 节点数为实时节点数。",
    "- local 使用 workspace 构建后的 dist；npm 使用 package.json 中的 calendar-ui-npm 别名（npm:@sanguo-dev/calendar-ui@latest），两个 target 各自独立页面。",
    "- 推送新版本后，先运行 vp run -F @sanguo-dev/bench refresh:npm 更新 latest 别名，再跑 bench:npm。",
    "- headless Chromium 的帧调度与真实显示器不同，绝对值随机器和浏览器版本变化；相对倍数与趋势更可靠。",
    "",
  );

  await writeFile(mdFile, md.join("\n"), "utf8");
  return [htmlFile, mdFile];
}
