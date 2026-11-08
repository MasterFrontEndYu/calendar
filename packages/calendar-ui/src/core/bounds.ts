import type { CalendarBounds, CalendarMode, YearMonth } from "../types";
import { compareDay, dateKey, monthFromIndex, monthIndexOf } from "../utils/date";

/** 整体替换边界；把 Date key 和月序号一次算好，避免渲染时反复读 Date */
export const setBounds = function (
  bounds: CalendarBounds,
  minDate: Date | null,
  maxDate: Date | null,
): void {
  bounds.minDate = minDate;
  bounds.maxDate = maxDate;
  bounds.minKey = minDate === null ? Number.NEGATIVE_INFINITY : dateKey(minDate);
  bounds.maxKey = maxDate === null ? Number.POSITIVE_INFINITY : dateKey(maxDate);
  bounds.minMonth =
    minDate === null
      ? Number.NEGATIVE_INFINITY
      : monthIndexOf(minDate.getFullYear(), minDate.getMonth() + 1);
  bounds.maxMonth =
    maxDate === null
      ? Number.POSITIVE_INFINITY
      : monthIndexOf(maxDate.getFullYear(), maxDate.getMonth() + 1);
};

export const createBounds = function (
  minDate: Date | null,
  maxDate: Date | null,
  disabled: ReadonlySet<number>,
  monthCount: 1 | 2,
): CalendarBounds {
  const bounds: CalendarBounds = {
    minDate,
    maxDate,
    minKey: Number.NEGATIVE_INFINITY,
    maxKey: Number.POSITIVE_INFINITY,
    minMonth: Number.NEGATIVE_INFINITY,
    maxMonth: Number.POSITIVE_INFINITY,
    disabled,
    monthCount,
  };
  setBounds(bounds, minDate, maxDate);
  return bounds;
};

/** 边界顺序校验；创建和 setMinDate / setMaxDate 共用同一句文案 */
export const assertBounds = function (minDate: Date | null, maxDate: Date | null): void {
  if (minDate !== null && maxDate !== null && compareDay(minDate, maxDate) > 0) {
    throw new RangeError("[calendar-ui] minDate 不能晚于 maxDate");
  }
};

/** 一次 dateKey + 三次数字比较；渲染 42 个格子时走这里 */
export const isDisabled = function (bounds: CalendarBounds, date: Date): boolean {
  const key = dateKey(date);
  return key < bounds.minKey || key > bounds.maxKey || bounds.disabled.has(key);
};

/** 双视图在边界不足两个月时退化成单视图 */
export const resolveMonthCount = function (
  mode: CalendarMode,
  requested: 1 | 2,
  minDate: Date | null,
  maxDate: Date | null,
): 1 | 2 {
  if (mode !== "range" || requested !== 2) return 1;
  if (minDate === null || maxDate === null) return 2;

  const min = monthIndexOf(minDate.getFullYear(), minDate.getMonth() + 1);
  const max = monthIndexOf(maxDate.getFullYear(), maxDate.getMonth() + 1);
  return max - min < 1 ? 1 : 2;
};

/**
 * 把「双视图的起始月」夹到可选范围内
 *
 * 单视图时 monthCount 为 1，只做 min/max 兜底；
 * 双视图时右边界要留出后一个月的位置。
 */
export const clampStartMonth = function (
  bounds: CalendarBounds,
  year: number,
  month: number,
): YearMonth {
  const index = monthIndexOf(year, month);
  const maxFirst = bounds.maxMonth - (bounds.monthCount - 1);
  const next = Math.min(Math.max(index, bounds.minMonth), maxFirst);
  if (next === index) return { year, month };
  return monthFromIndex(next);
};

/** 头部左右箭头的禁用状态：起点和终点都按整块展示范围判断 */
export const navDisabled = function (
  bounds: CalendarBounds,
  year: number,
  month: number,
): { prev: boolean; next: boolean } {
  const first = monthIndexOf(year, month);
  return {
    prev: first <= bounds.minMonth,
    next: first + bounds.monthCount - 1 >= bounds.maxMonth,
  };
};

/** 选择层：某年某月是否整体越界 */
export const isMonthOutOfRange = function (
  bounds: CalendarBounds,
  year: number,
  month: number,
): boolean {
  const index = monthIndexOf(year, month);
  return index < bounds.minMonth || index > bounds.maxMonth;
};

/** 选择层：某年是否整体越界 */
export const isYearOutOfRange = function (bounds: CalendarBounds, year: number): boolean {
  return (
    (bounds.minDate !== null && year < bounds.minDate.getFullYear()) ||
    (bounds.maxDate !== null && year > bounds.maxDate.getFullYear())
  );
};
