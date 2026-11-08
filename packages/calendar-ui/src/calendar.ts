import { createGrid } from "./components/grid";
import { createHeader } from "./components/header";
import { createPicker } from "./components/picker";
import { createWeekdays } from "./components/weekdays";
import { resolveLocale } from "./locales";
import type {
  CalendarDateInput,
  CalendarDay,
  CalendarInstance,
  CalendarMode,
  CalendarOptions,
  CalendarRange,
  CalendarSize,
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
import {
  normalizeEasing,
  prefersReducedMotion,
  readCssDuration,
  readCssEasing,
} from "./utils/motion";

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
  const size: CalendarSize = options.size ?? "normal";
  if (size !== "min" && size !== "normal" && size !== "fill") {
    throw new TypeError("[calendar-ui] size 必须是 min、normal 或 fill");
  }
  const today = new Date();

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

  const readEasing = function (value: string | undefined, path: string): string {
    const easing = value ?? "ease";
    if (typeof easing !== "string" || easing.trim() === "") {
      throw new TypeError(`[calendar-ui] ${path} 必须是非空字符串`);
    }
    return easing;
  };

  // 动画默认全关：传了 slide 才滑，传了 collapse 才有折叠箭头
  const animation = options.animation;
  if (animation !== undefined && (animation === null || typeof animation !== "object")) {
    throw new TypeError("[calendar-ui] animation 必须是对象");
  }
  const slide = animation?.slide ?? null;
  const collapseOptions = animation?.collapse ?? null;
  const monthTransition = slide === null ? "none" : "slide";
  const monthDuration = readDuration(slide?.duration, 220, "animation.slide.duration");
  const monthEasing = readEasing(slide?.easing, "animation.slide.easing");
  const collapsible = collapseOptions !== null;
  const collapseDuration = readDuration(
    collapseOptions?.duration,
    200,
    "animation.collapse.duration",
  );
  const collapseEasing = readEasing(collapseOptions?.easing, "animation.collapse.easing");

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
  let collapsed = collapsible && collapseOptions?.defaultCollapsed === true;
  let collapseButton: HTMLButtonElement | null = null;
  /**
   * 是否出现过副标题
   *
   * 只增不减：min 档一旦出现副标题就整块放大，之后再遇到没副标题的月份也不缩回去，
   * 否则每次翻月整块尺寸都会跳一下。
   */
  let hasSubtitle = false;

  const root = node("div", "cui");
  root.dataset.theme = theme;
  root.dataset.size = size;
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

  const updateCollapsedRows = function (
    dayLists: readonly CalendarDay<TData>[][],
    animate: boolean,
  ): void {
    if (!collapsed) {
      panels.forEach((panel) => panel.grid.setVisibleRows(null, animate));
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

      panel.grid.setVisibleRows(
        [...rows].sort((a, b) => a - b),
        animate,
      );
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

  function render(animateRows = true): void {
    header.update(state.year, state.month);
    const dayLists = panels.map((_, index) => currentDays(index));

    // 最小档按「有没有副标题」切换格宽；normal / fill 不受影响
    if (!hasSubtitle && dayLists.some((days) => days.some((day) => day.subtitle !== ""))) {
      hasSubtitle = true;
      root.classList.add("cui--sub");
    }

    panels.forEach((panel, index) => panel.grid.render(dayLists[index]!));
    updatePanelLabels();
    updateNav();
    updateCollapsedRows(dayLists, animateRows);
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

  interface MonthAnimation {
    token: number;
    layers: HTMLElement[];
    animations: Animation[];
    timer: ReturnType<typeof setTimeout>;
  }

  let monthAnimationToken = 0;
  let monthAnimation: MonthAnimation | null = null;

  /** 结束翻月动画：各层留在终点，并移除旧月份的克隆层 */
  function stopMonthAnimation(): void {
    const active = monthAnimation;
    if (active === null) return;

    monthAnimation = null;
    clearTimeout(active.timer);
    active.animations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        // 浏览器已经回收了这段动画
      }
    });
    active.layers.forEach((layer) => layer.remove());
    panels.forEach((panel) => {
      panel.grid.el.classList.remove(
        "is-month-in-next",
        "is-month-in-prev",
        "is-month-out-next",
        "is-month-out-prev",
      );
    });
  }

  /** 克隆旧月份作为离场层；折叠行在换月后由 syncLayerRows 对齐 */
  function captureMonthSnapshot(): HTMLElement[] {
    return panels.map((panel) => {
      const clone = panel.grid.el.cloneNode(true) as HTMLElement;
      clone.classList.add("is-month-clone");
      clone.classList.remove(
        "is-month-in-next",
        "is-month-in-prev",
        "is-month-out-next",
        "is-month-out-prev",
      );
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("button").forEach((button) => {
        button.tabIndex = -1;
      });
      panel.viewport.append(clone);
      return clone;
    });
  }

  /** 离场层和新月份用同一套折叠行，两层高度一致，滑动时不会露出空隙 */
  function syncLayerRows(layers: readonly HTMLElement[]): void {
    layers.forEach((layer, index) => {
      const sourceRows = panels[index]?.grid.el.querySelectorAll<HTMLElement>(".cui__week");
      const layerRows = layer.querySelectorAll<HTMLElement>(".cui__week");
      sourceRows?.forEach((source, rowIndex) => {
        const target = layerRows[rowIndex];
        if (target === undefined) return;

        const hidden = source.classList.contains("is-collapsed-hidden");
        target.classList.toggle("is-collapsed-hidden", hidden);
        target.toggleAttribute("inert", hidden);
        if (hidden) target.setAttribute("aria-hidden", "true");
        else target.removeAttribute("aria-hidden");
      });
    });
  }

  /**
   * 用 Web Animations 驱动翻月
   *
   * 不靠切换类名重启动画，也就不需要在点击处理里强制同步一次布局；
   * 快速连点时上一段会被 stopMonthAnimation 直接停到终点，不会叠加克隆层。
   */
  function startMonthAnimation(
    direction: 1 | -1,
    layers: readonly HTMLElement[],
    duration: number,
    easing: string,
  ): void {
    const enter = `translateX(${direction * 100}%)`;
    const leave = `translateX(${-direction * 100}%)`;
    const inClass = direction === 1 ? "is-month-in-next" : "is-month-in-prev";
    const outClass = direction === 1 ? "is-month-out-next" : "is-month-out-prev";
    const animations: Animation[] = [];

    panels.forEach((panel, index) => {
      const grid = panel.grid.el;
      const oldLayer = layers[index] ?? null;
      grid.classList.add(inClass);
      oldLayer?.classList.add(outClass);

      if (typeof grid.animate !== "function") return;
      animations.push(
        grid.animate([{ transform: enter }, { transform: "translateX(0)" }], {
          duration,
          easing,
          fill: "both",
        }),
      );
      if (oldLayer !== null) {
        animations.push(
          oldLayer.animate([{ transform: "translateX(0)" }, { transform: leave }], {
            duration,
            easing,
            fill: "both",
          }),
        );
      }
    });

    const token = ++monthAnimationToken;
    const timer = setTimeout(() => {
      if (monthAnimation?.token === token) stopMonthAnimation();
    }, duration + 80);

    monthAnimation = { token, layers: [...layers], animations, timer };
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
    const rootStyle = getComputedStyle(root);
    const duration = readCssDuration(rootStyle, "--cui-month-duration", monthDuration);
    const easing = normalizeEasing(readCssEasing(rootStyle, "--cui-month-easing", monthEasing));
    const shouldAnimate = monthTransition === "slide" && duration > 0 && !prefersReducedMotion();

    // 先把上一段停在终点：快速连点时不会让旧克隆和新动画同时存在
    stopMonthAnimation();

    const layers = shouldAnimate ? captureMonthSnapshot() : [];
    state.year = next.year;
    state.month = next.month;

    // 折叠行瞬时切换：行高过渡和位移动画同时跑会让每一帧都触发布局
    render(false);
    syncLayerRows(layers);

    if (shouldAnimate) startMonthAnimation(direction, layers, duration, easing);

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

  const monthName = (month: number): string => locale.monthName?.(month) ?? String(month);

  const header = createHeader({
    year: state.year,
    month: state.month,
    locale,
    label:
      monthCount === 2
        ? (year, month) => {
            const next = normalizeMonth(year, month + 1);
            return {
              year: locale.yearLabel?.(year) ?? String(year),
              month: `${monthName(month)} – ${monthName(next.month)}`,
            };
          }
        : undefined,
    onYearClick: () => openPicker("year"),
    onMonthClick: () => openPicker("month"),
    onPrev: () => goTo(state.year, state.month - 1),
    onNext: () => goTo(state.year, state.month + 1),
    renderer: options.renderHeader,
  });
  header.el.hidden = options.header === false;
  header.setTitleExpanded(false);

  /** 选择层的年份 / 月份都按整个日历范围判断，越界的直接禁用 */
  const isMonthOutOfRange = function (year: number, month: number): boolean {
    const index = monthIndexOf(year, month);
    const min =
      minDate === null
        ? Number.NEGATIVE_INFINITY
        : monthIndexOf(minDate.getFullYear(), minDate.getMonth() + 1);
    const max =
      maxDate === null
        ? Number.POSITIVE_INFINITY
        : monthIndexOf(maxDate.getFullYear(), maxDate.getMonth() + 1);
    return index < min || index > max;
  };

  const isYearOutOfRange = function (year: number): boolean {
    return (
      (minDate !== null && year < minDate.getFullYear()) ||
      (maxDate !== null && year > maxDate.getFullYear())
    );
  };

  const picker = createPicker({
    locale,
    getYear: () => state.year,
    getMonth: () => state.month,
    isMonthDisabled: isMonthOutOfRange,
    isYearDisabled: isYearOutOfRange,
    onPickMonth: (month) => {
      closePicker();
      goTo(state.year, month);
    },
    onPickYear: (year) => {
      closePicker();
      goTo(year, state.month);
    },
  });

  /** 选择层打开时把底层内容设为 inert，键盘不会 Tab 到后面的日期格 */
  const setBackgroundInert = function (inert: boolean): void {
    Array.from(root.children).forEach((child) => {
      if (child === picker.el) return;
      (child as HTMLElement).inert = inert;
    });
  };

  const onPickerPointerDown = function (event: PointerEvent): void {
    const target = event.target as Node | null;
    if (target !== null && root.contains(target)) return;
    closePicker();
  };

  const onPickerKeyDown = function (event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    closePicker();
  };

  function openPicker(mode: "month" | "year" = "month"): void {
    picker.open(mode);
    header.setTitleExpanded(true);
    setBackgroundInert(true);
    document.addEventListener("pointerdown", onPickerPointerDown, true);
    root.addEventListener("keydown", onPickerKeyDown);
  }

  function closePicker(): void {
    if (!picker.isOpen()) return;
    picker.close();
    header.setTitleExpanded(false);
    setBackgroundInert(false);
    document.removeEventListener("pointerdown", onPickerPointerDown, true);
    root.removeEventListener("keydown", onPickerKeyDown);
  }

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

  root.append(picker.el);

  root.classList.add("cui--no-animation");
  container.appendChild(root);
  // 首次渲染不播折叠动画
  render(false);
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
      stopMonthAnimation();
      closePicker();
      picker.destroy();
      collapseButton?.removeEventListener("click", toggleCollapsed);
      header.destroy();
      panels.forEach((panel) => panel.grid.destroy());
      root.remove();
    },
  };
}
