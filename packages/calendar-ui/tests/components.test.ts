// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { CalendarDay, CalendarLocale, HeaderRenderContext } from "../src/index.ts";
import { zhCN } from "../src/index.ts";
import { createCalendarUI } from "../src/index.ts";
import { createDayCell, setDay } from "../src/components/day.ts";
import { createGrid } from "../src/components/grid.ts";
import { createHeader } from "../src/components/header.ts";
import { createPicker } from "../src/components/picker.ts";
import { createCollapse } from "../src/core/collapse.ts";
import { createMonthSlide } from "../src/core/month-slide.ts";
import { createPickerLayer } from "../src/core/picker-layer.ts";
import { createState } from "../src/core/state.ts";
import type { CalendarConfig, MonthSlidePanel } from "../src/types/core.ts";
import { node } from "../src/utils/dom.ts";

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

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

const dayOf = function (day: number, patch: Partial<CalendarDay> = {}): CalendarDay {
  return {
    year: 2026,
    month: 10,
    day,
    date: new Date(2026, 9, day),
    inCurrentMonth: true,
    isToday: false,
    isSelected: false,
    isDisabled: false,
    isRangeStart: false,
    isRangeEnd: false,
    isInRange: false,
    subtitle: "",
    badge: null,
    data: null,
    ariaLabel: `2026-10-${day}`,
    ...patch,
  };
};

const daysOf = function (count = 42): CalendarDay[] {
  return Array.from({ length: count }, (_, index) => dayOf(index + 1));
};

