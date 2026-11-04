import type { CalendarLocale } from "../types";

/** 简体中文：默认语言 */
export const zhCN: CalendarLocale = {
  name: "zh-CN",
  weekdays: ["日", "一", "二", "三", "四", "五", "六"],
  weekdaysLong: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
  monthTitle: (year, month) => `${year} 年 ${month} 月`,
  prevMonth: "上个月",
  nextMonth: "下个月",
  collapse: "收起日历",
  expand: "展开日历",
};
