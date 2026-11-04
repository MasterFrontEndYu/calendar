// @vitest-environment jsdom
import { describe, expect, it } from "vite-plus/test";
import type { CalendarAdapter, CalendarDay, MonthInput } from "../src/index.ts";
import { createCalendarUI } from "../src/index.ts";

const host = function (): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
};

const cellOf = function (root: HTMLElement, key: string): HTMLElement {
  return root.querySelector(`.cui__day[data-date="${key}"]`) as HTMLElement;
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
