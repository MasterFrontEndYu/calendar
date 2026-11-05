// @vitest-environment jsdom
import { describe, expect, it } from "vite-plus/test";
import type { CalendarAdapter, CalendarDay, MonthInput } from "../src/index.ts";
import { createCalendarUI } from "../src/index.ts";

const host = function (): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
};

const cellOf = function (root: HTMLElement, key: string): HTMLButtonElement {
  return root.querySelector(`.cui__day[data-date="${key}"]`) as HTMLButtonElement;
};

const subtitleOf = function (root: HTMLElement, key: string): string {
  return cellOf(root, key).querySelector(".cui__day-sub")?.textContent ?? "";
};

const tagOf = function (root: HTMLElement, key: string): string {
  return cellOf(root, key).querySelector(".cui__day-tag")?.textContent ?? "";
};

const createFakeAdapter = function (): CalendarAdapter<{ note: string }> {
  return {
    id: "fake",
    decorateMonth(input: MonthInput) {
      return input.days.map((date) => {
        if (date.year === 2026 && date.month === 10 && date.day === 1) {
          return {
            subtitle: "测试节日",
            badge: { text: "休", tone: "rest" },
            data: { note: "rest" },
          };
        }
        if (date.year === 2026 && date.month === 10 && date.day === 10) {
          return { badge: { text: "班", tone: "work" }, data: { note: "work" } };
        }
        return null;
      });
    },
  };
};

describe("createCalendarUI 纯公历", () => {
  it("不传 adapter 时不显示副标题和标记", () => {
    const instance = createCalendarUI(host(), { initialDate: new Date(2026, 9, 1) });

    expect(subtitleOf(instance.el, "2026-10-1")).toBe("");
    expect(tagOf(instance.el, "2026-10-1")).toBe("");
    expect(
      cellOf(instance.el, "2026-10-1").querySelector(".cui__day-tag")?.hasAttribute("hidden"),
    ).toBe(true);

    instance.destroy();
  });

  it("adapter 的 42 个装饰按索引渲染", () => {
    let input: MonthInput | null = null;
    const adapter: CalendarAdapter<null> = {
      id: "spy",
      decorateMonth(next) {
        input = next;
        return next.days.map(() => null);
      },
    };

    const instance = createCalendarUI(host(), {
      initialDate: new Date(2026, 9, 1),
      adapter,
    });

    expect(input).not.toBeNull();
    expect(input!.days).toHaveLength(42);
    expect(input!.days[0]?.inCurrentMonth).toBe(false);
    expect(input!.weekStartsOn).toBe(1);

    instance.destroy();
  });

  it("副标题、标记、透传数据和 onSelect 都可用", () => {
    let picked: CalendarDay<{ note: string }> | null = null;
    const instance = createCalendarUI(host(), {
      initialDate: new Date(2026, 9, 1),
      adapter: createFakeAdapter(),
      onSelect: (day) => {
        picked = day;
      },
    });

    expect(subtitleOf(instance.el, "2026-10-1")).toBe("测试节日");
    expect(tagOf(instance.el, "2026-10-1")).toBe("休");
    expect(cellOf(instance.el, "2026-10-1").dataset.tone).toBe("rest");
    expect(tagOf(instance.el, "2026-10-10")).toBe("班");
    expect(cellOf(instance.el, "2026-10-10").dataset.tone).toBe("work");
    expect(tagOf(instance.el, "2026-10-11")).toBe("");

    cellOf(instance.el, "2026-10-10").click();

    expect(picked).not.toBeNull();
    expect(picked!.data).toEqual({ note: "work" });
    expect(picked!.isSelected).toBe(true);
    expect(picked!.inCurrentMonth).toBe(true);

    instance.destroy();
  });
});

