import { describe, expect, it } from "vite-plus/test";
import { monthFromIndex, normalizeMonth } from "../src/utils/date.ts";

describe("月份整数运算", () => {
  it("monthFromIndex 对负索引返回合法月份", () => {
    expect(monthFromIndex(-1)).toEqual({ year: -1, month: 12 });
    expect(monthFromIndex(-12)).toEqual({ year: -1, month: 1 });
  });

  it("normalizeMonth 支持 0-99 年且能跨年进位", () => {
    expect(normalizeMonth(50, 1)).toEqual({ year: 50, month: 1 });
    expect(normalizeMonth(2026, 13)).toEqual({ year: 2027, month: 1 });
    expect(normalizeMonth(2026, 0)).toEqual({ year: 2025, month: 12 });
  });
});