describe("网格点击", () => {
  it("点击格子回传对应数据和索引", () => {
    const onSelect = vi.fn();
    const grid = createGrid({ onSelect });
    document.body.append(grid.el);
    const days = daysOf();
    grid.render(days);

    grid.el.querySelectorAll<HTMLButtonElement>(".cui__day")[5]!.click();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0]).toBe(days[5]);
    expect(onSelect.mock.calls[0]?.[1]).toBe(5);
  });

  it("禁用格、空白区域、未知格子和缺失数据都不触发", () => {
    const onSelect = vi.fn();
    const grid = createGrid({ onSelect });
    document.body.append(grid.el);
    const days = daysOf();
    days[3] = dayOf(4, { isDisabled: true });
    grid.render(days);

    grid.el
      .querySelectorAll<HTMLButtonElement>(".cui__day")[3]!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();

    grid.el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelect).not.toHaveBeenCalled();

    const stray = document.createElement("button");
    stray.className = "cui__day";
    grid.el.append(stray);
    stray.click();
    expect(onSelect).not.toHaveBeenCalled();

    grid.render(days.slice(0, 2));
    grid.el.querySelectorAll<HTMLButtonElement>(".cui__day")[20]!.click();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("destroy 后不再响应点击", () => {
    const onSelect = vi.fn();
    const grid = createGrid({ onSelect });
    document.body.append(grid.el);
    grid.render(daysOf());

    grid.destroy();
    grid.el.querySelectorAll<HTMLButtonElement>(".cui__day")[0]!.click();

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("updateState 接受不完整的 42 天数据", () => {
    const grid = createGrid({ onSelect: () => {} });
    document.body.append(grid.el);
    grid.render(daysOf());

    expect(() => grid.updateState(daysOf(2))).not.toThrow();
  });
});

describe("网格行可见性", () => {
  const rowsOf = function (root: HTMLElement): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(".cui__week"));
  };

  it("animate=false 直接切换可见行", () => {
    const grid = createGrid({ onSelect: () => {} });
    document.body.append(grid.el);

    grid.setVisibleRows([0, 1], false);
    expect(rowsOf(grid.el).map((row) => row.classList.contains("is-collapsed-hidden"))).toEqual([
      false,
      false,
      true,
      true,
      true,
      true,
    ]);

    grid.setVisibleRows(null, false);
    expect(rowsOf(grid.el).every((row) => !row.classList.contains("is-collapsed-hidden"))).toBe(
      true,
    );
  });

  it("行集合没变时跳过整段更新", () => {
    const grid = createGrid({ onSelect: () => {} });
    document.body.append(grid.el);

    grid.setVisibleRows([0], false);
    const classes = rowsOf(grid.el).map((row) => row.className);
    grid.setVisibleRows([0]);

    expect(rowsOf(grid.el).map((row) => row.className)).toEqual(classes);
  });

  it("支持动画时按行高差补间，并在下一次切换时取消旧动画", async () => {
    const cancels: Array<ReturnType<typeof vi.fn>> = [];
    const finishes: Array<() => void> = [];
    const animate = vi.fn(() => {
      const cancel = vi.fn();
      cancels.push(cancel);
      const finished = new Promise<void>((resolve) => {
        finishes.push(resolve);
      });
      return { cancel, finished };
    });
    const hadAnimate = "animate" in Element.prototype;
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      writable: true,
      value: animate,
    });
    cleanups.push(() => {
      if (!hadAnimate) delete (Element.prototype as unknown as { animate?: unknown }).animate;
    });

    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ): DOMRect {
      if (this.classList.contains("cui__week")) {
        return rect({ height: this.classList.contains("is-collapsed-hidden") ? 0 : 40 });
      }
      return rect({});
    });

    const grid = createGrid({ onSelect: () => {} });
    document.body.append(grid.el);

    grid.setVisibleRows([0]);
    expect(animate).toHaveBeenCalledTimes(5);

    grid.setVisibleRows([1]);
    const totalCancels = (): number =>
      cancels.reduce((total, cancel) => total + cancel.mock.calls.length, 0);
    expect(totalCancels()).toBe(5);

    for (const resolve of finishes) resolve();
    await Promise.resolve();
    await Promise.resolve();

    grid.setVisibleRows([2]);
    expect(totalCancels()).toBe(5);
    expect(animate.mock.calls.length).toBeGreaterThan(5);
  });

  it("读取行尺寸时容忍非数字的 margin / opacity", () => {
    const animate = vi.fn(() => ({ cancel: vi.fn(), finished: Promise.resolve() }));
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      writable: true,
      value: animate,
    });
    cleanups.push(() => {
      delete (Element.prototype as unknown as { animate?: unknown }).animate;
    });
    const original = globalThis.getComputedStyle.bind(globalThis);
    vi.stubGlobal("getComputedStyle", (element: Element) => {
      if (element.classList.contains("cui__week")) {
        return { marginBottom: "auto", opacity: "abc" } as unknown as CSSStyleDeclaration;
      }
      return original(element);
    });
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ): DOMRect {
      if (this.classList.contains("cui__week")) {
        return rect({ height: this.classList.contains("is-collapsed-hidden") ? 0 : 40 });
      }
      return rect({});
    });

    const grid = createGrid({ onSelect: () => {} });
    document.body.append(grid.el);
    grid.setVisibleRows([0]);

    expect(animate).toHaveBeenCalledTimes(5);
  });

  it("减少动态效果时直接切换", () => {
    const animate = vi.fn();
    const hadAnimate = "animate" in Element.prototype;
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      writable: true,
      value: animate,
    });
    cleanups.push(() => {
      if (!hadAnimate) delete (Element.prototype as unknown as { animate?: unknown }).animate;
    });
    vi.stubGlobal("matchMedia", () => ({ matches: true }));

    const grid = createGrid({ onSelect: () => {} });
    document.body.append(grid.el);

    grid.setVisibleRows([0]);

    expect(animate).not.toHaveBeenCalled();
    expect(rowsOf(grid.el)[1]!.classList.contains("is-collapsed-hidden")).toBe(true);
  });

  it("时长为 0 时直接切换", () => {
    const animate = vi.fn();
    const hadAnimate = "animate" in Element.prototype;
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      writable: true,
      value: animate,
    });
    cleanups.push(() => {
      if (!hadAnimate) delete (Element.prototype as unknown as { animate?: unknown }).animate;
    });

    const original = globalThis.getComputedStyle.bind(globalThis);
    vi.stubGlobal("getComputedStyle", (element: Element) => {
      if (element.classList.contains("cui__grid")) {
        return {
          getPropertyValue: (name: string) => (name === "--cui-collapse-duration" ? "0ms" : ""),
          marginBottom: "",
          opacity: "",
        } as unknown as CSSStyleDeclaration;
      }
      return original(element);
    });

    const grid = createGrid({ onSelect: () => {} });
    document.body.append(grid.el);
    grid.setVisibleRows([0]);

    expect(animate).not.toHaveBeenCalled();
  });
});

