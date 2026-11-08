/**
 * 语言包
 *
 * 只负责日历自身的界面文字；农历、节气、节日等业务文案由适配器提供。
 */
export interface CalendarLocale {
  /** 语言标签，例如 "zh-CN"，仅用于调试与覆盖 */
  name: string;
  /** 一周七天的短名，下标 0 为周日 */
  weekdays: readonly string[];
  /** 一周七天的全名，下标 0 为周日，用于 title 提示 */
  weekdaysLong: readonly string[];
  /** 头部年月标题 */
  monthTitle(year: number, month: number): string;
  /** 头部标题里年份、月份按钮的排列顺序，默认 "year-first" */
  titleOrder?: "year-first" | "month-first";
  /** 选择层里的月份名，例如 "10 月" / "Oct"；不传时用 `${month}` */
  monthName?(month: number): string;
  /** 选择层里的年份名，例如 "2026 年" / "2026"；不传时用 `${year}` */
  yearLabel?(year: number): string;
  /** 上个月按钮的无障碍名称 */
  prevMonth: string;
  /** 下个月按钮的无障碍名称 */
  nextMonth: string;
  /** 年份选择层的上一组按钮名称 */
  prevYearPage?: string;
  /** 年份选择层的下一组按钮名称 */
  nextYearPage?: string;
  /** 选择层的无障碍名称：选月份 */
  pickMonth?: string;
  /** 选择层的无障碍名称：选年份 */
  pickYear?: string;
  /** 折叠按钮的无障碍名称；不传时使用内置文案 */
  collapse?: string;
  /** 展开按钮的无障碍名称；不传时使用内置文案 */
  expand?: string;
}

/** 内置语言包的名称，可直接传给 CalendarOptions.locale */
export type CalendarLocaleName = "zh-CN" | "en-US";
