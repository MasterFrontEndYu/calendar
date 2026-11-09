import type { CalendarDate, CalendarDay, DayDecoration, WeekStartsOn } from "../types";
import type { BuildDaysOptions } from "../types";
import { createDate, dateStringKey, sameDay, weekdayOf } from "./date";
import type { RangeFields } from "./range";
import { rangeFields } from "./range";

/** 某个年月 1 号是星期几（0 为周日） */
export const firstWeekdayOf = function (year: number, month: number): number {
  return weekdayOf(year, month, 1);
};

/** 生成 6 行 × 7 列共 42 个公历日期，包含上下月补位格 */
const buildMonthDates = function (
  year: number,
  month: number,
  weekStartsOn: WeekStartsOn,
): CalendarDate[] {
  const offset = (firstWeekdayOf(year, month) - weekStartsOn + 7) % 7;
  const days: CalendarDate[] = [];

  for (let i = 0; i < 42; i++) {
    const date = createDate(year, month, i - offset + 1);
    days.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      date,
      inCurrentMonth: date.getMonth() + 1 === month && date.getFullYear() === year,
    });
  }
  return days;
};

/** 生成 42 个格子的数据；今天/选中每次现算，适配器只负责装饰 */
export const buildDays = function <TData = null>(
  options: BuildDaysOptions<TData>,
): CalendarDay<TData>[] {
  const dates = buildMonthDates(options.year, options.month, options.weekStartsOn);
  const decorations: ReadonlyArray<DayDecoration<TData> | null> = options.adapter
    ? options.adapter.decorateMonth({
        year: options.year,
        month: options.month,
        weekStartsOn: options.weekStartsOn,
        today: options.today,
        locale: options.locale,
        days: dates,
      })
    : [];
  const disabledLabel = options.locale.disabledLabel ?? "不可选";
  const rangeStart = options.rangeStart ?? null;
  const rangeEnd = options.rangeEnd ?? null;
  // 42 个格子复用同一个范围状态对象，只把最终布尔值拷进 CalendarDay
  const range: RangeFields = {
    isRangeStart: false,
    isRangeEnd: false,
    isInRange: false,
    isSelected: false,
  };

  return dates.map((date, index) => {
    const decoration = decorations[index] ?? null;
    const badge = decoration?.badge ?? null;
    const adapterSubtitle = decoration?.subtitle ?? "";
    const customSubtitle = options.subtitle?.(date);
    const subtitle =
      customSubtitle === null || customSubtitle === undefined ? adapterSubtitle : customSubtitle;
    const key = dateStringKey(date.year, date.month, date.day);
    const isDisabled = options.isDisabled?.(date.date) ?? false;
    rangeFields(date.date, rangeStart, rangeEnd, range);

    return {
      ...date,
      isToday: sameDay(date.date, options.today),
      isSelected:
        (options.selected !== null && sameDay(date.date, options.selected)) || range.isSelected,
      isDisabled,
      isRangeStart: range.isRangeStart,
      isRangeEnd: range.isRangeEnd,
      isInRange: range.isInRange,
      subtitle,
      badge,
      data: decoration?.data ?? null,
      ariaLabel:
        decoration?.ariaLabel ??
        [key, badge?.text ?? "", subtitle, isDisabled ? disabledLabel : ""]
          .filter((part) => part !== "")
          .join(" "),
    };
  });
};