describe("年月选择层", () => {
  const createTestPicker = function (overrides: Partial<Parameters<typeof createPicker>[0]> = {}): {
    picker: ReturnType<typeof createPicker>;
    picked: { months: Array<[number, number]>; years: number[] };
  } {
    const picked = { months: [] as Array<[number, number]>, years: [] as number[] };
    const picker = createPicker({
      locale: zhCN,
      getYear: () => 2026,
      getMonth: () => 10,
      isMonthDisabled: () => false,
      isYearDisabled: () => false,
      onPickMonth: (year, month) => picked.months.push([year, month]),
      onPickYear: (year) => picked.years.push(year),
      ...overrides,
    });
    document.body.append(picker.el);
    cleanups.push(() => picker.destroy());
    return { picker, picked };
  };

  const cellsOf = function (picker: ReturnType<typeof createPicker>): HTMLButtonElement[] {
    return Array.from(picker.el.querySelectorAll<HTMLButtonElement>(".cui__picker-cell"));
  };

  it("月份层显示 12 个中文月份，选中当前月并聚焦", () => {
    const { picker } = createTestPicker();
    picker.open("month");

    const cells = cellsOf(picker);
    expect(picker.isOpen()).toBe(true);
    expect(picker.mode()).toBe("month");
    expect(picker.el.getAttribute("aria-label")).toBe("选择月份");
    expect(picker.el.classList.contains("is-month")).toBe(true);
    expect(cells).toHaveLength(12);
    expect(cells[0]?.textContent).toBe("1 月");
    expect(cells[9]?.textContent).toBe("10 月");
    expect(cells[9]?.classList.contains("is-selected")).toBe(true);
    expect(cells[0]?.getAttribute("aria-label")).toBe("2026 年 1 月");
    expect(document.activeElement).toBe(cells[9]);
  });

  it("点击月份 / 年份回传选择结果", () => {
    const { picker, picked } = createTestPicker();
    picker.open("month");
    cellsOf(picker)[2]!.click();
    expect(picked.months).toEqual([[2026, 3]]);

    picker.open("year");
    cellsOf(picker)[0]!.click();
    expect(picked.years).toEqual([2016]);
  });

  it("年份层按 12 年分页，选中当前年并支持翻页", () => {
    const { picker } = createTestPicker();
    picker.open("year");

    expect(picker.el.classList.contains("is-month")).toBe(false);
    expect(picker.el.getAttribute("aria-label")).toBe("选择年份");
    expect(cellsOf(picker)[0]?.textContent).toBe("2016");
    expect(cellsOf(picker)[10]?.classList.contains("is-selected")).toBe(true);
    expect(picker.canPage(-1)).toBe(true);

    picker.movePage(1);
    expect(cellsOf(picker)[0]?.textContent).toBe("2028");
    picker.movePage(-1);
    expect(cellsOf(picker)[0]?.textContent).toBe("2016");
  });

  it("禁用的格子和整页无可用年份时不动", () => {
    const { picker, picked } = createTestPicker({
      isYearDisabled: (year) => year > 2027,
      isMonthDisabled: (_year, month) => month === 1,
    });

    picker.open("month");
    expect(cellsOf(picker)[0]?.disabled).toBe(true);
    cellsOf(picker)[0]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(picked.months).toEqual([]);

    picker.open("year");
    picker.movePage(1);
    expect(cellsOf(picker)[0]?.textContent).toBe("2016");
  });

  it("关闭后模式为 null", () => {
    const { picker } = createTestPicker();
    picker.open("month");
    picker.close();

    expect(picker.mode()).toBeNull();
    expect(picker.isOpen()).toBe(false);
    expect(picker.el.classList.contains("is-open")).toBe(false);

    // 关闭状态下翻页不做事
    expect(() => picker.movePage(1)).not.toThrow();
  });

  it("refresh 在月份层同步当前年份，在年份层重新渲染", () => {
    let year = 2026;
    const { picker, picked } = createTestPicker({ getYear: () => year });

    picker.open("month");
    year = 2027;
    picker.refresh();
    cellsOf(picker)[0]!.click();
    expect(picked.months).toEqual([[2027, 1]]);

    picker.open("year");
    year = 2035;
    picker.refresh();
    expect(cellsOf(picker)[0]?.textContent).toBe("2016");
    expect(cellsOf(picker).some((cell) => cell.classList.contains("is-selected"))).toBe(false);
  });

  it("关闭后 refresh 和点击都不会出错", () => {
    const { picker, picked } = createTestPicker();
    picker.open("month");
    picker.close();
    picker.refresh();
    cellsOf(picker)[0]!.click();

    expect(picked.months).toEqual([]);
  });

  it("当前年份被禁用时聚焦第一页第一个格子", () => {
    const { picker } = createTestPicker({ isYearDisabled: (year) => year === 2026 });
    picker.open("year");

    expect(document.activeElement).toBe(cellsOf(picker)[0]);
  });

  it("点击不属于 12 格的格子不触发选择", () => {
    const { picker, picked } = createTestPicker();
    picker.open("year");
    const stray = document.createElement("button");
    stray.className = "cui__picker-cell";
    picker.el.querySelector(".cui__picker-grid")!.append(stray);

    stray.click();

    expect(picked.years).toEqual([]);
  });

  it("语言包缺少 monthName / yearLabel / pickMonth / pickYear 时退回内置文案", () => {
    const bare: CalendarLocale = {
      name: "bare",
      weekdays: zhCN.weekdays,
      weekdaysLong: zhCN.weekdaysLong,
      monthTitle: (y, m) => `${y}-${m}`,
      prevMonth: "prev",
      nextMonth: "next",
    };
    const { picker } = createTestPicker({ locale: bare });

    picker.open("month");
    expect(cellsOf(picker)[0]?.textContent).toBe("1");
    expect(cellsOf(picker)[0]?.getAttribute("aria-label")).toBe("2026 1");
    expect(picker.el.getAttribute("aria-label")).toBe("选择月份");

    picker.open("year");
    expect(cellsOf(picker)[0]?.textContent).toBe("2016");
    expect(cellsOf(picker)[0]?.getAttribute("aria-label")).toBe("2016");
    expect(picker.el.getAttribute("aria-label")).toBe("选择年份");
  });
});

