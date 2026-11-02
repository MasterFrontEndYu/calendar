import { LunarInfo, Gan, Zhi, GanZhiHour, SolarTerm, nStr3, nStr2, nStr1 } from "../data/Calendar";
import { assertInteger, failRange } from "./Assert";

/** 农历数据表覆盖的年份 */
const LUNAR_YEAR_MIN = 1900;
const LUNAR_YEAR_MAX = 2100;

/**
 * 校验农历年份是否在数据表范围内，越界直接抛 RangeError
 */
const assertLunarYear = function (y: number, path: string): number {
  return assertInteger(path, y, LUNAR_YEAR_MIN, LUNAR_YEAR_MAX);
};

/**
 * 返回农历 y 年一整年的总天数
 * @param y 农历年（1900-2100）
 * @return 348-385
 */
const lYearDays = function (y: number): number {
  assertLunarYear(y, "lYearDays(year)");
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += LunarInfo[y - 1900] & i ? 1 : 0;
  }
  return sum + leapDays(y);
};

/**
 * 返回农历 y 年闰月是哪个月；没有闰月返回 0
 * @param y 农历年（1900-2100）
 */
const leapMonth = function (y: number): number {
  assertLunarYear(y, "leapMonth(year)");
  return LunarInfo[y - 1900] & 0xf;
};

/**
 * 返回农历 y 年闰月的天数；没有闰月返回 0
 * @param y 农历年（1900-2100）
 */
const leapDays = function (y: number): number {
  if (leapMonth(y)) {
    return LunarInfo[y - 1900] & 0x10000 ? 30 : 29;
  }
  return 0;
};

/**
 * 返回农历 y 年 m 月（非闰月）的天数，闰月天数请用 leapDays
 * @param y 农历年（1900-2100）
 * @param m 农历月（1-12）
 */
const lMonthDays = function (y: number, m: number): number {
  assertLunarYear(y, "lMonthDays(year)");
  assertInteger("lMonthDays(month)", m, 1, 12);
  return LunarInfo[y - 1900] & (0x10000 >> m) ? 30 : 29;
};

/** 农历每年正月初一距 1900-01-31 的天数；长度 202，最后一项是 2101 正月初一 */
const YEAR_START: number[] = (function () {
  const starts: number[] = [0];
  for (let y = LUNAR_YEAR_MIN; y <= LUNAR_YEAR_MAX; y++) {
    starts.push((starts[starts.length - 1] as number) + lYearDays(y));
  }
  return starts;
})();

/** 某年正月初一距 1900-01-31 的天数 */
const yearStartOf = function (year: number): number {
  assertLunarYear(year, "yearStartOf(year)");
  return YEAR_START[year - LUNAR_YEAR_MIN] as number;
};

/** 农历某年的一个“月份段”，闰月算独立一段 */
export interface LunarMonthSegment {
  month: number;
  isLeap: boolean;
  /** 该段 1 号距当年正月初一的天数 */
  start: number;
}

const segmentCache = new Map<number, LunarMonthSegment[]>();

/** 某年的月份段表（按时间顺序），第一次构建后缓存 */
const monthSegmentsOf = function (year: number): LunarMonthSegment[] {
  const cached = segmentCache.get(year);
  if (cached) return cached;

  const leap = leapMonth(year);
  const segments: LunarMonthSegment[] = [];
  let start = 0;

  for (let m = 1; m <= 12; m++) {
    segments.push({ month: m, isLeap: false, start });
    start += lMonthDays(year, m);
    if (leap === m) {
      segments.push({ month: m, isLeap: true, start });
      start += leapDays(year);
    }
  }

  segmentCache.set(year, segments);
  return segments;
};

/** 把“距 1900-01-31 的天数”换算成农历年与当年第几天（二分查找，替代逐年累减） */
const resolveLunarYear = function (offset: number): { year: number; offsetInYear: number } {
  let low = 0;
  let high = LUNAR_YEAR_MAX - LUNAR_YEAR_MIN;

  while (low < high) {
    const mid = (low + high + 1) >>> 1;
    if ((YEAR_START[mid] as number) <= offset) low = mid;
    else high = mid - 1;
  }

  return {
    year: LUNAR_YEAR_MIN + low,
    offsetInYear: offset - (YEAR_START[low] as number),
  };
};

/**
 * 农历年转换为干支纪年
 * @param lYear 农历年，允许 1899 这类边界年（只做算术，不查表）
 */
const toGanZhiYear = function (lYear: number): string {
  if (typeof lYear !== "number" || !Number.isInteger(lYear)) {
    failRange("toGanZhiYear(year)", `必须是整数，收到 ${lYear}`);
  }
  let ganKey = (lYear - 3) % 10;
  let zhiKey = (lYear - 3) % 12;
  if (ganKey <= 0) ganKey += 10;
  if (zhiKey <= 0) zhiKey += 12;
  return Gan[ganKey - 1] + Zhi[zhiKey - 1];
};

/**
 * 传入相对甲子的偏移量返回干支
 * @param offset 可以为负数
 */
const toGanZhi = function (offset: number): string {
  if (typeof offset !== "number" || !Number.isInteger(offset)) {
    failRange("toGanZhi(offset)", `必须是整数，收到 ${offset}`);
  }
  const gan = ((offset % 10) + 10) % 10;
  const zhi = ((offset % 12) + 12) % 12;
  return Gan[gan] + Zhi[zhi];
};

/**
 * 传入当天的干支偏移量，返回当天十二个时辰的干支
 * @param offset 相对甲子的偏移量（与 gzDay 用同一个偏移量）
 */
const toHourGanZhi = function (offset: number): string[] {
  if (typeof offset !== "number" || !Number.isInteger(offset)) {
    failRange("toHourGanZhi(offset)", `必须是整数，收到 ${offset}`);
  }
  const index = ((offset % 10) + 10) % 10;
  return GanZhiHour[index].split("-");
};

/**
 * 农历数字月份转中文，例如 1 -> "正月"、12 -> "腊月"
 * @param m 农历月（1-12）
 */
const toChinaMonth = function (m: number): string {
  assertInteger("toChinaMonth(month)", m, 1, 12);
  return nStr3[m - 1] + "月";
};

/**
 * 农历日期数字转中文，例如 1 -> "初一"、21 -> "廿一"
 * @param d 农历日（1-30）
 */
const toChinaDay = function (d: number): string {
  assertInteger("toChinaDay(day)", d, 1, 30);
  switch (d) {
    case 10:
      return "\u521d\u5341";
    case 20:
      return "\u4e8c\u5341";
    case 30:
      return "\u4e09\u5341";
    default:
      return nStr2[Math.floor(d / 10)] + nStr1[d % 10];
  }
};

/**
 * 取第 n 个节气名（n 从 0 开始，0 为小寒）
 * @param n 0-23
 */
const getSolarTerm = function (n: number): string {
  assertInteger("getSolarTerm(n)", n, 0, 23);
  return SolarTerm[n];
};

export {
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
  assertLunarYear,
};
