import type {
  CalendarBounds,
  CalendarConfig,
  CalendarDay,
  CalendarLocale,
  CalendarState,
  HeaderHandle,
  RendererDeps,
} from "../types";
import { buildDays } from "../utils/days";
import { normalizeMonth } from "../utils/date";
import { isDisabled, navDisabled } from "./bounds";

/**
 * 按当前 state 生成某一列的 42 个格子
 *
 * 返回的函数在每次重绘时调用；闭包里只保存引用，不额外分配状态。
 */
export const createDayBuilder = function <TData = null>(
  config: CalendarConfig<TData>,
  bounds: CalendarBounds,
  state: CalendarState,
): (offset?: number) => CalendarDay<TData>[] {
  const disabled = (date: Date): boolean => isDisabled(bounds, date);

  return function currentDays(offset = 0): CalendarDay<TData>[] {
    const month = normalizeMonth(state.year, state.month + offset);
    return buildDays<TData>({
      year: month.year,
      month: month.month,
      weekStartsOn: config.weekStartsOn,
      today: config.today,
      selected: config.mode === "single" ? state.selected : null,
      rangeStart: state.rangeStart,
      rangeEnd: state.rangeEnd,
      locale: config.locale,
      adapter: config.adapter,
      isDisabled: disabled,
      subtitle: config.subtitle,
    });
  };
};

/** 头部左右按钮的禁用状态，渲染和选择层恢复时共用 */
export const updateNav = function (
  header: HeaderHandle,
  bounds: CalendarBounds,
  state: CalendarState,
): void {
  const { prev, next } = navDisabled(bounds, state.year, state.month);
  header.setNavDisabled(prev, next);
};

/** 双视图时每个月份外层 group 的 aria-label */
const updatePanelLabels = function (
  panelEls: readonly HTMLElement[],
  state: CalendarState,
  locale: CalendarLocale,
): void {
  panelEls.forEach((el, index) => {
    const month = normalizeMonth(state.year, state.month + index);
    el.setAttribute("aria-label", locale.monthTitle(month.year, month.month));
  });
};

/** 一次重绘：标题、格子内容、无障碍标签、翻月状态、折叠行一起同步 */
export const createRenderer = function <TData = null>(
  deps: RendererDeps<TData>,
): (animateRows?: boolean) => void {
  const { root, config, state, bounds, header, panels, panelEls, collapse } = deps;
  /**
   * 是否出现过副标题
   *
   * 只增不减：min 档一旦出现副标题就整块放大，之后再遇到没副标题的月份也不缩回去，
   * 否则每次翻月整块尺寸都会跳一下。
   */
  let hasSubtitle = false;

  return function render(animateRows = true): void {
    header.update(state.year, state.month);
    const dayLists = panels.map((_, index) => deps.currentDays(index));

    // 最小档按「有没有副标题」切换格宽；normal / fill 不受影响
    if (!hasSubtitle && dayLists.some((days) => days.some((day) => day.subtitle !== ""))) {
      hasSubtitle = true;
      root.classList.add("cui--sub");
    }

    panels.forEach((panel, index) => panel.grid.render(dayLists[index]!));
    updatePanelLabels(panelEls, state, config.locale);
    updateNav(header, bounds, state);
    collapse.updateRows(dayLists, animateRows);
    collapse.updateButton();
  };
};
