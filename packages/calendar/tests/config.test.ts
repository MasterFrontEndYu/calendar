import { afterEach, describe, expect, it } from "vite-plus/test";
import calendar from "../src/index.ts";

// 每个用例结束后恢复内置数据，避免相互污染
afterEach(() => {
  calendar.resetHolidays();
});

describe("setHolidays 合并语义", () => {
  it("节日是合并，不是覆盖", () => {
    calendar.setHolidays({ setFestival: { sFtv: { "0101": ["公司年会"] } } });
    const list = calendar.solarToLunar(2026, 1, 1).Gljr;
    expect(list).toContain("元旦");
    expect(list).toContain("公司年会");
  });

  it("重复注入不会产生重复项", () => {
    calendar.setHolidays({ setFestival: { sFtv: { "0101": ["公司年会"] } } });
    calendar.setHolidays({ setFestival: { sFtv: { "0101": ["公司年会"] } } });
    const list = calendar.solarToLunar(2026, 1, 1).Gljr;
    expect(list.filter((name: any) => name === "公司年会")).toHaveLength(1);
  });

  it("调休按年、按列表合并，不会整年覆盖", () => {
    calendar.setHolidays({ setRest: { 2020: { xiu: ["0102"] } } });
    expect(calendar.solarToLunar(2020, 1, 1).Xiu).toBe(true); // 内置 0101 仍在
    expect(calendar.solarToLunar(2020, 1, 2).Xiu).toBe(true); // 新注入 0102 生效
  });

  it("replace 模式丢弃内置数据", () => {
    calendar.setHolidays({ setFestival: { sFtv: { "0101": ["只此一个"] } } }, { replace: true });
    expect(calendar.solarToLunar(2026, 1, 1).Gljr).toEqual(["只此一个"]);
  });
});

describe("resetHolidays / getHolidays", () => {
  it("reset 之后自定义数据消失、内置数据回来", () => {
    const before = calendar.solarToLunar(2026, 1, 1).Gljr.slice();
    calendar.setHolidays({ setFestival: { sFtv: { "0101": ["临时节日"] } } });
    expect(calendar.solarToLunar(2026, 1, 1).Gljr).toContain("临时节日");
    calendar.resetHolidays();
    expect(calendar.solarToLunar(2026, 1, 1).Gljr).toEqual(before);
  });

  it("getHolidays 返回深拷贝，改了不影响内部状态", () => {
    const snapshot = calendar.getHolidays();
    snapshot.setFestival.sFtv["0101"].push("污染");
    snapshot.setRest["2020"].xiu?.push("1231");
    expect(calendar.solarToLunar(2026, 1, 1).Gljr).not.toContain("污染");
    expect(calendar.solarToLunar(2020, 12, 31).Xiu).toBe(false);
  });

  it("getHolidays 的结果可以再次传回 setHolidays", () => {
    const snapshot = calendar.getHolidays();
    expect(() => calendar.setHolidays(snapshot)).not.toThrow();
    expect(calendar.solarToLunar(2020, 1, 1).Xiu).toBe(true);
  });
});

describe("配置校验", () => {
  const cases: Array<[string, () => void]> = [
    ["顶层未知字段", () => calendar.setHolidays({ foo: 1 } as never)],
    ["setFestival 未知字段", () => calendar.setHolidays({ setFestival: { sftv: {} } } as never)],
    ["节日 key 不是 MMDD", () => calendar.setHolidays({ setFestival: { sFtv: { "1-1": ["x"] } } })],
    [
      "节日名不是数组",
      () => calendar.setHolidays({ setFestival: { sFtv: { "0101": "元旦" } } } as never),
    ],
    [
      "节日名不是字符串",
      () => calendar.setHolidays({ setFestival: { sFtv: { "0101": [1] } } } as never),
    ],
    ["年份越界", () => calendar.setHolidays({ setRest: { 2101: { xiu: [], ban: [] } } })],
    [
      "调休字段拼错",
      () => calendar.setHolidays({ setRest: { 2026: { xiu: [], baN: [] } } } as never),
    ],
    ["调休日期不是 MMDD", () => calendar.setHolidays({ setRest: { 2026: { xiu: ["1-1"] } } })],
    ["replace 不是布尔", () => calendar.setHolidays({}, { replace: 1 as never })],
  ];

  it.each(cases)("%s 抛 TypeError", (_name, fn) => {
    expect(fn).toThrow(TypeError);
  });

  it("错误信息带出错的字段路径", () => {
    expect(() => calendar.setHolidays({ setFestival: { sFtv: { "1-1": ["x"] } } })).toThrow(/sFtv/);
    expect(() =>
      calendar.setHolidays({ setRest: { 2026: { xiu: [], baN: [] } } } as never),
    ).toThrow(/baN/);
  });

  it("缺 ban 字段时按空数组处理，不再运行期崩溃", () => {
    expect(() =>
      calendar.setHolidays({ setRest: { 2026: { xiu: ["0101"] } } as never }),
    ).not.toThrow();
    expect(calendar.solarToLunar(2026, 1, 2).Ban).toBe(false);
  });

  it("校验失败不会破坏已有配置", () => {
    calendar.setHolidays({ setFestival: { sFtv: { "0123": ["有效"] } } });
    expect(() => calendar.setHolidays({ setFestival: { sFtv: { bad: ["x"] } } })).toThrow();
    expect(calendar.solarToLunar(2026, 1, 23).Gljr).toContain("有效");
  });
});

describe("休息与调休", () => {
  it("周末默认休息，工作日默认上班", () => {
    expect(calendar.solarToLunar(2026, 10, 31)).toMatchObject({ Xiu: true, Ban: false });
    expect(calendar.solarToLunar(2026, 10, 27)).toMatchObject({ Xiu: false, Ban: false });
  });

  it("法定节假日即使在工作日也休息", () => {
    // 2020-10-01 是周四
    expect(calendar.solarToLunar(2020, 10, 1)).toMatchObject({ Xiu: true, Ban: false });
  });

  it("调休补班日即使周末也要上班", () => {
    // 2020-10-10 是周六
    expect(calendar.solarToLunar(2020, 10, 10)).toMatchObject({ Xiu: false, Ban: true });
  });

  it("注入的调休立即生效", () => {
    calendar.setHolidays({ setRest: { 2026: { xiu: ["0101", "0102"], ban: ["0104"] } } });
    expect(calendar.solarToLunar(2026, 1, 2).Xiu).toBe(true);
    expect(calendar.solarToLunar(2026, 1, 4).Ban).toBe(true);
    expect(calendar.solarToLunar(2026, 1, 4).Xiu).toBe(false);
  });
});
