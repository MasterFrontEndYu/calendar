import type { CalendarLocale, CalendarLocaleName } from "./locale";

/** 一周从哪天开始：0 为周日，1 为周一 */
export type WeekStartsOn = 0 | 1;

/** 主题：light / dark 显式指定，auto 跟随最近的 data-theme 或系统偏好 */
export type CalendarTheme = "light" | "dark" | "auto";

/**
 * 尺寸模板
 *
 * - `min`：最小。纯数字为 24px 方格；出现副标题（农历、节气）时整块放大到 40px 方格
 * - `normal`：正常大小，固定 46px 方格，纯数字和带副标题一样大
 * - `fill`：宽度铺满容器，日期格为 16:10 长方形；最小 48px 宽、44px 高
 */
export type CalendarSize = "min" | "normal" | "fill";

/**
 * 外部传入的日期
 *
 * 支持 Date，或本地日期字符串：
 * `2026-10-01`、`2026-10-1`、`2026/10/01`、`2026/10/1`。
 */
export type CalendarDateInput = Date | string;

/** 选择模式：单选 / 范围 */
export type CalendarMode = "single" | "range";

/** 范围选择结果，start/end 为 null 表示还没选完 */
export interface CalendarRange {
  start: Date | null;
  end: Date | null;
}

/** 自定义副标题：返回 null/undefined 时回退到 adapter 的 subtitle */
export type SubtitleRenderer = (day: CalendarDate) => string | null | undefined;

/** 翻月滑动动画；传了 slide 就开启，不传就是直接切换 */
export interface SlideAnimationOptions {
  /** 动画时长，单位 ms，默认 220 */
  duration?: number;
  /** 缓动函数，默认 "ease" */
  easing?: string;
}

/** 折叠配置；传了 collapse 就显示底部折叠箭头并开启过渡 */
export interface CollapseAnimationOptions {
  /** 折叠时长，单位 ms，默认 200 */
  duration?: number;
  /** 缓动函数，默认 "ease" */
  easing?: string;
  /** 初始是否折叠，默认 false（展开） */
  defaultCollapsed?: boolean;
}

/** 动画配置；整块不传时不做任何动画，也不显示折叠箭头 */
export interface CalendarAnimationOptions {
  /** 翻月滑动；`{}` 表示用默认时长和缓动 */
  slide?: SlideAnimationOptions;
  /** 折叠；`{}` 表示启用折叠并默认展开 */
  collapse?: CollapseAnimationOptions;
}

/** 规范后的年月 */
export interface YearMonth {
  year: number;
  /** 1-12 */
  month: number;
}

/** 日历格的公历日期部分 */
export interface CalendarDate {
  /** 公历年 */
  year: number;
  /** 公历月，1-12 */
  month: number;
  /** 公历日 */
  day: number;
  /** 该格对应的日期对象（本地时区） */
  date: Date;
  /** 是否属于当前展示的月份（false 表示上一月/下一月的补位格） */
  inCurrentMonth: boolean;
}

/** 格子左上角的小标记，例如「休」「班」 */
export interface CalendarBadge {
  /** 显示文字 */
  text: string;
  /** 传给样式的 data-tone，核心不解释具体含义 */
  tone?: string;
}

/** 适配器对单个格子的装饰 */
export interface DayDecoration<TData = unknown> {
  /** 格子副标题，例如节气、节日、农历日 */
  subtitle?: string;
  /** 左上角小标记；不传则不显示 */
  badge?: CalendarBadge;
  /** 透传给 onSelect 的数据，核心不解释 */
  data?: TData;
  /** 覆盖默认 aria-label；不传时由日期、标记、副标题拼接 */
  ariaLabel?: string;
}

/** 每次渲染月视图时传给适配器的上下文 */
export interface MonthInput {
  /** 公历年 */
  year: number;
  /** 公历月，1-12 */
  month: number;
  /** 一周从哪天开始 */
  weekStartsOn: WeekStartsOn;
  /** 今天 */
  today: Date;
  /** 当前界面语言 */
  locale: CalendarLocale;
  /** 固定 42 个日期，包含上下月补位格 */
  days: readonly CalendarDate[];
}

