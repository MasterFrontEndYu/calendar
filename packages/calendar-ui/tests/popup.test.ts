// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  CalendarDate,
  CalendarInstance,
  CalendarPopupOptions,
  DayPopupItem,
} from "../src/index.ts";
import { createCalendarUI } from "../src/index.ts";

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.innerHTML = "";
});

const create = function (
  popup: CalendarPopupOptions,
  options: { initialDate?: string } = {},
): CalendarInstance {
  const host = document.createElement("div");
  document.body.append(host);
  const instance = createCalendarUI(host, {
    initialDate: options.initialDate ?? "2026-10-01",
    popup,
  });
  cleanups.push(() => {
    instance.destroy();
    host.remove();
  });
  return instance;
};

const cellOf = function (root: HTMLElement, key: string): HTMLButtonElement {
  const cell = root.querySelector<HTMLButtonElement>(`.cui__day[data-date="${key}"]`);
  if (!cell) throw new Error(`missing cell ${key}`);
  return cell;
};

const dotOf = function (root: HTMLElement, key: string): HTMLElement {
  const dot = cellOf(root, key).querySelector<HTMLElement>(".cui__day-dot");
  if (!dot) throw new Error(`missing dot ${key}`);
  return dot;
};

const popupOf = function (): HTMLElement {
  const popup = document.querySelector<HTMLElement>(".cui__popup");
  if (!popup) throw new Error("missing popup");
  return popup;
};

const itemsOf = function (): string[] {
  return [...popupOf().querySelectorAll(".cui__popup-item")].map((item) => item.textContent ?? "");
};

/** 只有 10 月 1 日、5 日有数据 */
const sharedRender = function (day: CalendarDate): readonly DayPopupItem[] {
  return day.month === 10 && (day.day === 1 || day.day === 5)
    ? [["全天", `${day.day} 号`, "内容"]]
    : [];
};

