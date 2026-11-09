import type {
  CalendarAdapter,
  CalendarDate,
  CalendarDay,
  CalendarMode,
  CalendarRange,
  CalendarSize,
  CalendarTheme,
  DayPopupItem,
  DayPopupPlacement,
  DayPopupTrigger,
  HeaderRenderer,
  SubtitleRenderer,
  WeekStartsOn,
  YearMonth,
} from "./calendar";
import type { GridHandle, HeaderHandle, PickerHandle } from "./components";
import type { CalendarLocale } from "./locale";

/** 规范化后的动画配置：默认全关 */
export interface ResolvedAnimation {
  /** 翻月方式，没传 slide 时是 none */
  monthTransition: "none" | "slide";
  monthDuration: number;
  monthEasing: string;
  /** 是否显示底部折叠箭头 */
  collapsible: boolean;
  collapseDuration: number;
  collapseEasing: string;
  /** 初始是否折叠 */
  defaultCollapsed: boolean;
}

/** 校验并补全默认值之后的 popup 配置 */
export interface ResolvedCalendarPopupOptions {
  trigger: DayPopupTrigger;
  render: (day: CalendarDate) => readonly DayPopupItem[];
  placement: DayPopupPlacement;
  role: "dialog" | "tooltip";
  ariaLabel?: string;
}

/** popup 控制器的句柄 */
export interface DayPopupHandle {
  /** 关闭当前 popup；restoreFocus 为 false 时不动焦点 */
  close(restoreFocus?: boolean): void;
  destroy(): void;
  /** 每次重绘后调用：关闭失效的 popup、刷新绿点 */
  sync(): void;
  isOpen(): boolean;
  /** 主题变化后同步 popup 上复制的 CSS 变量 */
  refreshTheme(): void;
}

/** 校验并补全默认值之后的创建配置 */
export interface CalendarConfig<TData = null> {
  weekStartsOn: WeekStartsOn;
  locale: CalendarLocale;
  adapter?: CalendarAdapter<TData>;
  /** 初始主题；运行时切换只改字段和 dataset */
  theme: CalendarTheme;
  size: CalendarSize;
  /** 创建时的「今天」，同一次会话内固定 */
  today: Date;
  mode: CalendarMode;
  requestedMonths: 1 | 2;
  subtitle?: SubtitleRenderer;
  /** 是否显示头部 */
  showHeader: boolean;
  renderHeader?: HeaderRenderer;
  /** 日期格 popup */
  popup?: ResolvedCalendarPopupOptions;
  onSelect?: (day: CalendarDay<TData>) => void;
  onMonthChange?: (year: number, month: number) => void;
  onRangeChange?: (range: CalendarRange) => void;
  animation: ResolvedAnimation;
}

/** resolveOptions 的完整结果：配置 + 创建时的一次性数据 */
export interface ResolvedCalendarOptions<TData = null> {
  config: CalendarConfig<TData>;
  minDate: Date | null;
  maxDate: Date | null;
  disabledDates: ReadonlySet<number>;
  /** 已经夹到可选范围内的初始日期 */
  initial: Date;
}

/** 日历运行时的可变状态 */
export interface CalendarState {
  /** 当前展示的年 */
  year: number;
  /** 当前展示的月，1-12 */
  month: number;
  /** 单选模式下的选中日期；范围模式不使用 */
  selected: Date;
  rangeStart: Date | null;
  rangeEnd: Date | null;
}

/**
 * 日期约束
 *
 * 创建时把 min/max 换成数字 key 和月序号缓存下来，
 * 渲染 42 个格子时不必反复调用 Date 的 getter。
 */
export interface CalendarBounds {
  minDate: Date | null;
  maxDate: Date | null;
  /** minDate 的 YYYYMMDD；未设置时是 -Infinity */
  minKey: number;
  /** maxDate 的 YYYYMMDD；未设置时是 +Infinity */
  maxKey: number;
  /** minDate 的连续月序号；未设置时是 -Infinity */
  minMonth: number;
  /** maxDate 的连续月序号；未设置时是 +Infinity */
  maxMonth: number;
  disabled: ReadonlySet<number>;
  /** 实际展示的月数 */
  monthCount: 1 | 2;
}

