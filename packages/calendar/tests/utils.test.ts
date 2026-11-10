import { describe, expect, it } from "vite-plus/test";
import createCalendar, { utils } from "../src/index.ts";
import { describe as describeValue } from "../src/utils/Assert.ts";
import { mergeFestivalMap } from "../src/utils/SetFestival.ts";
import { buildRestIndex, freezeRestMap, mergeRestMap, restOf } from "../src/utils/SetRest.ts";

describe("参数描述", () => {
  it("按类型给出便于排查的短字符串", () => {
    expect(describeValue("x")).toBe('"x"');
    expect(describeValue(1)).toBe("1");
    expect(describeValue(true)).toBe("true");
    expect(describeValue(null)).toBe("null");
    expect(describeValue(undefined)).toBe("undefined");
    expect(describeValue([1, 2])).toBe("Array(2)");
    expect(describeValue({ a: 1, b: 2 })).toBe("Object(keys: a, b)");
    expect(describeValue({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 })).toBe(
      "Object(keys: a, b, c, d, e, …)",
    );
    expect(describeValue(() => {})).toBe("function");
    expect(describeValue(Symbol("s"))).toBe("symbol");
  });

  it("配置里出现数组 / 对象 / 函数时错误信息带类型摘要", () => {
    expect(() => createCalendar({ setFestival: { sFtv: [] } } as never)).toThrow(/Array\(0\)/);
    expect(() =>
      createCalendar({ setFestival: { sFtv: { "0101": [{ a: 1 }] } } } as never),
    ).toThrow(/Object\(keys: a\)/);
    expect(() =>
      createCalendar({ setFestival: { sFtv: { "0101": [(): void => undefined] } } } as never),
    ).toThrow(/function/);
  });

  it("调休日期不是数组时抛 TypeError", () => {
    expect(() => createCalendar({ setRest: { 2026: { xiu: "0101" } } } as never)).toThrow(
      /xiu.*字符串数组/,
    );
    expect(() => createCalendar({ setRest: { 2026: { ban: 1 } } } as never)).toThrow(TypeError);
  });

  it("农历节日 key 也要通过农历日期校验", () => {
    expect(() => createCalendar({ setFestival: { lFtv: { "0231": ["x"] } } })).toThrow(
      /农历不存在 2 月 31 日/,
    );
    expect(() => createCalendar({ setFestival: { lFtv: { "0230": ["x"] } } })).not.toThrow();
  });
});

describe("农历工具函数", () => {
  it("干支年份、干支、时辰干支拒绝非整数", () => {
    expect(() => utils.toGanZhiYear(2020.5)).toThrow(RangeError);
    expect(() => utils.toGanZhi(1.5)).toThrow(RangeError);
    expect(() => utils.toHourGanZhi(1.5)).toThrow(RangeError);
    expect(() => utils.toGanZhiYear("2020" as never)).toThrow(RangeError);
    expect(() => utils.toGanZhi(Number.NaN)).toThrow(RangeError);
  });

  it("天文 / 农历数据工具给出确定值", () => {
    expect(utils.lYearDays(2020)).toBeGreaterThan(350);
    expect(utils.leapMonth(2020)).toBe(4);
    expect(utils.leapMonth(2021)).toBe(0);
    expect(utils.leapDays(2020)).toBe(29);
    expect(utils.leapDays(2021)).toBe(0);
    expect(utils.lMonthDays(2020, 4)).toBe(30);
    expect(utils.toChinaMonth(1)).toBe("正月");
    expect(utils.toChinaMonth(12)).toBe("腊月");
    expect(utils.getSolarTerm(0)).toBe("小寒");
    expect(utils.getSolarTerm(23)).toBe("冬至");
  });

  it("时辰干支返回 12 个且修改副本不影响共享表", () => {
    const first = utils.toHourGanZhi(0);
    expect(first).toHaveLength(12);
    first[0] = "污染";
    expect(utils.toHourGanZhi(0)[0]).not.toBe("污染");
  });
});

describe("公历工具函数", () => {
  it("nthWeekdayOfMonth 计算浮动节日并拒绝不存在的第 n 个星期", () => {
    expect(utils.nthWeekdayOfMonth(2026, 5, 0, 2)).toBe(10);
    expect(utils.nthWeekdayOfMonth(2026, 11, 4, 4)).toBe(26);
    expect(() => utils.nthWeekdayOfMonth(2026, 2, 0, 5)).toThrow(RangeError);
    expect(() => utils.nthWeekdayOfMonth(2026, 2, 0, 0)).toThrow(RangeError);
    expect(() => utils.nthWeekdayOfMonth(2026, 2, 7, 1)).toThrow(RangeError);
  });

  it("solarDays 处理闰年", () => {
    expect(utils.solarDays(2024, 2)).toBe(29);
    expect(utils.solarDays(2023, 2)).toBe(28);
    expect(utils.solarDays(2000, 2)).toBe(29);
    expect(utils.solarDays(1900, 2)).toBe(28);
    expect(utils.solarDays(2026, 10)).toBe(31);
  });

  it("节气、星期、生肖、数字中文", () => {
    expect(utils.getTerm(2026, 3)).toBe(4);
    expect(() => utils.getTerm(2026, 0)).toThrow(RangeError);
    expect(() => utils.getTerm(2026, 25)).toThrow(RangeError);
    expect(utils.solarFirstWeek(2026, 10)).toBe(4);
    expect(utils.getAnimal(2026)).toBe("马");
    expect(utils.getAnimal(2000)).toBe("龙");
    expect(utils.toChinaNum(0)).toBe("日");
    expect(utils.toChinaNum(3)).toBe("三");
    expect(utils.toAstro(1, 20)).toBe("水瓶座");
  });
});

