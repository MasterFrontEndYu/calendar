import { afterEach, describe, expect, it } from "vite-plus/test";
import calendar from "../src/index.ts";

// 每个用例结束后恢复内置数据，避免相互污染
afterEach(() => {
  calendar.resetHolidays();
});

describe("createConverter 隔离性", () => {
  it("两套配置互不影响", () => {
    const a = calendar.createConverter({ setFestival: { sFtv: { "1115": ["A 节日"] } } });
    const b = calendar.createConverter({ setFestival: { sFtv: { "1115": ["B 节日"] } } });

    expect(a.solarToLunar(2026, 11, 15).gljr).toContain("A 节日");
    expect(a.solarToLunar(2026, 11, 15).gljr).not.toContain("B 节日");
    expect(b.solarToLunar(2026, 11, 15).gljr).toContain("B 节日");
    expect(b.solarToLunar(2026, 11, 15).gljr).not.toContain("A 节日");
  });

  it("不影响全局配置，也不被全局 setHolidays 影响", () => {
    const converter = calendar.createConverter({ setFestival: { sFtv: { "1115": ["A 节日"] } } });
    calendar.setHolidays({ setFestival: { sFtv: { "1115": ["全局节日"] } } });

    expect(converter.solarToLunar(2026, 11, 15).gljr).toContain("A 节日");
    expect(converter.solarToLunar(2026, 11, 15).gljr).not.toContain("全局节日");
    expect(calendar.solarToLunar(2026, 11, 15).gljr).toContain("全局节日");
    expect(calendar.solarToLunar(2026, 11, 15).gljr).not.toContain("A 节日");
  });

  it("创建时固定配置，之后修改入参不影响结果", () => {
    const config = { setFestival: { sFtv: { "1115": ["A 节日"] } } };
    const converter = calendar.createConverter(config);
    config.setFestival.sFtv["1115"].push("后来加的");

    expect(converter.solarToLunar(2026, 11, 15).gljr).toEqual(["A 节日"]);
  });

  it("默认合并内置数据，replace 丢弃内置数据", () => {
    const merged = calendar.createConverter({ setFestival: { sFtv: { "0101": ["公司年会"] } } });
    expect(merged.solarToLunar(2026, 1, 1).gljr).toContain("元旦");
    expect(merged.solarToLunar(2026, 1, 1).gljr).toContain("公司年会");

    const replaced = calendar.createConverter(
      { setFestival: { sFtv: { "0101": ["只此一个"] } } },
      { replace: true },
    );
    expect(replaced.solarToLunar(2026, 1, 1).gljr).toEqual(["只此一个"]);
  });

  it("调休配置独立生效", () => {
    const converter = calendar.createConverter({ setRest: { 2027: { xiu: ["0104"] } } });
    expect(converter.solarToLunar(2027, 1, 4).xiu).toBe(true);
    expect(calendar.solarToLunar(2027, 1, 4).xiu).toBe(false);
  });

  it("lunarToSolar 也使用自己的配置", () => {
    const converter = calendar.createConverter({
      setFestival: { lFtv: { "0101": ["自定义春节"] } },
    });

    // 2024 正月初一 = 2024-02-10
    const result = converter.lunarToSolar(2024, 1, 1);
    expect(result.cYear).toBe(2024);
    expect(result.nljr).toContain("自定义春节");
    expect(calendar.lunarToSolar(2024, 1, 1).nljr).not.toContain("自定义春节");
  });

  it("不传配置时等价于内置数据", () => {
    const plain = calendar.createConverter();
    expect(plain.solarToLunar(2026, 1, 1).gljr).toEqual(calendar.solarToLunar(2026, 1, 1).gljr);
    expect(plain.solarToLunar(2026, 10, 1).xiu).toBe(true);
  });

  it("solarToLunar 的范围校验与全局一致", () => {
    const converter = calendar.createConverter();
    expect(() => converter.solarToLunar(1899, 12, 31)).toThrow(RangeError);
    expect(() => converter.solarToLunar(2100, 12, 31)).not.toThrow();
  });
});

describe("createConverter.getHolidays", () => {
  it("返回深拷贝，改动不影响转换器", () => {
    const converter = calendar.createConverter({ setFestival: { sFtv: { "1115": ["A 节日"] } } });
    const snapshot = converter.getHolidays();
    snapshot.setFestival.sFtv["1115"].push("污染");

    expect(converter.solarToLunar(2026, 11, 15).gljr).toEqual(["A 节日"]);
  });

  it("快照可以再喂给 createConverter", () => {
    const converter = calendar.createConverter({
      setFestival: { sFtv: { "1115": ["A 节日"] } },
      setRest: { 2027: { xiu: ["0104"] } },
    });
    const copy = calendar.createConverter(converter.getHolidays());

    expect(copy.solarToLunar(2026, 11, 15).gljr).toEqual(["A 节日"]);
    expect(copy.solarToLunar(2027, 1, 4).xiu).toBe(true);
  });
});

describe("createConverter 配置校验", () => {
  it("错误信息带 createConverter 字段路径", () => {
    expect(() => calendar.createConverter({ setFestival: { sFtv: { "1-1": ["x"] } } })).toThrow(
      /createConverter\.setFestival\.sFtv/,
    );
    expect(() =>
      calendar.createConverter({ setRest: { 2026: { xiu: [], baN: [] } } } as never),
    ).toThrow(/createConverter\.setRest\.2026\.baN/);
  });

  it("非法配置不会影响全局配置", () => {
    calendar.setHolidays({ setFestival: { sFtv: { "1120": ["有效"] } } });
    expect(() => calendar.createConverter({ setFestival: { sFtv: { bad: ["x"] } } })).toThrow(
      TypeError,
    );
    expect(calendar.solarToLunar(2026, 11, 20).gljr).toContain("有效");
  });
});
