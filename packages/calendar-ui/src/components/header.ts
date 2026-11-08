import type { HeaderHandle, HeaderOptions } from "../types";
import { node } from "../utils/dom";
import { createNav } from "./nav";

/**
 * 头部：默认是 ‹ 年 月 ›，也可以交给 renderer 完全自定义
 *
 * 年份和月份是两个独立按钮：点年份开年份选择层，点月份开月份选择层。
 */
export const createHeader = function (options: HeaderOptions): HeaderHandle {
  const el = node("div", "cui__header");
  const title = node("div", "cui__title");
  const yearButton = node("button", "cui__title-part");
  const monthButton = node("button", "cui__title-part");
  yearButton.type = "button";
  monthButton.type = "button";
  yearButton.dataset.part = "year";
  monthButton.dataset.part = "month";

  if ((options.locale.titleOrder ?? "year-first") === "month-first") {
    title.append(monthButton, yearButton);
  } else {
    title.append(yearButton, monthButton);
  }

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

  const bindPicker = function (button: HTMLButtonElement, handler?: () => void): void {
    if (!handler) return;
    button.setAttribute("aria-haspopup", "dialog");
    button.addEventListener("click", handler);
  };

  bindPicker(yearButton, options.onYearClick);
  bindPicker(monthButton, options.onMonthClick);

  let year = options.year;
  let month = options.month;

  const labels = (): { year: string; month: string } =>
    options.label?.(year, month) ?? {
      year: options.locale.yearLabel?.(year) ?? String(year),
      month: options.locale.monthName?.(month) ?? String(month),
    };

  const renderDefault = (): void => {
    // 默认头部只建一次节点：换月时重建会把正在聚焦的翻月按钮挪出 DOM，
    // 焦点掉到 body，键盘用户每翻一个月就要重新找按钮。
    if (el.childElementCount === 0) el.append(prev.el, title, next.el);
    const text = labels();
    if (yearButton.textContent !== text.year) yearButton.textContent = text.year;
    if (monthButton.textContent !== text.month) monthButton.textContent = text.month;
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
    setTitleExpanded: (expanded: boolean) => {
      const value = String(expanded);
      if (options.onYearClick) yearButton.setAttribute("aria-expanded", value);
      if (options.onMonthClick) monthButton.setAttribute("aria-expanded", value);
    },
    destroy: () => {
      prev.destroy();
      next.destroy();
      if (options.onYearClick) yearButton.removeEventListener("click", options.onYearClick);
      if (options.onMonthClick) monthButton.removeEventListener("click", options.onMonthClick);
    },
  };
};
