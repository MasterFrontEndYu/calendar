import type { CalendarInstance, CalendarRuntime } from "../types";
import { readDate } from "../utils/date";
import { applyBounds, clearRangeValue, selectDate, setRangeValue } from "./actions";
import { copyRange } from "./state";

/** 创建对外的日历实例 API。 */
export const createInstance = function <TData = null>(
  runtime: CalendarRuntime<TData>,
): CalendarInstance {
  const {
    config,
    state,
    bounds,
    root,
    header,
    picker,
    pickerLayer,
    collapse,
    slide,
    panels,
    popup,
  } = runtime;

  return {
    el: root,
    setMonth: (year, month) => runtime.goTo(year, month),
    getMonth: () => ({ year: state.year, month: state.month }),
    prevMonth: () => runtime.goTo(state.year, state.month - 1),
    nextMonth: () => runtime.goTo(state.year, state.month + 1),
    select: (date) => selectDate(runtime, date),
    getSelected: () => {
      if (config.mode === "range") {
        return state.rangeStart === null ? null : new Date(state.rangeStart);
      }
      return new Date(state.selected);
    },
    getRange: () => copyRange(state),
    setRange: (start, end) => setRangeValue(runtime, start, end),
    clearRange: () => clearRangeValue(runtime),
    show: () => {
      root.hidden = false;
    },
    hide: () => {
      root.hidden = true;
      popup?.close(false);
    },
    toggle: () => {
      root.hidden = !root.hidden;
      if (root.hidden) popup?.close(false);
    },
    isVisible: () => !root.hidden,
    getMinDate: () => (bounds.minDate === null ? null : new Date(bounds.minDate)),
    setMinDate: (date) => {
      applyBounds(runtime, readDate(date, "setMinDate(date)"), bounds.maxDate);
    },
    getMaxDate: () => (bounds.maxDate === null ? null : new Date(bounds.maxDate)),
    setMaxDate: (date) => {
      applyBounds(runtime, bounds.minDate, readDate(date, "setMaxDate(date)"));
    },
    getTheme: () => config.theme,
    setTheme: (next) => {
      config.theme = next;
      root.dataset.theme = next;
      popup?.refreshTheme();
    },
    destroy: () => {
      popup?.destroy();
      slide.stop();
      pickerLayer?.destroy();
      picker?.destroy();
      collapse.destroy();
      header?.destroy();
      panels.forEach((panel) => panel.grid.destroy());
      root.remove();
    },
  };
};
