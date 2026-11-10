import { describe, expect, it } from "vite-plus/test";
import type { CalendarLocale } from "../src/index.ts";
import { enUS, locales, resolveLocale, zhCN } from "../src/index.ts";
import { createHeaderLabel } from "../src/core/labels.ts";

describe("en-US 语言包", () => {
  it("头部标题按 month-first 排列", () => {
    expect(enUS.titleOrder).toBe("month-first");
    expect(enUS.monthTitle(2026, 10)).toBe("October 2026");
  });

  it("月份越界时回退到数字", () => {
    expect(enUS.monthTitle(2026, 13)).toBe("13 2026");
    expect(enUS.monthName?.(13)).toBe("13");
  });

  it("选择层使用三字母月份缩写和纯数字年份", () => {
    expect(enUS.monthName?.(1)).toBe("Jan");
    expect(enUS.monthName?.(12)).toBe("Dec");
    expect(enUS.yearLabel?.(2026)).toBe("2026");
  });

  it("popup 标题区分单复数，月份越界时回退到数字", () => {
    const day = { year: 2026, month: 10, day: 1, date: new Date(2026, 9, 1), inCurrentMonth: true };

    expect(enUS.popupTitle?.(day, 1)).toBe("October 1 · 1 item");
    expect(enUS.popupTitle?.(day, 3)).toBe("October 1 · 3 items");
    expect(enUS.popupTitle?.({ ...day, month: 13 }, 2)).toBe("13 1 · 2 items");
  });
});

describe("resolveLocale", () => {
  it("支持内置名称、自定义对象和默认值", () => {
    expect(resolveLocale()).toBe(zhCN);
    expect(resolveLocale("zh-CN")).toBe(zhCN);
    expect(resolveLocale("en-US")).toBe(enUS);
    expect(locales["en-US"]).toBe(enUS);

    const custom: CalendarLocale = { ...zhCN, name: "custom" };
    expect(resolveLocale(custom)).toBe(custom);
  });
});

describe("双视图头部标题", () => {
  it("单月时没有自定义 label", () => {
    expect(createHeaderLabel(zhCN, 1)).toBeUndefined();
  });

  it("双月时标题显示连续两个月份", () => {
    const label = createHeaderLabel(zhCN, 2);

    expect(label?.(2026, 10)).toEqual({ year: "2026 年", month: "10 月 – 11 月" });
    expect(label?.(2026, 12)).toEqual({ year: "2026 年", month: "12 月 – 1 月" });
  });

  it("语言包缺少 monthName / yearLabel 时退回数字", () => {
    const bare: CalendarLocale = {
      name: "bare",
      weekdays: zhCN.weekdays,
      weekdaysLong: zhCN.weekdaysLong,
      monthTitle: (year, month) => `${year}-${month}`,
      prevMonth: "prev",
      nextMonth: "next",
    };
    const label = createHeaderLabel(bare, 2);

    expect(label?.(2026, 10)).toEqual({ year: "2026", month: "10 – 11" });
  });
});

describe("日期对象", () => {
  it("zh-CN 标题和选择层文案", () => {
    expect(zhCN.monthTitle(2026, 10)).toBe("2026 年 10 月");
    expect(zhCN.monthName?.(10)).toBe("10 月");
    expect(zhCN.yearLabel?.(2026)).toBe("2026 年");
  });
});