describe("头部", () => {
  const createTestHeader = function (
    overrides: Partial<Parameters<typeof createHeader>[0]> = {},
  ): ReturnType<typeof createHeader> {
    const header = createHeader({
      year: 2026,
      month: 10,
      locale: zhCN,
      onPrev: () => {},
      onNext: () => {},
      ...overrides,
    });
    document.body.append(header.el);
    cleanups.push(() => header.destroy());
    return header;
  };

  const partOf = function (header: { el: HTMLElement }, part: string): HTMLButtonElement {
    return header.el.querySelector<HTMLButtonElement>(`[data-part="${part}"]`)!;
  };

  it("默认头部显示年月和左右按钮，更新只改文本", () => {
    const header = createTestHeader();
    const year = partOf(header, "year");
    const month = partOf(header, "month");

    expect(header.el.children).toHaveLength(3);
    expect(year.textContent).toBe("2026 年");
    expect(month.textContent).toBe("10 月");

    header.update(2026, 11);
    expect(month.textContent).toBe("11 月");
    expect(partOf(header, "year")).toBe(year);

    header.update(2026, 11);
    expect(month.textContent).toBe("11 月");
  });

  it("左右按钮的禁用和隐藏状态", () => {
    const header = createTestHeader();
    const navs = header.el.querySelectorAll<HTMLButtonElement>(".cui__nav");

    header.setNavDisabled(true, false);
    expect(navs[0]?.disabled).toBe(true);
    expect(navs[1]?.disabled).toBe(false);

    header.setNavVisible(false);
    expect(navs[0]?.classList.contains("is-nav-hidden")).toBe(true);
    expect(navs[1]?.classList.contains("is-nav-hidden")).toBe(true);

    header.setNavVisible(true);
    expect(navs[0]?.classList.contains("is-nav-hidden")).toBe(false);
  });

  it("没有点击处理器时不写 aria-expanded / aria-haspopup", () => {
    const header = createTestHeader();
    const year = partOf(header, "year");

    header.setTitleExpanded(true);
    expect(year.hasAttribute("aria-expanded")).toBe(false);
    expect(year.hasAttribute("aria-haspopup")).toBe(false);

    header.focusTitle();
    expect(document.activeElement).toBe(year);
  });

  it("有点击处理器时写 aria-expanded 和 aria-haspopup", () => {
    const header = createTestHeader({ onYearClick: () => {}, onMonthClick: () => {} });
    const year = partOf(header, "year");
    const month = partOf(header, "month");

    expect(year.getAttribute("aria-haspopup")).toBe("dialog");
    expect(month.getAttribute("aria-haspopup")).toBe("dialog");

    header.setTitleExpanded(true);
    expect(year.getAttribute("aria-expanded")).toBe("true");
    expect(month.getAttribute("aria-expanded")).toBe("true");

    header.setTitleExpanded(false);
    expect(year.getAttribute("aria-expanded")).toBe("false");
  });

  it("destroy 后标题按钮不再响应点击", () => {
    const onYearClick = vi.fn();
    const header = createHeader({
      year: 2026,
      month: 10,
      locale: zhCN,
      onYearClick,
      onPrev: () => {},
      onNext: () => {},
    });
    document.body.append(header.el);
    const year = partOf(header, "year");

    year.click();
    header.destroy();
    year.click();

    expect(onYearClick).toHaveBeenCalledTimes(1);
  });

  it("语言包没有 titleOrder / yearLabel / monthName 时使用默认顺序和数字", () => {
    const bare: CalendarLocale = {
      name: "bare",
      weekdays: zhCN.weekdays,
      weekdaysLong: zhCN.weekdaysLong,
      monthTitle: (year, month) => `${year}-${month}`,
      prevMonth: "prev",
      nextMonth: "next",
    };
    const header = createTestHeader({ locale: bare });
    const title = header.el.querySelector(".cui__title")!;

    expect(title.children[0]).toBe(partOf(header, "year"));
    expect(partOf(header, "year").textContent).toBe("2026");
    expect(partOf(header, "month").textContent).toBe("10");
  });

  it("自定义头部按上下文渲染，并在换月时重绘", () => {
    let renders = 0;
    const header = createTestHeader({
      renderer: (context: HeaderRenderContext) => {
        renders += 1;
        const el = document.createElement("div");
        el.className = "custom";
        el.textContent = `${context.year}-${context.month}`;
        el.setAttribute("aria-label", `${context.prevDisabled}/${context.nextDisabled}`);
        return el;
      },
    });

    expect(renders).toBe(1);
    expect(header.el.querySelector(".custom")?.textContent).toBe("2026-10");
    expect(header.el.querySelector(".custom")?.getAttribute("aria-label")).toBe("false/false");

    header.update(2026, 10);
    expect(renders).toBe(1);

    header.update(2026, 11);
    expect(renders).toBe(2);
    expect(header.el.querySelector(".custom")?.textContent).toBe("2026-11");
  });

  it("自定义头部能拿到禁用状态和选择层模式", () => {
    const header = createTestHeader({
      renderer: (context) => {
        const el = document.createElement("div");
        el.textContent = `${String(context.prevDisabled)}/${String(context.nextDisabled)}/${String(context.pickerMode)}`;
        return el;
      },
      getNavDisabled: () => ({ prev: true, next: false }),
      getPickerMode: () => "year",
    });

    expect(header.el.textContent).toBe("true/false/year");
  });

  it("自定义头部缺少点击处理器时，toggle 回调是空操作", () => {
    let context: HeaderRenderContext | null = null;
    const header = createTestHeader({
      renderer: (value) => {
        context = value;
        const el = document.createElement("div");
        el.textContent = "custom";
        return el;
      },
    });

    expect(context).not.toBeNull();
    expect(() => context!.toggleYearPicker()).not.toThrow();
    expect(() => context!.toggleMonthPicker()).not.toThrow();
    expect(context!.prevDisabled).toBe(false);
    expect(context!.nextDisabled).toBe(false);
    expect(context!.pickerMode).toBeNull();
    expect(header.el.textContent).toBe("custom");
  });

  it("focusTitle 在自定义头部里依次找标题、选择按钮和第一个按钮", () => {
    // 1. data-cui-title 优先
    const titled = createTestHeader({
      renderer: () => {
        const el = document.createElement("div");
        const label = document.createElement("span");
        label.dataset.cuiTitle = "";
        label.tabIndex = -1;
        const picker = document.createElement("button");
        picker.setAttribute("aria-haspopup", "dialog");
        el.append(picker, label);
        return el;
      },
    });
    titled.focusTitle();
    expect((document.activeElement as HTMLElement).dataset.cuiTitle).toBe("");

    // 2. 没有标题时找 aria-haspopup="dialog"
    const pickerOnly = createTestHeader({
      renderer: () => {
        const el = document.createElement("div");
        const picker = document.createElement("button");
        picker.setAttribute("aria-haspopup", "dialog");
        const plain = document.createElement("button");
        el.append(picker, plain);
        return el;
      },
    });
    pickerOnly.focusTitle();
    expect(document.activeElement?.getAttribute("aria-haspopup")).toBe("dialog");

    // 3. 都没有时找第一个 button
    const plainOnly = createTestHeader({
      renderer: () => {
        const el = document.createElement("div");
        const plain = document.createElement("button");
        plain.textContent = "plain";
        el.append(plain);
        return el;
      },
    });
    plainOnly.focusTitle();
    expect((document.activeElement as HTMLElement).textContent).toBe("plain");
  });
});

