# calendar-ui

纯 DOM、零依赖的公历日历核心，不依赖任何农历 / 节假日库。副标题、左上角标记和透传数据通过 `CalendarAdapter` 注入，第三方可以接自己的日历实现。

## 用法

```ts
import { createCalendarUI } from "@sanguo-dev/calendar-ui";
import "@sanguo-dev/calendar-ui/style.css";

const instance = createCalendarUI(container, {
  weekStartsOn: 1, // 0 周日 / 1 周一（默认）
  locale: "zh-CN", // 或 "en-US" / 自定义语言包
  onSelect: (day) => console.log(day.year, day.month, day.day, day.data),
});

instance.nextMonth();
instance.select("2026-12-01");
instance.destroy();
```

## 选项

| 选项            | 类型                                    | 说明                                  |
| --------------- | --------------------------------------- | ------------------------------------- |
| `initialDate`   | `CalendarDateInput`                     | 初始日期，默认今天                    |
| `minDate`       | `CalendarDateInput`                     | 最小可选日期（包含）                  |
| `maxDate`       | `CalendarDateInput`                     | 最大可选日期（包含）                  |
| `disabledDates` | `readonly CalendarDateInput[]`          | 禁止选中的日期                        |
| `mode`          | `"single" \| "range"`                   | 选择模式，默认 `"single"`             |
| `months`        | `1 \| 2`                                | 范围模式月数，`2` 为相邻两月          |
| `animation`     | `CalendarAnimationOptions`              | 动画与折叠配置，默认全关              |
| `subtitle`      | `SubtitleRenderer`                      | 自定义副标题，优先于 adapter          |
| `weekStartsOn`  | `0 \| 1`                                | 一周从哪天开始，默认 1                |
| `locale`        | `CalendarLocale \| CalendarLocaleName`  | 界面语言，默认 `"zh-CN"`              |
| `theme`         | `"light" \| "dark" \| "auto"`           | 主题，默认 `"auto"`                   |
| `size`          | `"min" \| "normal" \| "fill"`           | 尺寸模板，默认 `"normal"`             |
| `header`        | `boolean`                               | 是否渲染头部与月份选择层，默认 `true` |
| `renderHeader`  | `HeaderRenderer`                        | 自定义头部，替换默认的 `‹ 标题 ›`     |
| `popup`         | `CalendarPopupOptions`                  | 日期格 popup；不传则不启用            |
| `adapter`       | `CalendarAdapter<TData>`                | 日历适配器；不传就是纯公历            |
| `onSelect`      | `(day: CalendarDay<TData>) => void`     | 选中某一天时触发                      |
| `onRangeChange` | `(range: CalendarRange) => void`        | 范围变化时触发                        |
| `onMonthChange` | `(year: number, month: number) => void` | 切换月份时触发                        |

## 范围选择

```ts
const instance = createCalendarUI(container, {
  mode: "range",
  months: 2, // 相邻两个月；默认 1
  initialDate: "2026-10-15",
  onRangeChange: (range) => console.log(range),
});

instance.getRange();
instance.setRange("2026-10-20", "2026-10-05"); // 自动交换
instance.setRange("2026-10-05"); // 只设起点
instance.clearRange();
```

- 第一次点击设起点，第二次设终点；
- 反向选择自动交换；
- 第三次点击重新开始；
- `months: 2` 显示相邻两月，容器宽度不足时自动上下排列；
- `day.isRangeStart` / `isRangeEnd` / `isInRange` 可用于自定义样式；
- `setRange` 触发 `onRangeChange`，不触发 `onSelect`。

## 折叠

```ts
const instance = createCalendarUI(container, {
  animation: {
    collapse: {},
  },
});
```

- 不配置 `animation.collapse` 就没有底部箭头；
- 配置后默认展开，`collapse.defaultCollapsed: true` 可默认折叠；
- 折叠后显示当前选中行；
- 范围模式折叠时显示起点行和终点行（同一周只显示一行）；
- 双视图下每个月份只显示属于该月的端点行；
- 折叠/展开只通过底部箭头操作，没有额外的实例方法。

## 动画

