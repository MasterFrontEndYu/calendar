import type { CalendarDate, CalendarDay, DayDecoration, WeekStartsOn } from "../types";
import type { BuildDaysOptions } from "../types";
import { sameDay } from "./date";

/** 某个年月 1 号是星期几（0 为周日） */
export const firstWeekdayOf = function (year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
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
    const date = new Date(year, month - 1, i - offset + 1);
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

  return dates.map((date, index) => {
    const decoration = decorations[index] ?? null;
    const badge = decoration?.badge ?? null;
    const subtitle = decoration?.subtitle ?? "";
    const key = `${date.year}-${date.month}-${date.day}`;
    const isDisabled = options.isDisabled?.(date.date) ?? false;

    return {
      ...date,
      isToday: sameDay(date.date, options.today),
      isSelected: options.selected !== null && sameDay(date.date, options.selected),
      isDisabled,
      subtitle,
      badge,
      data: decoration?.data ?? null,
      ariaLabel:
        decoration?.ariaLabel ??
        [key, badge?.text ?? "", subtitle, isDisabled ? "不可选" : ""]
          .filter((part) => part !== "")
          .join(" "),
    };
  });
};