describe("月份翻页动画", () => {
  const createPanel = function (): MonthSlidePanel {
    const viewport = document.createElement("div");
    const gridEl = document.createElement("div");
    gridEl.className = "cui__grid";
    for (let row = 0; row < 2; row++) {
      const week = document.createElement("div");
      week.className = "cui__week";
      const button = document.createElement("button");
      button.textContent = String(row);
      week.append(button);
      gridEl.append(week);
    }
    viewport.append(gridEl);
    document.body.append(viewport);
    return { viewport, grid: { el: gridEl } };
  };

  const stubAnimate = function (cancel?: () => void): ReturnType<typeof vi.fn> {
    const animate = vi.fn(() => ({
      cancel: vi.fn(cancel),
      finished: Promise.resolve(),
    }));
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      writable: true,
      value: animate,
    });
    cleanups.push(() => {
      delete (Element.prototype as unknown as { animate?: unknown }).animate;
    });
    return animate;
  };

  it("capture 克隆当前月份并禁用克隆里的按钮", () => {
    const panel = createPanel();
    const slide = createMonthSlide([panel]);

    const layers = slide.capture();
    const clone = layers[0]!;

    expect(clone.classList.contains("is-month-clone")).toBe(true);
    expect(clone.getAttribute("aria-hidden")).toBe("true");
    expect(panel.viewport.contains(clone)).toBe(true);
    expect(clone.querySelector<HTMLButtonElement>("button")?.tabIndex).toBe(-1);

    slide.stop();
  });

  it("sync 把源网格的折叠行同步到离场层", () => {
    const panel = createPanel();
    const slide = createMonthSlide([panel]);
    const layers = slide.capture();
    const clone = layers[0]!;
    const sourceRows = panel.grid.el.querySelectorAll<HTMLElement>(".cui__week");

    sourceRows[0]!.classList.add("is-collapsed-hidden");
    slide.sync(layers);

    const cloneRows = clone.querySelectorAll<HTMLElement>(".cui__week");
    expect(cloneRows[0]?.classList.contains("is-collapsed-hidden")).toBe(true);
    expect(cloneRows[1]?.classList.contains("is-collapsed-hidden")).toBe(false);

    slide.stop();
  });

  it("离场层缺少行时跳过该行", () => {
    const panel = createPanel();
    const slide = createMonthSlide([panel]);
    const layer = document.createElement("div");
    layer.append(document.createElement("div"));
    panel.grid.el.querySelectorAll(".cui__week")[0]!.classList.add("is-collapsed-hidden");

    expect(() => slide.sync([layer])).not.toThrow();
    expect(layer.children).toHaveLength(1);
  });

  it("start 给新旧两层加动画，计时结束后清理离场层", () => {
    vi.useFakeTimers();
    const panel = createPanel();
    const slide = createMonthSlide([panel]);
    const animate = stubAnimate();
    const layers = slide.capture();

    slide.start(1, layers, 100, "linear");
    expect(panel.grid.el.classList.contains("is-month-in-next")).toBe(true);
    expect(layers[0]?.classList.contains("is-month-out-next")).toBe(true);
    expect(animate).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(179);
    expect(panel.viewport.contains(layers[0]!)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(panel.viewport.contains(layers[0]!)).toBe(false);
    expect(panel.grid.el.classList.contains("is-month-in-next")).toBe(false);
  });

  it("反方向翻页使用 prev 类名", () => {
    vi.useFakeTimers();
    const panel = createPanel();
    const slide = createMonthSlide([panel]);
    stubAnimate();
    const layers = slide.capture();

    slide.start(-1, layers, 50, "ease");
    expect(panel.grid.el.classList.contains("is-month-in-prev")).toBe(true);
    expect(layers[0]?.classList.contains("is-month-out-prev")).toBe(true);

    slide.stop();
  });

  it("没有离场层时只给当前网格做进入动画", () => {
    const panel = createPanel();
    const slide = createMonthSlide([panel]);
    const animate = stubAnimate();

    slide.start(1, [], 100, "ease");
    expect(animate).toHaveBeenCalledTimes(1);

    slide.stop();
  });

  it("动画已经被浏览器回收时 stop 不抛错", () => {
    const panel = createPanel();
    const slide = createMonthSlide([panel]);
    stubAnimate(() => {
      throw new Error("动画已回收");
    });
    const layers = slide.capture();

    slide.start(1, layers, 100, "ease");
    expect(() => slide.stop()).not.toThrow();
    expect(panel.viewport.contains(layers[0]!)).toBe(false);
  });

  it("重复 start 会替换 token，旧计时器不再清理新动画", () => {
    vi.useFakeTimers();
    const panel = createPanel();
    const slide = createMonthSlide([panel]);
    stubAnimate();
    const first = slide.capture();

    slide.start(1, first, 100, "ease");
    vi.advanceTimersByTime(50);
    const second = slide.capture();
    slide.start(1, second, 100, "ease");

    vi.advanceTimersByTime(180);
    expect(panel.viewport.contains(second[0]!)).toBe(false);

    slide.stop();
  });
});

