import type {
  CalendarDate,
  CalendarLocale,
  DayPopupHandle,
  DayPopupItem,
  ResolvedCalendarPopupOptions,
} from "../types";
import { createDate, dateKey } from "../utils/date";
import { node } from "../utils/dom";

/** 从月视图复制到 popup 的 CSS 变量 */
const THEME_VARS = [
  "--cui-bg",
  "--cui-fg",
  "--cui-muted",
  "--cui-border",
  "--cui-accent",
  "--cui-accent-fg",
  "--cui-rest",
  "--cui-hover",
  "--cui-radius",
] as const;

/** hover 离开格子后留给鼠标移到 popup 的缓冲时间 */
const HOVER_CLOSE_DELAY = 120;
const POPUP_GAP = 8;
const VIEWPORT_PADDING = 8;

let popupSeed = 0;

export interface CreateDayPopupOptions {
  root: HTMLElement;
  popup: ResolvedCalendarPopupOptions;
  locale: CalendarLocale;
}

/** 从 data-date（YYYY-M-D）和 is-outside 还原日期 */
const readDay = function (cell: HTMLElement): CalendarDate | null {
  const key = cell.dataset.date;
  if (!key) return null;

  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return null;

  return {
    year,
    month,
    day,
    date: createDate(year, month, day),
    inCurrentMonth: !cell.classList.contains("is-outside"),
  };
};

/** 当前设备是否支持 hover */
const canHover = function (doc: Document): boolean {
  const view = doc.defaultView;
  if (!view || typeof view.matchMedia !== "function") return false;
  return view.matchMedia("(hover: hover) and (pointer: fine)").matches;
};

/** 运行时判断 Node，避免依赖全局构造器 */
const isNode = function (value: unknown): value is Node {
  return typeof value === "object" && value !== null && "nodeType" in value;
};

const defaultPopupTitle = function (day: CalendarDate, count: number): string {
  return `${day.month}/${day.day} · ${count}`;
};

