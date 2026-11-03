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
import {
  getResolvedConfig,
  setHolidays as applyHolidays,
  resetHolidays as restoreHolidays,
  createStandaloneConfig,
  snapshotOf,
} from "./config";
import type { ResolvedConfig } from "./config";
import type { CalendarConverter, HolidayConfig, LunarResult, SetHolidayOptions } from "./types";

export type {
  LunarResult,
  CalendarConverter,
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
const computeLunar = function (
  config: ResolvedConfig,
  sy: number,
  sm: number,
  sd: number,
): LunarResult {
  const utc = Date.UTC(sy, sm - 1, sd);
  if (utc < MIN_SOLAR_UTC || utc > MAX_SOLAR_UTC) {
    failRange("solarToLunar", `${sy}-${sm}-${sd} 超出 1900-01-31 ~ 2100-12-31 的支持范围`);
  }

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
  // 0=普通日、1=放假、2=补班，三者互斥；xiu / ban 只由 rest.json 决定，与周末无关
  const isXiu = restState === 1;

  const dayCyclical = utc / DAY_MS - (sd - 1) + 25567 + 10;
  const gzDayOffset = dayCyclical + sd - 1;
  const ganzhiYear = sm > 2 || (sm === 2 && sd >= lichunDay) ? sy : sy - 1;

  return {
    xiu: isXiu,
    ban: isBan,
    gljr: solarFestivals(sy, sm, sd, config.sFtv),
    nljr: lunarFestivals(year, month, day, config.lFtv),
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
    isToday: (function () {
      const now = new Date();
      return now.getFullYear() === sy && now.getMonth() + 1 === sm && now.getDate() === sd;
    })(),
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
    return computeLunar(config, now.getFullYear(), now.getMonth() + 1, now.getDate());
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
  return computeLunar(config, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
};

/**
 * 把“读某一份配置”的只读操作打包成 converter 形态
 *
 * 默认 converter 和 createConverter() 都走这里，保证两种实例行为完全一致。
 */
const createConverterAPI = function (getConfig: () => ResolvedConfig): CalendarConverter {
  return {
    /** 公历转农历，不传参返回今天 */
    solarToLunar: (y, m, d) => solarToLunarWith(getConfig(), y, m, d),
    /** 农历转公历 */
    lunarToSolar: (y, m, d, isLeapMonth) => lunarToSolarWith(getConfig(), y, m, d, isLeapMonth),
    /** 当前配置的深拷贝 */
    getHolidays: () => snapshotOf(getConfig()),
  };
};

/**
 * 创建带独立节假日配置的转换器
 *
 * 配置在创建时校验并冻结，之后与全局 setHolidays() 互不影响，
 * 适合同一页面里并排展示多套节假日数据的场景。
 * 默认以内置数据为基准合并，传 { replace: true } 则丢弃内置数据。
 *
 * @param config 节假日 / 调休配置
 * @param options replace 为 true 时忽略内置数据
 * @throws TypeError 配置格式不合法（含具体字段路径）
 * @example
 * const converter = calendar.createConverter({ setRest: { 2027: { xiu: ["0101"] } } });
 * converter.solarToLunar(2027, 1, 1).xiu; // true
 */
const createConverter = function (
  config: HolidayConfig = {},
  options: SetHolidayOptions = {},
): CalendarConverter {
  const resolved = createStandaloneConfig(config, options);
  return createConverterAPI(() => resolved);
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

/**
 * 默认 converter：全局 API 的唯一实现
 *
 * solarToLunar / lunarToSolar / getHolidays 与自定义 converter 同形，
 * 额外带 setHolidays / resetHolidays 来管理全局配置。
 */
const calendar = {
  ...createConverterAPI(getResolvedConfig),
  /** 注入自定义节日与调休数据，默认与内置数据合并去重 */
  setHolidays(this: void, config: HolidayConfig = {}, options: SetHolidayOptions = {}): void {
    applyHolidays(config, options);
  },
  /** 恢复到内置数据 */
  resetHolidays(this: void): void {
    restoreHolidays();
  },
  /** 创建带独立节假日配置的转换器 */
  createConverter,
  utils,
};

// 只保留默认 converter 一套 API：2.x 不再提供具名函数导出
export default calendar;
