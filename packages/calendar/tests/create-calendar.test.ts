import { describe, expect, it } from "vite-plus/test";
import createCalendar from "../src/index.ts";

describe("createCalendar 隔离性", () => {
  it("两套配置互不影响", () => {
    const a = createCalendar({ setFestival: { sFtv: { "1115": ["A 节日"] } } });
    const b = createCalendar({ setFestival: { sFtv: { "1115": ["B 节日"] } } });

    expect(a.solarToLunar(2026, 11, 15).gljr).toContain("A 节日");
    expect(a.solarToLunar(2026, 11, 15).gljr).not.toContain("B 节日");
    expect(b.solarToLunar(2026, 11, 15).gljr).toContain("B 节日");
    expect(b.solarToLunar(2026, 11, 15).gljr).not.toContain("A 节日");
  });

  it("默认合并内置数据，replace 丢弃内置数据", () => {
    const merged = createCalendar({ setFestival: { sFtv: { "0101": ["公司年会"] } } });
    expect(merged.solarToLunar(2026, 1, 1).gljr).toContain("元旦");
    expect(merged.solarToLunar(2026, 1, 1).gljr).toContain("公司年会");

    const replaced = createCalendar(
      { setFestival: { sFtv: { "0101": ["只此一个"] } } },
      { replace: true },
    );
    expect(replaced.solarToLunar(2026, 1, 1).gljr).toEqual(["只此一个"]);
  });

  it("调休配置独立生效", () => {
    const custom = createCalendar({ setRest: { 2027: { xiu: ["0104"] } } });

    expect(custom.solarToLunar(2027, 1, 4).xiu).toBe(true);
    expect(createCalendar().solarToLunar(2027, 1, 4).xiu).toBe(false);
  });

  it("lunarToSolar 也使用自己的配置", () => {
    const calendar = createCalendar({
      setFestival: { lFtv: { "0101": ["自定义春节"] } },
    });

    const result = calendar.lunarToSolar(2024, 1, 1);
    expect(result.cYear).toBe(2024);
    expect(result.nljr).toContain("自定义春节");
    expect(createCalendar().lunarToSolar(2024, 1, 1).nljr).not.toContain("自定义春节");
  });

  it("不传配置时等价于内置数据", () => {
    const plain = createCalendar();

    expect(plain.solarToLunar(2026, 1, 1).gljr).toEqual(
      createCalendar().solarToLunar(2026, 1, 1).gljr,
    );
    expect(plain.solarToLunar(2026, 10, 1).xiu).toBe(true);
  });

  it("范围校验与内置实例一致", () => {
    const calendar = createCalendar();

    expect(() => calendar.solarToLunar(1899, 12, 31)).toThrow(RangeError);
    expect(() => calendar.solarToLunar(2100, 12, 31)).not.toThrow();
  });
});

describe("createCalendar.getHolidays", () => {
  it("返回深拷贝，改动不影响实例", () => {
    const calendar = createCalendar({ setFestival: { sFtv: { "1115": ["A 节日"] } } });
    const snapshot = calendar.getHolidays();
    snapshot.setFestival.sFtv["1115"].push("污染");

    expect(calendar.solarToLunar(2026, 11, 15).gljr).toEqual(["A 节日"]);
  });

  it("快照可以再喂给 createCalendar", () => {
    const calendar = createCalendar({
      setFestival: { sFtv: { "1115": ["A 节日"] } },
      setRest: { 2027: { xiu: ["0104"] } },
    });
    const copy = createCalendar(calendar.getHolidays());

    expect(copy.solarToLunar(2026, 11, 15).gljr).toEqual(["A 节日"]);
    expect(copy.solarToLunar(2027, 1, 4).xiu).toBe(true);
  });
});

describe("createCalendar 配置错误", () => {
  it("错误信息带 createCalendar 字段路径", () => {
    expect(() => createCalendar({ setFestival: { sFtv: { "1-1": ["x"] } } })).toThrow(
      /createCalendar\.setFestival\.sFtv/,
    );
    expect(() => createCalendar({ setRest: { 2026: { xiu: [], baN: [] } } } as never)).toThrow(
      /createCalendar\.setRest\.2026\.baN/,
    );
  });
});
