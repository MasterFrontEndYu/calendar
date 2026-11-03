import type { CalendarLocale, CalendarLocaleName } from "./locale";

/** 一周从哪天开始：0 为周日，1 为周一 */
export type WeekStartsOn = 0 | 1;

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
  /** 格子副标题，例如节气、节日、农历日 */
  subtitle: string;
  /** 左上角小标记 */
  badge: CalendarBadge | null;
  /** 适配器透传的数据 */
  data: TData | null;
  /** 无障碍名称 */
  ariaLabel: string;
}

/** 自定义头部能拿到的上下文 */
export interface HeaderRenderContext {
  /** 当前展示的年 */
  year: number;
  /** 当前展示的月，1-12 */
  month: number;
  /** 当前语言包 */
  locale: CalendarLocale;
  /** 切到上个月 */
  prevMonth(): void;
  /** 切到下个月 */
  nextMonth(): void;
}

/** 自定义头部渲染函数：返回要放进头部的元素，每次换月都会重新调用 */
export type HeaderRenderer = (context: HeaderRenderContext) => HTMLElement;

/** 创建日历时的配置 */
export interface CalendarOptions<TData = null> {
  /** 初始日期，默认今天 */
  initialDate?: Date;
  /** 一周从哪天开始，默认 1（周一） */
  weekStartsOn?: WeekStartsOn;
  /** 界面语言：内置 "zh-CN"（默认）/ "en-US"，也可直接传自定义语言包 */
  locale?: CalendarLocale | CalendarLocaleName;
  /** 是否显示头部，默认 true */
  header?: boolean;
  /** 自定义头部，替换默认的 ‹ 标题 › */
  renderHeader?: HeaderRenderer;
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
  select(date: Date): void;
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
  /** 显示头部 */
  showHeader(): void;
  /** 隐藏头部 */
  hideHeader(): void;
  /** 切换头部的显示状态 */
  toggleHeader(): void;
  /** 头部当前是否可见 */
  isHeaderVisible(): boolean;
  /** 移除 DOM 与事件监听 */
  destroy(): void;
}
