import type { CalendarDay } from "../types";
import { node } from "../utils/dom";

/**
 * 建一个空的日期格
 *
 * 节点只建一次，之后靠 setDay / setDayState 更新，换月不再分配新节点。
 */
export const createDayCell = function (): HTMLButtonElement {
  const cell = node("button", "cui__day");
  cell.type = "button";

  const tag = node("span", "cui__day-tag");
  tag.hidden = true;
  tag.setAttribute("aria-hidden", "true");

  cell.append(tag, node("span", "cui__day-num"), node("span", "cui__day-sub"));
  return cell;
};

/** 更新格子的日期内容；同一日期不重复写文本，只刷新状态 */
export const setDay = function (cell: HTMLButtonElement, day: CalendarDay<unknown>): void {
  const key = `${day.year}-${day.month}-${day.day}`;

  if (cell.dataset.date !== key) {
    cell.dataset.date = key;

    const tag = cell.querySelector(".cui__day-tag") as HTMLElement;
    const num = cell.querySelector(".cui__day-num") as HTMLElement;
    const sub = cell.querySelector(".cui__day-sub") as HTMLElement;
    const badge = day.badge;

    tag.textContent = badge?.text ?? "";
    tag.hidden = badge === null;

    if (badge?.tone !== undefined) {
      tag.dataset.tone = badge.tone;
      cell.dataset.tone = badge.tone;
    } else {
      delete tag.dataset.tone;
      delete cell.dataset.tone;
    }

    num.textContent = String(day.day);
    sub.textContent = day.subtitle;
    cell.setAttribute("aria-label", day.ariaLabel);
  }

  setDayState(cell, day);
};

/** 只更新状态类，不动文本；选中、hover 预览这类高频操作走这里 */
export const setDayState = function (cell: HTMLButtonElement, day: CalendarDay<unknown>): void {
  cell.classList.toggle("is-outside", !day.inCurrentMonth);
  cell.classList.toggle("is-today", day.isToday);
  cell.classList.toggle("is-selected", day.isSelected);
  cell.tabIndex = day.inCurrentMonth ? 0 : -1;

  if (day.isSelected) cell.setAttribute("aria-pressed", "true");
  else cell.removeAttribute("aria-pressed");
};
