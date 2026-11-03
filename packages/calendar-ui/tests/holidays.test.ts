import { describe, expect, it } from "vite-plus/test";
import { buildDays, resolveDaySource } from "../src/utils/calendar.ts";
import type { CalendarDay, DaySource } from "../src/types/index.ts";

const build = function (source: DaySource, month: number): CalendarDay[] {
  return buildDays({
    year: 2026,
    month,
    weekStartsOn: 1,
    today: new Date(2026, 10, 1),
    selected: null,
    source,
  });
};

const dayOf = function (days: CalendarDay[], year: number, month: number, day: number) {
  return days.find((item) => item.year === year && item.month === month && item.day === day);
};

const festivalsOf = function (source: DaySource, month: number, day: number): readonly string[] {
  return dayOf(build(source, month), 2026, month, day)?.lunar?.gljr ?? [];
};

describe("resolveDaySource", () => {
  it("同一个配置对象复用同一个 source，replace 会单独建源", () => {
    const config = { setFestival: { sFtv: { "1115": ["自定义"] } } };

    expect(resolveDaySource(config).id).toBe(resolveDaySource(config).id);
    expect(resolveDaySource(config, true).id).not.toBe(resolveDaySource(config).id);
  });

  it("不传配置时使用全局源", () => {
    expect(resolveDaySource().id).toBe(0);
  });
});

describe("按实例隔离的节假日数据", () => {
  it("同一个月、不同配置不会互相命中缓存", () => {
    const sourceA = resolveDaySource({ setFestival: { sFtv: { "1115": ["A 节"] } } });
    const sourceB = resolveDaySource({ setFestival: { sFtv: { "1115": ["B 节"] } } });

    expect(sourceA.id).not.toBe(sourceB.id);

    expect(festivalsOf(sourceA, 11, 15)).toEqual(["A 节"]);
    expect(festivalsOf(sourceB, 11, 15)).toEqual(["B 节"]);

    // 再切回 A，仍然读 A 自己的缓存，不会串到 B
    expect(festivalsOf(sourceA, 11, 15)).toEqual(["A 节"]);
  });

  it("默认合并内置数据，replace 丢弃内置数据", () => {
    const merged = resolveDaySource({ setFestival: { sFtv: { "0101": ["公司年会"] } } });
    const replaced = resolveDaySource({ setFestival: { sFtv: { "0101": ["只此一个"] } } }, true);

    expect(festivalsOf(merged, 1, 1)).toContain("元旦");
    expect(festivalsOf(merged, 1, 1)).toContain("公司年会");
    expect(festivalsOf(replaced, 1, 1)).toEqual(["只此一个"]);
  });

  it("全局源不受实例配置影响", () => {
    const custom = resolveDaySource({ setFestival: { sFtv: { "1115": ["A 节"] } } });
    const globalSource = resolveDaySource();

    expect(festivalsOf(custom, 11, 15)).toEqual(["A 节"]);
    expect(festivalsOf(globalSource, 11, 15)).not.toContain("A 节");
  });
});
