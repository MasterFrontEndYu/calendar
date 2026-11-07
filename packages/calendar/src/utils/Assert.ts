/**
 * 统一的参数错误、类型守卫，以及节日 / 调休配置的校验与规范化
 */
import type { FestivalMap, RestMap } from "../types";

/** 四位 "MMDD"，月份 01-12、日期 01-31 */
const MMDD_RE = /^(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/;

/** 预生成的 MMDD 查表键（12 × 31），避免每次查节日 / 调休都拼字符串 */
const MMDD: string[][] = Array.from({ length: 13 }, () => Array.from({ length: 32 }, () => ""));

for (let m = 1; m <= 12; m++) {
  for (let d = 1; d <= 31; d++) {
    (MMDD[m] as string[])[d] = (m < 10 ? "0" + m : String(m)) + (d < 10 ? "0" + d : String(d));
  }
}

/** 取四位 MMDD 字符串，例如 mmddOf(1, 1) → "0101" */
export const mmddOf = function (m: number, d: number): string {
  return (MMDD[m] as string[])[d] as string;
};

/** 调休年份：1900-2100 */
const YEAR_RE = /^(19\d{2}|20\d{2}|2100)$/;

/** 公历每个月的最大天数，2 月按闰年放宽到 29 */
const SOLAR_MAX_DAY = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** 调休表每年的字段 */
const REST_FIELDS = ["xiu", "ban"];

/** 抛出带位置信息的 TypeError，用于配置格式错误 */
export function failType(path: string, message: string): never {
  throw new TypeError(`[calendar] ${path} ${message}`);
}

/** 抛出带位置信息的 RangeError，用于数值越界 */
export function failRange(path: string, message: string): never {
  throw new RangeError(`[calendar] ${path} ${message}`);
}

/** 是否为普通对象（非 null、非数组） */
export const isPlainObject = function (value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

/** 校验是普通对象，否则按 path 抛 TypeError；断言之后可以直接当字典用 */
export function assertPlainObject(
  value: unknown,
  path: string,
  message = "必须是对象",
): asserts value is Record<string, unknown> {
  if (!isPlainObject(value)) failType(path, `${message}，收到 ${describe(value)}`);
}

/** 校验对象里没有白名单之外的字段 */
export const assertKnownKeys = function (
  value: object,
  allowed: readonly string[],
  path: string,
): void {
  Object.keys(value).forEach(function (key) {
    if (allowed.indexOf(key) === -1) {
      failType(`${path}.${key}`, `不认识的字段，只支持 ${allowed.join(" 与 ")}`);
    }
  });
};

/** 把任意值格式化成便于排查的短字符串 */
export const describe = function (value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return String(value);
  }
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === "object") {
    const keys = Object.keys(value as Record<string, unknown>);
    return `Object(keys: ${keys.slice(0, 5).join(", ")}${keys.length > 5 ? ", …" : ""})`;
  }
  return typeof value;
};

/** 校验一个整数并返回它 */
export const assertInteger = function (
  path: string,
  value: unknown,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return failRange(path, `必须是整数，收到 ${describe(value)}`);
  }
  if (value < min || value > max) {
    return failRange(path, `必须在 ${min}-${max} 之间，收到 ${value}`);
  }
  return value;
};

/** 公历 MMDD 是否对应真实存在的日期（例如 0231、0431 为 false） */
const isSolarMonthDay = function (m: number, d: number): boolean {
  return d >= 1 && d <= (SOLAR_MAX_DAY[m - 1] ?? 0);
};

/** 农历 MMDD：每个月最多 30 天 */
const isLunarMonthDay = function (m: number, d: number): boolean {
  return d >= 1 && d <= 30;
};

/**
 * 校验并解析四位 MMDD：节日 key 与调休日期共用同一套格式和日期检查
 *
 * @param value 待校验值，必须是 "MMDD" 字符串
 * @param path 出错时用于定位的路径
 * @param options.lunar 按农历校验（每月最多 30 天），默认公历
 * @param options.label 报错信息里的主语，例如 "节日 key"
 */
