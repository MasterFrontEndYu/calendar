# calendar-ui 功能备忘录

> 状态：日期约束、范围选择、折叠、动画、subtitle 均已完成。
>
> 范围：`@sanguogege/calendar-ui` 核心；`calendar-ui-lunar` 只做适配，不重复实现。
>
> 原则：保持零运行时依赖、纯 DOM、公开 API 可组合；不破坏现有 `CalendarAdapter` 约定。

## 现有基础

- `createCalendarUI(container, options)` 创建单月日历；
- 42 格固定网格，`CalendarDay` 已包含 `subtitle` / `badge` / `data` / `ariaLabel` / `isDisabled`；
- 默认选中 `initialDate`（今天或传入日期）；
- 入口日期统一接受 `Date` 或 `YYYY-MM-DD` / `YYYY/MM/DD` 字符串；
- 已有 `light` / `dark` / `auto` 主题；
- 已实现 `minDate` / `maxDate` / `disabledDates` 日期约束；
- 已完成日期约束和范围选择；暂无动画、折叠。

---

## 一、动画

### 1.1 上 / 下月横移动画

**状态：已完成。**

**目标**：切换月份时，旧月份滑出、新月份从另一侧滑入，两页连续移动。

行为：

- 下一月：新月份从右侧进入，旧月份向左退出；
- 上一月：新月份从左侧进入，旧月份向右退出；
- 只移动网格区域，头部、星期表头保持不动；
- 连续快速翻月会重新触发动画，不会叠加多个旧网格；
- 支持 `prefers-reduced-motion: reduce`，此时直接切换、无动画；
- 旧月份使用克隆层离场，新月份在同一裁剪区内进入。

API：

```ts
interface CalendarOptions {
  monthTransition?: "none" | "slide"; // 默认 slide
  monthTransitionDuration?: number; // 默认 220ms
  monthTransitionEasing?: string; // 默认 ease
}
```

验收：

- 前后翻月方向正确；
- 快速连续点击不闪烁、不叠加；
- reduced motion 下无位移动画；
- 动画不影响选中、`onMonthChange` 的调用次数。

### 1.2 折叠：只显示当前选中行

**状态：已完成（高度过渡）。**

**目标**：日历可以折叠成一行，只显示当前选中日期所在的那一周；展开后恢复完整 42 格。

行为：

- 默认选中日期（`initialDate`，不传就是今天）所在行作为折叠行；
- 折叠时隐藏其他行，保留星期表头和当前行；
- 选中日期变化后，折叠行跟随移动到新选中日期所在周；
- 展开 / 折叠通过 `max-height`、`opacity`、`margin` 过渡；
- 折叠状态下仍可左右翻月、选中日期；
- 范围模式显示起点行和终点行；
- 双视图每个月份只显示属于该月的端点行；
- 与 1.1 的横移动画组合时，先完成翻月，再更新折叠行；
- reduced motion 下直接显示/隐藏。

API：

```ts
interface CalendarOptions {
  collapsible?: boolean; // 是否允许折叠，默认 false
  defaultCollapsed?: boolean; // 初始是否折叠，默认 false
  collapseTransitionDuration?: number; // 默认 200ms
  collapseTransitionEasing?: string; // 默认 ease
}

interface CalendarInstance {
  collapse(): void;
  expand(): void;
  toggleCollapsed(): void;
  isCollapsed(): boolean;
}
```

验收：

- 默认选中行正确；
- 选中变化后行跟随；
- 折叠/展开不改变选中值；
- 折叠时键盘仍可操作当前行；
- 与翻月动画组合不抖动。

---

## 二、日历功能

### 2.1 多选模式：范围选择（两个日历界面）

**状态：已完成。**

**目标**：一个组件内显示两个日历界面，点击第一次选起点，点击第二次选终点。

行为：

