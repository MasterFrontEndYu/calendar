import { createGrid } from "./components/grid";
import { createHeader } from "./components/header";
import { createWeekdays } from "./components/weekdays";
import { resolveLocale } from "./locales";
import type { CalendarDay, CalendarInstance, CalendarOptions, CalendarTheme } from "./types";
import { buildDays } from "./utils/days";
import { normalizeMonth, sameDay } from "./utils/date";
import { node } from "./utils/dom";

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
  const initial = options.initialDate ?? today;

  const state = {
    year: initial.getFullYear(),
    month: initial.getMonth() + 1,
    selected: new Date(initial.getFullYear(), initial.getMonth(), initial.getDate()),
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
    });
  };

  const render = function () {
    header.update(state.year, state.month);
    grid.render(currentDays());
  };

  /** 处理点选：补位格只改选中，不切换展示月份 */
  const handleSelect = function (day: CalendarDay<TData>) {
    state.selected = day.date;
    if (day.inCurrentMonth) {
      state.year = day.year;
      state.month = day.month;
    }

    // 点选不换月，只需要刷新状态类，不必重建格子
    const days = currentDays();
    grid.updateState(days);

    // 回调用更新后的对象，保证 isSelected 是本次点击的结果
    options.onSelect?.(days.find((item) => sameDay(item.date, day.date)) ?? day);
  };

  const grid = createGrid<TData>({ onSelect: handleSelect });

  const goTo = function (year: number, month: number) {
    const next = normalizeMonth(year, month);
    state.year = next.year;
    state.month = next.month;
    render();
    options.onMonthChange?.(state.year, state.month);
  };

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
    select: (date: Date) => {
      const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      state.selected = target;
      state.year = target.getFullYear();
      state.month = target.getMonth() + 1;
      render();

      const day = currentDays().find((item) => sameDay(item.date, target));
      if (day) options.onSelect?.(day);
    },
    getSelected: () => (state.selected ? new Date(state.selected) : null),
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
