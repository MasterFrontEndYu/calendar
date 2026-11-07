import { mmddOf } from "./Assert";
import type { RestMap } from "../types";

/** 预建索引，避免每次查询都做数组 includes */
export interface RestIndexEntry {
  xiu: Set<string>;
  ban: Set<string>;
}
export type RestIndex = Record<string, RestIndexEntry>;

/**
 * 某一天的调休状态
 *
 * 放假和补班来自同一份国家法定节假日数据，同一天不会既是放假又是补班；
 * 既不在 xiu 也不在 ban 的普通日返回 undefined。
 */
export type RestState = "xiu" | "ban";

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
      result[year] = left;
    } else if (right) {
      result[year] = right;
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
 * 只返回一个字符串，不为每天分配 { isHoliday, isBan } 对象。
 */
const restOf = function (index: RestIndex, y: number, m: number, d: number): RestState | undefined {
  const entry = index[y];
  if (!entry) return undefined;

  const key = mmddOf(m, d);
  if (entry.ban.has(key)) return "ban";
  if (entry.xiu.has(key)) return "xiu";
  return undefined;
};

export { mergeRestMap, freezeRestMap, buildRestIndex, restOf };
