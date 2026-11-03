import { afterEach, describe, expect, it } from "vite-plus/test";
import calendar from "../src/index.ts";

// 每个用例结束后恢复内置数据，避免相互污染
afterEach(() => {
  calendar.resetHolidays();
});

describe("setHolidays 合并语义", () => {
  it("节日是合并，不是覆盖", () => {
    calendar.setHolidays({ setFestival: { sFtv: { "0101": ["公司年会"] } } });
    const list = calendar.solarToLunar(2026, 1, 1).gljr;
    expect(list).toContain("元旦");
    expect(list).toContain("公司年会");
  });

  it("重复注入不会产生重复项", () => {
    calendar.setHolidays({ setFestival: { sFtv: { "0101": ["公司年会"] } } });
    calendar.setHolidays({ setFestival: { sFtv: { "0101": ["公司年会"] } } });
    const list = calendar.solarToLunar(2026, 1, 1).gljr;
    expect(list.filter((name: any) => name === "公司年会")).toHaveLength(1);
  });

  it("调休按年、按列表合并，不会整年覆盖", () => {
    calendar.setHolidays({ setRest: { 2026: { xiu: ["0105"] } } });
    expect(calendar.solarToLunar(2026, 1, 1).xiu).toBe(true); // 内置 0101 仍在
    expect(calendar.solarToLunar(2026, 1, 5).xiu).toBe(true); // 新注入 0105 生效
  });

  it("replace 模式丢弃内置数据", () => {
    calendar.setHolidays({ setFestival: { sFtv: { "0101": ["只此一个"] } } }, { replace: true });
    expect(calendar.solarToLunar(2026, 1, 1).gljr).toEqual(["只此一个"]);
  });
});

describe("resetHolidays / getHolidays", () => {
  it("reset 之后自定义数据消失、内置数据回来", () => {
    const before = calendar.solarToLunar(2026, 1, 1).gljr.slice();
    calendar.setHolidays({ setFestival: { sFtv: { "0101": ["临时节日"] } } });
    expect(calendar.solarToLunar(2026, 1, 1).gljr).toContain("临时节日");
    calendar.resetHolidays();
    expect(calendar.solarToLunar(2026, 1, 1).gljr).toEqual(before);
  });

  it("getHolidays 返回深拷贝，改了不影响内部状态", () => {
    const snapshot = calendar.getHolidays();
    snapshot.setFestival.sFtv["0101"].push("污染");
    snapshot.setRest["2026"].xiu?.push("1231");
    expect(calendar.solarToLunar(2026, 1, 1).gljr).not.toContain("污染");
    expect(calendar.solarToLunar(2026, 12, 31).xiu).toBe(false);
  });

  it("getHolidays 的结果可以再次传回 setHolidays", () => {
    const snapshot = calendar.getHolidays();
    expect(() => calendar.setHolidays(snapshot)).not.toThrow();
    expect(calendar.solarToLunar(2026, 1, 1).xiu).toBe(true);
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
    expect(calendar.solarToLunar(2026, 1, 2).ban).toBe(false);
  });

  it("校验失败不会破坏已有配置", () => {
    calendar.setHolidays({ setFestival: { sFtv: { "0123": ["有效"] } } });
    expect(() => calendar.setHolidays({ setFestival: { sFtv: { bad: ["x"] } } })).toThrow();
    expect(calendar.solarToLunar(2026, 1, 23).gljr).toContain("有效");
  });
});

describe("休息与调休", () => {
  it("xiu / ban 与周末无关，只看 rest.json", () => {
    // 2026-10-31 是周六，但不在 xiu 列表里
    expect(calendar.solarToLunar(2026, 10, 31)).toMatchObject({ xiu: false, ban: false });
    // 2026-10-27 是周二
    expect(calendar.solarToLunar(2026, 10, 27)).toMatchObject({ xiu: false, ban: false });
    // 2027 年没有内置数据，周末也不休息
    expect(calendar.solarToLunar(2027, 1, 2)).toMatchObject({ xiu: false, ban: false });
  });

  it("法定节假日即使在工作日也休息", () => {
    // 2026-10-01 是周四
    expect(calendar.solarToLunar(2026, 10, 1)).toMatchObject({ xiu: true, ban: false });
    // 2026-10-03 是周六，但写在 xiu 列表里
    expect(calendar.solarToLunar(2026, 10, 3)).toMatchObject({ xiu: true, ban: false });
  });

  it("调休补班日即使周末也要上班", () => {
    // 2026-10-10 是周六
    expect(calendar.solarToLunar(2026, 10, 10)).toMatchObject({ xiu: false, ban: true });
  });

  it("注入的调休立即生效", () => {
    calendar.setHolidays({ setRest: { 2026: { xiu: ["0105"], ban: ["0106"] } } });
    expect(calendar.solarToLunar(2026, 1, 5).xiu).toBe(true);
    expect(calendar.solarToLunar(2026, 1, 6).ban).toBe(true);
    expect(calendar.solarToLunar(2026, 1, 6).xiu).toBe(false);
  });

  it("2026 内置数据与国务院通知一致", () => {
    const xiu = (m: number, d: number) => calendar.solarToLunar(2026, m, d).xiu;
    const ban = (m: number, d: number) => calendar.solarToLunar(2026, m, d).ban;

    // 元旦：1/1-1/3 放假，1/4 补班
    for (let d = 1; d <= 3; d++) expect(xiu(1, d)).toBe(true);
    expect(ban(1, 4)).toBe(true);

    // 春节：2/15-2/23 放假，2/14、2/28 补班
    for (let d = 15; d <= 23; d++) expect(xiu(2, d)).toBe(true);
    expect(ban(2, 14)).toBe(true);
    expect(ban(2, 28)).toBe(true);
    expect(xiu(2, 24)).toBe(false);

    // 清明：4/4-4/6
    for (let d = 4; d <= 6; d++) expect(xiu(4, d)).toBe(true);

    // 劳动节：5/1-5/5 放假，5/9 补班
    for (let d = 1; d <= 5; d++) expect(xiu(5, d)).toBe(true);
    expect(ban(5, 9)).toBe(true);

    // 端午：6/19-6/21
    for (let d = 19; d <= 21; d++) expect(xiu(6, d)).toBe(true);

    // 中秋：9/25-9/27
    for (let d = 25; d <= 27; d++) expect(xiu(9, d)).toBe(true);

    // 国庆：10/1-10/7 放假，9/20、10/10 补班
    for (let d = 1; d <= 7; d++) expect(xiu(10, d)).toBe(true);
    expect(ban(9, 20)).toBe(true);
    expect(ban(10, 10)).toBe(true);
    expect(xiu(10, 8)).toBe(false);
  });
});