describe("自定义 subtitle", () => {
  it("用户 subtitle 优先于 adapter，null/undefined 回退，空字符串保留", () => {
    const adapter: CalendarAdapter<null> = {
      id: "subtitle",
      decorateMonth({ days }) {
        return days.map((date) =>
          date.month === 10 && (date.day === 1 || date.day === 2 || date.day === 3)
            ? { subtitle: `adapter-${date.day}` }
            : null,
        );
      },
    };

    let picked: CalendarDay | null = null;
    const instance = createCalendarUI(host(), {
      initialDate: "2026-10-01",
      adapter,
      subtitle: (day) => {
        if (day.day === 1) return "用户-1";
        if (day.day === 2) return null;
        if (day.day === 3) return "";
        return undefined;
      },
      onSelect: (day) => {
        picked = day;
      },
    });

    expect(subtitleOf(instance.el, "2026-10-1")).toBe("用户-1");
    expect(subtitleOf(instance.el, "2026-10-2")).toBe("adapter-2");
    expect(subtitleOf(instance.el, "2026-10-3")).toBe("");

    cellOf(instance.el, "2026-10-1").click();
    expect(picked!.subtitle).toBe("用户-1");

    instance.destroy();
  });
});

describe("范围选择", () => {
  it("单视图：两次点击完成范围，反向选择自动交换", () => {
    let picked: CalendarDay | null = null;
    const changes: Array<{ start: Date | null; end: Date | null }> = [];
    const instance = createCalendarUI(host(), {
      mode: "range",
      initialDate: "2026-10-15",
      onSelect: (day) => {
        picked = day;
      },
      onRangeChange: (range) => changes.push(range),
    });

    expect(instance.getRange()).toEqual({ start: null, end: null });

    cellOf(instance.el, "2026-10-20").click();
    expect(instance.getRange().start).toEqual(new Date(2026, 9, 20));
    expect(instance.getRange().end).toBeNull();
    expect(picked!.isRangeStart).toBe(true);
    expect(cellOf(instance.el, "2026-10-20").classList.contains("is-range-start")).toBe(true);

    cellOf(instance.el, "2026-10-10").click();
    expect(instance.getRange()).toEqual({
      start: new Date(2026, 9, 10),
      end: new Date(2026, 9, 20),
    });
    expect(picked!.isRangeStart).toBe(true);
    expect(picked!.isRangeEnd).toBe(false);
    expect(cellOf(instance.el, "2026-10-10").classList.contains("is-range-start")).toBe(true);
    expect(cellOf(instance.el, "2026-10-20").classList.contains("is-range-end")).toBe(true);
    expect(cellOf(instance.el, "2026-10-15").classList.contains("is-in-range")).toBe(true);
    expect(changes).toHaveLength(2);

    instance.destroy();
  });

  it("setRange 反向输入自动交换，clearRange 清空", () => {
    const changes: Array<{ start: Date | null; end: Date | null }> = [];
    const instance = createCalendarUI(host(), {
      mode: "range",
      initialDate: "2026-10-01",
      onRangeChange: (range) => changes.push(range),
    });

    instance.setRange("2026-10-20", "2026-10-05");
    expect(instance.getRange()).toEqual({
      start: new Date(2026, 9, 5),
      end: new Date(2026, 9, 20),
    });

    instance.clearRange();
    expect(instance.getRange()).toEqual({ start: null, end: null });
    expect(changes.at(-1)).toEqual({ start: null, end: null });

    instance.destroy();
  });

  it("第三次点击开始一个新范围", () => {
    const instance = createCalendarUI(host(), {
      mode: "range",
      initialDate: "2026-10-01",
    });

    cellOf(instance.el, "2026-10-5").click();
    cellOf(instance.el, "2026-10-10").click();
    cellOf(instance.el, "2026-10-15").click();

    expect(instance.getRange().start).toEqual(new Date(2026, 9, 15));
    expect(instance.getRange().end).toBeNull();

    instance.destroy();
  });

  it("双视图默认显示相邻两个月", () => {
    const instance = createCalendarUI(host(), {
      mode: "range",
      months: 2,
      initialDate: "2026-10-15",
    });

    expect(instance.el.classList.contains("cui--range")).toBe(true);
    expect(instance.el.querySelectorAll(".cui__grid")).toHaveLength(2);
    const title = instance.el.querySelector(".cui__title")?.textContent ?? "";
    expect(title).toContain("10 月");
    expect(title).toContain("11 月");

    instance.nextMonth();
    expect(instance.getMonth()).toEqual({ year: 2026, month: 11 });
    const nextTitle = instance.el.querySelector(".cui__title")?.textContent ?? "";
    expect(nextTitle).toContain("11 月");
    expect(nextTitle).toContain("12 月");

    instance.destroy();
  });

  it("双视图可以跨月选择范围", () => {
    const instance = createCalendarUI(host(), {
      mode: "range",
      months: 2,
      initialDate: "2026-10-15",
    });

    const october = cellOf(instance.el, "2026-10-28");
    const november = cellOf(instance.el, "2026-11-5");
    october.click();
    november.click();

    expect(instance.getRange()).toEqual({
      start: new Date(2026, 9, 28),
      end: new Date(2026, 10, 5),
    });
    expect(october.classList.contains("is-range-start")).toBe(true);
    expect(november.classList.contains("is-range-end")).toBe(true);

    instance.destroy();
  });

  it("范围端点不会选中禁用日期", () => {
    const instance = createCalendarUI(host(), {
      mode: "range",
      initialDate: "2026-10-01",
      disabledDates: ["2026-10-10"],
    });

    cellOf(instance.el, "2026-10-5").click();
    cellOf(instance.el, "2026-10-10").click();
    expect(instance.getRange()).toEqual({
      start: new Date(2026, 9, 5),
      end: null,
    });

    instance.destroy();
  });
});

