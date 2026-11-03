/**
 * 公历节日 / 农历节日的映射表
 * key 为四位 "MMDD"，value 为节日名称数组
 */
export type FestivalMap = Record<string, string[]>;

/**
 * 节日配置，sFtv 为公历节日，lFtv 为农历节日
 */
export interface FestivalConfig {
  /** 公历节日，key 为 MMDD，例如 { "0101": ["元旦"] } */
  sFtv?: FestivalMap;
  /** 农历节日，key 为 MMDD，例如 { "0101": ["春节"] } */
  lFtv?: FestivalMap;
}

/**
 * 单年的放假与调休配置（用户注入时的形态，两个数组都可省略）
 */
export interface RestEntry {
  /** 该年放假日（MMDD），不含普通周末 */
  xiu?: string[];
  /** 该年调休补班日（MMDD），一般是周末上班 */
  ban?: string[];
}

/**
 * 归一化之后的单年配置：两个数组一定存在，内部查询用
 */
export interface NormalizedRestEntry {
  xiu: string[];
  ban: string[];
}

/**
 * 调休配置，key 为年份，value 为该年的放假/补班日
 */
export type RestConfig = Record<string | number, RestEntry>;

/**
 * getHolidays() 的返回值：结构完整，可直接再传给 setHolidays()
 */
export interface HolidaySnapshot {
  setFestival: {
    sFtv: FestivalMap;
    lFtv: FestivalMap;
  };
  setRest: Record<string, NormalizedRestEntry>;
}

/**
 * setHolidays 的入参
 */
export interface HolidayConfig {
  setFestival?: FestivalConfig;
  setRest?: RestConfig;
}

/**
 * setHolidays 的选项
 */
export interface SetHolidayOptions {
  /** 为 true 时丢弃内置节日/调休数据，只使用传入的数据 */
  replace?: boolean;
}

/**
 * 公历转农历 / 农历转公历的完整结果
 */
export interface LunarResult {
  /** 是否在 rest.json 的放假日列表（xiu）中；与周末无关 */
  xiu: boolean;
  /** 是否在 rest.json 的调休补班日列表（ban）中 */
  ban: boolean;
  /** 公历节日，例如 ["元旦"]；没有节日时是共享的只读空数组 */
  gljr: readonly string[];
  /** 农历节日，例如 ["春节"]；没有节日时是共享的只读空数组 */
  nljr: readonly string[];
  /** 农历年 */
  lYear: number;
  /** 农历月，1-12 */
  lMonth: number;
  /** 农历日，1-30 */
  lDay: number;
  /** 生肖，以农历年为准 */
  animal: string;
  /** 农历月中文名，例如 "正月"、"闰四月" */
  lMonthCn: string;
  /** 农历日中文名，例如 "初一" */
  lDayCn: string;
  /** 公历年 */
  cYear: number;
  /** 公历月，1-12 */
  cMonth: number;
  /** 公历日 */
  cDay: number;
  /** 干支年，以立春为界，与 gzMonth 口径一致 */
  gzYear: string;
  /** 干支年，以正月初一为界，与 animal 口径一致 */
  gzYearLunar: string;
  /** 干支月，以节气为界 */
  gzMonth: string;
  /** 干支日 */
  gzDay: string;
  /** 当天十二个时辰的干支 */
  gzHour: string[];
  /** 是否今天（按本地时区） */
  isToday: boolean;
  /** 是否闰月 */
  isLeap: boolean;
  /** 星期数字，1-7，周一为 1、周日为 7 */
  nWeek: number;
  /** 星期数字，0-6，周日为 0，与 solarFirstWeek 口径一致 */
  dayOfWeek: number;
  /** 星期中文，例如 "星期日" */
  ncWeek: string;
  /** 节气名，当天不是节气时为 null */
  term: string | null;
  /** 星座，例如 "摩羯座" */
  astro: string;
}

/**
 * 固定了一份节假日配置的转换器
 *
 * 由 createConverter() 创建，配置在创建时固定，与全局 setHolidays() 互不影响。
 */
export interface CalendarConverter {
  /** 公历转农历，不传参返回今天 */
  solarToLunar(this: void, y?: number, m?: number, d?: number): LunarResult;
  /** 农历转公历 */
  lunarToSolar(this: void, y: number, m: number, d: number, isLeapMonth?: boolean): LunarResult;
  /** 该转换器当前配置的深拷贝，可再次用于 createConverter() / setHolidays() */
  getHolidays(this: void): HolidaySnapshot;
}
