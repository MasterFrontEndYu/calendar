import { Animals, nStr1, SolarMonth, TermInfo } from "../data/Calendar";
import { assertInteger, failRange } from "./Assert";

/** 公历年份下限，只为挡住明显错误的入参 */
const SOLAR_YEAR_MIN = 1;
const SOLAR_YEAR_MAX = 9999;

const MS_PER_DAY = 86400000;
/** 1970-01-01 是星期四，用作星期推算的基准 */
const EPOCH_WEEKDAY = 4;

/** 距 1970-01-01 的天数 → 星期，0 为周日；负数也能算对，供内部复用已算好的天数 */
const weekdayFromDays = function (days: number): number {
  return (((days + EPOCH_WEEKDAY) % 7) + 7) % 7;
};

/** 用毫秒数直接算星期，避免每次都 new Date */
const weekdayOf = function (y: number, m: number, d: number): number {
  // 这里不转调 weekdayFromDays：多一层调用在热路径上反而更慢
  const days = Math.round(Date.UTC(y, m - 1, d) / MS_PER_DAY);
  return (((days + EPOCH_WEEKDAY) % 7) + 7) % 7;
};

/** 按年缓存的 24 个节气日期，同一年只解析一次 */
const termCache = new Map<number, number[]>();

/** 解析某一年的节气表，返回 24 个日期数字 */
const parseTerms = function (y: number): number[] {
  const table = TermInfo[y - 1900];
  if (typeof table !== "string" || table.length < 30) {
    failRange("getTerm(year)", `缺少 ${y} 年的节气数据`);
  }

  const days: number[] = [];
  for (let i = 0; i < 6; i++) {
    const chunk = parseInt(table.slice(i * 5, i * 5 + 5), 16).toString();
    days.push(
      Number(chunk.slice(0, 1)),
      Number(chunk.slice(1, 3)),
      Number(chunk.slice(3, 4)),
      Number(chunk.slice(4, 6)),
    );
  }
  return days;
};

/**
 * 某年 24 个节气日期（内部用）
 *
 * 和 getTerm 的区别只有一点：省掉两次入参断言——调用方已经把年份校验过了，
 * 换算每天都在跑，这点开销也要省。
 */
const termsOf = function (y: number): number[] {
  let days = termCache.get(y);
  if (days === undefined) {
    days = parseTerms(y);
    termCache.set(y, days);
  }
  return days;
};

/**
 * 返回公历 y 年 m 月的天数（会自动处理闰年）
 * @param y 公历年
 * @param m 公历月（1-12）
 * @return 28-31
 */
const solarDays = function (y: number, m: number): number {
  assertInteger("solarDays(year)", y, SOLAR_YEAR_MIN, SOLAR_YEAR_MAX);
  assertInteger("solarDays(month)", m, 1, 12);
  if (m === 2) {
    return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28;
  }
  return SolarMonth[m - 1];
};

/**
 * 返回公历 y 年 m 月 1 日是星期几
 * @param y 公历年
 * @param m 公历月（1-12）
 * @return 0-6，0 为周日
 */
const solarFirstWeek = function (y: number, m: number): number {
  assertInteger("solarFirstWeek(year)", y, SOLAR_YEAR_MIN, SOLAR_YEAR_MAX);
  assertInteger("solarFirstWeek(month)", m, 1, 12);
  return weekdayOf(y, m, 1);
};

/**
 * 返回公历 y 年 m 月第 nth 个星期 weekday 是几号
 * @param y 公历年
 * @param m 公历月（1-12）
 * @param weekday 0-6，0 为周日
 * @param nth 第几个，从 1 开始
 * @example nthWeekdayOfMonth(2026, 5, 0, 2) // 10，2026 年母亲节是 5 月 10 日
 */
const nthWeekdayOfMonth = function (y: number, m: number, weekday: number, nth: number): number {
  assertInteger("nthWeekdayOfMonth(weekday)", weekday, 0, 6);
  assertInteger("nthWeekdayOfMonth(nth)", nth, 1, 5);
  const firstWeekday = solarFirstWeek(y, m);
  const day = 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7;
  if (day > solarDays(y, m)) {
    failRange("nthWeekdayOfMonth", `${y} 年 ${m} 月没有第 ${nth} 个星期${weekday}，超出当月天数`);
  }
  return day;
};

/**
 * 星座名称，每个星座占两个字符，末尾补一个摩羯座用于 12 月下旬切片
 */
const ASTRO_NAMES =
  "\u6469\u7faf\u6c34\u74f6\u53cc\u9c7c\u767d\u7f8a\u91d1\u725b\u53cc\u5b50\u5de8\u87f9\u72ee\u5b50\u5904\u5973\u5929\u79e4\u5929\u874e\u5c04\u624b\u6469\u7faf";

/** 每个月切换星座的日期，当天大于等于该值即属于后一个星座 */
const ASTRO_CUSP = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22];

/** 12 个月 × 31 天的星座表，预先切好，省掉每天一次字符串切片 */
const ASTRO_TABLE: string[][] = (function () {
  const table: string[][] = Array.from({ length: 13 }, () => [] as string[]);
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= 31; d++) {
      const start = m * 2 - (d < (ASTRO_CUSP[m - 1] as number) ? 2 : 0);
      (table[m] as string[])[d] = ASTRO_NAMES.slice(start, start + 2) + "\u5ea7";
    }
  }
  return table;
})();

/**
 * 公历月、日判断所属星座
 * @param m 公历月（1-12）
 * @param d 公历日
 * @example toAstro(4, 19) // "白羊座"
 */
const toAstro = function (m: number, d: number): string {
  assertInteger("toAstro(month)", m, 1, 12);
  assertInteger("toAstro(day)", d, 1, 31);
  return (ASTRO_TABLE[m] as string[])[d] as string;
};

/**
 * 传入公历年获得该年第 n 个节气所在公历月的日期
 * @param y 公历年（1900-2100）
 * @param n 第几个节气（1-24），1 为小寒
 * @return 日期数字
 * @example getTerm(1987, 3) // 4，1987 年 2 月 4 日立春
 */
const getTerm = function (y: number, n: number): number {
  assertInteger("getTerm(year)", y, 1900, 2100);
  assertInteger("getTerm(n)", n, 1, 24);

  const day = (termsOf(y) as number[])[n - 1];
  if (!Number.isInteger(day)) {
    failRange("getTerm", `${y} 年第 ${n} 个节气解析失败`);
  }
  return day;
};

/**
 * 年份转生肖，以农历年为准
 * @param y 年份
 * @example getAnimal(1987) // "兔"
 */
const getAnimal = function (y: number): string {
  assertInteger("getAnimal(year)", y, SOLAR_YEAR_MIN, SOLAR_YEAR_MAX);
  return Animals[(((y - 4) % 12) + 12) % 12];
};

/**
 * 数字转中文，0-10
 * @param num 0-10
 * @example toChinaNum(3) // "三"
 */
const toChinaNum = function (num: number): string {
  assertInteger("toChinaNum(num)", num, 0, 10);
  return nStr1[num];
};

export {
  solarDays,
  toChinaNum,
  solarFirstWeek,
  weekdayOf,
  weekdayFromDays,
  nthWeekdayOfMonth,
  toAstro,
  getTerm,
  termsOf,
  getAnimal,
};
