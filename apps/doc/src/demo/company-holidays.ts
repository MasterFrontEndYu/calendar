/** 第三方节假日数据源：不依赖 @sanguogege/calendar */
export type CompanyRestType = "holiday" | "makeup";

/** 和 setRest 相同的形状：按年列出放假 / 补班的 MMDD，names 提供副标题 */
export interface CompanyRestConfig {
  [year: string]: {
    xiu?: string[];
    ban?: string[];
    names?: Record<string, string>;
  };
}

export const COMPANY_REST: CompanyRestConfig = {
  2026: {
    xiu: ["0101", "0501", "0605", "1001"],
    ban: ["0613"],
    names: {
      "0101": "公司元旦",
      "0501": "公司劳动节",
      "0605": "六月公司日",
      "0613": "公司日补班",
      "1001": "公司国庆",
    },
  },
};

export interface CompanyRest {
  /** YYYY-MM-DD */
  date: string;
  type: CompanyRestType;
  /** 格子副标题 */
  subtitle: string;
}

const pad = function (value: number): string {
  return String(value).padStart(2, "0");
};

/** 第三方接口：按日期返回节假日 / 调休数据 */
export function getCompanyRest(date: Date): CompanyRest | null {
  const year = COMPANY_REST[String(date.getFullYear())];
  if (!year) return null;

  const mmdd = `${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const subtitle = year.names?.[mmdd];

  if (year.ban?.includes(mmdd)) {
    return { date: day, type: "makeup", subtitle: subtitle ?? "公司补班" };
  }
  if (year.xiu?.includes(mmdd)) {
    return { date: day, type: "holiday", subtitle: subtitle ?? "公司假日" };
  }
  return null;
}
