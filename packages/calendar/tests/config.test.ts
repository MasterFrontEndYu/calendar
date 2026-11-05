import { describe, expect, it } from "vite-plus/test";
import createCalendar from "../src/index.ts";

describe("createCalendar 合并语义", () => {
  it("节日是合并，不是覆盖", () => {
    const calendar = createCalendar({ setFestival: { sFtv: { "0101": ["公司年会"] } } });
    const list = calendar.solarToLunar(2026, 1, 1).gljr;

    expect(list).toContain("元旦");
    expect(list).toContain("公司年会");
  });

  it("重复数据不会产生重复项", () => {
    const calendar = createCalendar({
      setFestival: { sFtv: { "0101": ["公司年会", "公司年会"] } },
    });

    expect(
      calendar.solarToLunar(2026, 1, 1).gljr.filter((name) => name === "公司年会"),
    ).toHaveLength(1);
  });

  it("调休按年、按列表合并，不会整年覆盖", () => {
    const calendar = createCalendar({ setRest: { 2026: { xiu: ["0105"] } } });

    expect(calendar.solarToLunar(2026, 1, 1).xiu).toBe(true);
    expect(calendar.solarToLunar(2026, 1, 5).xiu).toBe(true);
  });

  it("replace 模式丢弃内置数据", () => {
    const calendar = createCalendar(
      { setFestival: { sFtv: { "0101": ["只此一个"] } } },
      { replace: true },
    );

    expect(calendar.solarToLunar(2026, 1, 1).gljr).toEqual(["只此一个"]);
  });
});

describe("createCalendar 快照", () => {
  it("getHolidays 返回深拷贝，改了不影响实例", () => {
    const calendar = createCalendar();
    const snapshot = calendar.getHolidays();
    snapshot.setFestival.sFtv["0101"].push("污染");
    snapshot.setRest["2026"].xiu?.push("1231");

    expect(calendar.solarToLunar(2026, 1, 1).gljr).not.toContain("污染");
    expect(calendar.solarToLunar(2026, 12, 31).xiu).toBe(false);
  });

  it("快照可以再传给 createCalendar", () => {
    const source = createCalendar({ setRest: { 2027: { xiu: ["0104"] } } });
    const copy = createCalendar(source.getHolidays());

    expect(copy.solarToLunar(2027, 1, 4).xiu).toBe(true);
  });
});

describe("createCalendar 配置校验", () => {
  const cases: Array<[string, () => void]> = [
    ["顶层未知字段", () => createCalendar({ foo: 1 } as never)],
    ["setFestival 未知字段", () => createCalendar({ setFestival: { sftv: {} } } as never)],
    ["节日 key 不是 MMDD", () => createCalendar({ setFestival: { sFtv: { "1-1": ["x"] } } })],
    [
      "节日名不是数组",
      () => createCalendar({ setFestival: { sFtv: { "0101": "元旦" } } } as never),
    ],
    ["节日名不是字符串", () => createCalendar({ setFestival: { sFtv: { "0101": [1] } } } as never)],
    ["年份越界", () => createCalendar({ setRest: { 2101: { xiu: [], ban: [] } } })],
    ["调休字段拼错", () => createCalendar({ setRest: { 2026: { xiu: [], baN: [] } } } as never)],
    ["调休日期不是 MMDD", () => createCalendar({ setRest: { 2026: { xiu: ["1-1"] } } })],
    ["公历节日日期不存在", () => createCalendar({ setFestival: { sFtv: { "0230": ["x"] } } })],
    ["调休日期不存在", () => createCalendar({ setRest: { 2026: { xiu: ["0230"] } } })],
    [
      "同一天既放假又补班",
      () => createCalendar({ setRest: { 2026: { xiu: ["0301"], ban: ["0301"] } } }),
    ],
    ["replace 不是布尔", () => createCalendar({}, { replace: 1 as never })],
  ];

  it.each(cases)("%s 抛 TypeError", (_name, fn) => {
    expect(fn).toThrow(TypeError);
  });

  it("农历节日允许 0230 这类日期", () => {
    expect(() =>
      createCalendar({ setFestival: { lFtv: { "0230": ["测试农历节日"] } } }),
    ).not.toThrow();
  });

  it("错误信息带 createCalendar 和出错的字段路径", () => {
    expect(() => createCalendar({ setFestival: { sFtv: { "1-1": ["x"] } } })).toThrow(
      /createCalendar\.setFestival\.sFtv/,
    );
    expect(() => createCalendar({ setRest: { 2026: { xiu: [], baN: [] } } } as never)).toThrow(
      /createCalendar\.setRest\.2026\.baN/,
    );
  });

  it("缺 ban 字段时按空数组处理", () => {
    const calendar = createCalendar({ setRest: { 2026: { xiu: ["0101"] } } as never });

    expect(calendar.solarToLunar(2026, 1, 2).ban).toBe(false);
  });

  it("配置失败不会影响已经创建的实例", () => {
    const valid = createCalendar({ setFestival: { sFtv: { "0123": ["有效"] } } });

    expect(() => createCalendar({ setFestival: { sFtv: { bad: ["x"] } } })).toThrow();
    expect(valid.solarToLunar(2026, 1, 23).gljr).toContain("有效");
  });
});

