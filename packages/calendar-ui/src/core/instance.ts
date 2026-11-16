import type {
  CalendarCloseOptions,
  CalendarDateInput,
  CalendarInstance,
  CalendarRuntime,
  CalendarTheme,
  YearMonth,
} from "../types";
import { readDate } from "../utils/date";
import { applyBounds, clearRangeValue, selectDate, setRangeValue } from "./actions";
import { copyRange } from "./state";

/** 判断是否是元素节点：跨文档创建时也不依赖全局构造函数 */
const isElement = function (value: unknown): value is HTMLElement {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as Node).nodeType === 1 &&
    typeof (value as HTMLElement).focus === "function"
  );
};

class CalendarInstanceImpl<TData = null> implements CalendarInstance {
  readonly el: HTMLElement;
  private readonly runtime: CalendarRuntime<TData>;
  private readonly doc: Document;
  /** 最近一次由隐藏变为可见时的焦点元素，关闭时还回去 */
  private lastFocus: HTMLElement | null = null;

  constructor(runtime: CalendarRuntime<TData>) {
    this.runtime = runtime;
    this.el = runtime.root;
    this.doc = runtime.root.ownerDocument;
  }

  setMonth(year: number, month: number): void {
    this.runtime.goTo(year, month);
  }

  getMonth(): YearMonth {
    return { year: this.runtime.state.year, month: this.runtime.state.month };
  }

  prevMonth(): void {
    this.runtime.goTo(this.runtime.state.year, this.runtime.state.month - 1);
  }

  nextMonth(): void {
    this.runtime.goTo(this.runtime.state.year, this.runtime.state.month + 1);
  }

  select(date: CalendarDateInput): void {
    selectDate(this.runtime, date);
  }

  getSelected(): Date | null {
    const { config, state } = this.runtime;
    if (config.mode === "range") {
      return state.rangeStart === null ? null : new Date(state.rangeStart);
    }
    return new Date(state.selected);
  }

  getRange(): ReturnType<typeof copyRange> {
    return copyRange(this.runtime.state);
  }

  setRange(start: CalendarDateInput | null, end?: CalendarDateInput | null): void {
    setRangeValue(this.runtime, start, end);
  }

  clearRange(): void {
    clearRangeValue(this.runtime);
  }

  open(): void {
    const { root } = this.runtime;
    if (root.hidden) {
      const active = this.doc.activeElement;
      this.lastFocus =
        isElement(active) && active !== this.doc.body && !root.contains(active) ? active : null;
    }
    root.hidden = false;
  }

  close(options: CalendarCloseOptions = {}): void {
    const { root, pickerLayer, popup } = this.runtime;
    const { restoreFocus } = options;
    const hadFocus = root.contains(this.doc.activeElement);

    // 年月选择层自己带外部点击 / Esc 监听和 inert，必须走它自己的 close
    pickerLayer?.close();
    // 让 popup 先把焦点还给日期格，再统一还给触发元素
    popup?.close(true);

    // 关选择层会把焦点移到头部标题，这里一并算作「焦点原本就在日历里」
    const focusedInside = root.contains(this.doc.activeElement);
    root.hidden = true;

    const target = restoreFocus === false ? null : (restoreFocus ?? this.lastFocus);
    this.lastFocus = null;

    const shouldRestore =
      restoreFocus !== false && (restoreFocus !== undefined || hadFocus || focusedInside);
    if (target !== null && shouldRestore && target.isConnected) {
      target.focus({ preventScroll: true });
    }
  }

  toggle(): void {
    if (this.runtime.root.hidden) this.open();
    else this.close();
  }

  isOpen(): boolean {
    return !this.runtime.root.hidden;
  }

  getMinDate(): Date | null {
    const minDate = this.runtime.bounds.minDate;
    return minDate === null ? null : new Date(minDate);
  }

  setMinDate(date: CalendarDateInput | null): void {
    applyBounds(this.runtime, readDate(date, "setMinDate(date)"), this.runtime.bounds.maxDate);
  }

  getMaxDate(): Date | null {
    const maxDate = this.runtime.bounds.maxDate;
    return maxDate === null ? null : new Date(maxDate);
  }

  setMaxDate(date: CalendarDateInput | null): void {
    applyBounds(this.runtime, this.runtime.bounds.minDate, readDate(date, "setMaxDate(date)"));
  }

  getTheme(): CalendarTheme {
    return this.runtime.config.theme;
  }

  setTheme(theme: CalendarTheme): void {
    this.runtime.config.theme = theme;
    this.runtime.root.dataset.theme = theme;
    this.runtime.popup?.refreshTheme();
  }

  destroy(): void {
    const { root, popup, slide, pickerLayer, picker, collapse, header, panels } = this.runtime;
    popup?.destroy();
    slide.stop();
    pickerLayer?.destroy();
    picker?.destroy();
    collapse.destroy();
    header?.destroy();
    panels.forEach((panel) => panel.grid.destroy());
    root.remove();
    this.lastFocus = null;
  }
}

/** 创建对外的日历实例 API。 */
export const createInstance = function <TData = null>(
  runtime: CalendarRuntime<TData>,
): CalendarInstance {
  return new CalendarInstanceImpl(runtime);
};
