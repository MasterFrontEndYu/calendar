import type { HeaderHandle, HeaderOptions } from "../types";
import { node } from "../utils/dom";
import { createNav } from "./nav";

/** 创建头部。 */
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
    direction: "prev",
    ariaLabel: options.locale.prevMonth,
    onClick: options.onPrev,
  });
  const next = createNav({
    direction: "next",
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

  const toggleYearPicker = options.onYearClick ?? (() => {});
  const toggleMonthPicker = options.onMonthClick ?? (() => {});

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
    const nav = options.getNavDisabled?.() ?? { prev: false, next: false };
    el.replaceChildren(
      options.renderer!({
        year,
        month,
        locale: options.locale,
        prevMonth: options.onPrev,
        nextMonth: options.onNext,
        prevDisabled: nav.prev,
        nextDisabled: nav.next,
        pickerMode: options.getPickerMode?.() ?? null,
        toggleYearPicker,
        toggleMonthPicker,
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
    refresh: render,
    setNavDisabled: (prevDisabled: boolean, nextDisabled: boolean) => {
      prev.setDisabled(prevDisabled);
      next.setDisabled(nextDisabled);
    },
    setNavVisible: (visible: boolean) => {
      prev.el.classList.toggle("is-nav-hidden", !visible);
      next.el.classList.toggle("is-nav-hidden", !visible);
    },
    setTitleExpanded: (expanded: boolean) => {
      const value = String(expanded);
      if (options.onYearClick) yearButton.setAttribute("aria-expanded", value);
      if (options.onMonthClick) monthButton.setAttribute("aria-expanded", value);
    },
    focusTitle: () => {
      if (options.renderer) {
        const target =
          el.querySelector<HTMLElement>("[data-cui-title]") ??
          el.querySelector<HTMLElement>('[aria-haspopup="dialog"]') ??
          el.querySelector<HTMLElement>("button");
        target?.focus({ preventScroll: true });
        return;
      }
      yearButton.focus({ preventScroll: true });
    },
    destroy: () => {
      prev.destroy();
      next.destroy();
      if (options.onYearClick) yearButton.removeEventListener("click", options.onYearClick);
      if (options.onMonthClick) monthButton.removeEventListener("click", options.onMonthClick);
    },
  };
};