- `mode: "range"` 时进入范围模式；
- 第一次点击设置 `start`，第二次点击设置 `end`；
- 第二次点击早于起点时**自动交换**；
- 起点和终点同一天是合法范围；
- 第三次点击重新开始一个新范围；
- `months: 1`（默认）单视图；`months: 2` 双视图，默认相邻两个月；
- 两个视图共享选中状态、min/max、disabled 和主题；
- 移动端两个视图上下排列，不横向挤压；
- `CalendarDay` 暴露 `isRangeStart` / `isRangeEnd` / `isInRange`；
- `onSelect` 仍可触发，另外提供 `onRangeChange`；
- 禁用日期不能作为起点或终点。

候选 API：

```ts
type CalendarMode = "single" | "range";

interface CalendarRange {
  start: Date | null;
  end: Date | null;
}

interface CalendarOptions {
  mode?: CalendarMode;
  months?: 1 | 2; // range 默认 1，设为 2 显示相邻两月
  onRangeChange?: (range: CalendarRange) => void;
}

interface CalendarInstance {
  getRange(): CalendarRange;
  setRange(start: CalendarDateInput | null, end?: CalendarDateInput | null): void;
  clearRange(): void;
}
```

验收：

- 两次点击完成范围；
- 反向选择自动交换；
- 两个视图选中状态同步；
- 范围跨月可见；
- 起点/终点/区间有可访问描述；
- 不与单选的 `onSelect` 语义冲突。

### 2.2 显示当前行（配合折叠）

**状态：已完成（高度过渡动画仍属于 1.2）。**

**目标**：折叠后展示“当前行”，而不是只显示选中格。

行为：

- 默认展开，只有 `collapsible: true` 才显示底部单状态上下箭头；
- `defaultCollapsed` 默认 `false`；
- 单选：折叠后显示选中日期所在周；默认选中日期决定初始行；
- 范围：折叠后同时显示起点行和终点行；两个端点同一周时只显示一行；
- 双视图：每个月份只显示属于该月的端点行；没有端点时显示该月第一行；
- 当前行包含完整 7 天，包括上下月补位格；
- 折叠状态下仍可点击其他日期，选中变化后行跟随；
- `collapse()` / `expand()` / `toggleCollapsed()` / `isCollapsed()` 已提供。

验收：

- 周起始为周一/周日时行边界正确；
- 跨月周补位格显示正确；
- 选中日期在补位格时，当前行与展示月份关系明确；
- 范围折叠显示两行（同一周时一行）。

### 2.3 最大日期 / 最小日期

**状态：已完成。**

**目标**：限制可选日期范围，可单独设置或同时设置。

行为：

- `minDate` / `maxDate` 均为包含边界；
- 只设一个时，另一个方向不限制；
- 两者都设时，`minDate <= maxDate`，否则创建或 setter 报 `RangeError`；
- 初始日期超出范围时，夹到边界；若边界日期被禁用，向最近的可选日期查找；
- 超出范围的日期显示为 disabled，不可点击、不可键盘选中；
- 翻月按钮在到达边界月份时禁用，`setMonth()` 越界会夹到边界月份；
- `select()` 传入越界或禁用日期时忽略，不触发 `onSelect`；
- 时区按本地日期比较，不按 UTC 字符串；
- `setMinDate()` / `setMaxDate()` 会重新校验并调整当前选中日期；失败时不改状态。

候选 API：

```ts
interface CalendarOptions {
  minDate?: Date;
  maxDate?: Date;
}

interface CalendarInstance {
  setMinDate(date: Date | null): void;
  setMaxDate(date: Date | null): void;
  getMinDate(): Date | null;
  getMaxDate(): Date | null;
}
```

验收：

- 边界日期可选；
- 边界外不可选；
- 只设 min 或只设 max 都正确；
- 翻月到边界时状态正确；
- 与 disabled、range 组合时优先级明确（disabled 优先）。

### 2.4 禁止选中日期

**状态：已完成。**

**目标**：通过数组指定不可选日期。

行为：

