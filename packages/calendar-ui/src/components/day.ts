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

/** 每个网格自己的格子状态；用数组代替「格子 → 对象」的 WeakMap */
export interface DayMarks {
  readonly masks: Int32Array;
  readonly labels: string[];
}

/** 创建 42 格的 mark 存储。 */
export const createDayMarks = function (count: number): DayMarks {
  return {
    masks: new Int32Array(count),
    labels: Array.from({ length: count }, () => ""),
  };
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
export const setDay = function (
  cell: HTMLButtonElement,
  day: CalendarDay<unknown>,
  marks: DayMarks,
  index: number,
): void {
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

  setDayState(cell, day, marks, index);
};

/** 更新日期格的状态。 */
export const setDayState = function (
  cell: HTMLButtonElement,
  day: CalendarDay<unknown>,
  marks: DayMarks,
  index: number,
): void {
  const mask =
    (day.inCurrentMonth ? 0 : STATE_OUTSIDE) |
    (day.isToday ? STATE_TODAY : 0) |
    (day.isSelected ? STATE_SELECTED : 0) |
    (day.isRangeStart ? STATE_RANGE_START : 0) |
    (day.isRangeEnd ? STATE_RANGE_END : 0) |
    (day.isInRange ? STATE_IN_RANGE : 0) |
    (day.isDisabled ? STATE_DISABLED : 0);

  // 42 个格子里每次通常只有 1-2 个真的变了，其余直接跳过
  const previousMask = marks.masks[index] ?? 0;
  const previousLabel = marks.labels[index] ?? "";
  const labelChanged = previousLabel !== day.ariaLabel;
  if (previousMask === mask && !labelChanged) return;

  // 只碰发生变化的位；翻月时 aria-label 全变，但状态位通常只变少数几格
  const diff = previousMask ^ mask;

  if ((diff & STATE_OUTSIDE) !== 0) cell.classList.toggle("is-outside", !day.inCurrentMonth);
  if ((diff & STATE_TODAY) !== 0) cell.classList.toggle("is-today", day.isToday);
  if ((diff & STATE_RANGE_START) !== 0) cell.classList.toggle("is-range-start", day.isRangeStart);
  if ((diff & STATE_RANGE_END) !== 0) cell.classList.toggle("is-range-end", day.isRangeEnd);
  if ((diff & STATE_IN_RANGE) !== 0) cell.classList.toggle("is-in-range", day.isInRange);

  // isSelected / aria-pressed 同时受「选中」和「范围端点」影响，三者任一变化都要同步
  if ((diff & (STATE_SELECTED | STATE_RANGE_START | STATE_RANGE_END)) !== 0) {
    cell.classList.toggle("is-selected", day.isSelected);
    if (day.isSelected) cell.setAttribute("aria-pressed", "true");
    else cell.removeAttribute("aria-pressed");
  }

  if ((diff & STATE_DISABLED) !== 0) {
    cell.classList.toggle("is-disabled", day.isDisabled);
    cell.disabled = day.isDisabled;
    if (day.isDisabled) cell.setAttribute("aria-disabled", "true");
    else cell.removeAttribute("aria-disabled");
  }

  if ((diff & (STATE_OUTSIDE | STATE_DISABLED)) !== 0) {
    cell.tabIndex = day.inCurrentMonth && !day.isDisabled ? 0 : -1;
  }

  if (labelChanged) cell.setAttribute("aria-label", day.ariaLabel);

  marks.masks[index] = mask;
  marks.labels[index] = day.ariaLabel;
};
