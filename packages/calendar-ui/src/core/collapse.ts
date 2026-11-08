import type { CalendarDay, CollapseHandle, CollapseOptions } from "../types";
import { sameDay } from "../utils/date";
import { createArrowIcon, node } from "../utils/dom";

/**
 * 折叠控制器
 *
 * 只负责折叠状态、底部箭头和可见行计算；重绘由外部传入的 onApply 触发。
 */
export const createCollapse = function <TData = null>(
  options: CollapseOptions<TData>,
): CollapseHandle<TData> {
  const { config, state, panels, monthCount } = options;
  const collapsible = config.animation.collapsible;

  let collapsed = collapsible && config.animation.defaultCollapsed;
  let button: HTMLButtonElement | null = null;

  const updateButton = function (): void {
    if (button === null) return;
    button.classList.toggle("is-collapsed", collapsed);
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute(
      "aria-label",
      collapsed ? (config.locale.expand ?? "展开日历") : (config.locale.collapse ?? "收起日历"),
    );
  };

  const updateRows = function (dayLists: readonly CalendarDay<TData>[][], animate: boolean): void {
    if (!collapsed) {
      panels.forEach((panel) => panel.grid.setVisibleRows(null, animate));
      return;
    }

    const targets: Date[] =
      config.mode === "range"
        ? [state.rangeStart, state.rangeEnd].filter((date): date is Date => date !== null)
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

  const toggle = function (): void {
    if (!collapsible) return;
    collapsed = !collapsed;
    updateButton();
    options.onApply();
  };

  if (collapsible) {
    button = node("button", "cui__collapse");
    button.type = "button";
    button.append(createArrowIcon());
    button.addEventListener("click", toggle);
  }

  return {
    button,
    isCollapsed: () => collapsed,
    toggle,
    updateButton,
    updateRows,
    destroy: () => {
      button?.removeEventListener("click", toggle);
    },
  };
};
