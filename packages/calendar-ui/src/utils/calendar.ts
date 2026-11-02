import calendar from "@sanguogege/calendar";
import type { LunarResult } from "@sanguogege/calendar";
import type { BuildDaysOptions, CalendarDay, WeekStartsOn } from "../types";
import { sameDay } from "./date";

/** 缓存里放的是“与选中/今天无关”的部分，可以跨实例、跨渲染复用 */
interface BaseDay {
  year: number;
  month: number;
  day: number;
  date: Date;
  inCurrentMonth: boolean;
  lunar: LunarResult | null;
}

/** 保留最近 24 个月（一屏 6 周 + 前后翻几个月够用） */
const CACHE_LIMIT = 24;
const baseCache = new Map<string, BaseDay[]>();

/** 取某一天的农历信息，超出 @sanguogege/calendar 支持范围（1900-01-31 ~ 2100-12-31）时返回 null */
export const lunarOf = function (date: Date): LunarResult | null {
  try {
    return calendar.solarToLunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
  } catch {
    return null;
  }
};

/** 某个年月 1 号是星期几（0 为周日） */
export const firstWeekdayOf = function (year: number, month: number): number {
  return calendar.utils.solarFirstWeek(year, month);
};

/** 格子副标题的取值顺序：节气 > 农历节日 > 公历节日 > 农历日 */
export const subtitleOf = function (day: CalendarDay): string {
  const lunar = day.lunar;
  if (!lunar) return "";
  if (lunar.Term) return lunar.Term;
  if (lunar.Nljr.length > 0) return lunar.Nljr[0] as string;
  if (lunar.Gljr.length > 0) return lunar.Gljr[0] as string;
  if (lunar.lDay === 1) return lunar.LMonthCn;
  return lunar.LDayCn;
};

/** 生成 42 格的基础数据（含农历），这一步最贵，所以缓存 */
const buildBaseDays = function (
  year: number,
  month: number,
  weekStartsOn: WeekStartsOn,
): BaseDay[] {
  const offset = (firstWeekdayOf(year, month) - weekStartsOn + 7) % 7;
  const days: BaseDay[] = [];

  for (let i = 0; i < 42; i++) {
    const date = new Date(year, month - 1, i - offset + 1);
    const inCurrentMonth = date.getMonth() + 1 === month && date.getFullYear() === year;
    days.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      date,
      inCurrentMonth,
      lunar: inCurrentMonth ? lunarOf(date) : null,
    });
  }
  return days;
};

/** 按 key 取缓存，命中后重新插入以维持 LRU 顺序 */
const getBaseDays = function (year: number, month: number, weekStartsOn: WeekStartsOn): BaseDay[] {
  const key = `${year}-${month}-${weekStartsOn}`;
  const cached = baseCache.get(key);

  if (cached) {
    baseCache.delete(key);
    baseCache.set(key, cached);
    return cached;
  }

  const days = buildBaseDays(year, month, weekStartsOn);
  if (baseCache.size >= CACHE_LIMIT) {
    const oldest = baseCache.keys().next();
    if (!oldest.done) baseCache.delete(oldest.value);
  }
  baseCache.set(key, days);
  return days;
};

/** 生成 6 行 × 7 列共 42 个格子的数据；今天/选中是每次现算的，不进缓存 */
export const buildDays = function (options: BuildDaysOptions): CalendarDay[] {
  const base = getBaseDays(options.year, options.month, options.weekStartsOn);

  return base.map((day) => ({
    ...day,
    isToday: sameDay(day.date, options.today),
    isSelected: options.selected !== null && sameDay(day.date, options.selected),
  }));
};
