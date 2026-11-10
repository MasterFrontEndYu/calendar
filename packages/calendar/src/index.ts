import {
  lYearDays,
  leapMonth,
  leapDays,
  lMonthDays,
  yearStartOf,
  monthSegmentsOf,
  resolveLunarYear,
  toGanZhiYear,
  toGanZhi,
  toHourGanZhi,
  toChinaMonth,
  toChinaDay,
  getSolarTerm,
} from "./utils/LunarFunction";
import type { LunarMonthSegment } from "./utils/LunarFunction";

import {
  toAstro,
  getTerm,
  termsOf,
  getAnimal,
  solarDays,
  solarFirstWeek,
  weekdayFromDays,
  toChinaNum,
  nthWeekdayOfMonth,
} from "./utils/SolarFunction";

import { assertInteger, assertPlainObject, describe, failRange, failType } from "./utils/Assert";
import { festivalList, NO_FESTIVAL } from "./utils/SetFestival";
import { restOf } from "./utils/SetRest";
import { createCalendarConfig, snapshotOf } from "./config";
import type { ResolvedConfig } from "./config";
import type { Calendar, HolidayConfig, LunarResult, SetHolidayOptions } from "./types";

export type {
  LunarResult,
  Calendar,
  FestivalMap,
  FestivalConfig,
  RestEntry,
  RestConfig,
  HolidayConfig,
  HolidaySnapshot,
  GetHolidaysOptions,
  SetHolidayOptions,
} from "./types";

/** 支持的公历 / 农历年份范围 */
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const DAY_MS = 86400000;
/** 农历数据起点：1900-01-31，即农历 1900 年正月初一 */
const MIN_SOLAR_UTC = Date.UTC(MIN_YEAR, 0, 31);
/** 起点距 1970-01-01 的天数；换算时直接拿天数相减，省掉一次取整 */
const MIN_SOLAR_DAYS = MIN_SOLAR_UTC / DAY_MS;
/** 支持的最后一个公历日 */
const MAX_SOLAR_UTC = Date.UTC(MAX_YEAR, 11, 31);
/** 干支日偏移的基准：1970-01-01 距甲子起点的天数 */
const GANZHI_DAY_BASE = 25577;

/**
 * 「今天」的短时缓存
 *
 * 渲染一屏日历要算 42 天的 isToday，每次 new Date() 是纯浪费；
 * 250ms 内复用同一个日期，跨天最多滞后 250ms，对「今天」这个标记没有影响。
 */
const TODAY_TTL = 250;
let todayAt = 0;
let todayYear = 0;
let todayMonth = 0;
let todayDay = 0;

/** 刷新「今天」缓存；TTL 内直接返回 */
const refreshToday = function (): void {
  const now = Date.now();
  if (now - todayAt <= TODAY_TTL) return;

  const date = new Date(now);
  todayAt = now;
  todayYear = date.getFullYear();
  todayMonth = date.getMonth() + 1;
  todayDay = date.getDate();
};

/** 把公历年月日校验成合法的、在支持范围内的日期 */
const validateSolar = function (
  y: unknown,
  m: unknown,
  d: unknown,
): { year: number; month: number; day: number } {
  const year = assertInteger("solarToLunar(year)", y, MIN_YEAR, MAX_YEAR);
  const month = assertInteger("solarToLunar(month)", m, 1, 12);
  const day = assertInteger("solarToLunar(day)", d, 1, solarDays(year, month));
  const utc = Date.UTC(year, month - 1, day);
  if (utc < MIN_SOLAR_UTC) {
    failRange("solarToLunar", `${year}-${month}-${day} 早于 1900-01-31，超出农历数据范围`);
  }
  if (utc > MAX_SOLAR_UTC) {
    failRange("solarToLunar", `${year}-${month}-${day} 晚于 2100-12-31，超出农历数据范围`);
  }
  return { year, month, day };
};

/** 按年缓存的浮动节日日期：母亲节、父亲节、感恩节 */
interface FloatingDays {
  /** 5 月第二个周日 */
  mother: number;
  /** 6 月第三个周日 */
  father: number;
  /** 11 月第四个周四 */
  thanksgiving: number;
}

const floatingCache = new Map<number, FloatingDays>();

/** 某年的三个浮动节日是几号，同一年只算一次 */
const floatingOf = function (y: number): FloatingDays {
  let days = floatingCache.get(y);
  if (days === undefined) {
    days = {
      mother: nthWeekdayOfMonth(y, 5, 0, 2),
      father: nthWeekdayOfMonth(y, 6, 0, 3),
      thanksgiving: nthWeekdayOfMonth(y, 11, 4, 4),
    };
    floatingCache.set(y, days);
  }
  return days;
};