describe("折叠", () => {
  const visibleRows = function (root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(".cui__week")).filter(
      (row) => !row.classList.contains("is-collapsed-hidden"),
    );
  };

  it("不配置 animation 时没有折叠箭头，也没有翻月动画", () => {
    const instance = createCalendarUI(host(), { initialDate: "2026-10-15" });

    expect(instance.el.querySelector(".cui__collapse")).toBeNull();
    expect(visibleRows(instance.el)).toHaveLength(6);

    instance.nextMonth();
    expect(instance.el.querySelector(".is-month-clone")).toBeNull();

    instance.destroy();
  });

  it("只配置 collapse 时翻月仍然直接切换", () => {
    const instance = createCalendarUI(host(), {
      initialDate: "2026-10-15",
      animation: { collapse: {} },
    });

    instance.nextMonth();
    expect(instance.el.querySelector(".is-month-clone")).toBeNull();

    instance.destroy();
  });

  it("配置 animation.collapse 后底部有单状态箭头，折叠只显示选中行", () => {
    const instance = createCalendarUI(host(), {
      initialDate: "2026-10-15",
      animation: { collapse: {} },
    });
    const button = instance.el.querySelector<HTMLButtonElement>(".cui__collapse")!;

    expect(button).not.toBeNull();
    expect(button.textContent).toBe("⌃");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(visibleRows(instance.el)).toHaveLength(6);

    button.click();
    expect(button.textContent).toBe("⌄");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    const collapsedRows = visibleRows(instance.el);
    expect(collapsedRows).toHaveLength(1);
    expect(collapsedRows[0]).toBe(instance.el.querySelectorAll(".cui__week")[2]);

    instance.select("2026-10-28");
    expect(visibleRows(instance.el)[0]).toBe(instance.el.querySelectorAll(".cui__week")[4]);

    button.click();
    expect(button.textContent).toBe("⌃");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(visibleRows(instance.el)).toHaveLength(6);

    instance.destroy();
  });

  it("范围模式折叠时同时显示起点行和终点行", () => {
    const instance = createCalendarUI(host(), {
      mode: "range",
      initialDate: "2026-10-01",
      animation: { collapse: {} },
    });

    cellOf(instance.el, "2026-10-5").click();
    cellOf(instance.el, "2026-10-28").click();
    instance.el.querySelector<HTMLButtonElement>(".cui__collapse")!.click();

    const rows = Array.from(instance.el.querySelectorAll<HTMLElement>(".cui__week"));
    expect(visibleRows(instance.el)).toHaveLength(2);
    expect(rows[1]?.classList.contains("is-collapsed-hidden")).toBe(false);
    expect(rows[4]?.classList.contains("is-collapsed-hidden")).toBe(false);

    instance.destroy();
  });

  it("双视图折叠时两个月份各自显示相关端点行", () => {
    const instance = createCalendarUI(host(), {
      mode: "range",
      months: 2,
      initialDate: "2026-10-01",
      animation: { collapse: {} },
    });

    cellOf(instance.el, "2026-10-28").click();
    cellOf(instance.el, "2026-11-5").click();
    instance.el.querySelector<HTMLButtonElement>(".cui__collapse")!.click();

    const grids = Array.from(instance.el.querySelectorAll<HTMLElement>(".cui__grid"));
    expect(grids).toHaveLength(2);
    grids.forEach((grid) => {
      const visible = Array.from(grid.querySelectorAll<HTMLElement>(".cui__week")).filter(
        (row) => !row.classList.contains("is-collapsed-hidden"),
      );
      expect(visible).toHaveLength(1);
    });

    instance.destroy();
  });

  it("collapse.defaultCollapsed 可以默认折叠", () => {
    const instance = createCalendarUI(host(), {
      initialDate: "2026-10-15",
      animation: { collapse: { defaultCollapsed: true } },
    });
    const button = instance.el.querySelector<HTMLButtonElement>(".cui__collapse")!;

    expect(button.textContent).toBe("⌄");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(visibleRows(instance.el)).toHaveLength(1);

    instance.destroy();
  });
});

