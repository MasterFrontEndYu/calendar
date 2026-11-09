import type { CalendarDay, CalendarRange, CalendarState } from "../types";
import { compareDay, toDateOnly } from "../utils/date";
import { rangeFields } from "../utils/range";

export const createState = function (initial: Date): CalendarState {
  return {
    year: initial.getFullYear(),
    month: initial.getMonth() + 1,
    selected: initial,
    rangeStart: null,
    rangeEnd: null,
  };
};

/** 复制当前范围。 */
export const copyRange = function (state: CalendarState): CalendarRange {
  return {
    start: state.rangeStart === null ? null : new Date(state.rangeStart),
    end: state.rangeEnd === null ? null : new Date(state.rangeEnd),
  };
};

/** 处理范围点选。 */
export const clickRange = function (state: CalendarState, target: Date): void {
  const date = toDateOnly(target);

  if (state.rangeStart === null || state.rangeEnd !== null) {
    state.rangeStart = date;
    state.rangeEnd = null;
  } else if (compareDay(date, state.rangeStart) < 0) {
    state.rangeEnd = state.rangeStart;
    state.rangeStart = date;
  } else {
    state.rangeEnd = date;
  }
};

/** 设置范围。 */
export const assignRange = function (
  state: CalendarState,
  start: Date | null,
  end: Date | null,
): void {
  if (start === null) {
    state.rangeStart = null;
    state.rangeEnd = null;
    return;
  }

  if (end === null) {
    state.rangeStart = start;
    state.rangeEnd = null;
    return;
  }

  if (compareDay(start, end) <= 0) {
    state.rangeStart = start;
    state.rangeEnd = end;
  } else {
    state.rangeStart = end;
    state.rangeEnd = start;
  }
};

/** 清空范围。 */
export const clearRange = function (state: CalendarState): void {
  state.rangeStart = null;
  state.rangeEnd = null;
};

/** 用范围状态覆盖格子的选中字段。 */
export const withRangeFields = function <TData = null>(
  day: CalendarDay<TData>,
  state: CalendarState,
): CalendarDay<TData> {
  return {
    ...day,
    ...rangeFields(day.date, state.rangeStart, state.rangeEnd),
  };
};
