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
  /** 当天是否休息：周末或法定节假日，且不是调休补班日 */
  Xiu: boolean;
  /** 当天是否调休补班 */
  Ban: boolean;
  /** 公历节日，例如 ["元旦"]；没有节日时是共享的只读空数组 */
  Gljr: readonly string[];
  /** 农历节日，例如 ["春节"]；没有节日时是共享的只读空数组 */
  Nljr: readonly string[];
  /** 农历年 */
  lYear: number;
  /** 农历月，1-12 */
  lMonth: number;
  /** 农历日，1-30 */
  lDay: number;
  /** 生肖，以农历年为准 */
  Animal: string;
  /** 农历月中文名，例如 "正月"、"闰四月" */
  LMonthCn: string;
  /** 农历日中文名，例如 "初一" */
  LDayCn: string;
  /** 公历年 */
  cYear: number;
  /** 公历月，1-12 */
  cMonth: number;
  /** 公历日 */
  cDay: number;
  /** 干支年，以立春为界，与 gzMonth 口径一致 */
  gzYear: string;
  /** 干支年，以正月初一为界，与 Animal 口径一致 */
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
  Term: string | null;
  /** 星座，例如 "摩羯座" */
  astro: string;
}
