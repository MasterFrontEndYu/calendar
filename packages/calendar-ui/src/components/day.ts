import type { CalendarDay } from "../types";
import { node } from "../utils/dom";

/** 周末判断：只看公历星期，与节日 / 调休数据无关 */
const isWeekend = function (year: number, month: number, day: number): boolean {
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 || weekday === 6;
};

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

    // 结构固定为 tag → num → sub，按兄弟节点取比三次 querySelector 便宜
    const tag = cell.firstElementChild as HTMLElement;
    const num = tag.nextElementSibling as HTMLElement;
    const sub = num.nextElementSibling as HTMLElement;
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

    // 周六 / 周日固定标红：和法定节假日同色，但不由节假日数据决定
    cell.classList.toggle("is-weekend", isWeekend(day.year, day.month, day.day));
  }

  setDayState(cell, day);
};

/** 只更新状态类，不动文本；选中、hover 预览这类高频操作走这里 */
export const setDayState = function (cell: HTMLButtonElement, day: CalendarDay<unknown>): void {
  cell.classList.toggle("is-outside", !day.inCurrentMonth);
  cell.classList.toggle("is-today", day.isToday);
  cell.classList.toggle("is-selected", day.isSelected);
  cell.classList.toggle("is-range-start", day.isRangeStart);
  cell.classList.toggle("is-range-end", day.isRangeEnd);
  cell.classList.toggle("is-in-range", day.isInRange);
  cell.classList.toggle("is-disabled", day.isDisabled);
  cell.disabled = day.isDisabled;
  cell.tabIndex = day.inCurrentMonth && !day.isDisabled ? 0 : -1;
  cell.setAttribute("aria-label", day.ariaLabel);

  if (day.isDisabled) cell.setAttribute("aria-disabled", "true");
  else cell.removeAttribute("aria-disabled");

  if (day.isSelected) cell.setAttribute("aria-pressed", "true");
  else cell.removeAttribute("aria-pressed");
};
