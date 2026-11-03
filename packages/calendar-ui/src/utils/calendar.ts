import calendar from "@sanguogege/calendar";
import type { HolidayConfig, LunarResult } from "@sanguogege/calendar";
import type { BuildDaysOptions, CalendarDay, DaySource, WeekStartsOn } from "../types";
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

/** 没传 holidays 时跟随全局 setHolidays()，每次计算都读当前配置 */
const GLOBAL_SOURCE: DaySource = {
  id: 0,
  solarToLunar: (year, month, day) => calendar.solarToLunar(year, month, day),
};

interface SourceEntry {
  merge?: DaySource;
  replace?: DaySource;
}

let nextSourceId = 1;
const sourceCache = new WeakMap<object, SourceEntry>();

/**
 * 把节假日配置解析成可复用的计算源
 *
 * 同一个配置对象 + 同样的 replace 语义只会创建一个转换器，多个实例传同一个
 * 配置对象时可以共享月份缓存。配置在创建时固定，之后再改对象内容不会生效。
 */
export const resolveDaySource = function (holidays?: HolidayConfig, replace = false): DaySource {
  if (!holidays) return GLOBAL_SOURCE;

  let entry = sourceCache.get(holidays);
  if (!entry) {
    entry = {};
    sourceCache.set(holidays, entry);
  }

  const mode = replace ? "replace" : "merge";
  const cached = entry[mode];
  if (cached) return cached;

  const converter = calendar.createConverter(holidays, replace ? { replace: true } : {});
  const source: DaySource = {
    id: nextSourceId++,
    solarToLunar: (year, month, day) => converter.solarToLunar(year, month, day),
  };
  entry[mode] = source;
  return source;
};

/** 取某一天的农历信息；超出 @sanguogege/calendar 支持范围（1900-01-31 ~ 2100-12-31）时返回 null */
export const lunarOf = function (
  date: Date,
  source: DaySource = GLOBAL_SOURCE,
): LunarResult | null {
  try {
    return source.solarToLunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
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
  if (lunar.term) return lunar.term;
  if (lunar.nljr.length > 0) return lunar.nljr[0] as string;
  if (lunar.gljr.length > 0) return lunar.gljr[0] as string;
  if (lunar.lDay === 1) return lunar.lMonthCn;
  return lunar.lDayCn;
};

/** 生成 42 格的基础数据（含农历），这一步最贵，所以缓存 */
const buildBaseDays = function (
  year: number,
  month: number,
  weekStartsOn: WeekStartsOn,
  source: DaySource,
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
      lunar: lunarOf(date, source),
    });
  }
  return days;
};

/** 按 key 取缓存，命中后重新插入以维持 LRU 顺序 */
const getBaseDays = function (
  year: number,
  month: number,
  weekStartsOn: WeekStartsOn,
  source: DaySource,
): BaseDay[] {
  const key = `${source.id}-${year}-${month}-${weekStartsOn}`;
  const cached = baseCache.get(key);

  if (cached) {
    baseCache.delete(key);
    baseCache.set(key, cached);
    return cached;
  }

  const days = buildBaseDays(year, month, weekStartsOn, source);
  if (baseCache.size >= CACHE_LIMIT) {
    const oldest = baseCache.keys().next();
    if (!oldest.done) baseCache.delete(oldest.value);
  }
  baseCache.set(key, days);
  return days;
};

/** 生成 6 行 × 7 列共 42 个格子的数据；今天/选中是每次现算的，不进缓存 */
export const buildDays = function (options: BuildDaysOptions): CalendarDay[] {
  const base = getBaseDays(options.year, options.month, options.weekStartsOn, options.source);

  return base.map((day) => ({
    ...day,
    isToday: sameDay(day.date, options.today),
    isSelected: options.selected !== null && sameDay(day.date, options.selected),
  }));
};