/** 某一天的公历节日，包含按规则计算的浮动节日 */
const solarFestivals = function (
  y: number,
  m: number,
  d: number,
  sFtv: Record<string, string[]>,
): readonly string[] {
  const base = festivalList(sFtv, m, d);

  // 浮动节日只有 5 / 6 / 11 月才有，其它月份直接返回配置里的只读数组
  if (m !== 5 && m !== 6 && m !== 11) return base;

  const floating = floatingOf(y);
  let name: string | null;
  if (m === 5) name = d === floating.mother ? "母亲节" : null;
  else if (m === 6) name = d === floating.father ? "父亲节" : null;
  else name = d === floating.thanksgiving ? "感恩节" : null;

  if (name === null || base.indexOf(name) !== -1) return base;
  return Object.freeze(base.concat(name));
};

/**
 * 某一天的农历节日，除夕按“腊月最后一天”计算，不写死 12-30
 *
 * 闰月不过节：闰五月初五不算端午、闰八月十五不算中秋。
 */
const lunarFestivals = function (
  lYear: number,
  lMonth: number,
  lDay: number,
  isLeap: boolean,
  lFtv: Record<string, string[]>,
): readonly string[] {
  if (isLeap) return NO_FESTIVAL;

  const base = festivalList(lFtv, lMonth, lDay);
  if (lMonth === 12 && lDay === lMonthDays(lYear, 12) && base.indexOf("除夕") === -1) {
    return Object.freeze(base.concat("除夕"));
  }
  return base;
};

/**
 * 核心换算，入参必须是已经校验过、且在支持范围内的公历日期
 */
const computeLunar = function (
  config: ResolvedConfig,
  sy: number,
  sm: number,
  sd: number,
): LunarResult {
  // 一次 Date.UTC 拿到绝对天数，后面的星期、干支、农历定位都复用它
  const utcDays = Date.UTC(sy, sm - 1, sd) / DAY_MS;
  const { year, offsetInYear } = resolveLunarYear(utcDays - MIN_SOLAR_DAYS);

  // 月份段（闰月单独一段）按顺序扫描，最多 13 段
  const segments = monthSegmentsOf(year);
  let segment = segments[0] as LunarMonthSegment;
  for (const item of segments) {
    if (item.start > offsetInYear) break;
    segment = item;
  }

  const month = segment.month;
  const day = offsetInYear - segment.start + 1;
  const isLeap = segment.isLeap;

  const dayOfWeek = weekdayFromDays(utcDays);

  // 节气表按年缓存，直接取数组，不再走两次断言 + 两次 Map 查询
  const terms = termsOf(sy);
  const firstTermDay = terms[sm * 2 - 2] as number;
  const secondTermDay = terms[sm * 2 - 1] as number;

  let term: string | null = null;
  if (firstTermDay === sd) term = getSolarTerm(sm * 2 - 2);
  if (secondTermDay === sd) term = getSolarTerm(sm * 2 - 1);

  // xiu / ban 只由 rest.json 决定，与周末无关；同一天不会既放假又补班，两种状态互斥
  const restState = restOf(config.restIndex, sy, sm, sd);
  const isXiu = restState === "xiu";
  const isBan = restState === "ban";

  // 干支日的偏移只和绝对天数有关：月份内第几天那两项正好抵消
  const gzDayOffset = utcDays + GANZHI_DAY_BASE;
  // 只有 2 月才需要立春当天的日期，其它月份不去查节气表
  const ganzhiYear = sm > 2 || (sm === 2 && sd >= (terms[2] as number)) ? sy : sy - 1;

  refreshToday();

  return {
    xiu: isXiu,
    ban: isBan,
    gljr: solarFestivals(sy, sm, sd, config.sFtv),
    nljr: lunarFestivals(year, month, day, isLeap, config.lFtv),
    lYear: year,
    lMonth: month,
    lDay: day,
    animal: getAnimal(year),
    lMonthCn: (isLeap ? "闰" : "") + toChinaMonth(month),
    lDayCn: toChinaDay(day),
    cYear: sy,
    cMonth: sm,
    cDay: sd,
    gzYear: toGanZhiYear(ganzhiYear),
    gzYearLunar: toGanZhiYear(year),
    gzMonth: toGanZhi((sy - 1900) * 12 + sm + (sd >= firstTermDay ? 12 : 11)),
    gzDay: toGanZhi(gzDayOffset),
    gzHour: toHourGanZhi(gzDayOffset),
    isToday: todayYear === sy && todayMonth === sm && todayDay === sd,
    isLeap,
    nWeek: dayOfWeek === 0 ? 7 : dayOfWeek,
    dayOfWeek,
    ncWeek: "星期" + toChinaNum(dayOfWeek),
    term,
    astro: toAstro(sm, sd),
  };
};