/**
 * 日历适配器
 *
 * 核心只认识这个接口，不依赖任何具体的农历/节假日实现。
 * 第三方可以实现它接入自己的日历数据。
 */
export interface CalendarAdapter<TData = unknown> {
  /** 适配器标识，用于调试和排查 */
  readonly id: string;

  /**
   * 生成当前月的 42 个格子的装饰
   *
   * 返回数组按索引和 input.days 对齐；没有装饰的位置返回 null。
   * 每次换月、选中、重新渲染都会调用，适配器应自行缓存重计算。
   */
  decorateMonth(input: MonthInput): ReadonlyArray<DayDecoration<TData> | null>;
}

/** 日历中的一格 */
export interface CalendarDay<TData = null> extends CalendarDate {
  /** 是否今天 */
  isToday: boolean;
  /** 是否当前选中 */
  isSelected: boolean;
  /** 是否被 minDate / maxDate / disabledDates 禁止 */
  isDisabled: boolean;
  /** 是否范围起点 */
  isRangeStart: boolean;
  /** 是否范围终点 */
  isRangeEnd: boolean;
  /** 是否在已选范围内（含起终点） */
  isInRange: boolean;
  /** 格子副标题，例如节气、节日、农历日 */
  subtitle: string;
  /** 左上角小标记 */
  badge: CalendarBadge | null;
  /** 适配器透传的数据 */
  data: TData | null;
  /** 无障碍名称 */
  ariaLabel: string;
}

/** popup 的默认项：[time, title, detail]，字段可以省略，省略就不渲染对应 UI */
export type DayPopupStringItem = readonly [time?: string, title?: string, detail?: string];

/** popup 里的单项内容：默认字符串项或自定义 Node */
export type DayPopupItem = DayPopupStringItem | Node;

/** popup 的触发方式 */
export type DayPopupTrigger = "click" | "hover" | "focus" | "auto";

/** popup 的定位方式 */
export type DayPopupPlacement = "auto" | "top" | "bottom" | "center";

/** 日期格 popup 配置 */
export interface CalendarPopupOptions {
  /**
   * 触发方式，默认 "click"
   *
   * - `click`：桌面和移动端都可用；
   * - `hover`：仅适合只读内容，移动端没有 hover；
   * - `focus`：键盘聚焦时打开；
   * - `auto`：支持 hover 的设备用 hover，否则用 click。
   */
  trigger?: DayPopupTrigger;
  /**
   * 返回这一天的 popup 内容；空数组表示这一天没有 popup，也不显示绿点
   *
   * 数组里每一项是：
   * - `[time, title, detail]`：用库的默认 title / detail 结构，字段可省略；
   * - `Node`：完全由使用方决定结构。
   *
   * 库在创建 / 重绘时调用 `render(day)` 计算绿点，并把结果缓存到打开时使用；
   * 所以数据要在创建日历前准备好，`render` 必须是同步纯函数。
   */
  render(day: CalendarDate): readonly DayPopupItem[];
  /** 定位方式，默认 "auto" */
  placement?: DayPopupPlacement;
  /** 语义，默认 click 为 dialog，其余为 tooltip */
  role?: "dialog" | "tooltip";
  /** popup 根节点的 aria-label */
  ariaLabel?: string;
}

/** 自定义头部能拿到的上下文 */
export interface HeaderRenderContext {
  /** 当前展示的年 */
  year: number;
  /** 当前展示的月，1-12 */
  month: number;
  /** 当前语言包 */
  locale: CalendarLocale;
  /** 切到上个月；年份层打开时翻上一页 */
  prevMonth(): void;
  /** 切到下个月；年份层打开时翻下一页 */
  nextMonth(): void;
  /** 上个月按钮是否已到可选范围起点 */
  prevDisabled: boolean;
  /** 下个月按钮是否已到可选范围终点 */
  nextDisabled: boolean;
  /** 当前打开的选择层，关闭时为 null */
  pickerMode: "month" | "year" | null;
  /** 打开或关闭年份选择层 */
  toggleYearPicker(): void;
  /** 打开或关闭月份选择层 */
  toggleMonthPicker(): void;
}

/** 自定义头部渲染函数：返回要放进头部的元素，每次换月都会重新调用 */
export type HeaderRenderer = (context: HeaderRenderContext) => HTMLElement;