- `disabledDates` 接收日期数组，按本地年月日归一化比较；
- 支持跨月、跨年；
- 被禁日期不可点击、不可键盘选中；
- 视觉上有 `is-disabled` / `:disabled` 样式，并设置 `aria-disabled="true"`；
- 与 `minDate` / `maxDate` 同时存在时，任一条件不满足即不可选；
- 数组会内部去重，查询使用 `Set<number>`；
- `CalendarDay.isDisabled` 暴露给 `onSelect`；
- range 模式不能把禁用日作为起点/终点；
- 已决定保持数组形式，不引入 `(date) => boolean` predicate：数组已经能表达“禁止点击”，也更容易序列化和调试。

候选 API：

```ts
interface CalendarOptions {
  disabledDates?: readonly Date[];
}
```

验收：

- 单日禁用生效；
- 跨月/跨年禁用生效；
- 键盘无法选中；
- 范围模式不会把禁用日设为端点；
- 与 min/max 组合正确。

### 2.5 自定义 subtitle，并在点击时返回

**状态：已完成。**

**目标**：除了 adapter 提供的 subtitle，允许直接自定义 subtitle，并在 `onSelect` 的 `day.subtitle` 中拿到。

行为：

- `options.subtitle` 接收 `CalendarDate`，每个展示日期调用一次；
- 优先级：`options.subtitle` 字符串 > `adapter.subtitle` > 空字符串；
- 返回 `null` / `undefined` 时回退到 adapter；
- 返回 `""` 时明确不显示，不回退；
- `onSelect` 的 `day.subtitle` 是最终结果；
- adapter 属于插件级数据源，用户 subtitle 优先。

API：

```ts
interface CalendarOptions {
  subtitle?: (day: CalendarDate) => string | null | undefined;
}
```

验收：

- 自定义 subtitle 渲染在日期下方；
- 点击返回的 `day.subtitle` 与渲染一致；
- 与 adapter 同时存在时用户优先；
- 空字符串表示隐藏，null/undefined 表示回退。

---

## 候选 API 汇总

> 以下只是草案，最终命名以实现时为准。

```ts
type CalendarMode = "single" | "range";
type MonthTransition = "none" | "slide";

interface CalendarOptions<TData = null> {
  mode?: CalendarMode;
  months?: 1 | 2;
  minDate?: CalendarDateInput;
  maxDate?: CalendarDateInput;
  disabledDates?: readonly CalendarDateInput[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  monthTransition?: MonthTransition;
  monthTransitionDuration?: number;
  monthTransitionEasing?: string;
  collapseTransitionDuration?: number;
  collapseTransitionEasing?: string;
  subtitle?: (day: CalendarDate) => string | null | undefined;
  onRangeChange?: (range: CalendarRange) => void;
}

interface CalendarInstance {
  collapse(): void;
  expand(): void;
  toggleCollapsed(): void;
  isCollapsed(): boolean;

  getRange(): CalendarRange;
  setRange(start: CalendarDateInput | null, end?: CalendarDateInput | null): void;
  clearRange(): void;

  setMinDate(date: Date | null): void;
  setMaxDate(date: Date | null): void;
  getMinDate(): Date | null;
  getMaxDate(): Date | null;
}
```

## 建议实现顺序

1. ✅ **日期约束**：`minDate` / `maxDate` / `disabledDates`，已完成；
2. ✅ **范围选择**：单视图 range + 双视图，已完成；
3. ✅ **折叠 + 当前行**：已完成（折叠高度动画仍待做）；
4. ✅ **翻月 / 折叠动画**：已完成，支持时长和缓动配置；
5. ✅ **subtitle 选项**：已完成，用户 subtitle 优先于 adapter。

## 待确认问题

- 暂无。

## 测试清单

- [x] 翻月方向、连续快速翻月、reduced motion；
- [x] 折叠默认行、选中换行、展开/折叠状态；
- [x] range 两次点击、反向选择、同一天、跨月；
- [x] 双视图月份同步、选中同步、移动端布局（基础）；
- [x] min/max 单独、组合、边界、翻月禁用；
- [x] disabledDates 单日、跨月、键盘；
- [x] disabledDates 作为 range 端点；
- [x] subtitle 自定义、点击返回、与 adapter 组合；
- [x] 主题 light/dark/auto 下新增状态的对比度（基础样式）；
- [x] 键盘与屏幕阅读器描述（禁用状态）。