describe("休息与调休", () => {
  const calendar = createCalendar();

  it("xiu / ban 与周末无关，只看 rest.json", () => {
    expect(calendar.solarToLunar(2026, 10, 31)).toMatchObject({ xiu: false, ban: false });
    expect(calendar.solarToLunar(2026, 10, 27)).toMatchObject({ xiu: false, ban: false });
    expect(calendar.solarToLunar(2027, 1, 2)).toMatchObject({ xiu: false, ban: false });
  });

  it("法定节假日即使在工作日也休息", () => {
    expect(calendar.solarToLunar(2026, 10, 1)).toMatchObject({ xiu: true, ban: false });
    expect(calendar.solarToLunar(2026, 10, 3)).toMatchObject({ xiu: true, ban: false });
  });

  it("调休补班日即使周末也要上班", () => {
    expect(calendar.solarToLunar(2026, 10, 10)).toMatchObject({ xiu: false, ban: true });
  });

  it("注入的调休立即生效", () => {
    const custom = createCalendar({ setRest: { 2026: { xiu: ["0105"], ban: ["0106"] } } });

    expect(custom.solarToLunar(2026, 1, 5).xiu).toBe(true);
    expect(custom.solarToLunar(2026, 1, 6).ban).toBe(true);
    expect(custom.solarToLunar(2026, 1, 6).xiu).toBe(false);
  });

  it("2026 内置数据与国务院通知一致", () => {
    const xiu = (m: number, d: number) => calendar.solarToLunar(2026, m, d).xiu;
    const ban = (m: number, d: number) => calendar.solarToLunar(2026, m, d).ban;

    for (let d = 1; d <= 3; d++) expect(xiu(1, d)).toBe(true);
    expect(ban(1, 4)).toBe(true);

    for (let d = 15; d <= 23; d++) expect(xiu(2, d)).toBe(true);
    expect(ban(2, 14)).toBe(true);
    expect(ban(2, 28)).toBe(true);

    for (let d = 4; d <= 6; d++) expect(xiu(4, d)).toBe(true);

    for (let d = 1; d <= 5; d++) expect(xiu(5, d)).toBe(true);
    expect(ban(5, 9)).toBe(true);

    for (let d = 19; d <= 21; d++) expect(xiu(6, d)).toBe(true);

    for (let d = 25; d <= 27; d++) expect(xiu(9, d)).toBe(true);

    for (let d = 1; d <= 7; d++) expect(xiu(10, d)).toBe(true);
    expect(ban(9, 20)).toBe(true);
    expect(ban(10, 10)).toBe(true);
  });
});
