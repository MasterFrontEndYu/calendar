import { createGrid } from "./components/grid";
import { createHeader } from "./components/header";
import { createWeekdays } from "./components/weekdays";
import { resolveLocale } from "./locales";
import type {
  CalendarDateInput,
  CalendarDay,
  CalendarInstance,
  CalendarMode,
  CalendarOptions,
  CalendarRange,
  CalendarTheme,
} from "./types";
import { buildDays } from "./utils/days";
import {
  addDays,
  compareDay,
  dateKey,
  normalizeMonth,
  parseDateInput,
  sameDay,
  toDateOnly,
} from "./utils/date";
import { node } from "./utils/dom";

/** 没有显式 min/max 时，搜索可选日期的兜底范围 */
const SEARCH_MIN = new Date(1900, 0, 1);
const SEARCH_MAX = new Date(2100, 11, 31);

const readDate = function (value: CalendarDateInput | null | undefined, path: string): Date | null {
  if (value === null || value === undefined) return null;
  return parseDateInput(value, path);
};

const monthIndexOf = function (year: number, month: number): number {
  return year * 12 + (month - 1);
};

const monthFromIndex = function (index: number): { year: number; month: number } {
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

/** 在 [min, max] 内找离 desired 最近的可选日期 */
const findSelectable = function (
  desired: Date,
  minDate: Date | null,
  maxDate: Date | null,
  disabled: ReadonlySet<number>,
): Date {
  const blocked = function (date: Date): boolean {
    const key = dateKey(date);
    return (
      (minDate !== null && compareDay(date, minDate) < 0) ||
      (maxDate !== null && compareDay(date, maxDate) > 0) ||
      disabled.has(key)
    );
  };

  let candidate = toDateOnly(desired);
  if (minDate !== null && compareDay(candidate, minDate) < 0) candidate = minDate;
  if (maxDate !== null && compareDay(candidate, maxDate) > 0) candidate = maxDate;
  if (!blocked(candidate)) return candidate;

  const lower = minDate ?? SEARCH_MIN;
  const upper = maxDate ?? SEARCH_MAX;
  const maxOffset = Math.max(0, compareDay(upper, lower));

  // 同时向两侧扩展，先遇到的可选日期就是距离最近的
  for (let offset = 1; offset <= maxOffset; offset++) {
    const forward = addDays(candidate, offset);
    if (compareDay(forward, upper) <= 0 && !blocked(forward)) return forward;

    const backward = addDays(candidate, -offset);
    if (compareDay(backward, lower) >= 0 && !blocked(backward)) return backward;
  }

  throw new RangeError("[calendar-ui] 当前日期约束下没有可选日期");
};

/**
 * 在容器里创建一个日历
 *
 * 只依赖 DOM，不依赖任何框架；重复调用 createCalendarUI 会各自独立。
 * 不传 adapter 时就是纯公历，适配器负责提供副标题、标记和透传数据。
 */
export function createCalendarUI<TData = null>(
  container: HTMLElement,
  options: CalendarOptions<TData> = {},
): CalendarInstance {
  const weekStartsOn = options.weekStartsOn ?? 1;
  const locale = resolveLocale(options.locale);
  const adapter = options.adapter;
  let theme = options.theme ?? "auto";
  const today = new Date();

  const monthTransition = options.monthTransition ?? "slide";
  if (monthTransition !== "none" && monthTransition !== "slide") {
    throw new TypeError('[calendar-ui] monthTransition 必须是 "none" 或 "slide"');
  }

  const readDuration = function (
    value: number | undefined,
    fallback: number,
    path: string,
  ): number {
    const duration = value ?? fallback;
    if (!Number.isFinite(duration) || duration < 0) {
      throw new TypeError(`[calendar-ui] ${path} 必须是大于等于 0 的数字`);
    }
    return duration;
  };

  const monthDuration = readDuration(
    options.monthTransitionDuration,
    220,
    "monthTransitionDuration",
  );
  const monthEasing = options.monthTransitionEasing ?? "ease";
  if (typeof monthEasing !== "string" || monthEasing.trim() === "") {
    throw new TypeError("[calendar-ui] monthTransitionEasing 必须是非空字符串");
  }

  const collapseDuration = readDuration(
    options.collapseTransitionDuration,
    200,
    "collapseTransitionDuration",
  );
  const collapseEasing = options.collapseTransitionEasing ?? "ease";
  if (typeof collapseEasing !== "string" || collapseEasing.trim() === "") {
    throw new TypeError("[calendar-ui] collapseTransitionEasing 必须是非空字符串");
  }

  const mode: CalendarMode = options.mode ?? "single";
  if (mode !== "single" && mode !== "range") {
    throw new TypeError("[calendar-ui] mode 必须是 single 或 range");
  }

  const requestedMonths = options.months ?? 1;
  if (requestedMonths !== 1 && requestedMonths !== 2) {
    throw new RangeError("[calendar-ui] months 只能是 1 或 2");
  }

  let minDate = readDate(options.minDate, "minDate");
  let maxDate = readDate(options.maxDate, "maxDate");
  if (minDate !== null && maxDate !== null && compareDay(minDate, maxDate) > 0) {
    throw new RangeError("[calendar-ui] minDate 不能晚于 maxDate");
  }

  const disabledDates = options.disabledDates ?? [];
  if (!Array.isArray(disabledDates)) {
    throw new TypeError("[calendar-ui] disabledDates 必须是 Date 数组");
  }
  const disabledSet = new Set<number>();
  disabledDates.forEach((value, index) => {
    const date = readDate(value, `disabledDates[${index}]`);
    if (date !== null) disabledSet.add(dateKey(date));
  });

  const isDisabled = function (date: Date): boolean {
    const key = dateKey(date);
    return (
      (minDate !== null && key < dateKey(minDate)) ||
      (maxDate !== null && key > dateKey(maxDate)) ||
      disabledSet.has(key)
    );
  };

  const initial = findSelectable(
    readDate(options.initialDate ?? today, "initialDate") as Date,
    minDate,
    maxDate,
    disabledSet,
  );

  // 双视图如果边界不足两个月，退化为单视图
  let monthCount = mode === "range" ? requestedMonths : 1;
  if (
    monthCount === 2 &&
    minDate !== null &&
    maxDate !== null &&
    monthIndexOf(maxDate.getFullYear(), maxDate.getMonth() + 1) -
      monthIndexOf(minDate.getFullYear(), minDate.getMonth() + 1) <
      1
  ) {
    monthCount = 1;
  }

  let firstYear = initial.getFullYear();
  let firstMonth = initial.getMonth() + 1;
  if (monthCount === 2 && maxDate !== null) {
    const maxFirst = monthIndexOf(maxDate.getFullYear(), maxDate.getMonth() + 1) - 1;
    if (monthIndexOf(firstYear, firstMonth) > maxFirst) {
      const clamped = monthFromIndex(maxFirst);
      firstYear = clamped.year;
      firstMonth = clamped.month;
    }
  }

  const state = {
    year: firstYear,
    month: firstMonth,
    selected: initial,
  };

  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;
  const collapsible = options.collapsible === true;
  let collapsed = collapsible && options.defaultCollapsed === true;
  let collapseButton: HTMLButtonElement | null = null;

  const root = node("div", "cui");
  root.dataset.theme = theme;
  root.style.setProperty("--cui-month-duration", `${monthDuration}ms`);
  root.style.setProperty("--cui-month-easing", monthEasing);
  root.style.setProperty("--cui-collapse-duration", `${collapseDuration}ms`);
  root.style.setProperty("--cui-collapse-easing", collapseEasing);
  if (monthCount === 2) root.classList.add("cui--range");

  const monthOf = function (offset = 0): { year: number; month: number } {
    return normalizeMonth(state.year, state.month + offset);
  };

  /** 按当前 state 生成某一列的 42 个格子 */
  const currentDays = function (offset = 0): CalendarDay<TData>[] {
    const month = monthOf(offset);
    return buildDays<TData>({
      year: month.year,
      month: month.month,
      weekStartsOn,
      today,
      selected: mode === "single" ? state.selected : null,
      rangeStart,
      rangeEnd,
      locale,
      adapter,
      isDisabled,
      subtitle: options.subtitle,
    });
  };

  const rangeCopy = function (): CalendarRange {
    return {
      start: rangeStart === null ? null : new Date(rangeStart),
      end: rangeEnd === null ? null : new Date(rangeEnd),
    };
  };

  const withRangeFields = function (day: CalendarDay<TData>): CalendarDay<TData> {
    const isStart = rangeStart !== null && sameDay(day.date, rangeStart);
    const isEnd = rangeEnd !== null && sameDay(day.date, rangeEnd);
    return {
      ...day,
      isSelected: isStart || isEnd,
      isRangeStart: isStart,
      isRangeEnd: isEnd,
      isInRange:
        rangeStart !== null &&
        rangeEnd !== null &&
        compareDay(day.date, rangeStart) >= 0 &&
        compareDay(day.date, rangeEnd) <= 0,
    };
  };

  const updateCollapseButton = function (): void {
    if (collapseButton === null) return;
    collapseButton.textContent = collapsed ? "⌄" : "⌃";
    collapseButton.setAttribute("aria-expanded", String(!collapsed));
    collapseButton.setAttribute(
      "aria-label",
      collapsed ? (locale.expand ?? "展开日历") : (locale.collapse ?? "收起日历"),
    );
  };

  const updateCollapsedRows = function (dayLists: readonly CalendarDay<TData>[][]): void {
    if (!collapsed) {
      panels.forEach((panel) => panel.grid.setVisibleRows(null));
      return;
    }

    const targets: Date[] =
      mode === "range"
        ? [rangeStart, rangeEnd].filter((date): date is Date => date !== null)
        : [state.selected];
    if (targets.length === 0) targets.push(state.selected);

    panels.forEach((panel, index) => {
      const rows = new Set<number>();
      const days = dayLists[index] ?? [];

      targets.forEach((target) => {
        const dayIndex = days.findIndex(
          (day) => sameDay(day.date, target) && (monthCount === 1 || day.inCurrentMonth),
        );
        if (dayIndex >= 0) rows.add(Math.floor(dayIndex / 7));
      });

      if (rows.size === 0) {
        const first = days.findIndex((day) => day.inCurrentMonth);
        rows.add(first >= 0 ? Math.floor(first / 7) : 0);
      }

      panel.grid.setVisibleRows([...rows].sort((a, b) => a - b));
    });
  };

  function applyCollapse(next: boolean): void {
    if (!collapsible) return;
    collapsed = next;
    updateCollapseButton();
    render();
  }

  function toggleCollapsed(): void {
    applyCollapse(!collapsed);
  }

  function updatePanelLabels(): void {
    panelEls.forEach((el, index) => {
      const month = monthOf(index);
      el.setAttribute("aria-label", locale.monthTitle(month.year, month.month));
    });
  }

  function updateNav(): void {
    const first = monthIndexOf(state.year, state.month);
    const last = first + monthCount - 1;
    const min =
      minDate === null
        ? Number.NEGATIVE_INFINITY
        : monthIndexOf(minDate.getFullYear(), minDate.getMonth() + 1);
    const max =
      maxDate === null
        ? Number.POSITIVE_INFINITY
        : monthIndexOf(maxDate.getFullYear(), maxDate.getMonth() + 1);

    header.setNavDisabled(first <= min, last >= max);
  }

  function render(): void {
    header.update(state.year, state.month);
    const dayLists = panels.map((_, index) => currentDays(index));
    panels.forEach((panel, index) => panel.grid.render(dayLists[index]!));
    updatePanelLabels();
    updateNav();
    updateCollapsedRows(dayLists);
    updateCollapseButton();
  }

  function applyRangeClick(target: Date): void {
    const date = toDateOnly(target);

    // 第一次点选起点；已有完整范围时重新开始
    if (rangeStart === null || rangeEnd !== null) {
      rangeStart = date;
      rangeEnd = null;
    } else if (compareDay(date, rangeStart) < 0) {
      // 反向选择自动交换
      rangeEnd = rangeStart;
      rangeStart = date;
    } else {
      rangeEnd = date;
    }

    render();
    options.onRangeChange?.(rangeCopy());
  }

  /** 处理点选：补位格只改选中，不切换展示月份 */
  function handleSelect(day: CalendarDay<TData>): void {
    if (day.isDisabled) return;

    if (mode === "range") {
      applyRangeClick(day.date);
      options.onSelect?.(withRangeFields(day));
      return;
    }

    state.selected = toDateOnly(day.date);
    if (day.inCurrentMonth) {
      state.year = day.year;
      state.month = day.month;
    }

    // 点选不换月，只需要刷新状态类，不必重建格子
    if (collapsed) {
      render();
      const days = currentDays();
      options.onSelect?.(days.find((item) => sameDay(item.date, day.date)) ?? day);
      return;
    }

    const days = currentDays();
    panels[0]?.grid.updateState(days);

    // 回调用更新后的对象，保证 isSelected 是本次点击的结果
    options.onSelect?.(days.find((item) => sameDay(item.date, day.date)) ?? day);
  }

  let monthAnimationToken = 0;
  let monthOldLayers: HTMLElement[] = [];

  function clearMonthAnimation(): void {
    panels.forEach((panel) => {
      panel.grid.el.classList.remove(
        "is-month-in-next",
        "is-month-in-prev",
        "is-month-out-next",
        "is-month-out-prev",
      );
    });
    monthOldLayers.forEach((layer) => layer.remove());
    monthOldLayers = [];
  }

  function captureMonthSnapshot(): void {
    clearMonthAnimation();
    panels.forEach((panel) => {
      const clone = panel.grid.el.cloneNode(true) as HTMLElement;
      clone.classList.add("is-month-clone");
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("button").forEach((button) => {
        button.tabIndex = -1;
      });
      panel.viewport.append(clone);
      monthOldLayers.push(clone);
    });
  }

  function animateMonth(direction: 1 | -1): void {
    panels.forEach((panel, index) => {
      const oldLayer = monthOldLayers[index];
      void panel.viewport.offsetWidth;
      panel.grid.el.classList.add(direction === 1 ? "is-month-in-next" : "is-month-in-prev");
      oldLayer?.classList.add(direction === 1 ? "is-month-out-next" : "is-month-out-prev");
    });
  }

  function goTo(year: number, month: number): void {
    let next = normalizeMonth(year, month);

    if (minDate !== null) {
      const min = monthIndexOf(minDate.getFullYear(), minDate.getMonth() + 1);
      if (monthIndexOf(next.year, next.month) < min) next = monthFromIndex(min);
    }
    if (maxDate !== null) {
      const maxFirst =
        monthIndexOf(maxDate.getFullYear(), maxDate.getMonth() + 1) - (monthCount - 1);
      if (monthIndexOf(next.year, next.month) > maxFirst) next = monthFromIndex(maxFirst);
    }

    const currentIndex = monthIndexOf(state.year, state.month);
    const nextIndex = monthIndexOf(next.year, next.month);
    if (nextIndex === currentIndex) return;

    const direction = nextIndex > currentIndex ? 1 : -1;
    const reduceMotion =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shouldAnimate = monthTransition === "slide" && monthDuration > 0 && !reduceMotion;

    if (shouldAnimate) captureMonthSnapshot();
    else clearMonthAnimation();

    state.year = next.year;
    state.month = next.month;
    render();

    if (shouldAnimate) {
      animateMonth(direction);
      const token = ++monthAnimationToken;
      setTimeout(() => {
        if (token === monthAnimationToken) clearMonthAnimation();
      }, monthDuration + 80);
    }

    options.onMonthChange?.(state.year, state.month);
  }

  function applyBounds(nextMin: Date | null, nextMax: Date | null): void {
    if (nextMin !== null && nextMax !== null && compareDay(nextMin, nextMax) > 0) {
      throw new RangeError("[calendar-ui] minDate 不能晚于 maxDate");
    }

    // 先确认还有可选日期，再整体替换，失败时不破坏现有状态
    const nextSelected = findSelectable(state.selected, nextMin, nextMax, disabledSet);

    minDate = nextMin;
    maxDate = nextMax;
    state.selected = nextSelected;
    state.year = nextSelected.getFullYear();
    state.month = nextSelected.getMonth() + 1;

    if (monthCount === 2 && maxDate !== null) {
      const maxFirst = monthIndexOf(maxDate.getFullYear(), maxDate.getMonth() + 1) - 1;
      if (monthIndexOf(state.year, state.month) > maxFirst) {
        const clamped = monthFromIndex(maxFirst);
        state.year = clamped.year;
        state.month = clamped.month;
      }
    }

    render();
  }

  const panelEls: HTMLElement[] = [];
  const panels = Array.from({ length: monthCount }, () => {
    const viewport = node("div", "cui__viewport");
    const grid = createGrid<TData>({ onSelect: handleSelect });
    viewport.append(grid.el);
    return {
      weekdays: createWeekdays(weekStartsOn, locale),
      viewport,
      grid,
    };
  });

  const header = createHeader({
    year: state.year,
    month: state.month,
    locale,
    title:
      monthCount === 2
        ? (year, month) => {
            const next = normalizeMonth(year, month + 1);
            return `${locale.monthTitle(year, month)} – ${locale.monthTitle(next.year, next.month)}`;
          }
        : undefined,
    onPrev: () => goTo(state.year, state.month - 1),
    onNext: () => goTo(state.year, state.month + 1),
    renderer: options.renderHeader,
  });
  header.el.hidden = options.header === false;

  if (monthCount === 1) {
    root.append(header.el, panels[0]!.weekdays.el, panels[0]!.viewport);
  } else {
    const monthsEl = node("div", "cui__months");
    panels.forEach((panel) => {
      const monthEl = node("div", "cui__month");
      monthEl.setAttribute("role", "group");
      monthEl.append(panel.weekdays.el, panel.viewport);
      monthsEl.append(monthEl);
      panelEls.push(monthEl);
    });
    root.append(header.el, monthsEl);
  }

  if (collapsible) {
    collapseButton = node("button", "cui__collapse");
    collapseButton.type = "button";
    collapseButton.addEventListener("click", toggleCollapsed);
    root.append(collapseButton);
  }

  root.classList.add("cui--no-animation");
  container.appendChild(root);
  render();
  root.classList.remove("cui--no-animation");

  return {
    el: root,
    setMonth: goTo,
    getMonth: () => ({ year: state.year, month: state.month }),
    prevMonth: () => goTo(state.year, state.month - 1),
    nextMonth: () => goTo(state.year, state.month + 1),
    select: (date: CalendarDateInput) => {
      const target = readDate(date, "select(date)");
      if (target === null || isDisabled(target)) return;

      if (mode === "range") {
        const targetIndex = monthIndexOf(target.getFullYear(), target.getMonth() + 1);
        const first = monthIndexOf(state.year, state.month);
        if (targetIndex < first || targetIndex > first + monthCount - 1) {
          state.year = target.getFullYear();
          state.month = target.getMonth() + 1;
        }
        if (monthCount === 2 && maxDate !== null) {
          const maxFirst = monthIndexOf(maxDate.getFullYear(), maxDate.getMonth() + 1) - 1;
          if (monthIndexOf(state.year, state.month) > maxFirst) {
            const clamped = monthFromIndex(maxFirst);
            state.year = clamped.year;
            state.month = clamped.month;
          }
        }
        applyRangeClick(target);
        const days = buildDays<TData>({
          year: target.getFullYear(),
          month: target.getMonth() + 1,
          weekStartsOn,
          today,
          selected: null,
          rangeStart,
          rangeEnd,
          locale,
          adapter,
          isDisabled,
          subtitle: options.subtitle,
        });
        const day = days.find((item) => sameDay(item.date, target));
        if (day) options.onSelect?.(withRangeFields(day));
        return;
      }

      state.selected = target;
      state.year = target.getFullYear();
      state.month = target.getMonth() + 1;
      render();

      const day = currentDays().find((item) => sameDay(item.date, target));
      if (day) options.onSelect?.(day);
    },
    getSelected: () => {
      if (mode === "range") return rangeStart === null ? null : new Date(rangeStart);
      return new Date(state.selected);
    },
    getRange: rangeCopy,
    setRange: (start: CalendarDateInput | null, end?: CalendarDateInput | null) => {
      const nextStart = readDate(start, "setRange(start)");
      const nextEnd = end === undefined ? null : readDate(end, "setRange(end)");

      if (nextStart === null) {
        rangeStart = null;
        rangeEnd = null;
      } else {
        if (isDisabled(nextStart) || (nextEnd !== null && isDisabled(nextEnd))) return;

        if (nextEnd === null) {
          rangeStart = nextStart;
          rangeEnd = null;
        } else if (compareDay(nextStart, nextEnd) <= 0) {
          rangeStart = nextStart;
          rangeEnd = nextEnd;
        } else {
          rangeStart = nextEnd;
          rangeEnd = nextStart;
        }
      }

      render();
      options.onRangeChange?.(rangeCopy());
    },
    clearRange: () => {
      rangeStart = null;
      rangeEnd = null;
      render();
      options.onRangeChange?.(rangeCopy());
    },
    show: () => {
      root.hidden = false;
    },
    hide: () => {
      root.hidden = true;
    },
    toggle: () => {
      root.hidden = !root.hidden;
    },
    isVisible: () => !root.hidden,
    showHeader: () => {
      header.el.hidden = false;
    },
    hideHeader: () => {
      header.el.hidden = true;
    },
    toggleHeader: () => {
      header.el.hidden = !header.el.hidden;
    },
    isHeaderVisible: () => !header.el.hidden,
    collapse: () => applyCollapse(true),
    expand: () => applyCollapse(false),
    toggleCollapsed,
    isCollapsed: () => collapsed,
    getMinDate: () => (minDate === null ? null : new Date(minDate)),
    setMinDate: (date: CalendarDateInput | null) => {
      applyBounds(readDate(date, "setMinDate(date)"), maxDate);
    },
    getMaxDate: () => (maxDate === null ? null : new Date(maxDate)),
    setMaxDate: (date: CalendarDateInput | null) => {
      applyBounds(minDate, readDate(date, "setMaxDate(date)"));
    },
    getTheme: () => theme,
    setTheme: (next: CalendarTheme) => {
      theme = next;
      root.dataset.theme = next;
    },
    destroy: () => {
      header.destroy();
      panels.forEach((panel) => panel.grid.destroy());
      root.remove();
    },
  };
}
