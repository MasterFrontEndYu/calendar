import { MMDD_RE, describe, failType, isPlainObject } from "./Assert";
import { mmddOf } from "./DateKey";
import type { FestivalMap } from "../types";

/** 没有节日时共用的空数组，冻结后不怕调用方误改 */
const NO_FESTIVAL: readonly string[] = Object.freeze([]) as readonly string[];

/**
 * 校验并规范化节日表。
 * 任何格式错误都会抛出 TypeError，并指出具体是哪个 key。
 * @param input 待校验的节日表
 * @param path 出错时用于定位的路径，例如 "createCalendar.setFestival.sFtv"
 */
const normalizeFestivalMap = function (input: unknown, path: string): FestivalMap {
  if (!isPlainObject(input)) {
    throw failType(path, `必须是对象，收到 ${describe(input)}`);
  }
  const result: FestivalMap = {};
  Object.keys(input).forEach(function (key) {
    if (!MMDD_RE.test(key)) {
      throw failType(
        `${path}.${key}`,
        `节日 key 必须是四位 "MMDD"（如 "0101"），收到 ${describe(key)}`,
      );
    }
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

/**
 * 把两份节日表按 key 合并并去重，不修改入参
 */
const mergeFestivalMap = function (base: FestivalMap, extra?: FestivalMap): FestivalMap {
  if (!extra) return base;
  const result: FestivalMap = { ...base };
  Object.keys(extra).forEach(function (key) {
    const merged = result[key] ? result[key].concat(extra[key]) : extra[key].slice();
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

export { normalizeFestivalMap, mergeFestivalMap, freezeFestivalMap, festivalList, NO_FESTIVAL };
export type { FestivalMap };
