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

/** 创建日期格数据的构建函数。 */
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

/** 更新头部翻页按钮状态。 */
export const updateNav = function (
  header: HeaderHandle | null,
  bounds: CalendarBounds,
  state: CalendarState,
): void {
  if (header === null) return;
  const { prev, next } = navDisabled(bounds, state.year, state.month);
  header.setNavDisabled(prev, next);
};

/** 更新月份列的 aria-label。 */
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

/** 创建重绘函数。 */
export const createRenderer = function <TData = null>(
  deps: RendererDeps<TData>,
): (animateRows?: boolean) => CalendarDay<TData>[][] {
  const { root, config, state, bounds, header, panels, panelEls, collapse, popup } = deps;
  /** 是否已经出现过副标题。 */
  let hasSubtitle = false;
  /** 没有适配器也没有自定义副标题时，42 个格子不可能有副标题，连扫描都省掉 */
  const canHaveSubtitle = config.adapter !== undefined || config.subtitle !== undefined;
  /** 上次写面板 aria-label 时的年月；只选不换月时整段跳过 */
  let labelKey = "";

  return function render(animateRows = true): CalendarDay<TData>[][] {
    header?.update(state.year, state.month);
    const dayLists = panels.map((_, index) => deps.currentDays(index));

    // 最小档按「有没有副标题」切换格宽；normal / fill 不受影响
    if (canHaveSubtitle && !hasSubtitle) {
      if (dayLists.some((days) => days.some((day) => day.subtitle !== ""))) {
        hasSubtitle = true;
        root.classList.add("cui--sub");
      }
    }

    panels.forEach((panel, index) => panel.grid.render(dayLists[index]!));

    const nextLabelKey = `${state.year}-${state.month}`;
    if (nextLabelKey !== labelKey) {
      labelKey = nextLabelKey;
      updatePanelLabels(panelEls, state, config.locale);
    }

    updateNav(header, bounds, state);
    collapse.updateRows(dayLists, animateRows);
    collapse.updateButton();
    popup?.sync();

    return dayLists;
  };
};
