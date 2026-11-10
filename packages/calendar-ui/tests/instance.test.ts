// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vite-plus/test";
import type { CalendarDate, CalendarInstance, DayPopupItem } from "../src/index.ts";
import { createCalendarUI } from "../src/index.ts";

const hosts: HTMLElement[] = [];
const instances: CalendarInstance[] = [];

afterEach(() => {
  while (instances.length > 0) instances.pop()?.destroy();
  while (hosts.length > 0) hosts.pop()?.remove();
  document.body.innerHTML = "";
});

const host = function (): HTMLElement {
  const el = document.createElement("div");
  document.body.append(el);
  hosts.push(el);
  return el;
};

const create = function (options: Parameters<typeof createCalendarUI>[1] = {}): {
  instance: CalendarInstance;
  host: HTMLElement;
} {
  const target = host();
  const instance = createCalendarUI(target, options);
  instances.push(instance);
  return { instance, host: target };
};

const cellOf = function (root: HTMLElement, key: string): HTMLButtonElement {
  const cell = root.querySelector<HTMLButtonElement>(`.cui__day[data-date="${key}"]`);
  if (!cell) throw new Error(`missing cell ${key}`);
  return cell;
};

const popupOf = function (): HTMLElement {
  const popup = document.querySelector<HTMLElement>(".cui__popup");
  if (!popup) throw new Error("missing popup");
  return popup;
};

const renderDay = (day: CalendarDate): readonly DayPopupItem[] =>
  day.month === 10 && day.day === 1 ? [["全天", "内容"]] : [];

describe("实例显示 / 隐藏", () => {
  it("show / hide / toggle / isVisible 同步 root.hidden", () => {
    const { instance } = create();
    expect(instance.isVisible()).toBe(true);
    expect(instance.el.hidden).toBe(false);

    instance.hide();
    expect(instance.isVisible()).toBe(false);
    expect(instance.el.hidden).toBe(true);

    instance.show();
    expect(instance.isVisible()).toBe(true);
    expect(instance.el.hidden).toBe(false);

    instance.toggle();
    expect(instance.isVisible()).toBe(false);
    instance.toggle();
    expect(instance.isVisible()).toBe(true);
  });

  it("hide / toggle 隐藏时会关闭已打开的 popup", () => {
    const { instance } = create({ initialDate: "2026-10-01", popup: { render: renderDay } });
    const cell = cellOf(instance.el, "2026-10-1");

    cell.click();
    expect(popupOf().hidden).toBe(false);
    instance.hide();
    expect(popupOf().hidden).toBe(true);

    instance.show();
    cell.click();
    instance.toggle();
    expect(popupOf().hidden).toBe(true);
  });
});

describe("头部渲染", () => {
  it("默认创建头部和月份选择层", () => {
    const { instance } = create();

    expect(instance.el.querySelector(".cui__header")).not.toBeNull();
    expect(instance.el.querySelector(".cui__picker")).not.toBeNull();
    expect(instance.el.querySelector('[data-part="year"]')).not.toBeNull();
  });

  it("header: false 时不渲染头部和选择层节点", () => {
    const { instance } = create({ header: false });

    expect(instance.el.querySelector(".cui__header")).toBeNull();
    expect(instance.el.querySelector(".cui__picker")).toBeNull();
    expect(instance.el.querySelector("[data-part]")).toBeNull();
    expect(instance.el.querySelectorAll(".cui__day")).toHaveLength(42);
  });

  it("header: false 时 renderHeader 不会被调用", () => {
    let calls = 0;
    const { instance } = create({
      header: false,
      renderHeader: () => {
        calls += 1;
        return document.createElement("div");
      },
    });

    expect(calls).toBe(0);
    expect(instance.el.querySelector(".cui__header")).toBeNull();
  });

  it("header: false 的双视图正常渲染", () => {
    const { instance } = create({
      header: false,
      mode: "range",
      months: 2,
      initialDate: "2026-10-01",
    });

    expect(instance.el.querySelector(".cui__header")).toBeNull();
    expect(instance.el.querySelector(".cui__picker")).toBeNull();
    expect(instance.el.querySelector(".cui__months")).not.toBeNull();
    expect(instance.el.querySelectorAll(".cui__grid")).toHaveLength(2);
  });

  it("header: false 的实例可以正常销毁", () => {
    const { instance } = create({ header: false, animation: { collapse: {} } });

    expect(() => instance.destroy()).not.toThrow();
    instances.pop();
  });
});

describe("实例选中值", () => {
  it("单选模式 getSelected 返回选中日期", () => {
    const { instance } = create({ initialDate: "2026-10-15" });

    expect(instance.getSelected()).toEqual(new Date(2026, 9, 15));
    instance.select("2026-10-20");
    expect(instance.getSelected()).toEqual(new Date(2026, 9, 20));
  });

  it("范围模式未选范围时 getSelected 为 null", () => {
    const { instance } = create({ mode: "range", initialDate: "2026-10-15" });

    expect(instance.getSelected()).toBeNull();
    expect(instance.getRange()).toEqual({ start: null, end: null });
  });

  it("范围模式选中后 getSelected 返回范围起点", () => {
    const { instance } = create({ mode: "range", initialDate: "2026-10-01" });

    cellOf(instance.el, "2026-10-10").click();
    expect(instance.getSelected()).toEqual(new Date(2026, 9, 10));
    expect(instance.getRange().start).toEqual(new Date(2026, 9, 10));

    cellOf(instance.el, "2026-10-20").click();
    expect(instance.getSelected()).toEqual(new Date(2026, 9, 10));
    expect(instance.getRange().end).toEqual(new Date(2026, 9, 20));

    instance.setRange("2026-10-5", "2026-10-8");
    expect(instance.getSelected()).toEqual(new Date(2026, 9, 5));
  });
});

