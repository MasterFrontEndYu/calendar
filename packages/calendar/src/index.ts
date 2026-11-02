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
  getAnimal,
  solarDays,
  solarFirstWeek,
  weekdayOf,
  toChinaNum,
  nthWeekdayOfMonth,
} from "./utils/SolarFunction";

import { assertInteger, failRange } from "./utils/Assert";
import { festivalList } from "./utils/SetFestival";
import { restOf } from "./utils/SetRest";
import { getResolvedConfig, setHolidays, resetHolidays, getHolidays } from "./config";
import type { LunarResult } from "./types";

export type {
  LunarResult,
  FestivalMap,
  FestivalConfig,
  RestEntry,
  RestConfig,
  HolidayConfig,
  HolidaySnapshot,
  SetHolidayOptions,
} from "./types";

/** 支持的公历 / 农历年份范围 */
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const DAY_MS = 86400000;
/** 农历数据起点：1900-01-31，即农历 1900 年正月初一 */
const MIN_SOLAR_UTC = Date.UTC(MIN_YEAR, 0, 31);
/** 支持的最后一个公历日 */
const MAX_SOLAR_UTC = Date.UTC(MAX_YEAR, 11, 31);

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

/** 某一天的公历节日，包含按规则计算的浮动节日 */
const solarFestivals = function (
  y: number,
  m: number,
  d: number,
  sFtv: Record<string, string[]>,
): readonly string[] {
  const base = festivalList(sFtv, m, d);
  const extra: string[] = [];

  const add = function (name: string) {
    if (base.indexOf(name) === -1 && extra.indexOf(name) === -1) extra.push(name);
  };

  if (m === 5 && d === nthWeekdayOfMonth(y, 5, 0, 2)) add("母亲节");
  if (m === 6 && d === nthWeekdayOfMonth(y, 6, 0, 3)) add("父亲节");
  if (m === 11 && d === nthWeekdayOfMonth(y, 11, 4, 4)) add("感恩节");

  // 没有浮动节日时直接返回配置里的只读数组，省掉一次拷贝
  return extra.length === 0 ? base : base.concat(extra);
};

/** 某一天的农历节日，除夕按“腊月最后一天”计算，不写死 12-30 */
const lunarFestivals = function (
  lYear: number,
  lMonth: number,
  lDay: number,
  lFtv: Record<string, string[]>,
): readonly string[] {
  const base = festivalList(lFtv, lMonth, lDay);
  if (lMonth === 12 && lDay === lMonthDays(lYear, 12) && base.indexOf("除夕") === -1) {
    return base.concat("除夕");
  }
  return base;
};

/**
 * 核心换算，入参必须是已经校验过、且在支持范围内的公历日期
 */
