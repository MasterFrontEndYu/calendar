import type { HolidayConfig, LunarResult } from "@sanguogege/calendar";
import type { CalendarLocale, CalendarLocaleName } from "./locale";
import type { WeekStartsOn, YearMonth } from "./utils";

/** 日历中的一格 */
export interface CalendarDay {
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
  /** 是否今天 */
  isToday: boolean;
  /** 是否当前选中 */
  isSelected: boolean;
  /** @sanguogege/calendar 的换算结果；超出 1900-2100 支持范围时为 null */
  lunar: LunarResult | null;
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
export interface CalendarOptions {
  /** 初始日期，默认今天 */
  initialDate?: Date;
  /** 一周从哪天开始，默认 1（周一） */
  weekStartsOn?: WeekStartsOn;
  /** 界面语言：内置 "zh-CN"（默认）/ "en-US"，也可直接传自定义语言包 */
  locale?: CalendarLocale | CalendarLocaleName;
  /** 本实例使用的节假日 / 调休配置；不传则跟随全局 setHolidays()。配置在创建时固定 */
  holidays?: HolidayConfig;
  /** 为 true 时忽略内置节日 / 调休数据，只使用 holidays */
  replaceHolidays?: boolean;
  /** 是否显示头部，默认 true */
  header?: boolean;
  /** 自定义头部，替换默认的 ‹ 标题 › */
  renderHeader?: HeaderRenderer;
  /** 选中某一天时触发 */
  onSelect?: (day: CalendarDay) => void;
  /** 切换月份时触发 */
  onMonthChange?: (year: number, month: number) => void;
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
