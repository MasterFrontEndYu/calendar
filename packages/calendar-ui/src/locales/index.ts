import { enUS } from "./en-US";
import { zhCN } from "./zh-CN";
import type { CalendarLocale, CalendarLocaleName } from "../types";

/** 内置语言包，key 可直接传给 createCalendarUI 的 locale 选项 */
export const locales: Record<CalendarLocaleName, CalendarLocale> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

/** 把 "zh-CN" 这类名称或自定义语言包，统一解析成语言包对象 */
export const resolveLocale = function (
  locale: CalendarLocale | CalendarLocaleName = "zh-CN",
): CalendarLocale {
  if (typeof locale !== "string") return locale;
  return locales[locale];
};

export { zhCN, enUS };
