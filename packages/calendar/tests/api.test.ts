import { describe, expect, it } from "vite-plus/test";
import createCalendar, { utils } from "../src/index.ts";

describe("createCalendar", () => {
  it("不传参数时使用内置数据", () => {
    const calendar = createCalendar();

    expect(calendar.solarToLunar(2026, 10, 1).xiu).toBe(true);
    expect(calendar.lunarToSolar(2024, 1, 1).cYear).toBe(2024);
    expect(calendar.getHolidays().setRest["2026"].xiu.length).toBeGreaterThan(0);
  });

  it("每次调用都是独立实例", () => {
    const a = createCalendar({ setFestival: { sFtv: { "1115": ["A 节日"] } } });
    const b = createCalendar({ setFestival: { sFtv: { "1115": ["B 节日"] } } });
    const plain = createCalendar();

    expect(a.solarToLunar(2026, 11, 15).gljr).toContain("A 节日");
    expect(a.solarToLunar(2026, 11, 15).gljr).not.toContain("B 节日");
    expect(b.solarToLunar(2026, 11, 15).gljr).toContain("B 节日");
    expect(plain.solarToLunar(2026, 11, 15).gljr).not.toContain("A 节日");
  });

  it("配置在创建时固定，之后修改入参不影响实例", () => {
    const config = { setFestival: { sFtv: { "1115": ["A 节日"] } } };
    const calendar = createCalendar(config);
    config.setFestival.sFtv["1115"].push("后来加的");

    expect(calendar.solarToLunar(2026, 11, 15).gljr).toEqual(["A 节日"]);
  });

  it("getHolidays 返回深拷贝，可直接再传给 createCalendar", () => {
    const source = createCalendar({
      setFestival: { sFtv: { "1115": ["A 节日"] } },
      setRest: { 2027: { xiu: ["0104"] } },
    });
    const snapshot = source.getHolidays();
    const copy = createCalendar(snapshot);

    snapshot.setFestival.sFtv["1115"].push("污染");

    expect(source.solarToLunar(2026, 11, 15).gljr).toEqual(["A 节日"]);
    expect(copy.solarToLunar(2026, 11, 15).gljr).toEqual(["A 节日"]);
    expect(copy.solarToLunar(2027, 1, 4).xiu).toBe(true);
  });

  it("utils 仍然是无状态具名导出", () => {
    expect(typeof utils.solarFirstWeek).toBe("function");
    expect(utils.toAstro(4, 19)).toBe("白羊座");
  });

  it("节日数组一律只读，动态节日也不可变", () => {
    const calendar = createCalendar();
    const dynamicSolar = calendar.solarToLunar(2026, 5, 10).gljr; // 母亲节
    const dynamicLunar = calendar.solarToLunar(2026, 2, 16).nljr; // 除夕

    expect(dynamicSolar).toContain("母亲节");
    expect(dynamicLunar).toContain("除夕");
    expect(Object.isFrozen(dynamicSolar)).toBe(true);
    expect(Object.isFrozen(dynamicLunar)).toBe(true);
    expect(() => (dynamicSolar as string[]).push("污染")).toThrow();
    expect(() => (dynamicLunar as string[]).push("污染")).toThrow();
  });

  it("isLeapMonth 必须是布尔值", () => {
    const calendar = createCalendar();

    expect(() => calendar.lunarToSolar(2020, 4, 1, "true" as never)).toThrow(TypeError);
    expect(() => calendar.lunarToSolar(2020, 4, 1, 1 as never)).toThrow(TypeError);
    expect(calendar.lunarToSolar(2020, 4, 1, true).isLeap).toBe(true);
  });

  it("getHolidays({ merged: false }) 只导出用户传入的部分", () => {
    const calendar = createCalendar({
      setFestival: { sFtv: { "1115": ["A 节日"] } },
      setRest: { 2027: { xiu: ["0104"] } },
    });

    const own = calendar.getHolidays({ merged: false });
    expect(Object.keys(own.setFestival.sFtv)).toEqual(["1115"]);
    expect(Object.keys(own.setFestival.lFtv)).toEqual([]);
    expect(Object.keys(own.setRest)).toEqual(["2027"]);

    const merged = calendar.getHolidays();
    expect(Object.keys(merged.setFestival.sFtv).length).toBeGreaterThan(1);
    expect(merged.setRest["2026"].xiu.length).toBeGreaterThan(0);
  });

  it("getHolidays 的 options 会被校验", () => {
    const calendar = createCalendar();

    expect(() => calendar.getHolidays({ merged: 1 as never })).toThrow(TypeError);
    expect(() => calendar.getHolidays("x" as never)).toThrow(TypeError);
  });

  it("默认导出就是 createCalendar", async () => {
    const module = await import("../src/index.ts");
    expect(module.default).toBe(module.createCalendar);
  });
});
