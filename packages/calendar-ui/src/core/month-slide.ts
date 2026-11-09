import type { MonthSlideHandle, MonthSlidePanel } from "../types";
import { setRowVisibility } from "../utils/dom";

interface MonthAnimation {
  token: number;
  layers: HTMLElement[];
  animations: Animation[];
  timer: ReturnType<typeof setTimeout>;
}

const MONTH_CLASSES = [
  "is-month-in-next",
  "is-month-in-prev",
  "is-month-out-next",
  "is-month-out-prev",
] as const;

/**
 * 用 Web Animations 驱动翻月
 *
 * 不靠切换类名重启动画，也就不需要在点击处理里强制同步一次布局；
 * 快速连点时上一段会被 stop 直接停到终点，不会叠加克隆层。
 */
export const createMonthSlide = function (panels: readonly MonthSlidePanel[]): MonthSlideHandle {
  let token = 0;
  let active: MonthAnimation | null = null;

  /** 结束翻月动画：各层留在终点，并移除旧月份的克隆层 */
  const stop = function (): void {
    const current = active;
    if (current === null) return;

    active = null;
    clearTimeout(current.timer);
    current.animations.forEach((animation) => {
      try {
        animation.cancel();
      } catch {
        // 浏览器已经回收了这段动画
      }
    });
    current.layers.forEach((layer) => layer.remove());
    panels.forEach((panel) => panel.grid.el.classList.remove(...MONTH_CLASSES));
  };

  /** 克隆旧月份作为离场层；折叠行在换月后由 sync 对齐 */
  const capture = function (): HTMLElement[] {
    return panels.map((panel) => {
      const clone = panel.grid.el.cloneNode(true) as HTMLElement;
      clone.classList.add("is-month-clone");
      clone.classList.remove(...MONTH_CLASSES);
      clone.setAttribute("aria-hidden", "true");
      clone.querySelectorAll("button").forEach((button) => {
        button.tabIndex = -1;
      });
      panel.viewport.append(clone);
      return clone;
    });
  };

  /** 离场层和新月份用同一套折叠行，两层高度一致，滑动时不会露出空隙 */
  const sync = function (layers: readonly HTMLElement[]): void {
    layers.forEach((layer, index) => {
      const sourceRows = panels[index]?.grid.el.querySelectorAll<HTMLElement>(".cui__week");
      const layerRows = layer.querySelectorAll<HTMLElement>(".cui__week");
      sourceRows?.forEach((source, rowIndex) => {
        const target = layerRows[rowIndex];
        if (target === undefined) return;

        const hidden = source.classList.contains("is-collapsed-hidden");
        setRowVisibility(target, !hidden);
      });
    });
  };

  const start = function (
    direction: 1 | -1,
    layers: readonly HTMLElement[],
    duration: number,
    easing: string,
  ): void {
    const enter = `translateX(${direction * 100}%)`;
    const leave = `translateX(${-direction * 100}%)`;
    const inClass = direction === 1 ? "is-month-in-next" : "is-month-in-prev";
    const outClass = direction === 1 ? "is-month-out-next" : "is-month-out-prev";
    const animations: Animation[] = [];

    panels.forEach((panel, index) => {
      const grid = panel.grid.el;
      const oldLayer = layers[index] ?? null;
      grid.classList.add(inClass);
      oldLayer?.classList.add(outClass);

      if (typeof grid.animate !== "function") return;
      animations.push(
        grid.animate([{ transform: enter }, { transform: "translateX(0)" }], {
          duration,
          easing,
          fill: "both",
        }),
      );
      if (oldLayer !== null) {
        animations.push(
          oldLayer.animate([{ transform: "translateX(0)" }, { transform: leave }], {
            duration,
            easing,
            fill: "both",
          }),
        );
      }
    });

    const nextToken = ++token;
    const timer = setTimeout(() => {
      if (active?.token === nextToken) stop();
    }, duration + 80);

    active = { token: nextToken, layers: [...layers], animations, timer };
  };

  return { stop, capture, sync, start };
};
