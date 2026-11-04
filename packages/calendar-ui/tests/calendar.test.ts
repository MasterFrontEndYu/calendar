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
