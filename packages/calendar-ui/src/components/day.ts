import type { CalendarDay } from "../types";
import { dateStringKey } from "../utils/date";
import { node } from "../utils/dom";

/** 日期格的状态位；值没变就跳过整段 DOM 写入 */
const STATE_OUTSIDE = 1;
const STATE_TODAY = 2;
const STATE_SELECTED = 4;
const STATE_RANGE_START = 8;
const STATE_RANGE_END = 16;
const STATE_IN_RANGE = 32;
const STATE_DISABLED = 64;

interface CellMark {
  /** 状态位组合，见 STATE_* */
  mask: number;
  /** 上一次写入的 aria-label */
  label: string;
}

/** 每个格子最近一次写入的状态；结构固定，不用 WeakMap 之外的地方保存 */
const marks = new WeakMap<HTMLElement, CellMark>();

/** 取（或建）格子的状态记录 */
const markOf = function (cell: HTMLElement): CellMark {
  let mark = marks.get(cell);
  if (mark === undefined) {
    mark = { mask: -1, label: "" };
    marks.set(cell, mark);
  }
  return mark;
};

/** 创建日期格元素。 */
export const createDayCell = function (): HTMLButtonElement {
  const cell = node("button", "cui__day");
  cell.type = "button";

  const tag = node("span", "cui__day-tag");
  tag.hidden = true;
  tag.setAttribute("aria-hidden", "true");

  const dot = node("span", "cui__day-dot");
  dot.hidden = true;
  dot.setAttribute("aria-hidden", "true");

  cell.append(tag, node("span", "cui__day-num"), node("span", "cui__day-sub"), dot);
  return cell;
};

/** 更新日期格的内容和状态。 */
export const setDay = function (cell: HTMLButtonElement, day: CalendarDay<unknown>): void {
  const key = dateStringKey(day.year, day.month, day.day);

  if (cell.dataset.date !== key) {
    cell.dataset.date = key;

    // 结构固定为 tag → num → sub，按兄弟节点取比三次 querySelector 便宜
    const tag = cell.firstElementChild as HTMLElement;
    const num = tag.nextElementSibling as HTMLElement;
    const sub = num.nextElementSibling as HTMLElement;
    const badge = day.badge;

    // 纯公历格没有标记和副标题，写成空串会白白触发一次 DOM 变更，先比再写
    const tagText = badge?.text ?? "";
    if (tag.textContent !== tagText) tag.textContent = tagText;

    const tagHidden = badge === null;
    if (tag.hidden !== tagHidden) tag.hidden = tagHidden;

    if (badge?.tone !== undefined) {
      tag.dataset.tone = badge.tone;
      cell.dataset.tone = badge.tone;
    } else if (tag.dataset.tone !== undefined) {
      delete tag.dataset.tone;
      delete cell.dataset.tone;
    }

    const numText = String(day.day);
    if (num.textContent !== numText) num.textContent = numText;
    if (sub.textContent !== day.subtitle) sub.textContent = day.subtitle;

    // 周六 / 周日固定标红：和法定节假日同色，但不由节假日数据决定。
    // day.date 是同一份数据里的 Date，直接用它的 getDay，不再按年月日另建 Date。
    const weekday = day.date.getDay();
    cell.classList.toggle("is-weekend", weekday === 0 || weekday === 6);
  }

  setDayState(cell, day);
};

/** 更新日期格的状态。 */
export const setDayState = function (cell: HTMLButtonElement, day: CalendarDay<unknown>): void {
  const mask =
    (day.inCurrentMonth ? 0 : STATE_OUTSIDE) |
    (day.isToday ? STATE_TODAY : 0) |
    (day.isSelected ? STATE_SELECTED : 0) |
    (day.isRangeStart ? STATE_RANGE_START : 0) |
    (day.isRangeEnd ? STATE_RANGE_END : 0) |
    (day.isInRange ? STATE_IN_RANGE : 0) |
    (day.isDisabled ? STATE_DISABLED : 0);

  // 42 个格子里每次通常只有 1-2 个真的变了，其余直接跳过
  const mark = markOf(cell);
  if (mark.mask === mask && mark.label === day.ariaLabel) return;
  mark.mask = mask;
  mark.label = day.ariaLabel;

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
