import type { CalendarLocale, HeaderOptions } from "../types";
import { normalizeMonth } from "../utils/date";

/** 创建双视图头部标题。 */
export const createHeaderLabel = function (
  locale: CalendarLocale,
  monthCount: 1 | 2,
): HeaderOptions["label"] {
  if (monthCount !== 2) return undefined;

  const monthName = (month: number): string => locale.monthName?.(month) ?? String(month);

  return (year, month) => {
    const next = normalizeMonth(year, month + 1);
    return {
      year: locale.yearLabel?.(year) ?? String(year),
      month: `${monthName(month)} – ${monthName(next.month)}`,
    };
  };
};