describe("动画配置", () => {
  it("把 animation 里的时长和缓动写入 CSS 变量", () => {
    const instance = createCalendarUI(host(), {
      animation: {
        slide: { duration: 300, easing: "linear" },
        collapse: { duration: 150, easing: "ease-in" },
      },
    });

    expect(instance.el.style.getPropertyValue("--cui-month-duration")).toBe("300ms");
    expect(instance.el.style.getPropertyValue("--cui-month-easing")).toBe("linear");
    expect(instance.el.style.getPropertyValue("--cui-collapse-duration")).toBe("150ms");
    expect(instance.el.style.getPropertyValue("--cui-collapse-easing")).toBe("ease-in");

    instance.destroy();
  });

  it("slide: {} / collapse: {} 使用默认时长和缓动", () => {
    const instance = createCalendarUI(host(), {
      animation: { slide: {}, collapse: {} },
    });

    expect(instance.el.style.getPropertyValue("--cui-month-duration")).toBe("220ms");
    expect(instance.el.style.getPropertyValue("--cui-month-easing")).toBe("ease");
    expect(instance.el.style.getPropertyValue("--cui-collapse-duration")).toBe("200ms");
    expect(instance.el.style.getPropertyValue("--cui-collapse-easing")).toBe("ease");

    instance.destroy();
  });

  it("拒绝负的动画时长和空缓动", () => {
    expect(() => createCalendarUI(host(), { animation: { slide: { duration: -1 } } })).toThrow(
      TypeError,
    );
    expect(() =>
      createCalendarUI(host(), { animation: { collapse: { duration: Number.NaN } } }),
    ).toThrow(TypeError);
    expect(() => createCalendarUI(host(), { animation: { slide: { easing: "  " } } })).toThrow(
      TypeError,
    );
  });

  it("默认不添加翻月动画类", () => {
    const instance = createCalendarUI(host(), {
      initialDate: "2026-10-15",
    });

    instance.nextMonth();
    expect(instance.el.querySelector(".cui__grid")?.classList.contains("is-month-in-next")).toBe(
      false,
    );
    expect(instance.el.querySelector(".is-month-clone")).toBeNull();

    instance.destroy();
  });

  it("配置 animation.slide 后添加对应的翻月动画类", () => {
    const instance = createCalendarUI(host(), {
      initialDate: "2026-10-15",
      animation: { slide: {} },
    });
    const grid = instance.el.querySelector(".cui__grid")!;

    instance.nextMonth();
    expect(grid.classList.contains("is-month-in-next")).toBe(true);
    expect(grid.classList.contains("is-month-in-prev")).toBe(false);
    expect(
      instance.el.querySelector(".is-month-clone")?.classList.contains("is-month-out-next"),
    ).toBe(true);

    instance.prevMonth();
    expect(grid.classList.contains("is-month-in-prev")).toBe(true);
    expect(grid.classList.contains("is-month-in-next")).toBe(false);
    expect(
      instance.el.querySelector(".is-month-clone")?.classList.contains("is-month-out-prev"),
    ).toBe(true);

    instance.destroy();
  });

  it("翻月时保留头部按钮焦点", () => {
    const instance = createCalendarUI(host(), { initialDate: "2026-10-15" });
    const next = instance.el.querySelectorAll<HTMLButtonElement>(".cui__nav")[1]!;

    next.focus();
    next.click();

    expect(instance.getMonth()).toEqual({ year: 2026, month: 11 });
    expect(document.activeElement).toBe(next);

    instance.destroy();
  });

  it("折叠状态下翻月，离场层和当前网格保持相同的可见行", () => {
    const instance = createCalendarUI(host(), {
      initialDate: "2026-10-15",
      animation: { slide: {}, collapse: {} },
    });

    instance.el.querySelector<HTMLButtonElement>(".cui__collapse")!.click();
    instance.nextMonth();

    const grid = instance.el.querySelector(".cui__grid")!;
    const clone = instance.el.querySelector(".cui__grid.is-month-clone")!;
    expect(clone).not.toBeNull();

    const hiddenRows = (root: Element): boolean[] =>
      Array.from(root.querySelectorAll<HTMLElement>(".cui__week")).map((row) =>
        row.classList.contains("is-collapsed-hidden"),
      );

    expect(hiddenRows(clone)).toEqual(hiddenRows(grid));
    expect(hiddenRows(clone).filter(Boolean)).toHaveLength(5);

    instance.destroy();
  });

  it("默认翻月不残留离场层", () => {
    const instance = createCalendarUI(host(), {
      initialDate: "2026-10-15",
    });

    instance.nextMonth();
    instance.prevMonth();

    expect(instance.el.querySelectorAll(".is-month-clone")).toHaveLength(0);
    instance.destroy();
  });
});

