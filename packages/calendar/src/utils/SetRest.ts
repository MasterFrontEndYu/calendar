import { MMDD_RE, describe, failType, isPlainObject } from "./Assert";
import { isSolarMonthDay, mmddOf } from "./DateKey";
import type { NormalizedRestEntry, RestEntry } from "../types";

/** 预建索引，避免每次查询都做数组 includes */
export interface RestIndexEntry {
  xiu: Set<string>;
  ban: Set<string>;
}
export type RestIndex = Record<string, RestIndexEntry>;

/**
 * 某一天的调休状态
 *
 * 0 = 普通日，1 = 放假，2 = 补班。放假和补班来自同一份国家法定节假日数据，不会落在同一天；
 * 真要冲突时按补班处理（保持原有优先级）。
 */
export type RestState = 0 | 1 | 2;

/** 规范化后的调休表，key 为年份 */
export type RestMap = Record<string, NormalizedRestEntry>;

const YEAR_RE = /^(19\d{2}|20\d{2}|2100)$/;

/** 校验单个日期数组 */
const normalizeDayList = function (input: unknown, path: string): string[] {
  if (!Array.isArray(input)) {
    throw failType(path, `必须是 "MMDD" 字符串数组，收到 ${describe(input)}`);
  }
  const days: string[] = [];
  input.forEach(function (day: unknown, index: number) {
    if (typeof day !== "string" || !MMDD_RE.test(day)) {
      throw failType(`${path}[${index}]`, `必须是四位 "MMDD"（如 "0101"），收到 ${describe(day)}`);
    }
    const month = Number(day.slice(0, 2));
    const date = Number(day.slice(2));
    if (!isSolarMonthDay(month, date)) {
      throw failType(`${path}[${index}]`, `公历不存在 ${month} 月 ${date} 日`);
    }
    days.push(day);
  });
  return Array.from(new Set(days));
};

/**
 * 校验并规范化调休表，key 为年份
 * @param input 待校验的调休表
 * @param path 出错时用于定位的路径
 */
const normalizeRestMap = function (input: unknown, path: string): RestMap {
  if (!isPlainObject(input)) {
    throw failType(path, `必须是对象，收到 ${describe(input)}`);
  }
  const result: RestMap = {};
  Object.keys(input).forEach(function (yearKey) {
    if (!YEAR_RE.test(yearKey)) {
      throw failType(
        `${path}.${yearKey}`,
        `年份必须是 1900-2100 的四位数字，收到 ${describe(yearKey)}`,
      );
    }
    const entry = input[yearKey];
    if (!isPlainObject(entry)) {
      throw failType(`${path}.${yearKey}`, `必须是 { xiu: [], ban: [] }，收到 ${describe(entry)}`);
    }
    Object.keys(entry).forEach(function (field) {
      if (field !== "xiu" && field !== "ban") {
        throw failType(`${path}.${yearKey}.${field}`, `不认识的字段，只支持 xiu 与 ban`);
      }
    });
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

/**
 * 按年、按列表合并调休数据，不修改入参
 */
const mergeRestMap = function (base: RestMap, extra?: RestMap): RestMap {
  if (!extra) return base;
  const result: RestMap = {};
  const years = new Set(Object.keys(base).concat(Object.keys(extra)));
  years.forEach(function (year) {
    const left = base[year];
    const right = extra[year];
    if (left && right) {
      result[year] = {
        xiu: Array.from(new Set(left.xiu.concat(right.xiu))),
        ban: Array.from(new Set(left.ban.concat(right.ban))),
      };
    } else if (left) {
      result[year] = { xiu: left.xiu.slice(), ban: left.ban.slice() };
    } else if (right) {
      result[year] = { xiu: right.xiu.slice(), ban: right.ban.slice() };
    }
  });
  return result;
};

/**
 * 冻结调休表
 */
const freezeRestMap = function (map: RestMap): RestMap {
  Object.keys(map).forEach(function (year) {
    Object.freeze(map[year].xiu);
    Object.freeze(map[year].ban);
    Object.freeze(map[year]);
  });
  return Object.freeze(map);
};

/**
 * 建立年份 -> Set 的索引
 */
const buildRestIndex = function (map: RestMap): RestIndex {
  const index: RestIndex = {};
  Object.keys(map).forEach(function (year) {
    index[year] = {
      xiu: new Set(map[year].xiu),
      ban: new Set(map[year].ban),
    };
  });
  return index;
};

/**
 * 查询某天的调休状态
 *
 * 只返回一个数字，不再为每天分配 { isHoliday, isBan } 对象。
 */
const restOf = function (index: RestIndex, y: number, m: number, d: number): RestState {
  const entry = index[y];
  if (!entry) return 0;

  const key = mmddOf(m, d);
  if (entry.ban.has(key)) return 2;
  if (entry.xiu.has(key)) return 1;
  return 0;
};

export { normalizeRestMap, mergeRestMap, freezeRestMap, buildRestIndex, restOf };
export type { RestEntry };
