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
  /** 上个月按钮的无障碍名称 */
  prevMonth: string;
  /** 下个月按钮的无障碍名称 */
  nextMonth: string;
}

/** 内置语言包的名称，可直接传给 CalendarOptions.locale */
export type CalendarLocaleName = "zh-CN" | "en-US";