describe("日期格", () => {
  it("设置带标记的日期，之后同格换成无标记日期会清掉 tone", () => {
    const cell = createDayCell();
    document.body.append(cell);

    setDay(cell, dayOf(1, { badge: { text: "休", tone: "rest" }, subtitle: "国庆节" }));
    const tag = cell.querySelector<HTMLElement>(".cui__day-tag")!;
    const sub = cell.querySelector<HTMLElement>(".cui__day-sub")!;
    expect(tag.textContent).toBe("休");
    expect(tag.hidden).toBe(false);
    expect(tag.dataset.tone).toBe("rest");
    expect(cell.dataset.tone).toBe("rest");
    expect(sub.textContent).toBe("国庆节");

    setDay(cell, dayOf(2));
    expect(tag.textContent).toBe("");
    expect(tag.hidden).toBe(true);
    expect(tag.dataset.tone).toBeUndefined();
    expect(cell.dataset.tone).toBeUndefined();
    expect(sub.textContent).toBe("");
  });

  it("周末、禁用、选中状态写到格子上", () => {
    const cell = createDayCell();
    document.body.append(cell);

    setDay(
      cell,
      dayOf(3, { isDisabled: true, isToday: true, isSelected: true, inCurrentMonth: false }),
    );

    expect(cell.dataset.date).toBe("2026-10-3");
    expect(cell.disabled).toBe(true);
    expect(cell.getAttribute("aria-disabled")).toBe("true");
    expect(cell.getAttribute("aria-pressed")).toBe("true");
    expect(cell.tabIndex).toBe(-1);
    expect(cell.classList.contains("is-outside")).toBe(true);
    expect(cell.classList.contains("is-today")).toBe(true);
    expect(cell.classList.contains("is-selected")).toBe(true);

    setDay(cell, dayOf(4));
    expect(cell.disabled).toBe(false);
    expect(cell.hasAttribute("aria-disabled")).toBe(false);
    expect(cell.hasAttribute("aria-pressed")).toBe(false);
    expect(cell.tabIndex).toBe(0);
  });

  it("换月但日期数字相同时不重写数字节点", () => {
    const cell = createDayCell();
    document.body.append(cell);
    setDay(cell, dayOf(5));
    const num = cell.querySelector(".cui__day-num")!;
    const original = num.textContent;

    setDay(cell, { ...dayOf(5), month: 11, date: new Date(2026, 10, 5) });

    expect(cell.dataset.date).toBe("2026-11-5");
    expect(num.textContent).toBe(original);
  });

  it("周日的周末标记", () => {
    const cell = createDayCell();
    document.body.append(cell);

    setDay(cell, dayOf(4)); // 2026-10-04 周日
    expect(cell.classList.contains("is-weekend")).toBe(true);

    setDay(cell, dayOf(5)); // 周一
    expect(cell.classList.contains("is-weekend")).toBe(false);
  });
});