```ts
const instance = createCalendarUI(container, {
  animation: {
    slide: { duration: 220, easing: "ease" }, // 传 {} 即开启
    collapse: { duration: 200, easing: "ease", defaultCollapsed: false }, // 传 {} 即开启
  },
});
```

- 动画默认关闭：不配置 `animation.slide` 时翻月直接切换；
- 翻月：旧月份向左/右滑出，新月份从另一侧滑入，两页首尾相接；
- 折叠：行高、透明度和间距一起过渡；
- 首次渲染不播放折叠动画；
- `prefers-reduced-motion: reduce` 下关闭过渡；
- 也可以通过 `.cui` 的 `--cui-month-duration`、`--cui-collapse-duration` 等 CSS 变量覆盖。

## 自定义 subtitle

```ts
const instance = createCalendarUI(container, {
  subtitle: (day) => (day.month === 10 && day.day === 1 ? "国庆" : null),
});
```

- 用户 `subtitle` 优先于 `adapter.subtitle`；
- 返回 `null` / `undefined` 时回退 adapter；
- 返回 `""` 时明确隐藏；
- `onSelect` 的 `day.subtitle` 是最终值。

## 日期格 popup

```ts
const POPUPS: Record<string, readonly PopupEntry[]> = {
  "2026-10-1": [{ title: "国庆节", detail: "10 月 1 日 - 7 日放假", time: "全天" }],
};

const instance = createCalendarUI(container, {
  popup: {
    trigger: "click",
    render: (day) => {
      const entries = POPUPS[`${day.year}-${day.month}-${day.day}`] ?? [];
      return entries.map((entry) => [entry.time, entry.title, entry.detail] as const);
    },
  },
});
```

- 数据在创建前准备好，`render(day)` 返回 `Array<readonly [time?, title?, detail?] | Node>`；空数组表示没有 popup；
- `[time, title, detail]` 会生成 `.cui__popup-title`（含 `.cui__popup-time` / `.cui__popup-name`）和 `.cui__popup-detail`；字段省略或为空就不渲染对应 UI；
- 绿点由库内部按 `render(day).length > 0` 计算；
- 打开时自动显示「日期 · 条数」头部，条数就是数组长度；
- `render` 在创建 / 重绘时调用并缓存，必须是同步纯函数；
- Node 直接 append，内部结构完全由使用方决定；
- 默认皮肤是 `.cui__popup` 卡片 + `.cui__popup-head` 头部 + `.cui__popup-item` 内容层，可以直接用 CSS 覆盖；
- `trigger` 支持 `"click"`（默认）/ `"hover"` / `"focus"` / `"auto"`；移动端没有 hover；
- 默认 click 用 `role="dialog"`，其余用 `role="tooltip"`，可通过 `role` 覆盖；
- 绿点颜色是 `--cui-popup-dot`。

## 日期输入

`CalendarDateInput = Date | string`，字符串支持 `2026-10-01`、`2026-10-1`、`2026/10/01`、`2026/10/1`，按本地年月日解析，不经过 `new Date(string)`。

## 日期约束

```ts
const instance = createCalendarUI(container, {
  minDate: "2026-10-05",
  maxDate: "2026-10-20",
  disabledDates: ["2026-10-12"],
});

instance.setMinDate("2026-10-06");
instance.setMaxDate("2026-10-25");
instance.getMinDate();
instance.getMaxDate();
```

- `minDate` / `maxDate` 包含边界，可单独或同时设置；
- `disabledDates` 按本地年月日比较，内部用 `Set` 查询；
- 边界外和禁用日期渲染为 disabled，点击、键盘、`select()` 都不可选中；
- 初始日期越界/被禁用时，自动寻找最近的可选日期；
- 翻月按钮在边界月份禁用，`setMonth()` 越界会夹到边界；
- `minDate > maxDate`、无效日期、没有任何可选日期都会抛错；
- setter 失败时不会修改现有状态；
- `disabledDates` 保持数组，不提供 predicate 函数。

## 主题

内置 `light` / `dark` / `auto` 主题：

```ts
const instance = createCalendarUI(container, { theme: "dark" });

instance.getTheme(); // "dark"
instance.setTheme("light");
```

