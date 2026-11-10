import type { CalendarDate, CalendarDay, DayDecoration, WeekStartsOn } from "../types";
import type { BuildDaysOptions } from "../types";
import { createDate, dateKey, dateStringKey, weekdayOf } from "./date";

/** 某个年月 1 号是星期几（0 为周日） */
export const firstWeekdayOf = function (year: number, month: number): number {
  return weekdayOf(year, month, 1);
};

/** 生成 42 个公历日期。 */
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

/** 生成 42 个格子的数据。 */
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

  // 把「今天 / 选中 / 范围」都换成一串数字 key，42 个格子只做整数比较，
  // 不再每格调用十几次 Date 的 getter
  const todayKey = dateKey(options.today);
  const selectedKey = options.selected === null ? 0 : dateKey(options.selected);
  const startKey = options.rangeStart == null ? 0 : dateKey(options.rangeStart);
  const endKey = options.rangeEnd == null ? 0 : dateKey(options.rangeEnd);
  const hasRange = startKey !== 0 && endKey !== 0;

  return dates.map((date, index) => {
    const decoration = decorations[index] ?? null;
    const badge = decoration?.badge ?? null;
    const adapterSubtitle = decoration?.subtitle ?? "";
    const customSubtitle = options.subtitle?.(date);
    const subtitle =
      customSubtitle === null || customSubtitle === undefined ? adapterSubtitle : customSubtitle;

    const key = date.year * 10000 + date.month * 100 + date.day;
    const isDisabled = options.isDisabled?.(date.date) ?? false;
    const isRangeStart = key === startKey;
    const isRangeEnd = key === endKey;
    const isInRange = hasRange && key >= startKey && key <= endKey;

    let ariaLabel = decoration?.ariaLabel;
    if (ariaLabel === undefined) {
      // 拼三段文案；不给默认的「无标记无副标题」路径分配数组
      let text = dateStringKey(date.year, date.month, date.day);
      const badgeText = badge?.text ?? "";
      if (badgeText !== "") text += " " + badgeText;
      if (subtitle !== "") text += " " + subtitle;
      if (isDisabled) text += " " + disabledLabel;
      ariaLabel = text;
    }

    return {
      year: date.year,
      month: date.month,
      day: date.day,
      date: date.date,
      inCurrentMonth: date.inCurrentMonth,
      isToday: key === todayKey,
      isSelected: (selectedKey !== 0 && key === selectedKey) || isRangeStart || isRangeEnd,
      isDisabled,
      isRangeStart,
      isRangeEnd,
      isInRange,
      subtitle,
      badge,
      data: decoration?.data ?? null,
      ariaLabel,
    };
  });
};
