import type { CalendarConfig, CalendarDay, CalendarPanel } from "../types";
import { createGrid } from "../components/grid";
import { createWeekdays } from "../components/weekdays";
import { node } from "../utils/dom";

/** 日历根节点：主题、尺寸和动画变量都挂在上面 */
export const createRoot = function <TData = null>(
  config: CalendarConfig<TData>,
  monthCount: 1 | 2,
): HTMLElement {
  const root = node("div", "cui");
  root.dataset.theme = config.theme;
  root.dataset.size = config.size;
  root.style.setProperty("--cui-month-duration", `${config.animation.monthDuration}ms`);
  root.style.setProperty("--cui-month-easing", config.animation.monthEasing);
  root.style.setProperty("--cui-collapse-duration", `${config.animation.collapseDuration}ms`);
  root.style.setProperty("--cui-collapse-easing", config.animation.collapseEasing);
  if (monthCount === 2) root.classList.add("cui--range");
  return root;
};

/** 建 1-2 列月份：星期表头、viewport、42 格网格只建一次 */
export const createPanels = function <TData = null>(
  config: CalendarConfig<TData>,
  monthCount: 1 | 2,
  onSelect: (day: CalendarDay<TData>, index: number) => void,
): CalendarPanel<TData>[] {
  return Array.from({ length: monthCount }, () => {
    const viewport = node("div", "cui__viewport");
    const grid = createGrid<TData>({ onSelect });
    viewport.append(grid.el);
    return {
      weekdays: createWeekdays(config.weekStartsOn, config.locale),
      viewport,
      grid,
    };
  });
};

export interface MountPanel {
  weekdays: { el: HTMLElement };
  viewport: HTMLElement;
}

export interface MountCalendarOptions {
  root: HTMLElement;
  headerEl: HTMLElement;
  pickerEl: HTMLElement;
  collapseButton: HTMLButtonElement | null;
  panels: readonly MountPanel[];
  monthCount: 1 | 2;
}

/**
 * 组装根节点
 *
 * 单视图把表头和唯一一列直接挂到根节点；双视图多包一层 cui__months。
 * 返回每个月份外层的 group 元素，供 aria-label 使用。
 */
export const mountCalendar = function (options: MountCalendarOptions): HTMLElement[] {
  const { root, headerEl, pickerEl, collapseButton, panels, monthCount } = options;
  const panelEls: HTMLElement[] = [];

  if (monthCount === 1) {
    root.append(headerEl, panels[0]!.weekdays.el, panels[0]!.viewport);
  } else {
    const monthsEl = node("div", "cui__months");
    panels.forEach((panel) => {
      const monthEl = node("div", "cui__month");
      monthEl.setAttribute("role", "group");
      monthEl.append(panel.weekdays.el, panel.viewport);
      monthsEl.append(monthEl);
      panelEls.push(monthEl);
    });
    root.append(headerEl, monthsEl);
  }

  if (collapseButton !== null) root.append(collapseButton);
  root.append(pickerEl);

  return panelEls;
};
