import type { CalendarDateInput, YearMonth } from "../types";

/** 日期字符串：YYYY-M-D，分隔符必须一致 */
const DATE_INPUT_PATTERN = /^(\d{4})([-/])(\d{1,2})\2(\d{1,2})$/;

/**
 * 用本地年月日建 Date
 *
 * Date 构造器会把 0-99 年解释成 1900+year；只有这段时间走 setFullYear，
 * 其余年份仍用构造器，避免给 42 个格子增加额外开销。
 */
export const createDate = function (year: number, month: number, day: number): Date {
  if (year >= 0 && year < 100) {
    const date = new Date(0);
    date.setHours(0, 0, 0, 0);
    date.setFullYear(year, month - 1, day);
    return date;
  }
  return new Date(year, month - 1, day);
};

/** 去掉时分秒，只保留本地年月日 */
export const toDateOnly = function (date: Date): Date {
  return createDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
};

/**
 * 解析用户传入的日期
 *
 * 支持 Date，以及 `2026-10-01`、`2026-10-1`、`2026/10/01`、`2026/10/1`。
 * 不交给 `new Date(string)`，避免时区/格式歧义。
 */
export const parseDateInput = function (value: CalendarDateInput, path = "date"): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new TypeError(`[calendar-ui] ${path} 必须是有效的 Date`);
    }
    return toDateOnly(value);
  }

  if (typeof value !== "string") {
    throw new TypeError(`[calendar-ui] ${path} 必须是 Date 或 YYYY-MM-DD / YYYY/MM/DD 字符串`);
  }

  const match = DATE_INPUT_PATTERN.exec(value.trim());
  if (!match) {
    throw new TypeError(
      `[calendar-ui] ${path} 必须是 Date 或 YYYY-MM-DD / YYYY/MM/DD 字符串，收到 ${JSON.stringify(value)}`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[3]);
  const day = Number(match[4]);
  if (month < 1 || month > 12) {
    throw new RangeError(`[calendar-ui] ${path} 月份必须在 1-12 之间`);
  }

  const date = createDate(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    throw new RangeError(`[calendar-ui] ${path} 不是有效日期: ${value}`);
  }
  return date;
};

/** 把日期转成可比较的数字 key：YYYYMMDD */
export const dateKey = function (date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
};

/** 拼日期字符串 key：YYYY-M-D，分隔符与 parseDateInput 接受的格式一致 */
export const dateStringKey = function (year: number, month: number, day: number): string {
  return `${year}-${month}-${day}`;
};

/** 加减天数，按本地日历计算 */
export const addDays = function (date: Date, amount: number): Date {
  const next = toDateOnly(date);
  next.setDate(next.getDate() + amount);
  return next;
};

/** 比较两个日期，只比年月日 */
export const compareDay = function (a: Date, b: Date): number {
  return dateKey(a) - dateKey(b);
};

/** 同一天（只比年月日，忽略时分秒） */
export const sameDay = function (a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

/** 某日是星期几（0 为周日），按本地日历 */
export const weekdayOf = function (year: number, month: number, day: number): number {
  return createDate(year, month, day).getDay();
};

/** 年月转成连续月序号，方便比较、加减和夹取 */
export const monthIndexOf = function (year: number, month: number): number {
  return year * 12 + (month - 1);
};

/** 连续月序号还原成年月；只做整数运算，不分配 Date */
export const monthFromIndex = function (index: number): YearMonth {
  const year = Math.floor(index / 12);
  return { year, month: index - year * 12 + 1 };
};

/**
 * 把年月规范成合法值，月份越界时自动进位/退位
 *
 * 用整数运算而不是 Date，避免 0-99 年被当成 1900+year；
 * 小数先按 Date 构造器的行为截断。
 */
export const normalizeMonth = function (year: number, month: number): YearMonth {
  return monthFromIndex(monthIndexOf(Math.trunc(year), Math.trunc(month)));
};

/** 读取可空日期入参：null / undefined 直接返回 null */
export const readDate = function (
  value: CalendarDateInput | null | undefined,
  path: string,
): Date | null {
  if (value === null || value === undefined) return null;
  return parseDateInput(value, path);
};
