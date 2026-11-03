/** 第三方节假日数据源：不依赖 @sanguogege/calendar */
export interface CompanyRest {
  /** 显示名称 */
  name: string;
  /** holiday = 放假，makeup = 补班 */
  type: "holiday" | "makeup";
}

const FIXED: Record<string, CompanyRest> = {
  "01-01": { name: "公司元旦", type: "holiday" },
  "05-01": { name: "公司劳动节", type: "holiday" },
  "10-01": { name: "公司国庆", type: "holiday" },
};

const pad = function (value: number): string {
  return String(value).padStart(2, "0");
};

/**
 * 第三方接口：返回某一天的节假日 / 调休信息
 *
 * 规则可以来自接口、数据库或公司配置；这里用一个固定表和两条规则演示。
 */
export function getCompanyRest(date: Date): CompanyRest | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = date.getDay();

  const fixed = FIXED[`${pad(month)}-${pad(day)}`];
  if (fixed) return fixed;

  // 六月第一个周五：公司日
  if (month === 6 && weekday === 5 && day <= 7) {
    return { name: "六月公司日", type: "holiday" };
  }

  // 六月第二个周六：公司日补班
  if (month === 6 && weekday === 6 && day > 7 && day <= 14) {
    return { name: "公司日补班", type: "makeup" };
  }

  return null;
}
