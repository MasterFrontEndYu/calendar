import type { PickerHandle, PickerOptions } from "../types";
import { node } from "../utils/dom";
import { createNav } from "./nav";

/** 一页显示 12 个：月份 4 列 × 3 行，年份同样 4 列 × 3 行 */
const PAGE_SIZE = 12;

/**
 * 年月选择层
 *
 * 年份和月份是两个独立的面板，盖住整块日历、尺寸一致：
 * - 月份：当前视图年的 12 个月，选完只改月，立刻关闭；
 * - 年份：12 年一页，左右箭头和日历头部的翻月按钮在同一个位置，选完只改年，立刻关闭。
 */
export const createPicker = function (options: PickerOptions): PickerHandle {
  const { locale } = options;

  const el = node("div", "cui__picker");
  el.hidden = true;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");

  const head = node("div", "cui__header");
  const title = node("div", "cui__title");

  const prev = createNav({
    label: "‹",
    ariaLabel: locale.prevYearPage ?? "上一组年份",
    onClick: () => movePage(-1),
  });
  const next = createNav({
    label: "›",
    ariaLabel: locale.nextYearPage ?? "下一组年份",
    onClick: () => movePage(1),
  });

  head.append(prev.el, title, next.el);

  const grid = node("div", "cui__picker-grid");
  const cells = Array.from({ length: PAGE_SIZE }, () => {
    const cell = node("button", "cui__picker-cell");
    cell.type = "button";
    return cell;
  });
  grid.append(...cells);
  el.append(head, grid);

  let mode: "month" | "year" | null = null;
  /** 月份面板展示的年份 */
  let viewYear = options.getYear();
  /** 年份面板这一页的起始年 */
  let pageStart = 0;

  const monthName = (month: number): string => locale.monthName?.(month) ?? String(month);
  const yearName = (year: number): string => locale.yearLabel?.(year) ?? String(year);

  const pageHasYear = (start: number): boolean => {
    for (let index = 0; index < PAGE_SIZE; index++) {
      if (!options.isYearDisabled(start + index)) return true;
    }
    return false;
  };

  function movePage(direction: -1 | 1): void {
    const start = pageStart + direction * PAGE_SIZE;
    if (!pageHasYear(start)) return;
    pageStart = start;
    render();
  }

  function renderMonths(): void {
    el.classList.add("is-month");
    el.setAttribute("aria-label", locale.pickMonth ?? "选择月份");

    title.textContent = yearName(viewYear);

    cells.forEach((cell, index) => {
      const month = index + 1;
      cell.textContent = monthName(month);
      cell.dataset.month = String(month);
      delete cell.dataset.year;
      cell.disabled = options.isMonthDisabled(viewYear, month);
      cell.classList.toggle("is-selected", month === options.getMonth());
      cell.setAttribute("aria-label", `${yearName(viewYear)} ${monthName(month)}`);
    });
  }

  function renderYears(): void {
    el.classList.remove("is-month");
    el.setAttribute("aria-label", locale.pickYear ?? "选择年份");

    title.textContent = `${pageStart} – ${pageStart + PAGE_SIZE - 1}`;

    cells.forEach((cell, index) => {
      const year = pageStart + index;
      cell.textContent = String(year);
      cell.dataset.year = String(year);
      delete cell.dataset.month;
      cell.disabled = options.isYearDisabled(year);
      cell.classList.toggle("is-selected", year === options.getYear());
      cell.setAttribute("aria-label", yearName(year));
    });

    prev.setDisabled(!pageHasYear(pageStart - PAGE_SIZE));
    next.setDisabled(!pageHasYear(pageStart + PAGE_SIZE));
  }

  function render(): void {
    if (mode === "month") renderMonths();
    else if (mode === "year") renderYears();
  }

  function open(nextMode: "month" | "year"): void {
    mode = nextMode;

    if (nextMode === "month") {
      viewYear = options.getYear();
    } else {
      pageStart = Math.floor(options.getYear() / PAGE_SIZE) * PAGE_SIZE;
    }

    el.hidden = false;
    render();

    const selected = cells.find((cell) => cell.classList.contains("is-selected") && !cell.disabled);
    (selected ?? cells[0])?.focus({ preventScroll: true });
  }

  const onGridClick = (event: MouseEvent): void => {
    const cell = (event.target as HTMLElement).closest<HTMLButtonElement>(".cui__picker-cell");
    if (!cell || cell.disabled) return;

    const index = cells.indexOf(cell);
    if (index < 0) return;

    if (mode === "month") {
      options.onPickMonth(index + 1);
      return;
    }

    if (mode === "year") {
      options.onPickYear(pageStart + index);
    }
  };

  grid.addEventListener("click", onGridClick);

  return {
    el,
    open,
    close: () => {
      el.hidden = true;
      mode = null;
    },
    isOpen: () => mode !== null,
    render,
    destroy: () => {
      grid.removeEventListener("click", onGridClick);
      prev.destroy();
      next.destroy();
    },
  };
};
