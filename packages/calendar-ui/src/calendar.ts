import { createGrid } from "./components/grid";
import { createHeader } from "./components/header";
import { createWeekdays } from "./components/weekdays";
import { resolveLocale } from "./locales";
import type {
  CalendarDateInput,
  CalendarDay,
  CalendarInstance,
  CalendarOptions,
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

  const state = {
    year: initial.getFullYear(),
    month: initial.getMonth() + 1,
    selected: initial,
  };

  const root = node("div", "cui");
  root.dataset.theme = theme;
  const weekdays = createWeekdays(weekStartsOn, locale);

  /** 按当前 state 生成 42 个格子 */
  const currentDays = function (): CalendarDay<TData>[] {
    return buildDays<TData>({
      year: state.year,
      month: state.month,
      weekStartsOn,
      today,
      selected: state.selected,
      locale,
      adapter,
      isDisabled,
    });
  };

  function updateNav(): void {
    const current = monthIndexOf(state.year, state.month);
    const min =
      minDate === null
        ? Number.NEGATIVE_INFINITY
        : monthIndexOf(minDate.getFullYear(), minDate.getMonth() + 1);
    const max =
      maxDate === null
        ? Number.POSITIVE_INFINITY
        : monthIndexOf(maxDate.getFullYear(), maxDate.getMonth() + 1);
    header.setNavDisabled(current <= min, current >= max);
  }

  function render(): void {
    header.update(state.year, state.month);
    grid.render(currentDays());
    updateNav();
  }

  /** 处理点选：补位格只改选中，不切换展示月份 */
  function handleSelect(day: CalendarDay<TData>): void {
    if (day.isDisabled) return;

    state.selected = toDateOnly(day.date);
    if (day.inCurrentMonth) {
      state.year = day.year;
      state.month = day.month;
    }

    // 点选不换月，只需要刷新状态类，不必重建格子
    const days = currentDays();
    grid.updateState(days);

    // 回调用更新后的对象，保证 isSelected 是本次点击的结果
    options.onSelect?.(days.find((item) => sameDay(item.date, day.date)) ?? day);
  }

  function goTo(year: number, month: number): void {
    let next = normalizeMonth(year, month);

    if (minDate !== null) {
      const min = monthIndexOf(minDate.getFullYear(), minDate.getMonth() + 1);
      if (monthIndexOf(next.year, next.month) < min) {
        next = { year: minDate.getFullYear(), month: minDate.getMonth() + 1 };
      }
    }
    if (maxDate !== null) {
      const max = monthIndexOf(maxDate.getFullYear(), maxDate.getMonth() + 1);
      if (monthIndexOf(next.year, next.month) > max) {
        next = { year: maxDate.getFullYear(), month: maxDate.getMonth() + 1 };
      }
    }

    if (next.year === state.year && next.month === state.month) return;

    state.year = next.year;
    state.month = next.month;
    render();
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
    render();
  }

  const grid = createGrid<TData>({ onSelect: handleSelect });

  const header = createHeader({
    year: state.year,
    month: state.month,
    locale,
    onPrev: () => goTo(state.year, state.month - 1),
    onNext: () => goTo(state.year, state.month + 1),
    renderer: options.renderHeader,
  });
  header.el.hidden = options.header === false;

  root.append(header.el, weekdays.el, grid.el);
  container.appendChild(root);
  render();

  return {
    el: root,
    setMonth: goTo,
    getMonth: () => ({ year: state.year, month: state.month }),
    prevMonth: () => goTo(state.year, state.month - 1),
    nextMonth: () => goTo(state.year, state.month + 1),
    select: (date: CalendarDateInput) => {
      const target = readDate(date, "select(date)");
      if (target === null || isDisabled(target)) return;

      state.selected = target;
      state.year = target.getFullYear();
      state.month = target.getMonth() + 1;
      render();

      const day = currentDays().find((item) => sameDay(item.date, target));
      if (day) options.onSelect?.(day);
    },
    getSelected: () => new Date(state.selected),
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
      header.destroy();
      grid.destroy();
      root.remove();
    },
  };
}
