import type { CalendarDay, GridHandle, GridOptions } from "../types";
import { node } from "../utils/dom";
import { createDayCell, setDay, setDayState } from "./day";

/** 固定 6 行 × 7 列 */
const CELL_COUNT = 42;

/**
 * 日期网格：42 个格子只建一次，之后按索引复用
 *
 * - render：换月时更新日期/副标题 + 状态
 * - updateState：只切选中/今天等状态类，不动文本
 *
 * 没有做“按日期复用 + DOM 重排”：42 个节点的移动比 42 次文本写入更贵，
 * 实测换月反而从 0.60ms 退化到 0.93ms。
 */
export const createGrid = function <TData = null>(options: GridOptions<TData>): GridHandle<TData> {
  const el = node("div", "cui__grid");
  const cells = Array.from({ length: CELL_COUNT }, () => createDayCell());
  el.append(...cells);

  let days: CalendarDay<TData>[] = [];

  const onClick = (event: MouseEvent) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(".cui__day");
    if (!cell) return;

    // 用索引取格子数据，比解析 data-date 快，也不受补位格影响
    const picked = days[cells.indexOf(cell as HTMLButtonElement)];
    if (picked) options.onSelect(picked);
  };

  el.addEventListener("click", onClick);

  return {
    el,
    render: (next: CalendarDay<TData>[]) => {
      days = next;
      for (let i = 0; i < CELL_COUNT; i++) {
        const day = next[i];
        if (day) setDay(cells[i] as HTMLButtonElement, day);
      }
    },
    updateState: (next: CalendarDay<TData>[]) => {
      days = next;
      for (let i = 0; i < CELL_COUNT; i++) {
        const day = next[i];
        if (day) setDayState(cells[i] as HTMLButtonElement, day);
      }
    },
    destroy: () => el.removeEventListener("click", onClick),
  };
};