/** 创建日历时的配置 */
export interface CalendarOptions<TData = null> {
  /** 初始日期，默认今天；超出约束时夹到最近的可选日期 */
  initialDate?: CalendarDateInput;
  /** 最小可选日期（包含） */
  minDate?: CalendarDateInput;
  /** 最大可选日期（包含） */
  maxDate?: CalendarDateInput;
  /** 禁止选中的日期，按本地年月日比较 */
  disabledDates?: readonly CalendarDateInput[];
  /** 选择模式，默认 "single" */
  mode?: CalendarMode;
  /** 范围模式下显示的月数，默认 1；设为 2 时显示相邻两个月 */
  months?: 1 | 2;
  /** 范围变化时触发 */
  onRangeChange?: (range: CalendarRange) => void;
  /** 一周从哪天开始，默认 1（周一） */
  weekStartsOn?: WeekStartsOn;
  /** 界面语言：内置 "zh-CN"（默认）/ "en-US"，也可直接传自定义语言包 */
  locale?: CalendarLocale | CalendarLocaleName;
  /** 主题，默认 "auto"：跟随最近的 data-theme，没有则跟随系统 */
  theme?: CalendarTheme;
  /** 尺寸模板，默认 "normal"：min 最小 / normal 正常 / fill 跟随容器 */
  size?: CalendarSize;
  /**
   * 动画配置
   *
   * 不传时翻月直接切换、不显示折叠箭头。传了 `slide` 才开启滑动，
   * 传了 `collapse` 才显示折叠箭头。
   */
  animation?: CalendarAnimationOptions;
  /** 自定义副标题；优先于 adapter.subtitle，返回 null/undefined 时回退 */
  subtitle?: SubtitleRenderer;
  /** 是否渲染头部，默认 true；为 false 时不创建头部和月份选择层 */
  header?: boolean;
  /** 自定义头部，替换默认的 ‹ 标题 › */
  renderHeader?: HeaderRenderer;
  /** 日期格 popup；不传则不启用 */
  popup?: CalendarPopupOptions;
  /** 选中某一天时触发 */
  onSelect?: (day: CalendarDay<TData>) => void;
  /** 切换月份时触发 */
  onMonthChange?: (year: number, month: number) => void;
  /** 日历适配器；不传时就是纯公历 */
  adapter?: CalendarAdapter<TData>;
}

/** 返回的实例 */
export interface CalendarInstance {
  /** 日历根元素，方便外部定位或再挂样式 */
  readonly el: HTMLElement;
  /** 跳到某年某月 */
  setMonth(year: number, month: number): void;
  /** 当前展示的年月 */
  getMonth(): YearMonth;
  /** 切到上个月 */
  prevMonth(): void;
  /** 切到下个月 */
  nextMonth(): void;
  /** 选中某个日期 */
  select(date: CalendarDateInput): void;
  /** 当前已选范围；单选模式返回 { start: null, end: null } */
  getRange(): CalendarRange;
  /** 设置范围；start 为空时清空，end 省略表示只选了起点 */
  setRange(start: CalendarDateInput | null, end?: CalendarDateInput | null): void;
  /** 清空范围 */
  clearRange(): void;
  /** 当前选中的日期 */
  getSelected(): Date | null;
  /** 显示整个日历 */
  show(): void;
  /** 隐藏整个日历 */
  hide(): void;
  /** 切换整个日历的显示状态 */
  toggle(): void;
  /** 整个日历当前是否可见 */
  isVisible(): boolean;
  /** 当前最小可选日期，未设置时为 null */
  getMinDate(): Date | null;
  /** 设置最小可选日期，传 null 取消 */
  setMinDate(date: CalendarDateInput | null): void;
  /** 当前最大可选日期，未设置时为 null */
  getMaxDate(): Date | null;
  /** 设置最大可选日期，传 null 取消 */
  setMaxDate(date: CalendarDateInput | null): void;
  /** 当前主题 */
  getTheme(): CalendarTheme;
  /** 切换主题，只改 data-theme，不重建 DOM */
  setTheme(theme: CalendarTheme): void;
  /** 移除 DOM 与事件监听 */
  destroy(): void;
}