/** 一列月份需要的 DOM 句柄 */
export interface CalendarPanel<TData = null> {
  weekdays: { el: HTMLElement };
  viewport: HTMLElement;
  grid: GridHandle<TData>;
}

/** 翻月动画只关心 viewport 和网格根节点 */
export interface MonthSlidePanel {
  viewport: HTMLElement;
  grid: { el: HTMLElement };
}

export interface MonthSlideHandle {
  /** 结束翻月动画：各层留在终点，并移除旧月份的克隆层 */
  stop(): void;
  /** 克隆旧月份作为离场层 */
  capture(): HTMLElement[];
  /** 让离场层和当前月份保持相同的折叠行 */
  sync(layers: readonly HTMLElement[]): void;
  start(direction: 1 | -1, layers: readonly HTMLElement[], duration: number, easing: string): void;
}

/** 折叠控制器的创建参数 */
export interface CollapseOptions<TData = null> {
  config: CalendarConfig<TData>;
  state: CalendarState;
  panels: readonly CalendarPanel<TData>[];
  monthCount: 1 | 2;
  /** 折叠状态变化后触发整棵日历重绘 */
  onApply(): void;
}

export interface CollapseHandle<TData = null> {
  /** 没有配置 collapse 时为 null */
  readonly button: HTMLButtonElement | null;
  isCollapsed(): boolean;
  toggle(): void;
  updateButton(): void;
  updateRows(dayLists: readonly CalendarDay<TData>[][], animate: boolean): void;
  destroy(): void;
}

/** 年月选择层控制器的创建参数 */
export interface PickerLayerOptions {
  root: HTMLElement;
  header: HeaderHandle;
  picker: PickerHandle;
  getMonth(): YearMonth;
  /** 回到月份层时恢复头部的翻月按钮状态 */
  updateNav(): void;
  /** 选择层关闭后跳到某年某月 */
  onGoTo(year: number, month: number): void;
}

export interface PickerLayerHandle {
  /** 点同一个标题按钮再点一次会关闭 */
  toggle(mode: "month" | "year"): void;
  close(): void;
  /** 头部左右箭头在年份层翻 12 年，其余情况翻月 */
  step(direction: -1 | 1): void;
  isOpen(): boolean;
  destroy(): void;
}

export interface RendererDeps<TData = null> {
  root: HTMLElement;
  config: CalendarConfig<TData>;
  state: CalendarState;
  bounds: CalendarBounds;
  header: HeaderHandle;
  panels: readonly CalendarPanel<TData>[];
  /** 双视图时是每个月份外层的 group 元素，用于写 aria-label */
  panelEls: readonly HTMLElement[];
  collapse: CollapseHandle<TData>;
  /** 日期格 popup；未启用时为 null */
  popup: DayPopupHandle | null;
  currentDays(offset?: number): CalendarDay<TData>[];
}

/** 动作函数需要的最小上下文 */
export interface ActionContext<TData = null> {
  config: CalendarConfig<TData>;
  state: CalendarState;
  bounds: CalendarBounds;
  monthCount: 1 | 2;
  root: HTMLElement;
  panels: readonly CalendarPanel<TData>[];
  collapse: CollapseHandle<TData>;
  slide: MonthSlideHandle;
  render(animateRows?: boolean): CalendarDay<TData>[][];
  currentDays(offset?: number): CalendarDay<TData>[];
}

/** 构建公开实例需要的完整上下文 */
export interface CalendarRuntime<TData = null> extends ActionContext<TData> {
  header: HeaderHandle;
  picker: PickerHandle;
  pickerLayer: PickerLayerHandle;
  popup: DayPopupHandle | null;
  goTo(year: number, month: number): void;
}