describe("调休索引", () => {
  const base = { 2026: { xiu: ["0101"], ban: ["0104"] } };

  it("mergeRestMap 合并且不修改入参", () => {
    const extra = {
      2026: { xiu: ["0101", "0102"], ban: [] },
      2027: { xiu: ["0101"], ban: ["0109"] },
    };
    const merged = mergeRestMap(base, extra);

    expect(merged["2026"]).toEqual({ xiu: ["0101", "0102"], ban: ["0104"] });
    expect(merged["2027"]).toEqual({ xiu: ["0101"], ban: ["0109"] });
    expect(base["2026"].xiu).toEqual(["0101"]);

    expect(mergeRestMap(base)).toBe(base);
  });

  it("mergeRestMap 保留只有一侧存在的年份", () => {
    const merged = mergeRestMap(base, { 2027: { xiu: ["0101"], ban: [] } });
    expect(merged["2026"]).toBe(base["2026"]);
    expect(merged["2027"]).toEqual({ xiu: ["0101"], ban: [] });
  });

  it("freezeRestMap 冻结后不可修改", () => {
    const frozen = freezeRestMap({ 2026: { xiu: ["0101"], ban: [] } });

    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen["2026"])).toBe(true);
    expect(() => frozen["2026"].xiu.push("0102")).toThrow();
  });

  it("restOf 区分放假、补班、普通日和不存在的年份", () => {
    const index = buildRestIndex({ 2026: { xiu: ["0101"], ban: ["0104"] } });

    expect(restOf(index, 2026, 1, 1)).toBe("xiu");
    expect(restOf(index, 2026, 1, 4)).toBe("ban");
    expect(restOf(index, 2026, 1, 2)).toBeUndefined();
    expect(restOf(index, 2025, 1, 1)).toBeUndefined();
  });

  it("mergeRestMap 的结果可以被 createCalendar 使用", () => {
    const calendar = createCalendar({ setRest: { 1999: { xiu: ["0101"] } } });

    expect(calendar.solarToLunar(1999, 1, 1).xiu).toBe(true);
    expect(calendar.solarToLunar(1999, 1, 2).xiu).toBe(false);
  });
});

describe("节假日快照边界", () => {
  it("没有用户配置时 merged:false 返回空快照", () => {
    const own = createCalendar().getHolidays({ merged: false });

    expect(own.setFestival.sFtv).toEqual({});
    expect(own.setFestival.lFtv).toEqual({});
    expect(own.setRest).toEqual({});
  });

  it("replace 模式下 merged:false 也返回用户那份配置", () => {
    const calendar = createCalendar(
      {
        setFestival: { sFtv: { "0101": ["只此一个"] } },
        setRest: { 2027: { xiu: ["0104"], ban: [] } },
      },
      { replace: true },
    );

    const own = calendar.getHolidays({ merged: false });
    expect(own.setFestival.sFtv).toEqual({ "0101": ["只此一个"] });
    expect(own.setFestival.lFtv).toEqual({});
    expect(own.setRest).toEqual({ 2027: { xiu: ["0104"], ban: [] } });
  });

  it("空配置 + replace 只影响 merged，不影响内置实例", () => {
    const empty = createCalendar({}, { replace: true });

    expect(empty.getHolidays().setFestival.sFtv).toEqual({});
    expect(empty.solarToLunar(2026, 10, 1).gljr).toEqual([]);
    expect(createCalendar().solarToLunar(2026, 10, 1).gljr).toContain("国庆节");
  });
});

describe("节日合并", () => {
  const base = { "0101": ["A"] };

  it("没有补丁时直接返回原表", () => {
    expect(mergeFestivalMap(base)).toBe(base);
  });

  it("同 key 合并去重，新 key 追加且不修改入参", () => {
    expect(mergeFestivalMap(base, { "0101": ["A", "B"], "0202": ["C"] })).toEqual({
      "0101": ["A", "B"],
      "0202": ["C"],
    });
    expect(base).toEqual({ "0101": ["A"] });
  });
});

describe("公历转农历参数组合", () => {
  it("年月日必须同时传入", () => {
    const calendar = createCalendar();

    expect(() => calendar.solarToLunar(2026, undefined, undefined)).toThrow(RangeError);
    expect(() => calendar.solarToLunar(2026, 10, undefined)).toThrow(RangeError);
    expect(() => calendar.solarToLunar(undefined, 10, 1)).toThrow(RangeError);
    expect(() => calendar.solarToLunar(2026, undefined, undefined)).toThrow(/必须同时传入/);
  });

  it("支持范围的首尾日期", () => {
    const calendar = createCalendar();

    expect(calendar.solarToLunar(1900, 1, 31).lYear).toBe(1900);
    expect(calendar.solarToLunar(2100, 12, 31).cYear).toBe(2100);
  });
});