const computeLunar = function (sy: number, sm: number, sd: number): LunarResult {
  const utc = Date.UTC(sy, sm - 1, sd);
  if (utc < MIN_SOLAR_UTC || utc > MAX_SOLAR_UTC) {
    failRange("solarToLunar", `${sy}-${sm}-${sd} 超出 1900-01-31 ~ 2100-12-31 的支持范围`);
  }
  const config = getResolvedConfig();

  const offset = Math.round((utc - MIN_SOLAR_UTC) / DAY_MS);
  const { year, offsetInYear } = resolveLunarYear(offset);

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

  const dayOfWeek = weekdayOf(sy, sm, sd);
  const firstTermDay = getTerm(sy, sm * 2 - 1);
  const secondTermDay = getTerm(sy, sm * 2);
  const lichunDay = getTerm(sy, 3);

  let term: string | null = null;
  if (firstTermDay === sd) term = getSolarTerm(sm * 2 - 2);
  if (secondTermDay === sd) term = getSolarTerm(sm * 2 - 1);

  const restState = restOf(config.restIndex, sy, sm, sd);
  const isBan = restState === 2;
  // 0=普通日、1=放假、2=补班，三者互斥；只有普通日才回落到周六/周日
  const isXiu = restState === 1 || (restState === 0 && (dayOfWeek === 0 || dayOfWeek === 6));

  const dayCyclical = utc / DAY_MS - (sd - 1) + 25567 + 10;
  const gzDayOffset = dayCyclical + sd - 1;
  const ganzhiYear = sm > 2 || (sm === 2 && sd >= lichunDay) ? sy : sy - 1;

  return {
    Xiu: isXiu,
    Ban: isBan,
    Gljr: solarFestivals(sy, sm, sd, config.sFtv),
    Nljr: lunarFestivals(year, month, day, config.lFtv),
    lYear: year,
    lMonth: month,
    lDay: day,
    Animal: getAnimal(year),
    LMonthCn: (isLeap ? "闰" : "") + toChinaMonth(month),
    LDayCn: toChinaDay(day),
    cYear: sy,
    cMonth: sm,
    cDay: sd,
    gzYear: toGanZhiYear(ganzhiYear),
    gzYearLunar: toGanZhiYear(year),
    gzMonth: toGanZhi((sy - 1900) * 12 + sm + (sd >= firstTermDay ? 12 : 11)),
    gzDay: toGanZhi(gzDayOffset),
    gzHour: toHourGanZhi(gzDayOffset),
    isToday: (function () {
      const now = new Date();
      return now.getFullYear() === sy && now.getMonth() + 1 === sm && now.getDate() === sd;
    })(),
    isLeap,
    nWeek: dayOfWeek === 0 ? 7 : dayOfWeek,
    dayOfWeek,
    ncWeek: "星期" + toChinaNum(dayOfWeek),
    Term: term,
    astro: toAstro(sm, sd),
  };
};

/**
 * 公历转农历
 *
 * 不传参返回今天；传参时年、月、日必须同时传入且全部合法，
 * 越界或非法日期一律抛 RangeError，不会再静默回退到今天或自动进位。
 *
 * @param y 公历年（1900-2100）
 * @param m 公历月（1-12）
 * @param d 公历日
 * @throws RangeError 日期非法或超出 1900-01-31 ~ 2100-12-31
 * @example solarToLunar(2024, 2, 10) // 正月初一
 */
const solarToLunar = function (y?: number, m?: number, d?: number): LunarResult {
  if (y === undefined && m === undefined && d === undefined) {
    const now = new Date();
    return computeLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
  if (y === undefined || m === undefined || d === undefined) {
    failRange(
      "solarToLunar",
      `年、月、日必须同时传入，或全部不传以取今天（收到 year=${String(y)}, month=${String(m)}, day=${String(d)}）`,
    );
  }
  const date = validateSolar(y, m, d);
  return computeLunar(date.year, date.month, date.day);
};

/**
 * 农历转公历
 *
 * 农历年、月、日非法（含闰月年份不匹配）一律抛 RangeError，
 * 不再返回 -1 让调用方自己判断。
 *
 * @param y 农历年（1900-2100）
 * @param m 农历月（1-12）
 * @param d 农历日（1-30）
 * @param isLeapMonth 是否闰月
 * @throws RangeError 农历日期非法、闰月不匹配，或换算结果超出 2100-12-31
 * @example lunarToSolar(2020, 4, 1, true) // 2020-05-23
 */
const lunarToSolar = function (
  y: number,
  m: number,
  d: number,
  isLeapMonth?: boolean,
): LunarResult {
  const year = assertInteger("lunarToSolar(year)", y, MIN_YEAR, MAX_YEAR);
  const month = assertInteger("lunarToSolar(month)", m, 1, 12);
  const leap = leapMonth(year);
  const wantLeap = Boolean(isLeapMonth);
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
  return computeLunar(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
};

const calendar = {
  /** 注入自定义节日与调休数据，默认与内置数据合并去重 */
  setHolidays,
  /** 恢复到内置数据 */
  resetHolidays,
  /** 取当前生效的节假日配置（深拷贝） */
  getHolidays,
  solarToLunar,
  lunarToSolar,
  utils: {
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
  },
};

export { solarToLunar, lunarToSolar, setHolidays, resetHolidays, getHolidays };
export default calendar;
