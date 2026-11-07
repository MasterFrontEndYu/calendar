import { mmddOf } from "./Assert";
import type { FestivalMap } from "../types";

/** 没有节日时共用的空数组，冻结后不怕调用方误改 */
const NO_FESTIVAL: readonly string[] = Object.freeze([]) as readonly string[];

/**
 * 把两份节日表按 key 合并并去重，不修改入参
 */
const mergeFestivalMap = function (base: FestivalMap, extra?: FestivalMap): FestivalMap {
  if (!extra) return base;
  const result: FestivalMap = { ...base };
  Object.keys(extra).forEach(function (key) {
    const merged = result[key] ? result[key].concat(extra[key]) : extra[key];
    result[key] = Array.from(new Set(merged));
  });
  return result;
};

/**
 * 冻结节日表，防止调用方后续误改
 */
const freezeFestivalMap = function (map: FestivalMap): FestivalMap {
  Object.keys(map).forEach(function (key) {
    Object.freeze(map[key]);
  });
  return Object.freeze(map);
};

/**
 * 取某一天（MMDD）的节日名称，没有则返回共享的空数组。
 *
 * 返回的是只读数组：配置里的数组已被冻结，调用方要追加节日必须自己 copy。
 */
const festivalList = function (map: FestivalMap, m: number, d: number): readonly string[] {
  return map[mmddOf(m, d)] ?? NO_FESTIVAL;
};

export { mergeFestivalMap, freezeFestivalMap, festivalList, NO_FESTIVAL };
export type { FestivalMap };
