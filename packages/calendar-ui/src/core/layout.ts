import type { CalendarConfig, CalendarDay, CalendarPanel } from "../types";
import { createGrid } from "../components/grid";
import { createWeekdays } from "../components/weekdays";
import { node } from "../utils/dom";

/** 创建日历根节点。 */
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

/** 创建月份列。 */
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
  /** header: false 时为 null */
  headerEl: HTMLElement | null;
  /** header: false 时为 null */
  pickerEl: HTMLElement | null;
  collapseButton: HTMLButtonElement | null;
  panels: readonly MountPanel[];
  monthCount: 1 | 2;
}

/** 把各部分挂载到根节点。 */
export const mountCalendar = function (options: MountCalendarOptions): HTMLElement[] {
  const { root, headerEl, pickerEl, collapseButton, panels, monthCount } = options;
  const panelEls: HTMLElement[] = [];

  if (monthCount === 1) {
    if (headerEl !== null) root.append(headerEl);
    root.append(panels[0]!.weekdays.el, panels[0]!.viewport);
  } else {
    const monthsEl = node("div", "cui__months");
    panels.forEach((panel) => {
      const monthEl = node("div", "cui__month");
      monthEl.setAttribute("role", "group");
      monthEl.append(panel.weekdays.el, panel.viewport);
      monthsEl.append(monthEl);
      panelEls.push(monthEl);
    });
    if (headerEl !== null) root.append(headerEl);
    root.append(monthsEl);
  }

  if (collapseButton !== null) root.append(collapseButton);
  if (pickerEl !== null) root.append(pickerEl);

  return panelEls;
};
