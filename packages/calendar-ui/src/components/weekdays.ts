import type { CalendarLocale, WeekStartsOn } from "../types";
import { node } from "../utils/dom";

/** 创建星期表头。 */
export const createWeekdays = function (
  weekStartsOn: WeekStartsOn,
  locale: CalendarLocale,
): { el: HTMLElement } {
  const el = node("div", "cui__weekdays");

  for (let i = 0; i < 7; i++) {
    const weekday = (weekStartsOn + i) % 7;
    const cell = node("div", "cui__weekday", locale.weekdays[weekday]);
    cell.title = locale.weekdaysLong[weekday] as string;
    el.appendChild(cell);
  }

  return { el };
};