describe("日期格 popup", () => {
  it("创建时调用 render，只有有内容的日期显示绿点", () => {
    const render = vi.fn(sharedRender);
    const instance = create({ render });

    expect(dotOf(instance.el, "2026-10-1").hidden).toBe(false);
    expect(dotOf(instance.el, "2026-10-5").hidden).toBe(false);
    expect(dotOf(instance.el, "2026-10-2").hidden).toBe(true);
    expect(dotOf(instance.el, "2026-10-31").hidden).toBe(true);

    // 42 个格子都会参与判断，数据源由 render 自己对接
    expect(render).toHaveBeenCalledTimes(42);
    expect(render.mock.calls[0]?.[0]).toMatchObject({ year: 2026, month: 9, day: 28 });
  });

  it("点击打开，头部显示日期和条数，内容按数组顺序渲染", () => {
    const instance = create({
      render: (day) =>
        day.month === 10 && day.day === 1
          ? [
              ["全天", "国庆节", "10 月 1 日 - 7 日放假"],
              ["10:00", "升旗仪式", "广场集合，提前 10 分钟到场"],
            ]
          : [],
    });

    cellOf(instance.el, "2026-10-1").click();

    const popup = popupOf();
    expect(popup.hidden).toBe(false);
    expect(popup.querySelector(".cui__popup-head")?.textContent).toBe("10 月 1 日 · 2 条");
    expect(itemsOf()).toEqual([
      "全天国庆节10 月 1 日 - 7 日放假",
      "10:00升旗仪式广场集合，提前 10 分钟到场",
    ]);
    expect(popup.getAttribute("role")).toBe("dialog");
    expect(cellOf(instance.el, "2026-10-1").getAttribute("aria-expanded")).toBe("true");
  });

  it("[time, title, detail] 生成默认 title / detail 结构", () => {
    const instance = create({
      render: (day) =>
        day.month === 10 && day.day === 1 ? [["全天", "国庆节", "10 月 1 日 - 7 日放假"]] : [],
    });

    cellOf(instance.el, "2026-10-1").click();

    expect(popupOf().querySelector(".cui__popup-head")?.textContent).toBe("10 月 1 日 · 1 条");
    expect(popupOf().querySelector(".cui__popup-time")?.textContent).toBe("全天");
    expect(popupOf().querySelector(".cui__popup-name")?.textContent).toBe("国庆节");
    expect(popupOf().querySelector(".cui__popup-detail")?.textContent).toBe(
      "10 月 1 日 - 7 日放假",
    );
  });

  it("省略字段时不渲染对应 UI", () => {
    const instance = create({
      render: (day) =>
        day.month === 10 && day.day === 1
          ? [
              ["全天", "国庆节"],
              [undefined, "只有标题", "只有详情"],
            ]
          : [],
    });

    cellOf(instance.el, "2026-10-1").click();

    const items = popupOf().querySelectorAll(".cui__popup-item");
    expect(items).toHaveLength(2);
    expect(items[0]?.querySelector(".cui__popup-detail")).toBeNull();
    expect(items[1]?.querySelector(".cui__popup-time")).toBeNull();
    expect(items[1]?.querySelector(".cui__popup-detail")?.textContent).toBe("只有详情");
  });

  it("空三元组不显示绿点，点击也不弹", () => {
    const instance = create({ render: () => [["", "", ""]] });

    expect(dotOf(instance.el, "2026-10-1").hidden).toBe(true);

    cellOf(instance.el, "2026-10-1").click();
    expect(popupOf().hidden).toBe(true);
  });

  it("三元组和 Node 可以混合，Node 原样挂载", () => {
    const node = document.createElement("div");
    node.textContent = "节点内容";
    const instance = create({
      render: (day) =>
        day.month === 10 && day.day === 1 ? [["全天", "国庆节", "放假"], node] : [],
    });

    cellOf(instance.el, "2026-10-1").click();

    expect(popupOf().querySelector(".cui__popup-head")?.textContent).toBe("10 月 1 日 · 2 条");
    expect(itemsOf()).toEqual(["全天国庆节放假", "节点内容"]);
    expect(popupOf().contains(node)).toBe(true);
  });

  it("字段按纯文本挂载，不解析 HTML", () => {
    const instance = create({
      render: (day) =>
        day.month === 10 && day.day === 1
          ? [["<b>全天</b>", "<b>不是标签</b>", "<b>详情</b>"]]
          : [],
    });

    cellOf(instance.el, "2026-10-1").click();

    expect(popupOf().querySelector(".cui__popup-time")?.textContent).toBe("<b>全天</b>");
    expect(popupOf().querySelector(".cui__popup-name")?.textContent).toBe("<b>不是标签</b>");
    expect(popupOf().querySelector(".cui__popup-item b")).toBeNull();
  });

  it("render 只在创建 / 重绘时调用，打开 popup 复用缓存", () => {
    const render = vi.fn((day: CalendarDate): readonly DayPopupItem[] =>
      day.month === 10 && day.day === 1 ? [["全天", "缓存内容", "详情"]] : [],
    );
    const instance = create({ render });
    const callsBeforeOpen = render.mock.calls.filter(
      ([day]) => day.month === 10 && day.day === 1,
    ).length;

    cellOf(instance.el, "2026-10-1").click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    cellOf(instance.el, "2026-10-1").click();

    expect(callsBeforeOpen).toBe(1);
    expect(render.mock.calls.filter(([day]) => day.month === 10 && day.day === 1)).toHaveLength(1);
    expect(itemsOf()).toEqual(["全天缓存内容详情"]);
  });

  it("返回空数组的日期没有绿点，点击也不弹", () => {
    const instance = create({ render: () => [] });

    expect(dotOf(instance.el, "2026-10-1").hidden).toBe(true);

    cellOf(instance.el, "2026-10-1").click();
    expect(popupOf().hidden).toBe(true);
  });

  it("hover 触发用 tooltip 语义", () => {
    const instance = create({
      trigger: "hover",
      render: (day) => (day.month === 10 && day.day === 1 ? [["全天", "悬浮", "详情"]] : []),
    });

    cellOf(instance.el, "2026-10-1").dispatchEvent(
      new MouseEvent("pointerover", { bubbles: true }),
    );

    const popup = popupOf();
    expect(popup.hidden).toBe(false);
    expect(popup.getAttribute("role")).toBe("tooltip");
    expect(cellOf(instance.el, "2026-10-1").getAttribute("aria-describedby")).toBe(popup.id);
  });

  it("点击外部和 Esc 都能关闭", () => {
    const instance = create({ render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");

    cell.click();
    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(popupOf().hidden).toBe(true);

    cell.click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(popupOf().hidden).toBe(true);
  });

  it("换月后关闭", () => {
    const instance = create({ render: sharedRender });
    cellOf(instance.el, "2026-10-1").click();
    expect(popupOf().hidden).toBe(false);

    instance.nextMonth();

    expect(popupOf().hidden).toBe(true);
  });

  it("render 返回值不合法时抛 TypeError", () => {
    expect(() => create({ render: () => "不是数组" as unknown as [] })).toThrow(TypeError);

    cleanups.pop()?.();
    document.body.innerHTML = "";

    expect(() => create({ render: () => ["字符串"] as unknown as [] })).toThrow(TypeError);

    cleanups.pop()?.();
    document.body.innerHTML = "";

    expect(() => create({ render: () => [["a", "b", "c", "d"]] as unknown as [] })).toThrow(
      TypeError,
    );
  });

  it("销毁实例时移除 popup", () => {
    const instance = create({ render: sharedRender });
    cellOf(instance.el, "2026-10-1").click();

    instance.destroy();
    cleanups.pop();

    expect(document.querySelector(".cui__popup")).toBeNull();
  });
});
