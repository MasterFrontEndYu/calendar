// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vite-plus/test";
import type { CalendarAdapter, CalendarDate, MonthInput } from "@sanguo-dev/calendar-ui";
import { zhCN } from "@sanguo-dev/calendar-ui";
import type { LunarCalendarDay, LunarResult } from "../src/index.ts";
import { createCalendarLunar, createLunarAdapter } from "../src/index.ts";

const instances: Array<{ destroy(): void; el: HTMLElement }> = [];

afterEach(() => {
  while (instances.length > 0) instances.pop()?.destroy();
  document.body.innerHTML = "";
});

const dateOf = function (year: number, month: number, day: number): CalendarDate {
  return { year, month, day, date: new Date(year, month - 1, day), inCurrentMonth: true };
};

const inputOf = function (
  year: number,
  month: number,
  days: CalendarDate[] = [dateOf(year, month, 1)],
): MonthInput {
  return {
    year,
    month,
    weekStartsOn: 1,
    today: new Date(year, month - 1, 1),
    locale: zhCN,
    days,
  };
};

const host = function (): HTMLElement {
  const el = document.createElement("div");
  document.body.append(el);
  return el;
};

const mount = function (
  options: Parameters<typeof createCalendarLunar>[1] = {},
): ReturnType<typeof createCalendarLunar> {
  const instance = createCalendarLunar(host(), { initialDate: "2026-10-01", ...options });
  instances.push(instance);
  return instance;
};

const cellOf = function (root: HTMLElement, key: string): HTMLButtonElement {
  const cell = root.querySelector<HTMLButtonElement>(`.cui__day[data-date="${key}"]`);
  if (!cell) throw new Error(`missing cell ${key}`);
  return cell;
};

const subtitleOf = function (root: HTMLElement, key: string): string {
  return cellOf(root, key).querySelector(".cui__day-sub")?.textContent ?? "";
};

describe("适配器缓存", () => {
  it("同一个月再次取用时返回同一个数组", () => {
    const adapter = createLunarAdapter();
    const input = inputOf(2029, 5);
    const first = adapter.decorateMonth(input);

    expect(adapter.decorateMonth(input)).toBe(first);
  });

  it("weekStartsOn 不同的同一个月分开缓存", () => {
    const adapter = createLunarAdapter();
    const monday = adapter.decorateMonth({ ...inputOf(2029, 6), weekStartsOn: 1 });
    const sunday = adapter.decorateMonth({ ...inputOf(2029, 6), weekStartsOn: 0 });

    expect(monday).not.toBe(sunday);
  });

  it("超过缓存上限后淘汰最早的月份，仍能正常计算", () => {
    const adapter = createLunarAdapter();
    const firstInput = inputOf(2032, 1);
    const first = adapter.decorateMonth(firstInput);

    // 36 个不同的月份，确保超过 24 的缓存上限
    for (let index = 0; index < 36; index++) {
      const year = 2033 + Math.floor(index / 12);
      const month = (index % 12) + 1;
      const decorations = adapter.decorateMonth(inputOf(year, month));
      expect(decorations[0]).not.toBeNull();
    }

    const again = adapter.decorateMonth(firstInput);
    expect(again).not.toBe(first);
    expect(again[0]?.data?.cDay).toBe(1);
  });

  it("不同 holidays 对象使用不同的缓存命名空间", () => {
    const a = createLunarAdapter({ holidays: { setFestival: { sFtv: { "1115": ["A"] } } } });
    const b = createLunarAdapter({ holidays: { setFestival: { sFtv: { "1115": ["B"] } } } });

    expect(a.id).not.toBe(b.id);
  });

  it("同一份 holidays 的同一种模式复用同一个 converter", () => {
    const holidays = { setFestival: { sFtv: { "1115": ["复用"] } } };

    expect(createLunarAdapter({ holidays }).id).toBe(createLunarAdapter({ holidays }).id);
    expect(createLunarAdapter({ holidays }).id).not.toBe(
      createLunarAdapter({ holidays, replaceHolidays: true }).id,
    );
  });

  it("同一份 holidays 的 merge / replace 是两个 converter", () => {
    const holidays = { setFestival: { sFtv: { "1115": ["仅此"] } } };
    const merge = createLunarAdapter({ holidays });
    const replace = createLunarAdapter({ holidays, replaceHolidays: true });

    expect(merge.id).not.toBe(replace.id);
    expect(merge.decorateMonth(inputOf(2030, 11, [dateOf(2030, 11, 15)]))[0]?.data?.gljr).toContain(
      "仅此",
    );
    expect(replace.decorateMonth(inputOf(2030, 11, [dateOf(2030, 11, 15)]))[0]?.data?.gljr).toEqual(
      ["仅此"],
    );
  });
});

describe("节假日替换", () => {
  it("默认合并内置数据", () => {
    const adapter = createLunarAdapter();
    const [decoration] = adapter.decorateMonth(inputOf(2026, 10, [dateOf(2026, 10, 1)]));

    expect(decoration?.data?.gljr).toContain("国庆节");
    expect(decoration?.badge).toEqual({ text: "休", tone: "rest" });
  });

  it("replaceHolidays 忽略内置节日和调休", () => {
    const adapter = createLunarAdapter({
      holidays: { setFestival: { sFtv: { "1115": ["公司日"] } } },
      replaceHolidays: true,
    });
    const [decoration] = adapter.decorateMonth(inputOf(2031, 10, [dateOf(2031, 10, 1)]));

    expect(decoration?.data?.gljr).toEqual([]);
    expect(decoration?.badge).toBeUndefined();
    expect(decoration?.data?.xiu).toBe(false);
  });
});

describe("createCalendarLunar 入口", () => {
  it("replaceHolidays 透传到适配器", () => {
    const instance = mount({
      holidays: { setFestival: { sFtv: { "1115": ["公司日"] } } },
      replaceHolidays: true,
    });

    expect(subtitleOf(instance.el, "2026-10-1")).not.toBe("国庆节");
    expect(
      cellOf(instance.el, "2026-10-1").querySelector<HTMLElement>(".cui__day-tag")?.hidden,
    ).toBe(true);
  });

  it("自定义 adapter 优先于内置农历适配器", () => {
    const adapter: CalendarAdapter<LunarResult> = {
      id: "custom",
      decorateMonth: ({ days }) => days.map(() => ({ subtitle: "自定义" })),
    };
    const instance = mount({ adapter, holidays: { setRest: { 2026: { xiu: ["1001"] } } } });

    expect(subtitleOf(instance.el, "2026-10-1")).toBe("自定义");
    expect(
      cellOf(instance.el, "2026-10-1").querySelector<HTMLElement>(".cui__day-tag")?.hidden,
    ).toBe(true);
  });

  it("onSelect 能拿到自定义农历配置的数据", () => {
    let picked: LunarCalendarDay | null = null;
    const instance = mount({
      holidays: { setRest: { 2026: { xiu: ["1011"] } } },
      onSelect: (day) => {
        picked = day;
      },
    });

    cellOf(instance.el, "2026-10-11").click();

    expect(picked).not.toBeNull();
    expect(picked!.data?.xiu).toBe(true);
    expect(picked!.data?.ban).toBe(false);
    expect(picked!.isSelected).toBe(true);
  });
});
