import { describe, expect, it } from "vite-plus/test";
import createCalendar, { utils } from "../src/index.ts";

const calendar = createCalendar();

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (r: { cYear: number; cMonth: number; cDay: number }) =>
  `${r.cYear}-${pad(r.cMonth)}-${pad(r.cDay)}`;

/**
 * 依据香港天文台《公曆與農曆日期對照表》(1901-2100) 校正的四条 LunarInfo 记录。
 * 这四处都是 29/30 天写反，年总天数不变，所以春节和其它年份不受影响，
 * 只有月内边界错一天——全量「公历转农历再转回来」的往返测试抓不到，必须用外部锚点。
 * 数据源：https://www.hko.gov.hk/tc/gts/time/conversion1_text.htm
 */
describe("农历数据表：HKO 对照的月长修正", () => {
  it("1933 闰五月 30 天、六月 29 天", () => {
    expect([utils.leapMonth(1933), utils.leapDays(1933)]).toEqual([5, 30]);
    expect([utils.lMonthDays(1933, 5), utils.lMonthDays(1933, 6)]).toEqual([30, 29]);
    expect(utils.lYearDays(1933)).toBe(384);
  });

  it("1996 五月、七月 30 天，六月、八月 29 天", () => {
    expect(utils.leapMonth(1996)).toBe(0);
    expect([5, 6, 7, 8].map((m) => utils.lMonthDays(1996, m))).toEqual([30, 29, 30, 29]);
    expect(utils.lYearDays(1996)).toBe(354);
  });

  // 2057 年九月朔在 2057-09-29 00:00 CST 前后（分钟级），HKO 把九月初一记为 09-28，这里按 HKO 取值
  it("2057 八月 29 天、九月 30 天", () => {
    expect(utils.leapMonth(2057)).toBe(0);
    expect([utils.lMonthDays(2057, 8), utils.lMonthDays(2057, 9)]).toEqual([29, 30]);
    expect(utils.lYearDays(2057)).toBe(354);
  });

  it("2060 三月 29 天、四月 30 天", () => {
    expect(utils.leapMonth(2060)).toBe(0);
    expect([utils.lMonthDays(2060, 3), utils.lMonthDays(2060, 4)]).toEqual([29, 30]);
    expect(utils.lYearDays(2060)).toBe(354);
  });
});

describe("公历转农历：修正年份的月界锚点", () => {
  it("1933-07-22 是闰五月三十，次日才是六月初一", () => {
    const r = calendar.solarToLunar(1933, 7, 22);
    expect([r.lYear, r.lMonth, r.lDay, r.isLeap]).toEqual([1933, 5, 30, true]);
    expect([r.lMonthCn, r.lDayCn]).toEqual(["闰五月", "三十"]);

    const next = calendar.solarToLunar(1933, 7, 23);
    expect([next.lMonthCn, next.lDayCn]).toEqual(["六月", "初一"]);
  });

  it("1996-07-15 是五月三十，1996-09-12 是七月三十", () => {
    const may = calendar.solarToLunar(1996, 7, 15);
    expect([may.lMonthCn, may.lDayCn, may.isLeap]).toEqual(["五月", "三十", false]);

    const jul = calendar.solarToLunar(1996, 9, 12);
    expect([jul.lMonthCn, jul.lDayCn]).toEqual(["七月", "三十"]);

    const aug = calendar.solarToLunar(1996, 9, 13);
    expect([aug.lMonthCn, aug.lDayCn]).toEqual(["八月", "初一"]);
  });

  it("1996 中秋节落在八月十五（09-27）", () => {
    const eve = calendar.solarToLunar(1996, 9, 26);
    expect([eve.lMonthCn, eve.lDayCn]).toEqual(["八月", "十四"]);

    const mid = calendar.solarToLunar(1996, 9, 27);
    expect([mid.lMonthCn, mid.lDayCn]).toEqual(["八月", "十五"]);
    expect(mid.nljr).toContain("中秋节");
  });

  it("2057-09-28 是九月初一，2057-10-27 是九月三十", () => {
    const prev = calendar.solarToLunar(2057, 9, 27);
    expect([prev.lMonthCn, prev.lDayCn]).toEqual(["八月", "廿九"]);

    const first = calendar.solarToLunar(2057, 9, 28);
    expect([first.lMonthCn, first.lDayCn]).toEqual(["九月", "初一"]);

    const last = calendar.solarToLunar(2057, 10, 27);
    expect([last.lMonthCn, last.lDayCn]).toEqual(["九月", "三十"]);
  });

  it("2060-04-30 是四月初一，此前 04-29 仍是三月廿九", () => {
    const prev = calendar.solarToLunar(2060, 4, 29);
    expect([prev.lMonthCn, prev.lDayCn]).toEqual(["三月", "廿九"]);

    const first = calendar.solarToLunar(2060, 4, 30);
    expect([first.lMonthCn, first.lDayCn]).toEqual(["四月", "初一"]);
  });
});

describe("农历转公历：此前被误拒的三十日", () => {
  it("1933 闰五月三十按闰月换算，五月的三十是另一天", () => {
    expect(ymd(calendar.lunarToSolar(1933, 5, 30, false))).toBe("1933-06-22");
    expect(ymd(calendar.lunarToSolar(1933, 5, 30, true))).toBe("1933-07-22");
  });

  it("1996 五月三十、七月三十可以换算", () => {
    expect(ymd(calendar.lunarToSolar(1996, 5, 30))).toBe("1996-07-15");
    expect(ymd(calendar.lunarToSolar(1996, 7, 30))).toBe("1996-09-12");
  });

  it("2057 九月三十、2060 四月三十可以换算", () => {
    expect(ymd(calendar.lunarToSolar(2057, 9, 30))).toBe("2057-10-27");
    expect(ymd(calendar.lunarToSolar(2060, 4, 30))).toBe("2060-05-29");
  });

  it("修正的是月长而不是放宽校验：小月三十仍抛错", () => {
    expect(() => calendar.lunarToSolar(1933, 6, 30)).toThrow(RangeError);
    expect(() => calendar.lunarToSolar(1996, 6, 30)).toThrow(RangeError);
    expect(() => calendar.lunarToSolar(2057, 8, 30)).toThrow(RangeError);
    expect(() => calendar.lunarToSolar(2060, 3, 30)).toThrow(RangeError);
  });
});
