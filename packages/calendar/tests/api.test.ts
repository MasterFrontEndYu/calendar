import { afterEach, describe, expect, it } from "vite-plus/test";
import calendar from "../src/index.ts";

afterEach(() => {
  calendar.resetHolidays();
});

describe("默认 converter", () => {
  it("直接提供只读方法与全局配置方法", () => {
    expect(typeof calendar.solarToLunar).toBe("function");
    expect(typeof calendar.lunarToSolar).toBe("function");
    expect(typeof calendar.getHolidays).toBe("function");
    expect(typeof calendar.setHolidays).toBe("function");
    expect(typeof calendar.resetHolidays).toBe("function");
    expect(typeof calendar.createConverter).toBe("function");
    expect(typeof calendar.utils.solarFirstWeek).toBe("function");
  });

  it("createConverter 与默认 converter 同形、结果一致", () => {
    const custom = calendar.createConverter();

    expect(custom.solarToLunar(2026, 4, 5)).toEqual(calendar.solarToLunar(2026, 4, 5));
    expect(custom.lunarToSolar(2024, 1, 1)).toEqual(calendar.lunarToSolar(2024, 1, 1));
    expect(custom.getHolidays()).toEqual(calendar.getHolidays());
  });

  it("setHolidays 改的是默认 converter 自己的状态", () => {
    calendar.setHolidays({ setFestival: { sFtv: { "0405": ["测试"] } } });

    expect(calendar.solarToLunar(2026, 4, 5).Gljr).toContain("测试");
    expect(calendar.createConverter().solarToLunar(2026, 4, 5).Gljr).not.toContain("测试");
  });
});
