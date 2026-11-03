// @vitest-environment jsdom
import { describe, expect, it } from "vite-plus/test";
import type { LunarCalendarDay } from "../src/index.ts";
import { createCalendar } from "../src/index.ts";

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

describe("LunarCalendar", () => {
  it("使用内置 2026 数据渲染副标题和休班标记", () => {
    const instance = createCalendar(host(), { initialDate: new Date(2026, 9, 1) });

    expect(subtitleOf(instance.el, "2026-10-1")).toBe("国庆节");
    expect(tagOf(instance.el, "2026-10-1")).toBe("休");
    expect(cellOf(instance.el, "2026-10-1").dataset.tone).toBe("rest");
    expect(tagOf(instance.el, "2026-10-10")).toBe("班");
    expect(cellOf(instance.el, "2026-10-10").dataset.tone).toBe("work");
    expect(tagOf(instance.el, "2026-10-11")).toBe("");

    instance.destroy();
  });

  it("onSelect 能拿到 LunarResult", () => {
    let picked: LunarCalendarDay | null = null;
    const instance = createCalendar(host(), {
      initialDate: new Date(2026, 9, 1),
      onSelect: (day) => {
        picked = day;
      },
    });

    cellOf(instance.el, "2026-10-10").click();

    expect(picked).not.toBeNull();
    expect(picked!.data?.ban).toBe(true);
    expect(picked!.data?.gljr).toContain("世界精神卫生日");
    expect(picked!.isSelected).toBe(true);

    instance.destroy();
  });

  it("holidays 选项会覆盖默认配置", () => {
    const instance = createCalendar(host(), {
      initialDate: new Date(2026, 0, 1),
      holidays: { setRest: { 2026: { xiu: ["0110"], ban: ["0111"] } } },
    });

    expect(tagOf(instance.el, "2026-1-10")).toBe("休");
    expect(tagOf(instance.el, "2026-1-11")).toBe("班");

    instance.destroy();
  });
});
