import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { CalendarDay, DayDecoration, WeekStartsOn } from "../src/index.ts";
import { zhCN } from "../src/index.ts";
import {
  assertBounds,
  clampStartMonth,
  createBounds,
  isDisabled,
  isMonthOutOfRange,
  isYearOutOfRange,
  navDisabled,
  resolveMonthCount,
  setBounds,
} from "../src/core/bounds.ts";
import {
  assignRange,
  clearRange,
  clickRange,
  copyRange,
  createState,
  withRangeFields,
} from "../src/core/state.ts";
import {
  addDays,
  compareDay,
  createDate,
  dateKey,
  dateStringKey,
  monthFromIndex,
  monthIndexOf,
  normalizeMonth,
  parseDateInput,
  readDate,
  sameDay,
  toDateOnly,
  weekdayOf,
} from "../src/utils/date.ts";
import { buildDays } from "../src/utils/days.ts";
import {
  normalizeEasing,
  parseCssDuration,
  prefersReducedMotion,
  readCssDuration,
  readCssEasing,
} from "../src/utils/motion.ts";
import { rangeFields } from "../src/utils/range.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

const styleOf = function (value: string): CSSStyleDeclaration {
  return { getPropertyValue: () => value } as unknown as CSSStyleDeclaration;
};

describe("日期工具", () => {
  it("createDate 对 0-99 年不受 Date 偏移影响", () => {
    const date = createDate(50, 1, 1);
    expect(date.getFullYear()).toBe(50);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(1);
  });

  it("toDateOnly 去掉时分秒", () => {
    const value = new Date(2026, 9, 15, 23, 59, 59, 999);
    const date = toDateOnly(value);

    expect([date.getHours(), date.getMinutes(), date.getSeconds()]).toEqual([0, 0, 0]);
    expect(dateKey(date)).toBe(20261015);
  });

  it("parseDateInput 接受 Date、- 和 / 分隔的字符串", () => {
    expect(dateKey(parseDateInput(new Date(2026, 9, 1)))).toBe(20261001);
    expect(dateKey(parseDateInput("2026-1-5"))).toBe(20260105);
    expect(dateKey(parseDateInput("2026/01/05"))).toBe(20260105);
    expect(dateKey(parseDateInput(" 2026-10-01 "))).toBe(20261001);
  });

  it("parseDateInput 拒绝非法输入", () => {
    expect(() => parseDateInput(123 as never)).toThrow(TypeError);
    expect(() => parseDateInput(new Date(Number.NaN))).toThrow(TypeError);
    expect(() => parseDateInput("")).toThrow(TypeError);
    expect(() => parseDateInput("2026-01/01")).toThrow(TypeError);
    expect(() => parseDateInput("2026-13-01")).toThrow(RangeError);
    expect(() => parseDateInput("2026-02-30")).toThrow(RangeError);
    expect(() => parseDateInput("2026-00-10")).toThrow(RangeError);
    expect(() => parseDateInput("26-1-1")).toThrow(TypeError);
  });

  it("dateKey / dateStringKey / compareDay / sameDay", () => {
    expect(dateKey(new Date(2026, 9, 1))).toBe(20261001);
    expect(dateStringKey(2026, 10, 1)).toBe("2026-10-1");
    expect(compareDay(new Date(2026, 9, 1), new Date(2026, 9, 2))).toBeLessThan(0);
    expect(compareDay(new Date(2026, 9, 2), new Date(2026, 9, 2))).toBe(0);
    expect(sameDay(new Date(2026, 9, 2, 1), new Date(2026, 9, 2, 23))).toBe(true);
    expect(sameDay(new Date(2026, 9, 2), new Date(2026, 9, 3))).toBe(false);
  });

  it("weekdayOf 返回 0-6", () => {
    expect(weekdayOf(2026, 10, 1)).toBe(4);
    expect(weekdayOf(2026, 10, 4)).toBe(0);
  });

  it("addDays 跨月、跨年并保留日期部分", () => {
    expect(dateKey(addDays(new Date(2026, 9, 31, 12), 1))).toBe(20261101);
    expect(dateKey(addDays(new Date(2026, 0, 1), -1))).toBe(20251231);
    expect(dateKey(addDays(new Date(2024, 1, 28), 1))).toBe(20240229);
    expect(addDays(new Date(2026, 9, 15, 8, 30), 0).getHours()).toBe(0);
  });

  it("月份序号与规范化", () => {
    expect(monthIndexOf(2026, 1)).toBe(2026 * 12);
    expect(monthFromIndex(2026 * 12)).toEqual({ year: 2026, month: 1 });
    expect(monthFromIndex(-1)).toEqual({ year: -1, month: 12 });
    expect(normalizeMonth(2026, 13)).toEqual({ year: 2027, month: 1 });
    expect(normalizeMonth(2026.9, 10.2)).toEqual({ year: 2026, month: 10 });
  });

  it("readDate 对 null / undefined 返回 null", () => {
    expect(readDate(null, "x")).toBeNull();
    expect(readDate(undefined, "x")).toBeNull();
    expect(dateKey(readDate("2026-10-01", "x")!)).toBe(20261001);
  });
});

