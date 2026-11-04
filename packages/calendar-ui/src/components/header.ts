import type { HeaderHandle, HeaderOptions } from "../types";
import { node } from "../utils/dom";
import { createNav } from "./nav";

/** 头部：默认是 ‹ 年月 ›，也可以交给 renderer 完全自定义 */
export const createHeader = function (options: HeaderOptions): HeaderHandle {
  const el = node("div", "cui__header");
  const title = node("div", "cui__title");
  const prev = createNav({
    label: "‹",
    ariaLabel: options.locale.prevMonth,
    onClick: options.onPrev,
  });
  const next = createNav({
    label: "›",
    ariaLabel: options.locale.nextMonth,
    onClick: options.onNext,
  });

  let year = options.year;
  let month = options.month;

  const render = () => {
    el.replaceChildren();

    if (options.renderer) {
      el.append(
        options.renderer({
          year,
          month,
          locale: options.locale,
          prevMonth: options.onPrev,
          nextMonth: options.onNext,
        }),
      );
      return;
    }

    title.textContent = options.title
      ? options.title(year, month)
      : options.locale.monthTitle(year, month);
    el.append(prev.el, title, next.el);
  };

  render();

  return {
    el,
    update: (nextYear: number, nextMonth: number) => {
      year = nextYear;
      month = nextMonth;
      render();
    },
    setNavDisabled: (prevDisabled: boolean, nextDisabled: boolean) => {
      prev.setDisabled(prevDisabled);
      next.setDisabled(nextDisabled);
    },
    destroy: () => {
      prev.destroy();
      next.destroy();
    },
  };
};
