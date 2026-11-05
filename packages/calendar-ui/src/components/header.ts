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

  const titleText = (): string =>
    options.title ? options.title(year, month) : options.locale.monthTitle(year, month);

  const renderDefault = (): void => {
    // 默认头部只建一次节点：换月时重建会把正在聚焦的翻月按钮挪出 DOM，
    // 焦点掉到 body，键盘用户每翻一个月就要重新找按钮。
    if (el.childElementCount === 0) el.append(prev.el, title, next.el);
    const nextTitle = titleText();
    if (title.textContent !== nextTitle) title.textContent = nextTitle;
  };

  const renderCustom = (): void => {
    el.replaceChildren(
      options.renderer!({
        year,
        month,
        locale: options.locale,
        prevMonth: options.onPrev,
        nextMonth: options.onNext,
      }),
    );
  };

  const render = (): void => {
    if (options.renderer) renderCustom();
    else renderDefault();
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
