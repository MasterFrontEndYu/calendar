// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  CalendarDate,
  CalendarInstance,
  CalendarOptions,
  CalendarPopupOptions,
  DayPopupItem,
} from "../src/index.ts";
import { createCalendarUI } from "../src/index.ts";
import { zhCN } from "../src/index.ts";
import { createDayPopup } from "../src/core/day-popup.ts";

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

const create = function (
  popup: CalendarPopupOptions,
  options: Omit<CalendarOptions, "popup"> = {},
): CalendarInstance {
  const container = document.createElement("div");
  document.body.append(container);
  const instance = createCalendarUI(container, {
    initialDate: options.initialDate ?? "2026-10-01",
    ...options,
    popup,
  });
  cleanups.push(() => {
    instance.destroy();
    container.remove();
  });
  return instance;
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

const isOpen = function (): boolean {
  return !popupOf().hidden;
};

const itemsOf = function (): string[] {
  return [...popupOf().querySelectorAll(".cui__popup-item")].map((item) => item.textContent ?? "");
};

const pointer = function (target: EventTarget, type: string, related?: Node | null): void {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget: related ?? null }));
};

const focusIn = function (target: EventTarget): void {
  target.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
};

const focusOut = function (target: EventTarget, related?: Node | null): void {
  target.dispatchEvent(
    new FocusEvent("focusout", { bubbles: true, relatedTarget: related ?? null }),
  );
};

const escape = function (): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
};

/** 只有 10 月 1 日、5 日有内容 */
const sharedRender = function (day: CalendarDate): readonly DayPopupItem[] {
  return day.month === 10 && (day.day === 1 || day.day === 5)
    ? [["全天", `${day.day} 号`, "内容"]]
    : [];
};

/** 伪造 hover 能力 */
const stubHover = function (matches: boolean): void {
  const win = window as unknown as { matchMedia?: unknown };
  const original = win.matchMedia;
  win.matchMedia = (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
  cleanups.push(() => {
    if (original === undefined) delete win.matchMedia;
    else win.matchMedia = original;
  });
};

const rect = function (value: Partial<DOMRect>): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    toJSON: () => ({}),
    ...value,
  } as DOMRect;
};

/** 给目标日期格和 popup 伪造布局矩形 */
const stubRects = function (cell: Partial<DOMRect>, popup: Partial<DOMRect>): void {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
    this: Element,
  ): DOMRect {
    if (this.classList.contains("cui__popup")) return rect(popup);
    if (this.classList.contains("cui__day") && this.getAttribute("data-date") === "2026-10-1") {
      return rect(cell);
    }
    return rect({});
  });
};

