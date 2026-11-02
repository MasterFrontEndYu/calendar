import type { LunarResult } from "@sanguogege/calendar";

/** 一周从哪天开始：0 为周日，1 为周一 */
export type WeekStartsOn = 0 | 1;

/** 规范后的年月 */
export interface YearMonth {
  year: number;
  month: number;
}

/**
 * 一组固定节假日配置对应的农历计算源
 *
 * id 用来隔离模块级月份缓存：配置不同的实例不能命中彼此的缓存。
 */
export interface DaySource {
  readonly id: number;
  solarToLunar(year?: number, month?: number, day?: number): LunarResult;
}

/** buildDays 的入参 */
export interface BuildDaysOptions {
  /** 公历年 */
  year: number;
  /** 公历月，1-12 */
  month: number;
  /** 一周从哪天开始 */
  weekStartsOn: WeekStartsOn;
  /** 今天 */
  today: Date;
  /** 当前选中的日期，未选中传 null */
  selected: Date | null;
  /** 本次计算使用的节假日配置源 */
  source: DaySource;
}