describe("主题", () => {
  it("默认是 auto", () => {
    const instance = createCalendarUI(host());

    expect(instance.el.dataset.theme).toBe("auto");
    expect(instance.getTheme()).toBe("auto");

    instance.destroy();
  });

  it("可以通过 theme 指定 dark", () => {
    const instance = createCalendarUI(host(), { theme: "dark" });

    expect(instance.el.dataset.theme).toBe("dark");
    expect(instance.getTheme()).toBe("dark");

    instance.destroy();
  });

  it("setTheme 只改 data-theme，不重建 DOM", () => {
    const instance = createCalendarUI(host(), { theme: "light" });
    const grid = instance.el.querySelector(".cui__grid");

    instance.setTheme("dark");

    expect(instance.getTheme()).toBe("dark");
    expect(instance.el.dataset.theme).toBe("dark");
    expect(instance.el.querySelector(".cui__grid")).toBe(grid);

    instance.setTheme("auto");
    expect(instance.getTheme()).toBe("auto");
    expect(instance.el.dataset.theme).toBe("auto");

    instance.destroy();
  });
});

describe("日期约束", () => {
  it("minDate / maxDate 包含边界，边界外禁用", () => {
    const instance = createCalendarUI(host(), {
      initialDate: new Date(2026, 9, 10),
      minDate: new Date(2026, 9, 5),
      maxDate: new Date(2026, 9, 20),
    });

    expect(cellOf(instance.el, "2026-10-4").disabled).toBe(true);
    expect(cellOf(instance.el, "2026-10-5").disabled).toBe(false);
    expect(cellOf(instance.el, "2026-10-20").disabled).toBe(false);
    expect(cellOf(instance.el, "2026-10-21").disabled).toBe(true);
    expect(cellOf(instance.el, "2026-10-4").getAttribute("aria-disabled")).toBe("true");
    expect(cellOf(instance.el, "2026-10-4").getAttribute("aria-label")).toContain("不可选");

    instance.destroy();
  });

  it("minDate / maxDate 可以单独设置", () => {
    const onlyMin = createCalendarUI(host(), {
      initialDate: new Date(2026, 9, 10),
      minDate: new Date(2026, 9, 10),
    });
    expect(cellOf(onlyMin.el, "2026-10-9").disabled).toBe(true);
    expect(cellOf(onlyMin.el, "2026-10-11").disabled).toBe(false);
    onlyMin.destroy();

    const onlyMax = createCalendarUI(host(), {
      initialDate: new Date(2026, 9, 10),
      maxDate: new Date(2026, 9, 10),
    });
    expect(cellOf(onlyMax.el, "2026-10-9").disabled).toBe(false);
    expect(cellOf(onlyMax.el, "2026-10-11").disabled).toBe(true);
    onlyMax.destroy();
  });

  it("接受 - 和 / 分隔的日期字符串", () => {
    const instance = createCalendarUI(host(), {
      initialDate: "2026-10-10",
      minDate: "2026/10/5",
      maxDate: "2026-10-20",
      disabledDates: ["2026/10/12"],
    });

    expect(instance.getSelected()).toEqual(new Date(2026, 9, 10));
    expect(cellOf(instance.el, "2026-10-4").disabled).toBe(true);
    expect(cellOf(instance.el, "2026-10-5").disabled).toBe(false);
    expect(cellOf(instance.el, "2026-10-12").disabled).toBe(true);

    instance.select("2026/10/15");
    expect(instance.getSelected()).toEqual(new Date(2026, 9, 15));

    instance.setMinDate("2026/10/6");
    expect(instance.getMinDate()).toEqual(new Date(2026, 9, 6));

    instance.destroy();
  });

  it("拒绝不合法的日期字符串", () => {
    expect(() => createCalendarUI(host(), { initialDate: "2026-02-30" })).toThrow(RangeError);
    expect(() => createCalendarUI(host(), { initialDate: "2026-10/01" })).toThrow(TypeError);
    expect(() => createCalendarUI(host(), { initialDate: "2026-13-01" })).toThrow(RangeError);
  });

  it("初始日期超出范围时夹到最近的可选日期", () => {
    const instance = createCalendarUI(host(), {
      initialDate: new Date(2026, 8, 1),
      minDate: new Date(2026, 9, 5),
      maxDate: new Date(2026, 9, 20),
    });

    expect(instance.getSelected()).toEqual(new Date(2026, 9, 5));
    expect(instance.getMonth()).toEqual({ year: 2026, month: 10 });

    instance.destroy();
  });

  it("初始日期被禁用时选择距离最近的可选日期", () => {
    const instance = createCalendarUI(host(), {
      initialDate: new Date(2026, 9, 10),
      disabledDates: [new Date(2026, 9, 10), new Date(2026, 9, 11)],
    });

    expect(instance.getSelected()).toEqual(new Date(2026, 9, 9));

    instance.destroy();
  });

  it("disabledDates 中的日期不可点击", () => {
    let picked: CalendarDay | null = null;
    const instance = createCalendarUI(host(), {
      initialDate: new Date(2026, 9, 1),
      disabledDates: [new Date(2026, 9, 2), new Date(2026, 10, 2)],
      onSelect: (day) => {
        picked = day;
      },
    });

    const disabled = cellOf(instance.el, "2026-10-2");
    expect(disabled.disabled).toBe(true);
    disabled.click();
    expect(picked).toBeNull();
    expect(instance.getSelected()).toEqual(new Date(2026, 9, 1));

    cellOf(instance.el, "2026-10-3").click();
    expect(picked).not.toBeNull();
    expect(picked!.isDisabled).toBe(false);

    instance.setMonth(2026, 11);
    expect(cellOf(instance.el, "2026-11-2").disabled).toBe(true);

    instance.destroy();
  });

  it("到达 min/max 月份时禁用翻月按钮，并夹住 setMonth", () => {
    const instance = createCalendarUI(host(), {
      initialDate: new Date(2026, 9, 10),
      minDate: new Date(2026, 9, 5),
      maxDate: new Date(2026, 10, 20),
    });
    const nav = instance.el.querySelectorAll<HTMLButtonElement>(".cui__nav");

    expect(nav[0]?.disabled).toBe(true);
    expect(nav[1]?.disabled).toBe(false);

    instance.setMonth(2026, 9);
    expect(instance.getMonth()).toEqual({ year: 2026, month: 10 });

    instance.setMonth(2026, 12);
    expect(instance.getMonth()).toEqual({ year: 2026, month: 11 });
    expect(nav[0]?.disabled).toBe(false);
    expect(nav[1]?.disabled).toBe(true);

    instance.destroy();
  });

  it("select() 忽略越界和禁用日期", () => {
    let count = 0;
    const instance = createCalendarUI(host(), {
      initialDate: new Date(2026, 9, 10),
      minDate: new Date(2026, 9, 5),
      maxDate: new Date(2026, 9, 20),
      disabledDates: [new Date(2026, 9, 12)],
      onSelect: () => {
        count++;
      },
    });

    instance.select(new Date(2026, 9, 4));
    instance.select(new Date(2026, 9, 12));
    instance.select(new Date(2026, 9, 21));
    expect(count).toBe(0);
    expect(instance.getSelected()).toEqual(new Date(2026, 9, 10));

    instance.select(new Date(2026, 9, 15));
    expect(count).toBe(1);
    expect(instance.getSelected()).toEqual(new Date(2026, 9, 15));

    instance.destroy();
  });

  it("setMinDate / setMaxDate 会调整当前选中日期", () => {
    const instance = createCalendarUI(host(), {
      initialDate: new Date(2026, 9, 10),
    });

    expect(instance.getMinDate()).toBeNull();
    expect(instance.getMaxDate()).toBeNull();

    instance.setMinDate(new Date(2026, 9, 15));
    expect(instance.getSelected()).toEqual(new Date(2026, 9, 15));

    instance.setMaxDate(new Date(2026, 9, 20));
    expect(instance.getMaxDate()).toEqual(new Date(2026, 9, 20));

    instance.setMinDate(null);
    instance.setMaxDate(new Date(2026, 9, 1));
    expect(instance.getSelected()).toEqual(new Date(2026, 9, 1));
    expect(instance.getMinDate()).toBeNull();

    instance.destroy();
  });

  it("setMinDate 晚于 setMaxDate 时抛错且不改状态", () => {
    const instance = createCalendarUI(host(), {
      initialDate: new Date(2026, 9, 10),
      maxDate: new Date(2026, 9, 20),
    });

    expect(() => instance.setMinDate(new Date(2026, 9, 21))).toThrow(RangeError);
    expect(instance.getMinDate()).toBeNull();
    expect(instance.getSelected()).toEqual(new Date(2026, 9, 10));

    instance.destroy();
  });

  it("创建时 minDate 晚于 maxDate 抛 RangeError", () => {
    expect(() =>
      createCalendarUI(host(), {
        minDate: new Date(2026, 10, 1),
        maxDate: new Date(2026, 9, 1),
      }),
    ).toThrow(RangeError);
  });

  it("约束下没有任何可选日期时抛 RangeError", () => {
    expect(() =>
      createCalendarUI(host(), {
        minDate: new Date(2026, 9, 1),
        maxDate: new Date(2026, 9, 1),
        disabledDates: [new Date(2026, 9, 1)],
      }),
    ).toThrow(RangeError);
  });

  it("disabledDates 包含无效日期时抛 TypeError", () => {
    expect(() =>
      createCalendarUI(host(), {
        disabledDates: [new Date(Number.NaN)],
      }),
    ).toThrow(TypeError);
  });
});