/** 创建日期格 popup 控制器。 */
export const createDayPopup = function (options: CreateDayPopupOptions): DayPopupHandle {
  const { root, popup, locale } = options;
  const doc = root.ownerDocument ?? document;
  const win = doc.defaultView;
  const body = doc.body ?? doc.documentElement;

  const el = node("div", "cui__popup", undefined, doc);
  el.hidden = true;
  el.id = `cui-popup-${++popupSeed}`;
  el.setAttribute("role", popup.role);
  if (popup.ariaLabel) el.setAttribute("aria-label", popup.ariaLabel);
  if (popup.role === "dialog") el.tabIndex = -1;
  body.append(el);

  let isOpen = false;
  let activeCell: HTMLButtonElement | null = null;
  let activeKey = "";
  let closeTimer: number | null = null;
  let suppressFocus = false;
  let observer: ResizeObserver | null = null;

  /** 创建 / 重绘时渲染一次内容，打开时直接复用；key 为 YYYYMMDD */
  const rendered = new Map<number, readonly DayPopupItem[]>();

  if (typeof ResizeObserver === "function") {
    observer = new ResizeObserver(() => {
      if (isOpen) position();
    });
    observer.observe(el);
  }

  const usesHover = function (): boolean {
    return popup.trigger === "hover" || (popup.trigger === "auto" && canHover(doc));
  };

  const closestCell = function (target: EventTarget | null): HTMLButtonElement | null {
    const element = target as Element | null;
    if (!element || typeof element.closest !== "function") return null;
    const cell = element.closest<HTMLButtonElement>(".cui__day");
    return cell && root.contains(cell) ? cell : null;
  };

  const clearCloseTimer = function (): void {
    if (closeTimer !== null) {
      win?.clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const scheduleClose = function (): void {
    clearCloseTimer();
    if (!usesHover() || win === null) return;
    closeTimer = win.setTimeout(() => {
      closeTimer = null;
      close(false);
    }, HOVER_CLOSE_DELAY);
  };

  const applyTheme = function (): void {
    const styles = win?.getComputedStyle(root);
    const scheme = styles?.getPropertyValue("color-scheme").trim() ?? "";
    const resolvedTheme =
      scheme === "dark" || scheme === "light" ? scheme : (root.dataset.theme ?? "auto");
    el.dataset.theme = resolvedTheme;
    if (!styles) return;

    for (const name of THEME_VARS) {
      const value = styles.getPropertyValue(name).trim();
      if (value) el.style.setProperty(name, value);
      else el.style.removeProperty(name);
    }

    const font = styles.fontFamily.trim();
    if (font) el.style.setProperty("--cui-popup-font", font);
    else el.style.removeProperty("--cui-popup-font");

    if (scheme) el.style.setProperty("--cui-popup-color-scheme", scheme);
    else el.style.removeProperty("--cui-popup-color-scheme");
  };

  const setActiveAria = function (cell: HTMLButtonElement): void {
    if (popup.role === "dialog") {
      cell.setAttribute("aria-expanded", "true");
      cell.setAttribute("aria-controls", el.id);
    } else {
      cell.setAttribute("aria-describedby", el.id);
    }
  };

  const clearActiveAria = function (cell: HTMLButtonElement): void {
    cell.removeAttribute("aria-expanded");
    cell.removeAttribute("aria-controls");
    cell.removeAttribute("aria-describedby");
  };

  const focusPopup = function (): void {
    if (popup.role !== "dialog") return;
    el.focus({ preventScroll: true });
  };

  const restoreFocus = function (cell: HTMLButtonElement): void {
    if (!cell.isConnected) return;
    suppressFocus = true;
    cell.focus({ preventScroll: true });
    queueMicrotask(() => {
      suppressFocus = false;
    });
  };

  /**
   * 取某一天的 popup 内容。
   *
   * 第一次遇到某个日期时调用 `popup.render(day)` 并缓存，之后重绘和打开都复用；
   * 返回空数组表示这一天没有 popup，也就不显示绿点。
   */
  const contentOf = function (day: CalendarDate): readonly DayPopupItem[] {
    const key = dateKey(day.date);
    const cached = rendered.get(key);
    if (cached !== undefined) return cached;

    const items = popup.render(day);
    if (!Array.isArray(items)) {
      throw new TypeError("[calendar-ui] popup.render(day) 必须返回数组");
    }
    for (const item of items) {
      if (typeof item !== "string" && !isNode(item)) {
        throw new TypeError("[calendar-ui] popup.render(day) 的每一项必须是字符串或 Node");
      }
    }

    rendered.set(key, items);
    return items;
  };

  const renderItems = function (day: CalendarDate, items: readonly DayPopupItem[]): void {
    el.replaceChildren();

    const head = node("div", "cui__popup-head", undefined, doc);
    head.textContent = locale.popupTitle
      ? locale.popupTitle(day, items.length)
      : defaultPopupTitle(day, items.length);
    el.append(head);

    if (items.length === 0) return;

    const content = node("div", "cui__popup-body", undefined, doc);
    for (const item of items) {
      const itemEl = node("div", "cui__popup-item", undefined, doc);
      if (typeof item === "string") {
        itemEl.append(node("div", "cui__popup-title", item, doc));
      } else {
        itemEl.append(item);
      }
      content.append(itemEl);
    }
    el.append(content);
  };

  const updateIndicators = function (): void {
    const cells = root.querySelectorAll<HTMLButtonElement>(".cui__day");
    cells.forEach((cell) => {
      const dot = cell.querySelector<HTMLElement>(".cui__day-dot");
      const day = readDay(cell);
      const hasContent = day !== null && contentOf(day).length > 0;

      if (dot) dot.hidden = !hasContent;

      if (popup.role === "dialog") {
        if (hasContent) cell.setAttribute("aria-haspopup", "dialog");
        else cell.removeAttribute("aria-haspopup");
      }
    });
  };

  const position = function (): void {
    if (!isOpen || !activeCell) return;

    if (popup.placement === "center") {
      el.dataset.placement = "center";
      el.style.removeProperty("left");
      el.style.removeProperty("top");
      el.style.removeProperty("transform");
      return;
    }

    const cellRect = activeCell.getBoundingClientRect();
    const popupRect = el.getBoundingClientRect();
    const viewportWidth = doc.documentElement.clientWidth || win?.innerWidth || 0;
    const viewportHeight = doc.documentElement.clientHeight || win?.innerHeight || 0;

    let placement = popup.placement;
    if (placement === "auto") {
      const spaceBelow = viewportHeight - cellRect.bottom;
      const spaceAbove = cellRect.top;
      placement =
        spaceBelow >= popupRect.height + POPUP_GAP || spaceBelow >= spaceAbove ? "bottom" : "top";
    }

    const top =
      placement === "bottom"
        ? cellRect.bottom + POPUP_GAP
        : cellRect.top - popupRect.height - POPUP_GAP;
    let left = cellRect.left + cellRect.width / 2 - popupRect.width / 2;

    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, viewportWidth - popupRect.width - VIEWPORT_PADDING),
    );
    const clampedTop = Math.max(
      VIEWPORT_PADDING,
      Math.min(top, viewportHeight - popupRect.height - VIEWPORT_PADDING),
    );

    el.dataset.placement = placement;
    el.style.left = `${left}px`;
    el.style.top = `${clampedTop}px`;
    el.style.removeProperty("transform");
  };

  const removeGlobalListeners = function (): void {
    doc.removeEventListener("pointerdown", onPointerDown, true);
    doc.removeEventListener("keydown", onKeyDown, true);
    win?.removeEventListener("scroll", onScroll, true);
    win?.removeEventListener("resize", onResize);
  };

  const addGlobalListeners = function (): void {
    doc.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("keydown", onKeyDown, true);
    win?.addEventListener("scroll", onScroll, true);
    win?.addEventListener("resize", onResize);
  };

  const close = function (restore = true): void {
    if (!isOpen) return;

    isOpen = false;
    clearCloseTimer();
    removeGlobalListeners();

    const cell = activeCell;
    const hadFocus = el.contains(doc.activeElement);
    el.hidden = true;
    el.replaceChildren();
    el.removeAttribute("data-placement");
    if (cell) clearActiveAria(cell);

    activeCell = null;
    activeKey = "";

    if (restore && hadFocus && cell) restoreFocus(cell);
  };

  const openAt = function (cell: HTMLButtonElement): void {
    const day = readDay(cell);
    if (!day) return;

    const items = contentOf(day);
    if (items.length === 0) return;

    if (isOpen) close(false);

    activeCell = cell;
    activeKey = cell.dataset.date ?? "";
    isOpen = true;

    applyTheme();
    el.hidden = false;
    setActiveAria(cell);
    renderItems(day, items);
    position();
    addGlobalListeners();
    focusPopup();
  };

  const toggle = function (cell: HTMLButtonElement): void {
    if (isOpen && activeCell === cell) close();
    else openAt(cell);
  };

  function onPointerDown(event: Event): void {
    const target = event.target as Node | null;
    if (target && (el.contains(target) || activeCell?.contains(target))) return;
    close(false);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape" && event.key !== "Esc") return;
    event.preventDefault();
    close();
  }

  function onScroll(event: Event): void {
    const target = event.target as Node | null;
    if (target && el.contains(target)) return;
    close(false);
  }

  function onResize(): void {
    close(false);
  }

  function onClick(event: MouseEvent): void {
    const cell = closestCell(event.target);
    if (!cell || cell.disabled) return;

    if (popup.trigger === "focus") {
      if (!isOpen) openAt(cell);
      return;
    }

    if (popup.trigger === "hover") {
      if (event.detail === 0) toggle(cell);
      return;
    }

    if (popup.trigger === "auto") {
      if (canHover(doc) && event.detail !== 0) return;
      toggle(cell);
      return;
    }

    toggle(cell);
  }

  function onPointerOver(event: Event): void {
    if (!usesHover()) return;
    const cell = closestCell(event.target);
    if (!cell || cell.disabled) return;
    if (isOpen && activeCell === cell) return;
    clearCloseTimer();
    openAt(cell);
  }

  function onPointerOut(event: Event): void {
    if (!usesHover() || !isOpen) return;
    const cell = closestCell(event.target);
    if (!cell || cell !== activeCell) return;

    const related = (event as PointerEvent).relatedTarget as Node | null;
    if (related && (cell.contains(related) || el.contains(related))) return;
    scheduleClose();
  }

  function onFocusIn(event: FocusEvent): void {
    if (popup.trigger !== "focus" || suppressFocus) return;
    const cell = closestCell(event.target);
    if (!cell || cell.disabled) return;
    if (isOpen && activeCell === cell) return;
    openAt(cell);
  }

  function onFocusOut(event: FocusEvent): void {
    if (popup.trigger !== "focus" || !isOpen) return;
    const cell = closestCell(event.target);
    if (!cell || cell !== activeCell) return;

    const related = event.relatedTarget as Node | null;
    if (related && (el.contains(related) || cell.contains(related))) return;
    close(false);
  }

  function onPopupEnter(): void {
    clearCloseTimer();
  }

  function onPopupLeave(event: Event): void {
    if (!usesHover()) return;
    const related = (event as PointerEvent).relatedTarget as Node | null;
    if (related && activeCell?.contains(related)) return;
    scheduleClose();
  }

  function onPopupFocusOut(event: FocusEvent): void {
    if (popup.trigger !== "focus" || !isOpen) return;
    const related = event.relatedTarget as Node | null;
    if (related && (el.contains(related) || activeCell?.contains(related))) return;
    close(false);
  }

  root.addEventListener("click", onClick);
  root.addEventListener("pointerover", onPointerOver);
  root.addEventListener("pointerout", onPointerOut);
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  el.addEventListener("pointerenter", onPopupEnter);
  el.addEventListener("pointerleave", onPopupLeave);
  el.addEventListener("focusout", onPopupFocusOut);

  updateIndicators();

  return {
    close,
    destroy: () => {
      close(false);
      root.removeEventListener("click", onClick);
      root.removeEventListener("pointerover", onPointerOver);
      root.removeEventListener("pointerout", onPointerOut);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      el.removeEventListener("pointerenter", onPopupEnter);
      el.removeEventListener("pointerleave", onPopupLeave);
      el.removeEventListener("focusout", onPopupFocusOut);
      observer?.disconnect();
      observer = null;
      root.querySelectorAll<HTMLElement>(".cui__day").forEach((cell) => {
        cell.removeAttribute("aria-haspopup");
      });
      el.remove();
    },
    sync: () => {
      updateIndicators();
      if (!isOpen) return;

      if (root.hidden || !activeCell || !root.contains(activeCell)) {
        close(false);
        return;
      }
      if (activeCell.dataset.date !== activeKey || activeCell.disabled) {
        close(false);
        return;
      }

      const day = readDay(activeCell);
      if (!day || contentOf(day).length === 0) {
        close(false);
        return;
      }

      const week = activeCell.closest(".cui__week");
      if (!week || week.hasAttribute("hidden") || week.classList.contains("is-collapsed-hidden")) {
        close(false);
        return;
      }

      position();
    },
    isOpen: () => isOpen,
    refreshTheme: () => {
      applyTheme();
    },
  };
};
