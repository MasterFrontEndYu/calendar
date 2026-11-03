import { describe, expect, it } from "vite-plus/test";
import { zhCN } from "@sanguogege/calendar-ui";
import type { CalendarDate, MonthInput } from "@sanguogege/calendar-ui";
import { createLunarAdapter } from "../src/index.ts";

const dateOf = function (year: number, month: number, day: number): CalendarDate {
  return { year, month, day, date: new Date(year, month - 1, day), inCurrentMonth: true };
};

const inputOf = function (year: number, month: number, days: CalendarDate[]): MonthInput {
  return {
    year,
    month,
    weekStartsOn: 1,
    today: new Date(year, month - 1, 1),
    locale: zhCN,
    days,
  };
};

describe("createLunarAdapter", () => {
  it("输出副标题、休班标记和农历数据", () => {
    const adapter = createLunarAdapter();
    const decorations = adapter.decorateMonth(
      inputOf(2026, 10, [dateOf(2026, 10, 1), dateOf(2026, 10, 10), dateOf(2026, 10, 11)]),
    );

    expect(decorations[0]?.subtitle).toBe("国庆节");
    expect(decorations[0]?.badge).toEqual({ text: "休", tone: "rest" });
    expect(decorations[0]?.data?.xiu).toBe(true);
    expect(decorations[1]?.badge).toEqual({ text: "班", tone: "work" });
    expect(decorations[1]?.data?.ban).toBe(true);
    expect(decorations[2]?.badge).toBeUndefined();
    expect(decorations[2]?.data?.xiu).toBe(false);
  });

  it("不同 holidays 配置互不影响", () => {
    const a = createLunarAdapter({
      holidays: { setFestival: { sFtv: { "1115": ["A 节"] } } },
    });
    const b = createLunarAdapter({
      holidays: { setFestival: { sFtv: { "1115": ["B 节"] } } },
    });

    const day = [dateOf(2026, 11, 15)];
    expect(a.decorateMonth(inputOf(2026, 11, day))[0]?.data?.gljr).toContain("A 节");
    expect(a.decorateMonth(inputOf(2026, 11, day))[0]?.data?.gljr).not.toContain("B 节");
    expect(b.decorateMonth(inputOf(2026, 11, day))[0]?.data?.gljr).toContain("B 节");
  });

  it("自定义 xiu / ban 直接反映到标记", () => {
    const adapter = createLunarAdapter({
      holidays: { setRest: { 2026: { xiu: ["0110"], ban: ["0111"] } } },
    });

    const decorations = adapter.decorateMonth(
      inputOf(2026, 1, [dateOf(2026, 1, 10), dateOf(2026, 1, 11)]),
    );

    expect(decorations[0]?.badge).toEqual({ text: "休", tone: "rest" });
    expect(decorations[1]?.badge).toEqual({ text: "班", tone: "work" });
  });

  it("超出支持范围的日期返回 null", () => {
    const adapter = createLunarAdapter();
    const decorations = adapter.decorateMonth(inputOf(2101, 1, [dateOf(2101, 1, 1)]));

    expect(decorations[0]).toBeNull();
  });
});