- 主题写到 `.cui[data-theme="light|dark|auto"]`；
- `setTheme()` 只改 `data-theme`，不重建 DOM；
- `auto` 跟随最近的祖先 `data-theme`，没有则跟随系统；
- 两套主题共用布局，只改变量；
- 可通过 `--cui-bg`、`--cui-fg`、`--cui-accent`、`--cui-rest` 等变量覆盖；
- 周末的日期数字固定用 `--cui-rest`（和法定节假日同色），由 `.cui__day.is-weekend` 控制，与节假日数据无关。

## 尺寸

三套尺寸模板，通过 `size` 选择，默认 `normal`；`min` / `normal` 用正方形，`fill` 用 16:10 长方形：

```ts
createCalendarUI(container, { size: "min" }); // 最小
createCalendarUI(container, { size: "normal" }); // 正常（默认）
createCalendarUI(container, { size: "fill" }); // 跟随容器宽度
```

| 模板     | 格子                  | 整块宽度      | 说明                                  |
| -------- | --------------------- | ------------- | ------------------------------------- |
| `min`    | 24px（有副标题 40px） | 194px / 306px | 纯数字最小；出现副标题后整块放大一档  |
| `normal` | 46px                  | 372px         | 纯数字和带副标题一样大                |
| `fill`   | 宽随容器，16:10       | 100% 容器     | 高度比正方形矮，副标题 / 角标仍有位置 |

- `min`：一旦出现过副标题就放大到 40px 格，之后不再缩回，避免翻月时整块跳动；
- `normal`：固定 46px 格，副标题多少都不改变尺寸；
- `fill`：宽度铺满容器，格子是 16:10 长方形；最窄 48px 格时整块会横向溢出，高度不会低于 44px，避免双月 / 窄容器压掉副标题；
- 双月（`months: 2`）装不下时自动上下排列，`normal` 会保持 46px 格并居中；
- 尺寸全部走 CSS 变量：`--cui-cell-size`、`--cui-pad`、`--cui-column-gap`、`--cui-num-size`、`--cui-sub-size`、`--cui-tag-size` 等，外部可直接覆盖；`fill` 的长方形由 `--cui-cell-aspect`（默认 `16 / 10`）和 `--cui-cell-min-height`（默认 `44px`）控制；
- 运行时切换直接改属性：`instance.el.dataset.size = "fill"`。

## 年月选择

头部标题拆成年份、月份两个按钮，点哪个出哪个面板，共用同一个下拉（4 列 × 3 行，格子接近正方形）：

- 点月份：当前年的 12 个月，没有翻页按钮，选完只改月份并立即关闭；
- 点年份：12 年一页，头部两侧出现翻页按钮，选完只改年份并立即关闭；
- 同一个按钮再点一次 / 点击外部 / `Esc` 关闭；`minDate` / `maxDate` 之外的月份和年份自动禁用。

## 适配器

```ts
interface CalendarAdapter<TData = unknown> {
  readonly id: string;
  decorateMonth(input: MonthInput): ReadonlyArray<DayDecoration<TData> | null>;
}
```

`decorateMonth` 每次拿到 42 个日期，返回同长度的装饰数组：

```ts
{
  subtitle?: string;                  // 格子副标题
  badge?: { text: string; tone?: string }; // 左上角标记，tone 写到 data-tone
  data?: TData;                       // 透传给 onSelect
  ariaLabel?: string;                 // 覆盖默认 aria-label
}
```

核心不解释 `badge` 和 `data` 的含义；`tone` 对应的颜色由 CSS 决定（内置 `rest` / `work` 两种，可通过 `--cui-rest`、`--cui-accent` 覆盖）。

官方农历适配器见 `@sanguo-dev/calendar-ui-lunar`；第三方也可以按这个接口接入自己的日历。

## 路线图

后续功能（翻月动画、折叠当前行、范围选择、min/max、禁用日期、自定义 subtitle）记录在 [TODO.md](TODO.md)。

## 开发

```bash
vp test          # 单元测试
vp run build     # 构建 dist
vp check         # 格式、lint、类型检查
```
