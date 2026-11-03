import calendar from "@sanguogege/calendar";
import type { HolidayConfig, LunarResult } from "@sanguogege/calendar";
import { createCalendar as createBaseCalendar } from "@sanguogege/calendar-ui";
import type {
  CalendarAdapter,
  CalendarDate,
  CalendarDay,
  CalendarInstance,
  CalendarOptions,
  DayDecoration,
  MonthInput,
} from "@sanguogege/calendar-ui";

export interface LunarAdapterOptions {
  /** 本适配器使用的节假日 / 调休配置；不传时跟随全局 setHolidays() */
  holidays?: HolidayConfig;
  /** 为 true 时忽略内置节日 / 调休数据，只使用 holidays */
  replaceHolidays?: boolean;
}

export interface LunarCalendarOptions extends CalendarOptions<LunarResult> {
  /** 本实例使用的节假日 / 调休配置，配置在创建时固定 */
  holidays?: HolidayConfig;
  /** 为 true 时忽略内置节日 / 调休数据，只使用 holidays */
  replaceHolidays?: boolean;
}

/** 带农历数据的日历格 */
export type LunarCalendarDay = CalendarDay<LunarResult>;

/** 不含选中/今天的那部分缓存，可以跨实例复用 */
type MonthDecorations = ReadonlyArray<DayDecoration<LunarResult> | null>;

const CACHE_LIMIT = 24;
const monthCache = new Map<string, MonthDecorations>();

interface Source {
  id: number;
  solarToLunar(year: number, month: number, day: number): LunarResult;
}

const GLOBAL_SOURCE: Source = {
  id: 0,
  solarToLunar: (year, month, day) => calendar.solarToLunar(year, month, day),
};

interface SourceEntry {
  merge?: Source;
  replace?: Source;
}

let nextSourceId = 1;
const sourceCache = new WeakMap<object, SourceEntry>();

/** 同一份配置对象 + 同样的 replace 语义只创建一个 converter */
const resolveSource = function (holidays?: HolidayConfig, replace = false): Source {
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
  const source: Source = {
    id: nextSourceId++,
    solarToLunar: (year, month, day) => converter.solarToLunar(year, month, day),
  };
  entry[mode] = source;
  return source;
};

/** 格子副标题的取值顺序：节气 > 农历节日 > 公历节日 > 农历日 */
const subtitleOf = function (lunar: LunarResult): string {
  if (lunar.term) return lunar.term;
  if (lunar.nljr.length > 0) return lunar.nljr[0] as string;
  if (lunar.gljr.length > 0) return lunar.gljr[0] as string;
  if (lunar.lDay === 1) return lunar.lMonthCn;
  return lunar.lDayCn;
};

const decorateDate = function (
  source: Source,
  date: CalendarDate,
): DayDecoration<LunarResult> | null {
  let lunar: LunarResult;
  try {
    lunar = source.solarToLunar(date.year, date.month, date.day);
  } catch {
    return null;
  }

  return {
    subtitle: subtitleOf(lunar),
    badge: lunar.ban
      ? { text: "班", tone: "work" }
      : lunar.xiu
        ? { text: "休", tone: "rest" }
        : undefined,
    data: lunar,
  };
};

/** 创建使用 @sanguogege/calendar 的农历适配器 */
export const createLunarAdapter = function (
  options: LunarAdapterOptions = {},
): CalendarAdapter<LunarResult> {
  const source = resolveSource(options.holidays, options.replaceHolidays === true);

  return {
    id: `lunar-${source.id}`,
    decorateMonth(input: MonthInput): MonthDecorations {
      const key = `${source.id}-${input.year}-${input.month}-${input.weekStartsOn}`;
      const cached = monthCache.get(key);
      if (cached) {
        monthCache.delete(key);
        monthCache.set(key, cached);
        return cached;
      }

      const decorations = input.days.map((date) => decorateDate(source, date));
      if (monthCache.size >= CACHE_LIMIT) {
        const oldest = monthCache.keys().next();
        if (!oldest.done) monthCache.delete(oldest.value);
      }
      monthCache.set(key, decorations);
      return decorations;
    },
  };
};

/**
 * 创建带农历 / 节气 / 节日 / 调休的日历
 *
 * 接口与纯公历版本一致，只是换成这个入口，并且多收 holidays / replaceHolidays。
 */
export const createCalendar = function (
  container: HTMLElement,
  options: LunarCalendarOptions = {},
): CalendarInstance {
  const { holidays, replaceHolidays, adapter, ...rest } = options;

  return createBaseCalendar<LunarResult>(container, {
    ...rest,
    adapter: adapter ?? createLunarAdapter({ holidays, replaceHolidays }),
  });
};

export type {
  CalendarAdapter,
  CalendarBadge,
  CalendarDate,
  CalendarDay,
  CalendarInstance,
  CalendarOptions,
  DayDecoration,
  MonthInput,
  WeekStartsOn,
  YearMonth,
} from "@sanguogege/calendar-ui";
export type { HolidayConfig, LunarResult } from "@sanguogege/calendar";
