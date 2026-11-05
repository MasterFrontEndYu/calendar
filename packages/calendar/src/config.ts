import festivalJson from "./data/festival.json";
import restJson from "./data/rest.json";
import { describe, failType, isPlainObject } from "./utils/Assert";
import { freezeFestivalMap, mergeFestivalMap, normalizeFestivalMap } from "./utils/SetFestival";
import { buildRestIndex, freezeRestMap, mergeRestMap, normalizeRestMap } from "./utils/SetRest";
import type { FestivalMap, HolidayConfig, HolidaySnapshot, SetHolidayOptions } from "./types";
import type { RestIndex, RestMap } from "./utils/SetRest";

/** 真正用于查询的、已经合并并预建索引的配置 */
export interface ResolvedConfig {
  sFtv: FestivalMap;
  lFtv: FestivalMap;
  rest: RestMap;
  restIndex: RestIndex;
}

const createResolved = function (
  sFtv: FestivalMap,
  lFtv: FestivalMap,
  rest: RestMap,
): ResolvedConfig {
  const frozenRest = freezeRestMap(rest);
  return {
    sFtv: freezeFestivalMap(sFtv),
    lFtv: freezeFestivalMap(lFtv),
    rest: frozenRest,
    restIndex: buildRestIndex(frozenRest),
  };
};

/**
 * 内置数据在模块加载时就校验一遍，数据写错会立刻抛错而不是在运行时返回脏值
 */
const FESTIVAL_DATA = festivalJson as unknown as Record<string, unknown>;

const BASE = createResolved(
  normalizeFestivalMap(FESTIVAL_DATA.sFtv, "data/festival.json.sFtv"),
  normalizeFestivalMap(FESTIVAL_DATA.lFtv, "data/festival.json.lFtv", true),
  normalizeRestMap(restJson, "data/rest.json"),
);

const EMPTY = createResolved({}, {}, {});

const FESTIVAL_FIELDS = ["sFtv", "lFtv"];
const HOLIDAY_FIELDS = ["setFestival", "setRest"];

/**
 * 校验并合并一份配置，返回新的不可变配置。
 *
 * base 不会被修改；replace 为 true 时从空配置开始。
 * path 只用于错误信息，标明是 createCalendar 传错了。
 */
const resolveConfig = function (
  base: ResolvedConfig,
  config: HolidayConfig = {},
  options: SetHolidayOptions = {},
  path = "createCalendar",
): ResolvedConfig {
  if (!isPlainObject(config)) {
    failType(path, `参数必须是对象，收到 ${describe(config)}`);
  }
  Object.keys(config).forEach(function (key) {
    if (HOLIDAY_FIELDS.indexOf(key) === -1) {
      failType(`${path}.${key}`, `不认识的字段，只支持 ${HOLIDAY_FIELDS.join(" 与 ")}`);
    }
  });
  if (!isPlainObject(options)) {
    failType(`${path}(options)`, `第二个参数必须是对象，收到 ${describe(options)}`);
  }
  if (options.replace !== undefined && typeof options.replace !== "boolean") {
    failType(`${path}(options).replace`, `必须是布尔值，收到 ${describe(options.replace)}`);
  }
  const replace = options.replace === true;
  const from = replace ? EMPTY : base;

  const festivalConfig = config.setFestival;
  let sFtv = from.sFtv;
  let lFtv = from.lFtv;
  if (festivalConfig !== undefined) {
    if (!isPlainObject(festivalConfig)) {
      failType(`${path}.setFestival`, `必须是对象，收到 ${describe(festivalConfig)}`);
    }
    Object.keys(festivalConfig).forEach(function (key) {
      if (FESTIVAL_FIELDS.indexOf(key) === -1) {
        failType(
          `${path}.setFestival.${key}`,
          `不认识的字段，只支持 ${FESTIVAL_FIELDS.join(" 与 ")}`,
        );
      }
    });
    if (festivalConfig.sFtv !== undefined) {
      sFtv = mergeFestivalMap(
        from.sFtv,
        normalizeFestivalMap(festivalConfig.sFtv, `${path}.setFestival.sFtv`),
      );
    }
    if (festivalConfig.lFtv !== undefined) {
      lFtv = mergeFestivalMap(
        from.lFtv,
        normalizeFestivalMap(festivalConfig.lFtv, `${path}.setFestival.lFtv`, true),
      );
    }
  }

  const restConfig = config.setRest;
  const rest =
    restConfig === undefined
      ? from.rest
      : mergeRestMap(from.rest, normalizeRestMap(restConfig, `${path}.setRest`));

  return createResolved(sFtv, lFtv, rest);
};

/**
 * 以模块加载时的内置数据为基准，生成一份独立配置。
 *
 * 不读取、也不修改任何全局状态。
 */
const createStandaloneConfig = function (
  config: HolidayConfig = {},
  options: SetHolidayOptions = {},
): ResolvedConfig {
  return resolveConfig(BASE, config, options, "createCalendar");
};

/** 把内部配置转成可再次使用的快照 */
const snapshotOf = function (resolved: ResolvedConfig): HolidaySnapshot {
  const cloneMap = function (map: FestivalMap): FestivalMap {
    const result: FestivalMap = {};
    Object.keys(map).forEach(function (key) {
      result[key] = map[key].slice();
    });
    return result;
  };
  const result: HolidaySnapshot = {
    setFestival: {
      sFtv: cloneMap(resolved.sFtv),
      lFtv: cloneMap(resolved.lFtv),
    },
    setRest: {},
  };
  Object.keys(resolved.rest).forEach(function (year) {
    result.setRest[year] = {
      xiu: resolved.rest[year].xiu.slice(),
      ban: resolved.rest[year].ban.slice(),
    };
  });
  return result;
};

/**
 * 取某份配置的深拷贝，可再次传给 createCalendar()
 */
export { createStandaloneConfig, snapshotOf };