export function assertMMDD(
  value: unknown,
  path: string,
  options: { lunar?: boolean; label?: string } = {},
): { month: number; day: number; text: string } {
  const { lunar = false, label } = options;
  const prefix = label === undefined ? "" : `${label} `;
  const parsed =
    typeof value === "string" && MMDD_RE.test(value)
      ? { month: Number(value.slice(0, 2)), day: Number(value.slice(2)), text: value }
      : null;

  if (parsed === null) {
    failType(path, `${prefix}必须是四位 "MMDD"（如 "0101"），收到 ${describe(value)}`);
  }
  const valid = lunar
    ? isLunarMonthDay(parsed.month, parsed.day)
    : isSolarMonthDay(parsed.month, parsed.day);
  if (!valid) {
    failType(path, `${lunar ? "农历" : "公历"}不存在 ${parsed.month} 月 ${parsed.day} 日`);
  }
  return parsed;
}

/**
 * 校验并规范化节日表
 *
 * @param input 待校验的节日表
 * @param path 出错时用于定位的路径，例如 "createCalendar.setFestival.sFtv"
 * @param lunar 农历节日（true）还是公历节日（false）
 */
const normalizeFestivalMap = function (input: unknown, path: string, lunar = false): FestivalMap {
  assertPlainObject(input, path);
  const result: FestivalMap = {};
  Object.keys(input).forEach(function (key) {
    assertMMDD(key, `${path}.${key}`, { lunar, label: "节日 key" });
    const value = input[key];
    if (!Array.isArray(value)) {
      throw failType(`${path}.${key}`, `节日名称必须是字符串数组，收到 ${describe(value)}`);
    }
    const names: string[] = [];
    value.forEach(function (name: unknown, index: number) {
      if (typeof name !== "string" || name.trim() === "") {
        throw failType(
          `${path}.${key}[${index}]`,
          `节日名称必须是非空字符串，收到 ${describe(name)}`,
        );
      }
      names.push(name);
    });
    result[key] = names;
  });
  return result;
};

/** 校验并去重一组调休日期（MMDD 字符串） */
const normalizeDayList = function (input: unknown, path: string): string[] {
  if (!Array.isArray(input)) {
    throw failType(path, `必须是 "MMDD" 字符串数组，收到 ${describe(input)}`);
  }
  const days: string[] = [];
  input.forEach(function (day: unknown, index: number) {
    days.push(assertMMDD(day, `${path}[${index}]`).text);
  });
  return Array.from(new Set(days));
};

/**
 * 校验并规范化调休表，key 为年份
 *
 * @param input 待校验的调休表
 * @param path 出错时用于定位的路径
 */
const normalizeRestMap = function (input: unknown, path: string): RestMap {
  assertPlainObject(input, path);
  const result: RestMap = {};
  Object.keys(input).forEach(function (yearKey) {
    if (!YEAR_RE.test(yearKey)) {
      throw failType(
        `${path}.${yearKey}`,
        `年份必须是 1900-2100 的四位数字，收到 ${describe(yearKey)}`,
      );
    }
    const entry = input[yearKey];
    assertPlainObject(entry, `${path}.${yearKey}`, "必须是 { xiu: [], ban: [] }");
    assertKnownKeys(entry, REST_FIELDS, `${path}.${yearKey}`);

    const xiu =
      entry.xiu === undefined ? [] : normalizeDayList(entry.xiu, `${path}.${yearKey}.xiu`);
    const ban =
      entry.ban === undefined ? [] : normalizeDayList(entry.ban, `${path}.${yearKey}.ban`);

    // 放假和补班来自同一份法定节假日安排，同一天不可能既放假又补班
    const conflict = xiu.filter(function (day) {
      return ban.indexOf(day) !== -1;
    });
    if (conflict.length > 0) {
      throw failType(
        `${path}.${yearKey}`,
        `同一天不能既是放假日又是补班日：${conflict.join("、")}`,
      );
    }

    result[yearKey] = { xiu, ban };
  });
  return result;
};

export { normalizeFestivalMap, normalizeRestMap };