describe("实例日期边界", () => {
  it("setRange 省略 end 表示只选起点", () => {
    const { instance } = create({ mode: "range", initialDate: "2026-10-01" });

    instance.setRange("2026-10-10");

    expect(instance.getRange()).toEqual({ start: new Date(2026, 9, 10), end: null });
    expect(instance.getSelected()).toEqual(new Date(2026, 9, 10));
  });

  it("setRange 的起点或终点被禁用时不改状态", () => {
    const { instance } = create({
      mode: "range",
      initialDate: "2026-10-01",
      disabledDates: ["2026-10-08"],
    });

    instance.setRange("2026-10-05", "2026-10-08");
    expect(instance.getRange()).toEqual({ start: null, end: null });

    instance.setRange("2026-10-05", "2026-10-10");
    expect(instance.getRange()).toEqual({
      start: new Date(2026, 9, 5),
      end: new Date(2026, 9, 10),
    });
  });

  it("getMinDate / getMaxDate 返回副本而不是内部引用", () => {
    const { instance } = create({
      initialDate: "2026-10-15",
      minDate: "2026-10-01",
      maxDate: "2026-10-31",
    });

    const min = instance.getMinDate();
    const max = instance.getMaxDate();
    expect(min).toEqual(new Date(2026, 9, 1));
    expect(max).toEqual(new Date(2026, 9, 31));

    min?.setFullYear(2000);
    max?.setFullYear(2100);
    expect(instance.getMinDate()).toEqual(new Date(2026, 9, 1));
    expect(instance.getMaxDate()).toEqual(new Date(2026, 9, 31));
  });

  it("setMinDate / setMaxDate 接受字符串与 null", () => {
    const { instance } = create({ initialDate: "2026-10-15" });

    instance.setMinDate("2026/10/05");
    instance.setMaxDate("2026-10-25");
    expect(instance.getMinDate()).toEqual(new Date(2026, 9, 5));
    expect(instance.getMaxDate()).toEqual(new Date(2026, 9, 25));

    instance.setMinDate(null);
    instance.setMaxDate(null);
    expect(instance.getMinDate()).toBeNull();
    expect(instance.getMaxDate()).toBeNull();
  });

  it("范围模式还没有范围时设置边界不会凭空产生范围", () => {
    const { instance } = create({ mode: "range", initialDate: "2026-10-01" });

    instance.setMinDate("2026-10-10");

    expect(instance.getRange()).toEqual({ start: null, end: null });
    expect(instance.getMonth()).toEqual({ year: 2026, month: 10 });
  });

  it("范围模式只有起点时设置边界会夹取起点", () => {
    const { instance } = create({ mode: "range", initialDate: "2026-10-01" });

    instance.setRange("2026-10-05");
    instance.setMinDate("2026-10-10");

    expect(instance.getRange()).toEqual({ start: new Date(2026, 9, 10), end: null });
  });
});

describe("实例主题", () => {
  it("setTheme 会同步刷新已打开 popup 的主题", () => {
    const { instance } = create({
      initialDate: "2026-10-01",
      theme: "light",
      popup: { render: renderDay },
    });
    const popup = createPopupFor(instance);

    instance.setTheme("dark");
    expect(popup.dataset.theme).toBe("dark");
    expect(instance.getTheme()).toBe("dark");
  });
});

/** 打开 popup 后返回节点，顺手断言确实打开 */
const createPopupFor = function (instance: CalendarInstance): HTMLElement {
  cellOf(instance.el, "2026-10-1").click();
  const popup = popupOf();
  expect(popup.hidden).toBe(false);
  return popup;
};

describe("实例销毁", () => {
  it("destroy 移除根节点、popup 和开着的弹层", () => {
    const { instance, host: container } = create({
      initialDate: "2026-10-01",
      popup: { render: renderDay },
    });
    cellOf(instance.el, "2026-10-1").click();

    instance.destroy();
    instances.pop();

    expect(container.childElementCount).toBe(0);
    expect(document.querySelector(".cui__popup")).toBeNull();
  });

  it("destroy 后 root 上的事件监听不再触发", () => {
    const { instance } = create({ initialDate: "2026-10-01" });
    const root = instance.el;
    const cell = cellOf(root, "2026-10-1");
    instance.destroy();
    instances.pop();

    // 节点已经脱离文档，点击不应抛错，也不应重建 popup
    expect(() => cell.click()).not.toThrow();
    expect(document.querySelector(".cui__popup")).toBeNull();
  });
});
