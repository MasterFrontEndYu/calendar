import type { CalendarLocale, HeaderOptions } from "../types";
import { normalizeMonth } from "../utils/date";

/** 双视图头部把「年」「月」两段拼成跨月标题，单视图沿用默认标题 */
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