/** 公历转农历的内部实现，节假日配置由调用方固定 */
const solarToLunarWith = function (
  config: ResolvedConfig,
  y?: number,
  m?: number,
  d?: number,
): LunarResult {
  if (y === undefined && m === undefined && d === undefined) {
    const now = new Date();
    const today = validateSolar(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return computeLunar(config, today.year, today.month, today.day);
  }
  if (y === undefined || m === undefined || d === undefined) {
    failRange(
      "solarToLunar",
      `年、月、日必须同时传入，或全部不传以取今天（收到 year=${String(y)}, month=${String(m)}, day=${String(d)}）`,
    );
  }
  const date = validateSolar(y, m, d);
  return computeLunar(config, date.year, date.month, date.day);
};

/** 农历转公历的内部实现，节假日配置由调用方固定 */
const lunarToSolarWith = function (
  config: ResolvedConfig,
  y: number,
  m: number,
  d: number,
  isLeapMonth?: boolean,
): LunarResult {
  const year = assertInteger("lunarToSolar(year)", y, MIN_YEAR, MAX_YEAR);
  const month = assertInteger("lunarToSolar(month)", m, 1, 12);
  if (isLeapMonth !== undefined && typeof isLeapMonth !== "boolean") {
    throw failType("lunarToSolar(isLeapMonth)", `必须是布尔值，收到 ${describe(isLeapMonth)}`);
  }
  const leap = leapMonth(year);
  const wantLeap = isLeapMonth === true;
  if (wantLeap && leap !== month) {
    failRange(
      "lunarToSolar(isLeapMonth)",
      `${year} 年${leap === 0 ? "没有闰月" : `的闰月是闰${leap}月`}，不能按闰${month}月换算`,
    );
  }
  const maxDay = wantLeap ? leapDays(year) : lMonthDays(year, month);
  const day = assertInteger("lunarToSolar(day)", d, 1, maxDay);

  // 直接查表定位到该月第一天的绝对偏移，不再逐年逐月累加
  const segments = monthSegmentsOf(year);
  const segment = segments.find((item) => item.month === month && item.isLeap === wantLeap);
  if (!segment) {
    return failRange("lunarToSolar", `${year} 年${wantLeap ? "闰" : ""}${month}月不存在`);
  }
  const offset = yearStartOf(year) + segment.start;

  const utc = MIN_SOLAR_UTC + (offset + day - 1) * DAY_MS;
  if (utc > MAX_SOLAR_UTC) {
    failRange("lunarToSolar", `农历 ${year}-${month}-${day} 换算后晚于 2100-12-31，超出支持范围`);
  }
  const date = new Date(utc);
  return computeLunar(config, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
};

/**
 * 创建固定节假日配置的日历实例
 *
 * 不读取也不修改任何全局状态；配置在创建时校验并冻结，
 * 多个实例之间互不影响。不传配置时使用内置数据。
 *
 * @param config 节假日 / 调休配置
 * @param options replace 为 true 时忽略内置数据
 * @throws TypeError 配置格式不合法（含具体字段路径）
 * @example
 * const cc = createCalendar({ setRest: { 2027: { xiu: ["0101"] } } });
 * cc.solarToLunar(2027, 1, 1).xiu; // true
 */
const createCalendar = function (
  config: HolidayConfig = {},
  options: SetHolidayOptions = {},
): Calendar {
  // 用户配置只校验一次；只有一份可查询的配置，own 只在 getHolidays 需要时生成快照
  const { merged, snapshotOwn } = createCalendarConfig(config, options);

  return {
    /** 公历转农历，不传参返回今天 */
    solarToLunar: (y, m, d) => solarToLunarWith(merged, y, m, d),
    /** 农历转公历 */
    lunarToSolar: (y, m, d, isLeapMonth) => lunarToSolarWith(merged, y, m, d, isLeapMonth),
    /** 当前配置的深拷贝；merged 为 false 时只导出用户传入的部分 */
    getHolidays: (getOptions) => {
      if (getOptions !== undefined) assertPlainObject(getOptions, "getHolidays(options)");
      if (getOptions?.merged !== undefined && typeof getOptions.merged !== "boolean") {
        throw failType(
          "getHolidays(options).merged",
          `必须是布尔值，收到 ${describe(getOptions.merged)}`,
        );
      }
      return getOptions?.merged === false ? snapshotOwn() : snapshotOf(merged);
    },
  };
};

const utils = {
  lYearDays,
  leapMonth,
  leapDays,
  lMonthDays,
  toChinaMonth,
  toChinaDay,
  toChinaNum,
  solarDays,
  solarFirstWeek,
  nthWeekdayOfMonth,
  toAstro,
  getAnimal,
  getTerm,
  getSolarTerm,
  toGanZhi,
  toGanZhiYear,
  toHourGanZhi,
};

export { createCalendar, utils };
export default createCalendar;
