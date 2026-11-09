import type { PickerHandle, PickerOptions } from "../types";
import { node } from "../utils/dom";

/** 一页显示 12 个：月份 4 列 × 3 行，年份同样 4 列 × 3 行 */
const PAGE_SIZE = 12;

/** 创建年月选择层。 */
export const createPicker = function (options: PickerOptions): PickerHandle {
  const el = node("div", "cui__picker");
  el.setAttribute("role", "dialog");

  const grid = node("div", "cui__picker-grid");
  const cells = Array.from({ length: PAGE_SIZE }, () => {
    const cell = node("button", "cui__picker-cell");
    cell.type = "button";
    return cell;
  });
  grid.append(...cells);
  el.append(grid);

  let mode: "month" | "year" | null = null;
  /** 月份层展示的年份 */
  let viewYear = options.getYear();
  /** 年份层这一页的起始年 */
  let pageStart = 0;

  const monthName = (month: number): string => options.locale.monthName?.(month) ?? String(month);
  const yearName = (year: number): string => options.locale.yearLabel?.(year) ?? String(year);

  const pageHasYear = (start: number): boolean => {
    for (let index = 0; index < PAGE_SIZE; index++) {
      if (!options.isYearDisabled(start + index)) return true;
    }
    return false;
  };

  function movePage(direction: -1 | 1): void {
    if (mode !== "year") return;
    const start = pageStart + direction * PAGE_SIZE;
    if (!pageHasYear(start)) return;
    pageStart = start;
    render();
  }

  function renderMonths(): void {
    el.classList.add("is-month");
    el.setAttribute("aria-label", options.locale.pickMonth ?? "选择月份");

    cells.forEach((cell, index) => {
      const month = index + 1;
      cell.textContent = monthName(month);
      cell.dataset.month = String(month);
      delete cell.dataset.year;
      cell.disabled = options.isMonthDisabled(viewYear, month);
      cell.classList.toggle(
        "is-selected",
        viewYear === options.getYear() && month === options.getMonth(),
      );
      cell.setAttribute("aria-label", `${yearName(viewYear)} ${monthName(month)}`);
    });
  }

  function renderYears(): void {
    el.classList.remove("is-month");
    el.setAttribute("aria-label", options.locale.pickYear ?? "选择年份");

    cells.forEach((cell, index) => {
      const year = pageStart + index;
      cell.textContent = String(year);
      cell.dataset.year = String(year);
      delete cell.dataset.month;
      cell.disabled = options.isYearDisabled(year);
      cell.classList.toggle("is-selected", year === options.getYear());
      cell.setAttribute("aria-label", yearName(year));
    });
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

    el.classList.add("is-open");
    render();

    const selected = cells.find((cell) => cell.classList.contains("is-selected") && !cell.disabled);
    (selected ?? cells[0])?.focus({ preventScroll: true });
  }

  function close(): void {
    mode = null;
    el.classList.remove("is-open");
  }

  const onGridClick = (event: MouseEvent): void => {
    const cell = (event.target as HTMLElement).closest<HTMLButtonElement>(".cui__picker-cell");
    if (!cell || cell.disabled) return;

    const index = cells.indexOf(cell);
    if (index < 0) return;

    if (mode === "month") {
      options.onPickMonth(viewYear, index + 1);
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
    close,
    isOpen: () => mode !== null,
    mode: () => mode,
    movePage,
    canPage: (direction: -1 | 1) => pageHasYear(pageStart + direction * PAGE_SIZE),
    refresh: () => {
      if (mode === "month") viewYear = options.getYear();
      render();
    },
    destroy: () => {
      grid.removeEventListener("click", onGridClick);
    },
  };
};