describe("click 触发", () => {
  it("点击有内容的格子打开，再次点击关闭", () => {
    const instance = create({ render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");

    cell.click();
    expect(isOpen()).toBe(true);
    expect(itemsOf()).toEqual(["全天1 号内容"]);

    cell.click();
    expect(isOpen()).toBe(false);
  });

  it("点击另一个有内容的格子会切换内容", () => {
    const instance = create({ render: sharedRender });
    const first = cellOf(instance.el, "2026-10-1");
    const second = cellOf(instance.el, "2026-10-5");

    first.click();
    expect(popupOf().querySelector(".cui__popup-head")?.textContent).toBe("10 月 1 日 · 1 条");

    second.click();
    expect(isOpen()).toBe(true);
    expect(popupOf().querySelector(".cui__popup-head")?.textContent).toBe("10 月 5 日 · 1 条");
    expect(itemsOf()).toEqual(["全天5 号内容"]);
    expect(first.getAttribute("aria-expanded")).toBeNull();
    expect(second.getAttribute("aria-expanded")).toBe("true");
  });

  it("点击格子内部的数字 / 副标题也能打开", () => {
    const instance = create({ render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");
    const num = cell.querySelector(".cui__day-num")!;

    num.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(isOpen()).toBe(true);
  });

  it("点击非日期格、没有日期的格子和非法日期都不打开", () => {
    const instance = create({ render: sharedRender });
    instance.el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(isOpen()).toBe(false);

    const noDate = document.createElement("button");
    noDate.className = "cui__day";
    instance.el.append(noDate);
    noDate.click();
    expect(isOpen()).toBe(false);

    const malformed = document.createElement("button");
    malformed.className = "cui__day";
    malformed.dataset.date = "abc";
    instance.el.append(malformed);
    malformed.click();
    expect(isOpen()).toBe(false);

    const zeroDay = document.createElement("button");
    zeroDay.className = "cui__day";
    zeroDay.dataset.date = "2026-10-0";
    instance.el.append(zeroDay);
    zeroDay.click();
    expect(isOpen()).toBe(false);
  });

  it("禁用日期点击不打开", () => {
    const instance = create(
      { render: sharedRender },
      { initialDate: "2026-10-01", disabledDates: ["2026-10-01"] },
    );

    const cell = cellOf(instance.el, "2026-10-1");
    expect(cell.disabled).toBe(true);
    cell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(isOpen()).toBe(false);
  });
});

describe("hover 触发", () => {
  it("pointerover 打开 tooltip，pointerout 延迟关闭", () => {
    vi.useFakeTimers();
    const instance = create({ trigger: "hover", render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");

    pointer(cell, "pointerover");
    expect(isOpen()).toBe(true);

    pointer(cell, "pointerout");
    vi.advanceTimersByTime(119);
    expect(isOpen()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(isOpen()).toBe(false);
  });

  it("鼠标移入 popup 会取消关闭，移出后重新计时", () => {
    vi.useFakeTimers();
    const instance = create({ trigger: "hover", render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");
    const popup = popupOf();

    pointer(cell, "pointerover");
    pointer(cell, "pointerout");
    pointer(popup, "pointerenter");
    vi.advanceTimersByTime(500);
    expect(isOpen()).toBe(true);

    pointer(popup, "pointerleave");
    vi.advanceTimersByTime(120);
    expect(isOpen()).toBe(false);
  });

  it("pointerout 的 relatedTarget 在格子或 popup 内时不关闭", () => {
    vi.useFakeTimers();
    const instance = create({ trigger: "hover", render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");
    const popup = popupOf();
    const num = cell.querySelector(".cui__day-num")!;

    pointer(cell, "pointerover");
    pointer(cell, "pointerout", num);
    vi.advanceTimersByTime(200);
    expect(isOpen()).toBe(true);

    pointer(cell, "pointerout", popup);
    vi.advanceTimersByTime(200);
    expect(isOpen()).toBe(true);

    pointer(popup, "pointerleave", cell);
    vi.advanceTimersByTime(200);
    expect(isOpen()).toBe(true);
  });

  it("移到另一个有内容的格子会切换 popup，移到无内容格子保持原样", () => {
    vi.useFakeTimers();
    const instance = create({ trigger: "hover", render: sharedRender });
    const first = cellOf(instance.el, "2026-10-1");

    pointer(first, "pointerover");
    pointer(cellOf(instance.el, "2026-10-2"), "pointerover");
    expect(isOpen()).toBe(true);
    expect(itemsOf()).toEqual(["全天1 号内容"]);

    pointer(first, "pointerover");
    pointer(first, "pointerout");
    vi.advanceTimersByTime(200);
    expect(isOpen()).toBe(false);

    pointer(cellOf(instance.el, "2026-10-5"), "pointerover");
    expect(itemsOf()).toEqual(["全天5 号内容"]);
  });

  it("hover 模式下点击只在键盘点击（detail 0）时切换", () => {
    const instance = create({ trigger: "hover", render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");

    cell.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    expect(isOpen()).toBe(false);

    cell.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    expect(isOpen()).toBe(true);
    cell.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    expect(isOpen()).toBe(false);
  });

  it("禁用日期的 hover 不打开", () => {
    const instance = create(
      { trigger: "hover", render: sharedRender },
      { disabledDates: ["2026-10-01"] },
    );

    pointer(cellOf(instance.el, "2026-10-1"), "pointerover");
    expect(isOpen()).toBe(false);
  });
});

describe("focus 触发", () => {
  it("focusin 打开，focusout 关闭", () => {
    const instance = create({ trigger: "focus", render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");

    focusIn(cell);
    expect(isOpen()).toBe(true);
    expect(cell.getAttribute("aria-describedby")).toBe(popupOf().id);

    focusOut(cell);
    expect(isOpen()).toBe(false);
  });

  it("焦点在格子与 popup 之间移动时不关闭", () => {
    const instance = create({ trigger: "focus", role: "dialog", render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");
    const popup = popupOf();

    focusIn(cell);
    expect(isOpen()).toBe(true);

    focusOut(cell, popup);
    expect(isOpen()).toBe(true);

    focusOut(popup, cell);
    expect(isOpen()).toBe(true);

    focusOut(popup);
    expect(isOpen()).toBe(false);
  });

  it("Escape 关闭后焦点回到日期格，且不会因恢复焦点重新打开", async () => {
    const instance = create({ trigger: "focus", role: "dialog", render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");

    focusIn(cell);
    expect(document.activeElement).toBe(popupOf());

    escape();
    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(cell);

    await Promise.resolve();
    expect(isOpen()).toBe(false);
  });

  it("同一格重复 focusin 不会重复打开，换格则切换", () => {
    const instance = create({ trigger: "focus", render: sharedRender });
    const first = cellOf(instance.el, "2026-10-1");
    const second = cellOf(instance.el, "2026-10-5");

    focusIn(first);
    focusIn(first);
    expect(itemsOf()).toEqual(["全天1 号内容"]);

    focusIn(second);
    expect(itemsOf()).toEqual(["全天5 号内容"]);
  });

  it("点击已打开的格子不会切换", () => {
    const instance = create({ trigger: "focus", render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");

    focusIn(cell);
    expect(isOpen()).toBe(true);

    cell.click();
    expect(isOpen()).toBe(true);
  });
});

describe("auto 触发", () => {
  it("支持 hover 的设备用 hover 打开，鼠标点击不切换", () => {
    stubHover(true);
    const instance = create({ trigger: "auto", render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");

    pointer(cell, "pointerover");
    expect(isOpen()).toBe(true);

    pointer(cell, "pointerout");
    pointer(cell, "pointerover");
    expect(isOpen()).toBe(true);

    cell.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    expect(isOpen()).toBe(true);

    cell.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 }));
    expect(isOpen()).toBe(false);
  });

  it("不支持 hover 的设备退化为 click", () => {
    stubHover(false);
    const instance = create({ trigger: "auto", render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");

    pointer(cell, "pointerover");
    expect(isOpen()).toBe(false);

    cell.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    expect(isOpen()).toBe(true);
    cell.click();
    expect(isOpen()).toBe(false);
  });
});

describe("popup 定位", () => {
  it("bottom：放在格子下方并避开视口边缘", () => {
    stubRects(
      { top: 100, bottom: 130, left: 100, width: 30, height: 30 },
      { height: 50, width: 100 },
    );
    const instance = create({ render: sharedRender, placement: "bottom" });

    cellOf(instance.el, "2026-10-1").click();

    const popup = popupOf();
    expect(popup.dataset.placement).toBe("bottom");
    expect(popup.style.top).toBe("138px");
    expect(popup.style.left).toBe("65px");
  });

  it("top：放在格子上方", () => {
    stubRects(
      { top: 600, bottom: 630, left: 100, width: 30, height: 30 },
      { height: 50, width: 100 },
    );
    const instance = create({ render: sharedRender, placement: "top" });

    cellOf(instance.el, "2026-10-1").click();

    expect(popupOf().dataset.placement).toBe("top");
    expect(popupOf().style.top).toBe("542px");
  });

  it("auto：下方空间不足时翻到上方", () => {
    stubRects(
      { top: 720, bottom: 750, left: 100, width: 30, height: 30 },
      { height: 50, width: 100 },
    );
    const instance = create({ render: sharedRender, placement: "auto" });

    cellOf(instance.el, "2026-10-1").click();

    expect(popupOf().dataset.placement).toBe("top");
    expect(popupOf().style.top).toBe("662px");
  });

  it("auto：下方空间充足时放在下方，左侧超出视口时夹到 8px", () => {
    stubRects({ top: 10, bottom: 40, left: 0, width: 10, height: 30 }, { height: 40, width: 100 });
    const instance = create({ render: sharedRender, placement: "auto" });

    cellOf(instance.el, "2026-10-1").click();

    expect(popupOf().dataset.placement).toBe("bottom");
    expect(popupOf().style.left).toBe("8px");
    expect(popupOf().style.top).toBe("48px");
  });

  it("center：不写 left / top，改用居中定位", () => {
    stubRects(
      { top: 100, bottom: 130, left: 100, width: 30, height: 30 },
      { height: 50, width: 100 },
    );
    const instance = create({ render: sharedRender, placement: "center" });

    cellOf(instance.el, "2026-10-1").click();

    const popup = popupOf();
    expect(popup.dataset.placement).toBe("center");
    expect(popup.style.left).toBe("");
    expect(popup.style.top).toBe("");
  });
});

describe("popup 主题与无障碍", () => {
  it("继承根节点的主题和 CSS 变量", () => {
    const instance = create({ render: sharedRender });
    instance.el.dataset.theme = "light";
    instance.el.style.setProperty("--cui-bg", "#fff");
    instance.el.style.setProperty("--cui-accent", "#06f");

    cellOf(instance.el, "2026-10-1").click();

    expect(popupOf().dataset.theme).toBe("light");
  });

  it("没有 data-theme 时主题为 auto", () => {
    const instance = create({ render: sharedRender });
    delete instance.el.dataset.theme;

    cellOf(instance.el, "2026-10-1").click();

    expect(popupOf().dataset.theme).toBe("auto");
  });

  it("role / aria-label 写到 popup 上，dialog 可聚焦", () => {
    const instance = create({
      render: sharedRender,
      role: "dialog",
      ariaLabel: "日程详情",
    });

    cellOf(instance.el, "2026-10-1").click();

    expect(popupOf().getAttribute("role")).toBe("dialog");
    expect(popupOf().getAttribute("aria-label")).toBe("日程详情");
    expect(popupOf().tabIndex).toBe(-1);
    expect(document.activeElement).toBe(popupOf());
  });

  it("tooltip 使用 aria-describedby，不设置 aria-expanded", () => {
    const instance = create({ trigger: "hover", render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");

    pointer(cell, "pointerover");

    expect(popupOf().getAttribute("role")).toBe("tooltip");
    expect(cell.getAttribute("aria-describedby")).toBe(popupOf().id);
    expect(cell.hasAttribute("aria-expanded")).toBe(false);
    expect(document.activeElement).not.toBe(popupOf());
  });

  it("dialog 角色给有内容的格子加 aria-haspopup，销毁时移除", () => {
    const instance = create({ render: sharedRender });

    expect(cellOf(instance.el, "2026-10-1").getAttribute("aria-haspopup")).toBe("dialog");
    expect(cellOf(instance.el, "2026-10-2").hasAttribute("aria-haspopup")).toBe(false);

    const cell = cellOf(instance.el, "2026-10-1");
    instance.destroy();
    cleanups.pop();

    expect(cell.hasAttribute("aria-haspopup")).toBe(false);
    expect(document.querySelector(".cui__popup")).toBeNull();
  });

  it("自定义 popupTitle 优先于默认文案", () => {
    const instance = create(
      { render: sharedRender },
      {
        initialDate: "2026-10-01",
        locale: { ...zhCN, popupTitle: (day, count) => `自定义 ${day.day}/${count}` },
      },
    );

    cellOf(instance.el, "2026-10-1").click();
    expect(popupOf().querySelector(".cui__popup-head")?.textContent).toBe("自定义 1/1");
  });

  it("语言包没有 popupTitle 时使用默认的 月/日 · 条数", () => {
    const instance = create(
      { render: sharedRender },
      {
        initialDate: "2026-10-01",
        locale: { ...zhCN, popupTitle: undefined },
      },
    );

    cellOf(instance.el, "2026-10-1").click();
    expect(popupOf().querySelector(".cui__popup-head")?.textContent).toBe("10/1 · 1");
  });
});

describe("popup 关闭路径", () => {
  it("pointerdown 在 popup 或当前格子上不关闭，在外部关闭", () => {
    const instance = create({ render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");

    cell.click();
    pointer(popupOf(), "pointerdown");
    expect(isOpen()).toBe(true);

    pointer(cell, "pointerdown");
    expect(isOpen()).toBe(true);

    pointer(document.body, "pointerdown");
    expect(isOpen()).toBe(false);
  });

  it("Escape 关闭，scroll / resize 关闭", () => {
    const instance = create({ render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");

    cell.click();
    escape();
    expect(isOpen()).toBe(false);

    cell.click();
    document.dispatchEvent(new Event("scroll"));
    expect(isOpen()).toBe(false);

    cell.click();
    window.dispatchEvent(new Event("resize"));
    expect(isOpen()).toBe(false);
  });

  it("折叠隐藏当前行后 popup 关闭", () => {
    const instance = create(
      { trigger: "hover", render: sharedRender },
      { animation: { collapse: {} } },
    );

    pointer(cellOf(instance.el, "2026-10-5"), "pointerover");
    expect(isOpen()).toBe(true);

    instance.el.querySelector<HTMLButtonElement>(".cui__collapse")!.click();
    expect(isOpen()).toBe(false);
  });

  it("根节点隐藏后重绘会关闭 popup", () => {
    const instance = create({ render: sharedRender });
    cellOf(instance.el, "2026-10-1").click();

    instance.el.hidden = true;
    instance.select("2026-10-20");

    expect(isOpen()).toBe(false);
  });

  it("当前格子被禁用后重绘会关闭 popup", () => {
    const instance = create({ render: sharedRender });
    cellOf(instance.el, "2026-10-1").click();
    expect(isOpen()).toBe(true);

    instance.setMinDate("2026-10-02");

    expect(isOpen()).toBe(false);
  });

  it("所在周被隐藏时关闭 popup", () => {
    const instance = create({ render: sharedRender });
    cellOf(instance.el, "2026-10-1").click();
    const week = cellOf(instance.el, "2026-10-1").closest<HTMLElement>(".cui__week")!;

    week.hidden = true;
    instance.select("2026-10-20");

    expect(isOpen()).toBe(false);
  });

  it("格子日期变化（换月）后关闭 popup", () => {
    const instance = create({ render: sharedRender });
    cellOf(instance.el, "2026-10-1").click();

    instance.nextMonth();

    expect(isOpen()).toBe(false);
  });

  it("仍有效的 popup 重绘后保持打开并重新定位", () => {
    stubRects(
      { top: 100, bottom: 130, left: 100, width: 30, height: 30 },
      { height: 50, width: 100 },
    );
    const instance = create({ render: sharedRender });
    cellOf(instance.el, "2026-10-1").click();

    instance.select("2026-10-20");

    expect(isOpen()).toBe(true);
    expect(popupOf().style.top).toBe("138px");
  });
});

describe("popup 控制器句柄", () => {
  it("isOpen / close / refreshTheme 与内部状态一致", () => {
    const root = document.createElement("div");
    const cell = document.createElement("button");
    cell.className = "cui__day";
    cell.dataset.date = "2026-10-1";
    const dot = document.createElement("span");
    dot.className = "cui__day-dot";
    cell.append(dot);
    root.append(cell);
    document.body.append(root);

    const handle = createDayPopup({
      root,
      popup: {
        trigger: "click",
        render: () => [["全天", "内容"]],
        placement: "auto",
        role: "dialog",
      },
      locale: zhCN,
    });
    cleanups.push(() => {
      handle.destroy();
      root.remove();
    });

    expect(handle.isOpen()).toBe(false);
    expect(dot.hidden).toBe(false);

    cell.click();
    expect(handle.isOpen()).toBe(true);

    handle.close();
    expect(handle.isOpen()).toBe(false);

    expect(() => handle.refreshTheme()).not.toThrow();
    handle.destroy();
    expect(document.querySelector(".cui__popup")).toBeNull();
  });
});

describe("ResizeObserver 与销毁", () => {
  it("支持 ResizeObserver 时打开状态会跟随重新定位，销毁时断开", () => {
    const observers: Array<{ callback: () => void; disconnected: boolean }> = [];

    class FakeResizeObserver {
      private readonly entry: { callback: () => void; disconnected: boolean };

      constructor(callback: () => void) {
        this.entry = { callback, disconnected: false };
        observers.push(this.entry);
      }

      observe(): void {}

      disconnect(): void {
        this.entry.disconnected = true;
      }
    }

    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
    const instance = create({ render: sharedRender });
    cellOf(instance.el, "2026-10-1").click();

    expect(observers).toHaveLength(1);
    expect(() => observers[0]!.callback()).not.toThrow();

    instance.destroy();
    cleanups.pop();

    expect(observers[0]!.disconnected).toBe(true);
  });

  it("销毁后 popup 节点被移除，事件监听全部解除", () => {
    const instance = create({ trigger: "hover", render: sharedRender });
    const cell = cellOf(instance.el, "2026-10-1");

    pointer(cell, "pointerover");
    expect(isOpen()).toBe(true);

    instance.destroy();
    cleanups.pop();

    expect(document.querySelector(".cui__popup")).toBeNull();
    expect(() => pointer(cell, "pointerover")).not.toThrow();
  });
});
