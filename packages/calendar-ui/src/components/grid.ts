import type { CalendarDay, GridHandle, GridOptions } from "../types";
import { node, setRowVisibility } from "../utils/dom";
import { prefersReducedMotion, readCssDuration, readCssEasing } from "../utils/motion";
import { createDayCell, setDay, setDayState } from "./day";

/** 固定 6 行 × 7 列 */
const CELL_COUNT = 42;
const ROW_COUNT = 6;

interface RowMetrics {
  height: number;
  opacity: number;
  marginBottom: number;
}

/** 读一行当前的视觉尺寸（动画进行中时读到的是动画值） */
const readRowMetrics = function (row: HTMLElement): RowMetrics {
  const rect = row.getBoundingClientRect();
  const style = getComputedStyle(row);
  const margin = Number.parseFloat(style.marginBottom);
  return {
    height: rect.height,
    opacity: Number.parseFloat(style.opacity) || 0,
    marginBottom: Number.isFinite(margin) ? margin : 0,
  };
};

/**
 * 日期网格：42 个格子只建一次，之后按索引复用
 *
 * - render：换月时更新日期/副标题 + 状态
 * - updateState：只切选中/今天等状态类，不动文本
 * - setVisibleRows：折叠时按行动画高度，其余行收起
 *
 * 行高动画必须按真实像素走：CSS 的 max-height 过渡从 200px 收到 0，
 * 真正可见的变化只落在缓动的最后 20%，看起来就是「先不动、再突然合上」。
 *
 * 没有做“按日期复用 + DOM 重排”：42 个节点的移动比 42 次文本写入更贵，
 * 实测换月反而从 0.60ms 退化到 0.93ms。
 */
export const createGrid = function <TData = null>(options: GridOptions<TData>): GridHandle<TData> {
  const el = node("div", "cui__grid");
  const rowEls = Array.from({ length: ROW_COUNT }, () => node("div", "cui__week"));
  const cells = Array.from({ length: CELL_COUNT }, () => createDayCell());

  rowEls.forEach((row, index) => {
    row.append(...cells.slice(index * 7, index * 7 + 7));
  });
  el.append(...rowEls);

  let days: CalendarDay<TData>[] = [];
  /** 上一次应用的行集合，重复渲染时直接跳过 */
  let visibleKey: string | null = null;

  /** 每一行正在跑的高度动画；再次切换时从当前可见高度接着走 */
  const rowAnimations = new Map<HTMLElement, Animation>();

  const onClick = (event: MouseEvent) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>(".cui__day");
    if (!cell) return;

    // 用索引取格子数据，比解析 data-date 快，也不受补位格影响
    const index = cells.indexOf(cell as HTMLButtonElement);
    const picked = days[index];
    if (picked && !picked.isDisabled) options.onSelect(picked, index);
  };

  const cancelRowAnimations = (): void => {
    rowAnimations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        // 动画已经被浏览器回收
      }
    });
    rowAnimations.clear();
  };

  const applyInstant = (visible: ReadonlySet<number> | null): void => {
    rowEls.forEach((row, index) => {
      setRowVisibility(row, visible === null || visible.has(index));
    });
  };

  const animateRows = (visible: ReadonlySet<number> | null): void => {
    const firstRow = rowEls[0] as HTMLElement;
    const gridStyle = getComputedStyle(el);
    const duration = readCssDuration(gridStyle, "--cui-collapse-duration", 200);
    const easing = readCssEasing(gridStyle, "--cui-collapse-easing", "ease");

    if (typeof firstRow.animate !== "function" || prefersReducedMotion() || duration === 0) {
      cancelRowAnimations();
      applyInstant(visible);
      return;
    }

    // 先读当前视觉高度（可能正被上一段动画驱动），再取消动画、落到最终状态
    const before = rowEls.map(readRowMetrics);
    cancelRowAnimations();
    applyInstant(visible);
    const after = rowEls.map(readRowMetrics);

    rowEls.forEach((row, index) => {
      const from = before[index] as RowMetrics;
      const to = after[index] as RowMetrics;
      if (Math.abs(from.height - to.height) < 0.5) return;

      const animation = row.animate(
        [
          {
            height: `${from.height}px`,
            opacity: from.opacity,
            marginBottom: `${from.marginBottom}px`,
          },
          {
            height: `${to.height}px`,
            opacity: to.opacity,
            marginBottom: `${to.marginBottom}px`,
          },
        ],
        { duration, easing, fill: "none" },
      );

      rowAnimations.set(row, animation);
      animation.finished
        .then(() => {
          if (rowAnimations.get(row) === animation) rowAnimations.delete(row);
        })
        .catch(() => {
          // cancel 会 reject finished，无需处理
        });
    });
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
    setVisibleRows: (rows: readonly number[] | null, animate = true) => {
      const visible = rows === null ? null : new Set(rows);
      const key = visible === null ? "*" : [...visible].sort((a, b) => a - b).join(",");

      // 翻月等场景要求瞬时切换：即使行集合没变，也要把进行中的动画收掉
      if (!animate) {
        cancelRowAnimations();
        applyInstant(visible);
        visibleKey = key;
        return;
      }

      if (key === visibleKey) return;
      visibleKey = key;

      animateRows(visible);
    },
    destroy: () => {
      cancelRowAnimations();
      el.removeEventListener("click", onClick);
    },
  };
};
