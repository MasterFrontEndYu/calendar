import type { CalendarBounds, CalendarMode, YearMonth } from "../types";
import { compareDay, dateKey, monthFromIndex, monthIndexOf } from "../utils/date";

/** 设置日期边界。 */
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

/** 创建日期边界。 */
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

/** 校验日期边界的先后顺序。 */
export const assertBounds = function (minDate: Date | null, maxDate: Date | null): void {
  if (minDate !== null && maxDate !== null && compareDay(minDate, maxDate) > 0) {
    throw new RangeError("[calendar-ui] minDate 不能晚于 maxDate");
  }
};

/** 判断日期是否不可选。 */
export const isDisabled = function (bounds: CalendarBounds, date: Date): boolean {
  const key = dateKey(date);
  return key < bounds.minKey || key > bounds.maxKey || bounds.disabled.has(key);
};

/** 计算需要展示的月数。 */
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

/** 把起始月夹到可选范围内。 */
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

/** 计算头部左右箭头的禁用状态。 */
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

/** 判断年月是否超出可选范围。 */
export const isMonthOutOfRange = function (
  bounds: CalendarBounds,
  year: number,
  month: number,
): boolean {
  const index = monthIndexOf(year, month);
  return index < bounds.minMonth || index > bounds.maxMonth;
};

/** 判断年份是否超出可选范围。 */
export const isYearOutOfRange = function (bounds: CalendarBounds, year: number): boolean {
  return (
    (bounds.minDate !== null && year < bounds.minDate.getFullYear()) ||
    (bounds.maxDate !== null && year > bounds.maxDate.getFullYear())
  );
};