describe("动画工具", () => {
  it("parseCssDuration 解析 ms / s，非法值回退", () => {
    expect(parseCssDuration("300ms", 100)).toBe(300);
    expect(parseCssDuration("0.5s", 100)).toBe(500);
    expect(parseCssDuration("2S", 100)).toBe(2000);
    expect(parseCssDuration("120", 100)).toBe(120);
    expect(parseCssDuration(" 80ms ", 100)).toBe(80);
    expect(parseCssDuration("abc", 100)).toBe(100);
    expect(parseCssDuration("-1ms", 100)).toBe(100);
    expect(parseCssDuration("", 100)).toBe(100);
  });

  it("readCssDuration / readCssEasing 读取 CSS 变量", () => {
    expect(readCssDuration(styleOf("150ms"), "--x", 200)).toBe(150);
    expect(readCssDuration(styleOf(""), "--x", 200)).toBe(200);
    expect(readCssEasing(styleOf("linear"), "--x", "ease")).toBe("linear");
    expect(readCssEasing(styleOf(""), "--x", "ease")).toBe("ease");
    expect(readCssEasing(styleOf("  cubic-bezier(0, 0, 1, 1)  "), "--x", "ease")).toBe(
      "cubic-bezier(0, 0, 1, 1)",
    );
  });

  it("normalizeEasing 在 CSS.supports 不可用 / 不支持时回退", () => {
    vi.stubGlobal("CSS", undefined);
    expect(normalizeEasing("not-an-easing")).toBe("not-an-easing");

    vi.stubGlobal("CSS", { supports: () => false });
    expect(normalizeEasing("not-an-easing")).toBe("ease");

    vi.stubGlobal("CSS", { supports: () => true });
    expect(normalizeEasing("not-an-easing")).toBe("not-an-easing");
  });

  it("prefersReducedMotion 跟随 matchMedia", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);

    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(prefersReducedMotion()).toBe(true);

    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("范围状态", () => {
  const date = function (day: number): Date {
    return new Date(2026, 9, day, 12, 30);
  };

  it("createState 取年月并清空范围", () => {
    const state = createState(date(15));

    expect(state).toMatchObject({ year: 2026, month: 10, rangeStart: null, rangeEnd: null });
    expect(state.selected).toBeInstanceOf(Date);
  });

  it("copyRange 返回副本", () => {
    const state = createState(date(15));
    state.rangeStart = date(1);
    state.rangeEnd = date(2);

    const copy = copyRange(state);
    copy.start?.setFullYear(2000);

    expect(state.rangeStart?.getFullYear()).toBe(2026);
    expect(copy.end).toEqual(date(2));
  });

  it("clickRange 首次点选、反向点选和第三次点选", () => {
    const state = createState(date(15));

    clickRange(state, date(20));
    expect(state.rangeStart).toEqual(toDateOnly(date(20)));
    expect(state.rangeEnd).toBeNull();

    clickRange(state, date(10));
    expect(state.rangeStart).toEqual(toDateOnly(date(10)));
    expect(state.rangeEnd).toEqual(toDateOnly(date(20)));

    clickRange(state, date(25));
    expect(state.rangeStart).toEqual(toDateOnly(date(25)));
    expect(state.rangeEnd).toBeNull();
  });

  it("clickRange 同日第二次点选时终点等于起点", () => {
    const state = createState(date(15));

    clickRange(state, date(20));
    clickRange(state, date(20));

    expect(state.rangeStart).toEqual(toDateOnly(date(20)));
    expect(state.rangeEnd).toEqual(toDateOnly(date(20)));
  });

  it("assignRange 清空、只设起点、正序和反序", () => {
    const state = createState(date(15));

    state.rangeStart = date(1);
    assignRange(state, null, null);
    expect([state.rangeStart, state.rangeEnd]).toEqual([null, null]);

    assignRange(state, date(5), null);
    expect(state.rangeStart).toEqual(date(5));
    expect(state.rangeEnd).toBeNull();

    assignRange(state, date(5), date(10));
    expect(state.rangeStart).toEqual(date(5));
    expect(state.rangeEnd).toEqual(date(10));

    assignRange(state, date(10), date(5));
    expect(state.rangeStart).toEqual(date(5));
    expect(state.rangeEnd).toEqual(date(10));
  });

  it("clearRange 清空两端", () => {
    const state = createState(date(15));
    assignRange(state, date(1), date(2));

    clearRange(state);

    expect([state.rangeStart, state.rangeEnd]).toEqual([null, null]);
  });

  it("withRangeFields 在格子上覆盖范围字段", () => {
    const state = createState(date(15));
    assignRange(state, date(5), date(10));
    const day = buildDays({
      year: 2026,
      month: 10,
      weekStartsOn: 1,
      today: date(1),
      selected: null,
      locale: zhCN,
    })[7] as CalendarDay;

    const result = withRangeFields(day, state);

    expect(result.isRangeStart).toBe(true);
    expect(result.isSelected).toBe(true);
    expect(result.inCurrentMonth).toBe(day.inCurrentMonth);
  });
});

describe("范围字段", () => {
  const date = function (day: number): Date {
    return new Date(2026, 9, day);
  };

  it("没有范围时四个字段都是 false", () => {
    expect(rangeFields(date(10), null, null)).toEqual({
      isRangeStart: false,
      isRangeEnd: false,
      isInRange: false,
      isSelected: false,
    });
  });

  it("只选起点时只标记起点", () => {
    expect(rangeFields(date(10), date(10), null)).toMatchObject({
      isRangeStart: true,
      isRangeEnd: false,
      isInRange: false,
      isSelected: true,
    });
  });

  it("完整范围标记起终点和区间内的日期", () => {
    expect(rangeFields(date(5), date(5), date(10))).toMatchObject({
      isRangeStart: true,
      isInRange: true,
    });
    expect(rangeFields(date(7), date(5), date(10))).toMatchObject({
      isRangeStart: false,
      isRangeEnd: false,
      isInRange: true,
      isSelected: false,
    });
    expect(rangeFields(date(10), date(5), date(10))).toMatchObject({
      isRangeEnd: true,
      isSelected: true,
    });
    expect(rangeFields(date(11), date(5), date(10)).isInRange).toBe(false);
  });

  it("传入 out 时复用同一个对象", () => {
    const out = { isRangeStart: false, isRangeEnd: false, isInRange: false, isSelected: true };
    const result = rangeFields(date(10), null, null, out);

    expect(result).toBe(out);
    expect(out.isSelected).toBe(false);
  });
});

describe("日期边界", () => {
  const date = function (year: number, month: number, day = 1): Date {
    return new Date(year, month - 1, day);
  };

  it("resolveMonthCount 按模式、请求月数和范围跨度决定", () => {
    expect(resolveMonthCount("single", 2, null, null)).toBe(1);
    expect(resolveMonthCount("range", 1, null, null)).toBe(1);
    expect(resolveMonthCount("range", 2, null, null)).toBe(2);
    expect(resolveMonthCount("range", 2, date(2026, 10), date(2026, 12))).toBe(2);
    expect(resolveMonthCount("range", 2, date(2026, 10), date(2026, 11))).toBe(2);
    expect(resolveMonthCount("range", 2, date(2026, 10), date(2026, 10, 20))).toBe(1);
  });

  it("createBounds / setBounds 把 null 转成无穷", () => {
    const bounds = createBounds(null, null, new Set(), 1);
    expect(bounds).toMatchObject({
      minDate: null,
      maxDate: null,
      minKey: Number.NEGATIVE_INFINITY,
      maxKey: Number.POSITIVE_INFINITY,
      minMonth: Number.NEGATIVE_INFINITY,
      maxMonth: Number.POSITIVE_INFINITY,
    });

    setBounds(bounds, date(2026, 10, 5), date(2026, 11, 20));
    expect(bounds.minKey).toBe(20261005);
    expect(bounds.maxKey).toBe(20261120);
    expect(bounds.minMonth).toBe(monthIndexOf(2026, 10));
    expect(bounds.maxMonth).toBe(monthIndexOf(2026, 11));
  });

  it("assertBounds 校验先后顺序", () => {
    expect(() => assertBounds(date(2026, 10, 1), date(2026, 10, 2))).not.toThrow();
    expect(() => assertBounds(date(2026, 10, 2), date(2026, 10, 1))).toThrow(RangeError);
    expect(() => assertBounds(null, date(2026, 10, 1))).not.toThrow();
  });

  it("isDisabled 检查上下界与禁用集合", () => {
    const bounds = createBounds(date(2026, 10, 5), date(2026, 10, 20), new Set([20261010]), 1);

    expect(isDisabled(bounds, date(2026, 10, 4))).toBe(true);
    expect(isDisabled(bounds, date(2026, 10, 5))).toBe(false);
    expect(isDisabled(bounds, date(2026, 10, 10))).toBe(true);
    expect(isDisabled(bounds, date(2026, 10, 21))).toBe(true);
  });

  it("clampStartMonth 把起始月夹进范围", () => {
    const bounds = createBounds(date(2026, 10), date(2026, 12), new Set(), 1);

    expect(clampStartMonth(bounds, 2026, 11)).toEqual({ year: 2026, month: 11 });
    expect(clampStartMonth(bounds, 2026, 1)).toEqual({ year: 2026, month: 10 });
    expect(clampStartMonth(bounds, 2027, 5)).toEqual({ year: 2026, month: 12 });

    bounds.monthCount = 2;
    expect(clampStartMonth(bounds, 2027, 5)).toEqual({ year: 2026, month: 11 });
  });

  it("navDisabled 在边界月份禁用箭头", () => {
    const bounds = createBounds(date(2026, 10), date(2026, 12), new Set(), 1);

    expect(navDisabled(bounds, 2026, 10)).toEqual({ prev: true, next: false });
    expect(navDisabled(bounds, 2026, 11)).toEqual({ prev: false, next: false });
    expect(navDisabled(bounds, 2026, 12)).toEqual({ prev: false, next: true });

    bounds.monthCount = 2;
    expect(navDisabled(bounds, 2026, 11)).toEqual({ prev: false, next: true });
  });

  it("isMonthOutOfRange / isYearOutOfRange", () => {
    const bounds = createBounds(date(2026, 10, 5), date(2027, 2, 20), new Set(), 1);

    expect(isMonthOutOfRange(bounds, 2026, 9)).toBe(true);
    expect(isMonthOutOfRange(bounds, 2026, 10)).toBe(false);
    expect(isMonthOutOfRange(bounds, 2027, 3)).toBe(true);

    expect(isYearOutOfRange(bounds, 2025)).toBe(true);
    expect(isYearOutOfRange(bounds, 2026)).toBe(false);
    expect(isYearOutOfRange(bounds, 2027)).toBe(false);
    expect(isYearOutOfRange(bounds, 2028)).toBe(true);

    const open = createBounds(null, null, new Set(), 1);
    expect(isYearOutOfRange(open, 1800)).toBe(false);
  });
});

describe("buildDays", () => {
  const today = new Date(2026, 9, 15);

  const baseOptions = function (weekStartsOn: WeekStartsOn = 1) {
    return {
      year: 2026,
      month: 10,
      weekStartsOn,
      today,
      selected: null,
      locale: zhCN,
    } as const;
  };

  it("生成 42 天，首尾补位并标记是否当月", () => {
    const days = buildDays(baseOptions());

    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({ year: 2026, month: 9, day: 28, inCurrentMonth: false });
    expect(days[3]).toMatchObject({ year: 2026, month: 10, day: 1, inCurrentMonth: true });
    expect(days.at(-1)).toMatchObject({ year: 2026, month: 11, day: 8, inCurrentMonth: false });
  });

  it("weekStartsOn=0 时从周日开始", () => {
    const days = buildDays(baseOptions(0));

    expect(days[0]).toMatchObject({ year: 2026, month: 9, day: 27 });
    expect(days[4]).toMatchObject({ month: 10, day: 1 });
  });

  it("拼出日期、标记、副标题和禁用文案的 aria-label", () => {
    const decoration: DayDecoration = {
      subtitle: "国庆节",
      badge: { text: "休" },
      data: null,
    };
    const days = buildDays({
      ...baseOptions(),
      adapter: {
        id: "test",
        decorateMonth: ({ days: dates }) =>
          dates.map((date) => (date.month === 10 && date.day === 1 ? decoration : null)),
      },
      isDisabled: (date) => date.getMonth() === 9 && date.getDate() === 1,
    });
    const day = days.find((item) => item.month === 10 && item.day === 1)!;

    expect(day.subtitle).toBe("国庆节");
    expect(day.badge).toEqual({ text: "休" });
    expect(day.isDisabled).toBe(true);
    expect(day.ariaLabel).toBe("2026-10-1 休 国庆节 不可选");
  });

  it("adapter 的 ariaLabel 覆盖默认拼接", () => {
    const days = buildDays({
      ...baseOptions(),
      adapter: {
        id: "aria",
        decorateMonth: ({ days: dates }) =>
          dates.map((date) =>
            date.month === 10 && date.day === 2 ? { ariaLabel: "自定义标签" } : null,
          ),
      },
    });

    expect(days.find((item) => item.month === 10 && item.day === 2)?.ariaLabel).toBe("自定义标签");
  });

  it("自定义副标题优先，null / undefined 回退到 adapter", () => {
    const days = buildDays({
      ...baseOptions(),
      adapter: {
        id: "sub",
        decorateMonth: ({ days: dates }) =>
          dates.map((date) =>
            date.month === 10 && date.day >= 1 && date.day <= 3
              ? { subtitle: `adapter-${date.day}` }
              : null,
          ),
      },
      subtitle: (date) => {
        if (date.day === 1) return "custom";
        if (date.day === 2) return "";
        return undefined;
      },
    });

    expect(days.find((item) => item.month === 10 && item.day === 1)?.subtitle).toBe("custom");
    expect(days.find((item) => item.month === 10 && item.day === 2)?.subtitle).toBe("");
    expect(days.find((item) => item.month === 10 && item.day === 3)?.subtitle).toBe("adapter-3");
  });

  it("语言包没有 disabledLabel 时使用内置「不可选」", () => {
    const bare = { ...zhCN, disabledLabel: undefined };
    const days = buildDays({ ...baseOptions(), locale: bare, isDisabled: () => true });

    expect(days[0]?.ariaLabel).toBe("2026-9-28 不可选");
  });

  it("用数字 key 比较今天、选中、范围和禁用", () => {
    const days = buildDays({
      ...baseOptions(),
      selected: new Date(2026, 9, 15),
      rangeStart: new Date(2026, 9, 10),
      rangeEnd: new Date(2026, 9, 12),
      isDisabled: (date) => date.getDate() === 20,
    });

    expect(days.find((item) => item.day === 15)?.isToday).toBe(true);
    expect(days.find((item) => item.day === 15)?.isSelected).toBe(true);
    expect(days.find((item) => item.day === 10)?.isRangeStart).toBe(true);
    expect(days.find((item) => item.day === 11)?.isInRange).toBe(true);
    expect(days.find((item) => item.day === 12)?.isRangeEnd).toBe(true);
    expect(days.find((item) => item.day === 13)?.isInRange).toBe(false);
    expect(days.find((item) => item.day === 20)?.isDisabled).toBe(true);
  });
});
