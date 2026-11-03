// @vitest-environment jsdom
import { describe, expect, it } from "vite-plus/test";
import { createCalendar } from "../src/index.ts";

const host = function (): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
};

const subtitleOf = function (root: HTMLElement, key: string): string {
  return root.querySelector(`.cui__day[data-date="${key}"] .cui__day-sub`)?.textContent ?? "";
};

const tagOf = function (root: HTMLElement, key: string): string {
  return root.querySelector(`.cui__day[data-date="${key}"] .cui__day-tag`)?.textContent ?? "";
};

describe("createCalendar 的节假日配置", () => {
  it("不同实例使用各自的配置，互不串数据", () => {
    const a = createCalendar(host(), {
      initialDate: new Date(2026, 10, 2),
      holidays: { setFestival: { sFtv: { "1115": ["A 节"] } } },
    });
    const b = createCalendar(host(), {
      initialDate: new Date(2026, 10, 2),
      holidays: { setFestival: { sFtv: { "1115": ["B 节"] } } },
    });

    expect(subtitleOf(a.el, "2026-11-15")).toBe("A 节");
    expect(subtitleOf(b.el, "2026-11-15")).toBe("B 节");

    a.destroy();
    b.destroy();
  });

  it("replaceHolidays 为 true 时丢弃内置节日", () => {
    const instance = createCalendar(host(), {
      initialDate: new Date(2026, 0, 1),
      holidays: { setFestival: { sFtv: { "0101": ["只此一个"] } } },
      replaceHolidays: true,
    });

    expect(subtitleOf(instance.el, "2026-1-1")).toBe("只此一个");
    instance.destroy();
  });

  it("不传 holidays 时使用内置数据", () => {
    const instance = createCalendar(host(), { initialDate: new Date(2026, 0, 1) });

    expect(subtitleOf(instance.el, "2026-1-1")).toBe("元旦");
    instance.destroy();
  });

  it("xiu 显示休、ban 显示班，普通日不显示", () => {
    const instance = createCalendar(host(), { initialDate: new Date(2026, 9, 1) });

    expect(tagOf(instance.el, "2026-10-1")).toBe("休");
    expect(tagOf(instance.el, "2026-10-3")).toBe("休");
    expect(tagOf(instance.el, "2026-10-10")).toBe("班");
    expect(tagOf(instance.el, "2026-10-11")).toBe("");

    instance.destroy();
  });

  it("自定义 rest 配置同样显示标记", () => {
    const instance = createCalendar(host(), {
      initialDate: new Date(2026, 0, 1),
      holidays: { setRest: { 2026: { xiu: ["0110"], ban: ["0111"] } } },
    });

    expect(tagOf(instance.el, "2026-1-10")).toBe("休");
    expect(tagOf(instance.el, "2026-1-11")).toBe("班");

    instance.destroy();
  });
});
