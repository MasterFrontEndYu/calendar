import { describe, expect, it } from "vite-plus/test";
import type { CalendarPopupOptions, DayPopupItem } from "../src/index.ts";
import { resolveOptions } from "../src/core/options.ts";

const render = (): [] => [];

const popupOf = function (popup: CalendarPopupOptions): CalendarPopupOptions {
  return popup;
};

describe("resolveOptions 默认值", () => {
  it("空配置补全为单选、单月、自动主题、显示头部、无动画", () => {
    const { config, minDate, maxDate, disabledDates } = resolveOptions({});

    expect(minDate).toBeNull();
    expect(maxDate).toBeNull();
    expect(disabledDates.size).toBe(0);
    expect(config).toMatchObject({
      weekStartsOn: 1,
      theme: "auto",
      size: "normal",
      mode: "single",
      requestedMonths: 1,
      showHeader: true,
    });
    expect(config.animation).toEqual({
      monthTransition: "none",
      monthDuration: 220,
      monthEasing: "ease",
      collapsible: false,
      collapseDuration: 200,
      collapseEasing: "ease",
      defaultCollapsed: false,
    });
    expect(config.popup).toBeUndefined();
  });

  it("初始日期落在禁选日期时选择最近的可选日期", () => {
    const { initial } = resolveOptions({
      initialDate: "2026-10-03",
      disabledDates: ["2026-10-03", "2026-10-04"],
    });

    expect(initial).toEqual(new Date(2026, 9, 2));
  });
});

describe("resolveOptions 校验 popup", () => {
  const invalid: Array<[string, unknown]> = [
    ["popup 为 null", null],
    ["popup 为字符串", "popup"],
    ["缺少 render", {}],
    ["render 不是函数", { render: "x" }],
    ["trigger 不认识", { render, trigger: "dblclick" }],
    ["placement 不认识", { render, placement: "left" }],
    ["role 不认识", { render, role: "menu" }],
    ["ariaLabel 不是字符串", { render, ariaLabel: 1 }],
  ];

  it.each(invalid)("%s 抛 TypeError", (_name, popup) => {
    expect(() => resolveOptions({ popup: popupOf(popup as CalendarPopupOptions) })).toThrow(
      TypeError,
    );
  });

  it("补全 trigger / placement / role 的默认值", () => {
    const click = resolveOptions({ popup: { render } }).config.popup;
    expect(click).toMatchObject({ trigger: "click", placement: "auto", role: "dialog" });
    expect(click?.ariaLabel).toBeUndefined();

    const hover = resolveOptions({ popup: { render, trigger: "hover" } }).config.popup;
    expect(hover).toMatchObject({ trigger: "hover", role: "tooltip" });

    const explicit = resolveOptions({
      popup: { render, trigger: "focus", role: "dialog", placement: "center", ariaLabel: "日程" },
    }).config.popup;
    expect(explicit).toMatchObject({
      trigger: "focus",
      placement: "center",
      role: "dialog",
      ariaLabel: "日程",
    });
  });

  it("resolved.popup.render 代理原始 render", () => {
    const calls: number[] = [];
    const resolved = resolveOptions({
      popup: {
        render: (day): readonly DayPopupItem[] => {
          calls.push(day.day);
          return [[String(day.day)]];
        },
      },
    }).config.popup;

    expect(
      resolved?.render({ year: 2026, month: 10, day: 8, date: new Date(), inCurrentMonth: true }),
    ).toEqual([["8"]]);
    expect(calls).toEqual([8]);
  });
});

describe("resolveOptions 校验其余字段", () => {
  it("animation 必须是对象", () => {
    expect(() => resolveOptions({ animation: null as never })).toThrow(TypeError);
    expect(() => resolveOptions({ animation: "slide" as never })).toThrow(TypeError);
  });

  it("mode 只能是 single 或 range", () => {
    expect(() => resolveOptions({ mode: "multi" as never })).toThrow(TypeError);
  });

  it("months 只能是 1 或 2", () => {
    expect(() => resolveOptions({ months: 0 as never })).toThrow(RangeError);
    expect(() => resolveOptions({ months: 3 as never })).toThrow(RangeError);
  });

  it("disabledDates 必须是数组", () => {
    expect(() => resolveOptions({ disabledDates: "2026-10-01" as never })).toThrow(TypeError);
  });

  it("disabledDates 里的 null 会被忽略", () => {
    const { disabledDates } = resolveOptions({
      disabledDates: [null as never, "2026-10-01"],
    });

    expect(disabledDates.size).toBe(1);
  });

  it("动画时长和缓动会规整到 config.animation", () => {
    const { config } = resolveOptions({
      animation: {
        slide: { duration: 0, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
        collapse: { duration: 120, easing: "linear", defaultCollapsed: true },
      },
    });

    expect(config.animation).toEqual({
      monthTransition: "slide",
      monthDuration: 0,
      monthEasing: "cubic-bezier(0.4, 0, 0.2, 1)",
      collapsible: true,
      collapseDuration: 120,
      collapseEasing: "linear",
      defaultCollapsed: true,
    });
  });
});
