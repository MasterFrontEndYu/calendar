# calendar-ui 性能基准

类似 js-framework-benchmark 的操作型 UI 基准：用真实 Chromium（Playwright）测 `@sanguo-dev/calendar-ui` 的创建、翻月、点选、主题切换、批量挂载、销毁、内存和启动。

支持两套被测对象：

| target  | 被测对象                                               | 用途                       |
| ------- | ------------------------------------------------------ | -------------------------- |
| `local` | workspace 当前代码构建出的 `packages/calendar-ui/dist` | 开发阶段、发布前的性能验证 |
| `npm`   | npm 上的 `@sanguo-dev/calendar-ui@latest`              | 发布后回归线上产物         |

两个 target 使用两个独立页面（`local.html` / `npm.html`），CSS 和全局状态不会互相污染；可以先后跑，最后生成对比报告。

## 前置

- Node >= 22.18（仓库 `engines`）
- 首次准备：

```bash
vp install
vp run -F @sanguo-dev/bench install:browser
```

`install:browser` 下载 Playwright 自带的 Chromium。想用本机 Chrome / Edge 可以加 `--channel chrome`（或 `msedge`），不必下载浏览器。

## 命令

在仓库根目录：

```bash
vp run bench:local     # 构建 calendar-ui + 基准页，跑本地构建
vp run bench:npm       # 构建基准页，跑 npm latest
vp run bench:report    # 用已有 results 重新生成报告
```

在 `tools/bench` 目录内等价于：

```bash
vp run bench:local
vp run bench:npm
vp run bench:report
```

### 发布后的流程

1. 本地测：`vp run bench:local`
2. 发版到 npm
3. 更新 latest 别名：`vp run -F @sanguo-dev/bench refresh:npm`
4. 线上测：`vp run bench:npm`
5. 生成对比：`vp run bench:report`

报告会直接对比 `local` 与 `npm latest` 的 JS、样式、布局、到帧时间、内存和启动。

> `refresh:npm` 会执行 `bun update calendar-ui-npm`，把 `npm:@sanguo-dev/calendar-ui@latest` 解析到当前最新版本。如果 registry 不可达，先检查网络。

## 场景

| id            | 含义                       | 次数 | 采样 |
| ------------- | -------------------------- | ---- | ---- |
| `create`      | 创建 1 个日历              | 1    | 20   |
| `create100`   | 创建 100 个日历            | 100  | 10   |
| `nextMonth`   | 翻到下一月                 | 1    | 20   |
| `nextMonth60` | 连续翻 60 个月（吞吐）     | 60   | 10   |
| `select`      | 点选 1 天                  | 1    | 20   |
| `select42`    | 连续点选 42 个格子（吞吐） | 42   | 10   |
| `theme`       | light → dark 切换一次      | 1    | 20   |
| `idle`        | 空操作，测帧基线           | 1    | 20   |
| `destroy100`  | 销毁 100 个日历            | 100  | 10   |

## 变体

| id          | 含义                                                       |
| ----------- | ---------------------------------------------------------- |
| `vanilla`   | 相同 DOM 结构的手写实现，作为“没有库”的基线                |
| `single`    | 默认配置（单月、header、light 主题）                       |
| `no-header` | `header: false`                                            |
| `adapter`   | 模拟农历适配器（每天副标题 + 每 6 格角标 + 每 3 天 popup） |
| `range-2`   | `mode: "range"` + `months: 2`                              |

## 指标口径

- **JS**：`performance.now()` 包住操作本身的同步执行时间，不含等待渲染。
- **样式 / 布局**：CDP `Performance.getMetrics` 的 `RecalcStyleDuration` / `LayoutDuration` 增量。
- **到帧**：操作开始 → `requestAnimationFrame` → 宏任务（浏览器完成这一帧）。
- **帧基线**：同一页面不执行任何操作时的到帧时间，约 14–16 ms（Playwright Chromium 的 60 Hz rAF 节奏），来自帧调度与合成。比较交互增量应看「到帧 − 基线」。
- **内存**：`HeapProfiler.collectGarbage` 后的 `JSHeapUsedSize`，不含 C++ DOM 对象本身；100 个实例相对空页面的增量 / 100 得到每实例 JS 内存。
- **启动**：页面加载后同步挂载 50 个实例的耗时，以及从 `timeOrigin` 到画完这一帧的时间。

## 参数

直接调用 runner（在 `tools/bench` 下）：

```bash
vpx ./runner/main.ts --target local --quick
vpx ./runner/main.ts --target npm --iterations 30 --cpu 4
vpx ./runner/main.ts --target local --variant single,adapter --scenario create,nextMonth
vpx ./runner/main.ts --target npm --channel chrome --headed
```

| 参数                            | 说明                                        |
| ------------------------------- | ------------------------------------------- |
| `--target local\|npm`           | 被测对象，默认 `local`                      |
| `--report`                      | 只根据已有 JSON 重新生成报告                |
| `--quick`                       | 5 次采样，跳过内存与启动                    |
| `--iterations <n>`              | 覆盖每个场景的采样次数                      |
| `--cpu <n>`                     | CPU 降速倍数，默认 1（4 约等于中端手机）    |
| `--channel chrome\|msedge`      | 用本机浏览器，不用 Playwright 自带 Chromium |
| `--headed`                      | 显示浏览器窗口，便于排查                    |
| `--variant` / `--scenario`      | 逗号分隔，只跑子集                          |
| `--skip-boot` / `--skip-memory` | 跳过对应阶段                                |

## 结果

```
tools/bench/results/
├─ local.json     # 本地构建的原始结果
├─ npm.json       # npm latest 的原始结果
├─ *-partial.json # 过滤 / quick 模式的局部结果（不参与对比报告）
├─ report.html    # 自包含的可视化对比报告
└─ REPORT.md      # Markdown 版
```

`results/` 已加入 `.gitignore`，不提交机器相关的数据；报告和 JSON 都是本地生成物。

## 怎么判读

- **先看帧预算**：单次交互的「到帧 − 基线」远低于 16.7 ms（60 Hz）或 8.3 ms（120 Hz）就没有可感知卡顿。
- **再看相对基线**：`vanilla` 是手写 DOM 的下限；`calendar-ui / vanilla` 的倍数比绝对值更能说明库本身的开销。
- **内存看每实例增量**：单实例 16 KB 量级、100 实例 1.6 MB 量级是正常的；DOM 节点本身的 C++ 内存不在这项里。
- **注意噪声**：亚毫秒操作的跨运行波动可达几十个百分点，单次运行只差 0.01 ms 不要下结论；报告用的是多次采样中位数。
- **local vs npm**：应当是同一份代码，差异主要来自构建产物和页面加载状态；如果 npm 版本明显更慢，先确认版本号是否一致。

## 局限

- 未覆盖滚动性能、slide / collapse 动画帧率、移动端触控延迟、真实鼠标命中测试。
- headless Chromium 的合成与真实显示器不同，绝对值会随机型和浏览器版本变化；跨机器比较优先看相对倍数。
- `adapter` 变体是模拟数据，不是真实的 `@sanguo-dev/calendar-ui-lunar`。
- 原生基线用相同 DOM 结构实现，但不完全等价于一个真实的业务页面。
