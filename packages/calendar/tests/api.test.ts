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

  it("默认导出就是 createCalendar", async () => {
    const module = await import("../src/index.ts");
    expect(module.default).toBe(module.createCalendar);
  });
});
