import festivalJson from "./data/festival.json";
import restJson from "./data/rest.json";
import {
  assertKnownKeys,
  assertPlainObject,
  describe,
  failType,
  normalizeFestivalMap,
  normalizeRestMap,
} from "./utils/Assert";
import { freezeFestivalMap, mergeFestivalMap } from "./utils/SetFestival";
import { buildRestIndex, freezeRestMap, mergeRestMap } from "./utils/SetRest";
import type {
  FestivalMap,
  HolidayConfig,
  HolidaySnapshot,
  NormalizedRestEntry,
  RestMap,
  SetHolidayOptions,
} from "./types";
import type { RestIndex } from "./utils/SetRest";
/** 真正用于查询的、已经合并并预建索引的配置 */
export interface ResolvedConfig {
  sFtv: FestivalMap;
  lFtv: FestivalMap;
  rest: RestMap;
  restIndex: RestIndex;
}

/**
 * 冻结并预建索引；rest 没变时复用调用方给的 restIndex，避免重复建 Set
 */
const createResolved = function (
  sFtv: FestivalMap,
  lFtv: FestivalMap,
  rest: RestMap,
  restIndex?: RestIndex,
): ResolvedConfig {
  const frozenRest = freezeRestMap(rest);
  return {
    sFtv: freezeFestivalMap(sFtv),
    lFtv: freezeFestivalMap(lFtv),
    rest: frozenRest,
    restIndex: restIndex ?? buildRestIndex(frozenRest),
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
 * 用户配置校验一次之后的片段：字段已归一化、去重，可以直接合并。
 *
 * replace 由 options 决定，单独记下来，后面合并时不再重复判断。
 */
interface HolidayPatch {
  replace: boolean;
  sFtv?: FestivalMap;
  lFtv?: FestivalMap;
  rest?: RestMap;
}

/**
 * 校验并规范用户传入的配置，整份配置只在这里检查一次。
 *
 * 返回的片段是全新的数组 / 对象，不和入参共享引用；
 * 合并、冻结、建索引这些后续步骤都直接信任这里的结果，不再重复校验。
 */
const normalizeHoliday = function (
  config: HolidayConfig = {},
  options: SetHolidayOptions = {},
  path = "createCalendar",
): HolidayPatch {
  assertPlainObject(config, path);
  assertKnownKeys(config, HOLIDAY_FIELDS, path);
  assertPlainObject(options, `${path}(options)`, "第二个参数必须是对象");
  if (options.replace !== undefined && typeof options.replace !== "boolean") {
    failType(`${path}(options).replace`, `必须是布尔值，收到 ${describe(options.replace)}`);
  }

  let sFtv: FestivalMap | undefined;
  let lFtv: FestivalMap | undefined;
  if (config.setFestival !== undefined) {
    const festivalConfig = config.setFestival;
    assertPlainObject(festivalConfig, `${path}.setFestival`);
    assertKnownKeys(festivalConfig, FESTIVAL_FIELDS, `${path}.setFestival`);
    if (festivalConfig.sFtv !== undefined) {
      sFtv = normalizeFestivalMap(festivalConfig.sFtv, `${path}.setFestival.sFtv`);
    }
    if (festivalConfig.lFtv !== undefined) {
      lFtv = normalizeFestivalMap(festivalConfig.lFtv, `${path}.setFestival.lFtv`, true);
    }
  }

  return {
    replace: options.replace === true,
    sFtv,
    lFtv,
    rest:
      config.setRest === undefined
        ? undefined
        : normalizeRestMap(config.setRest, `${path}.setRest`),
  };
};

/**
 * 把补丁合并到 base 上；replace 为 true 时从空配置开始。
 *
 * 补丁来自 normalizeHoliday，已经是干净数据，这里只做合并、冻结和建索引。
 */
const applyHoliday = function (base: ResolvedConfig, patch: HolidayPatch): ResolvedConfig {
  const from = patch.replace ? EMPTY : base;
  if (patch.sFtv === undefined && patch.lFtv === undefined && patch.rest === undefined) {
    // 没有用户数据：空补丁直接用 from，省掉一次冻结 + 建索引
    return from;
  }
  return createResolved(
    patch.sFtv === undefined ? from.sFtv : mergeFestivalMap(from.sFtv, patch.sFtv),
    patch.lFtv === undefined ? from.lFtv : mergeFestivalMap(from.lFtv, patch.lFtv),
    patch.rest === undefined ? from.rest : mergeRestMap(from.rest, patch.rest),
    // 调休没变时直接沿用 from 的索引，省掉一次 buildRestIndex
    patch.rest === undefined ? from.restIndex : undefined,
  );
};

/** 复制一份节日表，返回值可以安全修改 */
const cloneFestivalMap = function (map: FestivalMap): FestivalMap {
  const result: FestivalMap = {};
  Object.keys(map).forEach(function (key) {
    result[key] = map[key].slice();
  });
  return result;
};

/** 复制一份调休表，返回值可以安全修改 */
const cloneRestMap = function (rest: RestMap): Record<string, NormalizedRestEntry> {
  const result: Record<string, NormalizedRestEntry> = {};
  Object.keys(rest).forEach(function (year) {
    result[year] = { xiu: rest[year].xiu.slice(), ban: rest[year].ban.slice() };
  });
  return result;
};

/** 把内部配置转成可再次使用的快照 */
const snapshotOf = function (resolved: ResolvedConfig): HolidaySnapshot {
  return {
    setFestival: {
      sFtv: cloneFestivalMap(resolved.sFtv),
      lFtv: cloneFestivalMap(resolved.lFtv),
    },
    setRest: cloneRestMap(resolved.rest),
  };
};

/** 只含用户传入部分的快照：own 不参与查询，不需要冻结 / 建索引 */
const snapshotOfPatch = function (patch: HolidayPatch): HolidaySnapshot {
  return {
    setFestival: {
      sFtv: cloneFestivalMap(patch.sFtv ?? {}),
      lFtv: cloneFestivalMap(patch.lFtv ?? {}),
    },
    setRest: cloneRestMap(patch.rest ?? {}),
  };
};

/**
 * createCalendar 用的配置。
 *
 * 只有一份可查询的 merged；getHolidays({ merged: false }) 要的"用户传入的那部分"
 * 不参与查询，所以不另外建 ResolvedConfig，需要时直接从 patch 生成快照。
 * replace 为 true 时 merged 本身就是用户那份，两条路径共用同一份配置。
 */
const createCalendarConfig = function (
  config: HolidayConfig = {},
  options: SetHolidayOptions = {},
): { merged: ResolvedConfig; snapshotOwn: () => HolidaySnapshot } {
  const patch = normalizeHoliday(config, options);
  const merged = applyHoliday(BASE, patch);
  return {
    merged,
    snapshotOwn: patch.replace ? () => snapshotOf(merged) : () => snapshotOfPatch(patch),
  };
};

export { createCalendarConfig, snapshotOf };