describe("DOM 工具", () => {
  it("node 按需设置类名和文本", () => {
    expect(node("div", "a").className).toBe("a");
    expect(node("div").className).toBe("");
    expect(node("div").textContent).toBe("");
    expect(node("span", undefined, "hi").textContent).toBe("hi");
    expect(node("span", undefined, "").textContent).toBe("");
  });
});

describe("折叠控制器", () => {
  const collapsedConfig = function (
    mode: "single" | "range",
    locale: CalendarLocale,
  ): CalendarConfig {
    return {
      weekStartsOn: 1,
      locale,
      theme: "auto",
      size: "normal",
      today: new Date(2026, 9, 15),
      mode,
      requestedMonths: 1,
      showHeader: true,
      animation: {
        monthTransition: "none",
        monthDuration: 220,
        monthEasing: "ease",
        collapsible: true,
        collapseDuration: 200,
        collapseEasing: "ease",
        defaultCollapsed: true,
      },
    };
  };

  const make = function (mode: "single" | "range", locale: CalendarLocale) {
    const rows: Array<readonly number[] | null> = [];
    const state = createState(new Date(2026, 9, 15));
    state.selected = new Date(2026, 9, 20);
    if (mode === "range") {
      state.rangeStart = new Date(2026, 10, 5);
      state.rangeEnd = new Date(2026, 10, 6);
    }
    const panel = {
      weekdays: { el: document.createElement("div") },
      viewport: document.createElement("div"),
      grid: {
        el: document.createElement("div"),
        setVisibleRows: (next: readonly number[] | null) => {
          rows.push(next === null ? null : [...next]);
        },
      },
    };
    const onApply = vi.fn();
    const collapse = createCollapse({
      config: collapsedConfig(mode, locale),
      state,
      panels: [panel] as never,
      monthCount: 1,
      onApply,
    });
    cleanups.push(() => collapse.destroy());
    return { collapse, rows, onApply };
  };

  it("语言包没有折叠文案时使用内置文案", () => {
    const { collapse, onApply } = make("single", {
      ...zhCN,
      collapse: undefined,
      expand: undefined,
    });

    collapse.updateButton();
    expect(collapse.button?.getAttribute("aria-label")).toBe("展开日历");
    expect(collapse.button?.classList.contains("is-collapsed")).toBe(true);

    collapse.toggle();
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(collapse.isCollapsed()).toBe(false);
    expect(collapse.button?.getAttribute("aria-label")).toBe("收起日历");
  });

  it("当月找不到选中日期时退回第一行，并容忍缺少月份数据", () => {
    const { collapse, rows } = make("single", zhCN);

    collapse.updateRows([], true);

    expect(rows.at(-1)).toEqual([0]);
  });

  it("没有配置 collapsible 时没有按钮，toggle 是空操作", () => {
    const config = collapsedConfig("single", zhCN);
    config.animation.collapsible = false;
    config.animation.defaultCollapsed = false;
    const collapse = createCollapse({
      config,
      state: createState(new Date(2026, 9, 15)),
      panels: [] as never,
      monthCount: 1,
      onApply: vi.fn(),
    });

    expect(collapse.button).toBeNull();
    expect(() => collapse.toggle()).not.toThrow();
    expect(collapse.isCollapsed()).toBe(false);
    collapse.updateButton();
  });

  it("范围模式两个端点都不在当前月时也显示第一行", () => {
    const { collapse, rows } = make("range", zhCN);

    collapse.updateRows([[]], true);

    expect(rows.at(-1)).toEqual([0]);
  });

  it("展开状态下恢复显示全部行", () => {
    const { collapse, rows } = make("single", zhCN);
    collapse.toggle();
    rows.length = 0;

    collapse.updateRows([[]], false);

    expect(rows).toEqual([null]);
  });
});

