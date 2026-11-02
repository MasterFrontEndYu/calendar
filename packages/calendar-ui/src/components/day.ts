import type { CalendarDay } from "../types";
import { subtitleOf } from "../utils/calendar";
import { node } from "../utils/dom";

/**
 * 建一个空的日期格
 *
 * 节点只建一次，之后靠 setDay / setDayState 更新，换月不再分配新节点。
 */
export const createDayCell = function (): HTMLButtonElement {
  const cell = node("button", "cui__day");
  cell.type = "button";
  cell.append(node("span", "cui__day-num"), node("span", "cui__day-sub"));
  return cell;
};

/** 更新格子的日期内容；同一日期不重复写文本，只刷新状态 */
export const setDay = function (cell: HTMLButtonElement, day: CalendarDay): void {
  const key = `${day.year}-${day.month}-${day.day}`;

  if (cell.dataset.date !== key) {
    cell.dataset.date = key;

    const num = cell.firstElementChild as HTMLElement;
    const sub = cell.lastElementChild as HTMLElement;
    const subtitle = subtitleOf(day);

    num.textContent = String(day.day);
    sub.textContent = subtitle;
    cell.setAttribute("aria-label", `${key} ${subtitle}`.trim());
  }

  setDayState(cell, day);
};

/** 只更新状态类，不动文本；选中、hover 预览这类高频操作走这里 */
export const setDayState = function (cell: HTMLButtonElement, day: CalendarDay): void {
  cell.classList.toggle("is-outside", !day.inCurrentMonth);
  cell.classList.toggle("is-today", day.isToday);
  cell.classList.toggle("is-selected", day.isSelected);
  cell.classList.toggle("is-rest", day.lunar?.Xiu === true);
  cell.tabIndex = day.inCurrentMonth ? 0 : -1;

  if (day.isSelected) cell.setAttribute("aria-pressed", "true");
  else cell.removeAttribute("aria-pressed");
};