describe("选择层控制器", () => {
  it("isOpen 跟随选择层，打开 / 关闭同步背景 inert 和导航", () => {
    const root = document.createElement("div");
    document.body.append(root);
    const picker = createPicker({
      locale: zhCN,
      getYear: () => 2026,
      getMonth: () => 10,
      isMonthDisabled: () => false,
      isYearDisabled: () => false,
      onPickMonth: () => {},
      onPickYear: () => {},
    });
    cleanups.push(() => picker.destroy());

    const header = {
      el: document.createElement("div"),
      setNavVisible: vi.fn(),
      setTitleExpanded: vi.fn(),
      refresh: vi.fn(),
      focusTitle: vi.fn(),
    } as never;
    const background = document.createElement("div");
    root.append(picker.el, (header as { el: HTMLElement }).el, background);

    const updateNav = vi.fn();
    const layer = createPickerLayer({
      root,
      header,
      picker,
      getMonth: () => ({ year: 2026, month: 10 }),
      updateNav,
      onGoTo: vi.fn(),
    });
    cleanups.push(() => layer.destroy());

    expect(layer.isOpen()).toBe(false);

    layer.toggle("month");
    expect(layer.isOpen()).toBe(true);
    expect(updateNav).toHaveBeenCalledTimes(1);
    expect(background.inert).toBe(true);

    layer.close();
    expect(layer.isOpen()).toBe(false);
    expect(background.inert).toBe(false);
  });

  it("打开选择层后点击 root 外部关闭，内部点击不关闭", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const instance = createCalendarUI(container, { initialDate: "2026-10-15" });
    cleanups.push(() => {
      instance.destroy();
      container.remove();
    });
    const picker = instance.el.querySelector<HTMLElement>(".cui__picker")!;
    const yearButton = instance.el.querySelector<HTMLButtonElement>('[data-part="year"]')!;

    yearButton.click();
    expect(picker.classList.contains("is-open")).toBe(true);
    instance.el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(picker.classList.contains("is-open")).toBe(true);

    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(picker.classList.contains("is-open")).toBe(false);
  });

  it("非 Escape 按键不关闭，月份层里翻页箭头不翻月", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const instance = createCalendarUI(container, { initialDate: "2026-10-15" });
    cleanups.push(() => {
      instance.destroy();
      container.remove();
    });
    const picker = instance.el.querySelector<HTMLElement>(".cui__picker")!;
    const yearButton = instance.el.querySelector<HTMLButtonElement>('[data-part="year"]')!;
    const monthButton = instance.el.querySelector<HTMLButtonElement>('[data-part="month"]')!;
    const next = instance.el.querySelectorAll<HTMLButtonElement>(".cui__header .cui__nav")[1]!;

    yearButton.click();
    instance.el.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    expect(picker.classList.contains("is-open")).toBe(true);
    instance.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(picker.classList.contains("is-open")).toBe(false);

    monthButton.click();
    const before = instance.getMonth();
    next.click();
    expect(instance.getMonth()).toEqual(before);
    expect(picker.classList.contains("is-open")).toBe(true);
  });

  it("焦点不在选择层里时关闭不会抢焦点", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const instance = createCalendarUI(container, { initialDate: "2026-10-15" });
    cleanups.push(() => {
      instance.destroy();
      container.remove();
    });
    const picker = instance.el.querySelector<HTMLElement>(".cui__picker")!;
    const yearButton = instance.el.querySelector<HTMLButtonElement>('[data-part="year"]')!;

    yearButton.click();
    (document.activeElement as HTMLElement | null)?.blur();
    expect(document.activeElement).toBe(document.body);

    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));

    expect(picker.classList.contains("is-open")).toBe(false);
    expect(document.activeElement).not.toBe(yearButton);
  });
});
