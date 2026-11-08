import type { CalendarDay, HeaderRenderer } from "./calendar";
import type { CalendarLocale } from "./locale";

/** 头部左右切换按钮的入参 */
export interface NavOptions {
  /** 箭头方向：同一个向上箭头旋转 -90° / 90° */
  direction: "prev" | "next";
  /** 无障碍名称，例如「上个月」 */
  ariaLabel: string;
  onClick: () => void;
}

/** 头部左右切换按钮的句柄 */
export interface NavHandle {
  el: HTMLButtonElement;
  /** 设置禁用状态，边界月份时使用 */
  setDisabled(disabled: boolean): void;
  destroy(): void;
}

/** 头部的入参 */
export interface HeaderOptions {
  /** 初始展示的年 */
  year: number;
  /** 初始展示的月 */
  month: number;
  /** 界面文案 */
  locale: CalendarLocale;
  /** 标题两段文案；不传时用 locale.yearLabel / locale.monthName */
  label?: (year: number, month: number) => { year: string; month: string };
  /** 点击年份按钮：打开（或切换）年份选择层 */
  onYearClick?: () => void;
  /** 点击月份按钮：打开（或切换）月份选择层 */
  onMonthClick?: () => void;
  /** 上个月 */
  onPrev: () => void;
  /** 下个月 */
  onNext: () => void;
  /** 自定义渲染函数，提供时替换默认的 ‹ 年 月 › */
  renderer?: HeaderRenderer;
}

/** 头部的句柄 */
export interface HeaderHandle {
  el: HTMLElement;
  /** 换月时更新标题或重绘自定义头部 */
  update(year: number, month: number): void;
  /** 更新左右按钮的禁用状态 */
  setNavDisabled(prevDisabled: boolean, nextDisabled: boolean): void;
  /** 显示 / 隐藏左右按钮（月份层里不需要） */
  setNavVisible(visible: boolean): void;
  /** 同步标题按钮的展开状态（选择层打开时为 true） */
  setTitleExpanded(expanded: boolean): void;
  /** 把焦点还给标题按钮 */
  focusTitle(): void;
  destroy(): void;
}

/** 年月选择层的入参 */
export interface PickerOptions {
  /** 界面文案 */
  locale: CalendarLocale;
  /** 当前展示的年 */
  getYear(): number;
  /** 当前展示的月 */
  getMonth(): number;
  /** 某年某月是否落在可选范围内 */
  isMonthDisabled(year: number, month: number): boolean;
  /** 某年是否落在可选范围内 */
  isYearDisabled(year: number): boolean;
  /** 选中月份：只改月，选完立刻关闭 */
  onPickMonth(year: number, month: number): void;
  /** 选中年份：只改年，选完立刻关闭 */
  onPickYear(year: number): void;
}

/** 年月选择层的句柄 */
export interface PickerHandle {
  el: HTMLElement;
  /** 打开选择层：月份 4 列 × 3 行，年份 4 列 × 3 行 */
  open(mode: "month" | "year"): void;
  close(): void;
  isOpen(): boolean;
  /** 当前模式，关闭时为 null */
  mode(): "month" | "year" | null;
  /** 年份层整页翻 12 年 */
  movePage(direction: -1 | 1): void;
  /** 年份层还能不能继续往这个方向翻页 */
  canPage(direction: -1 | 1): boolean;
  /** 日历换月后同步月份层 */
  refresh(): void;
  destroy(): void;
}

/** 日期网格的入参 */
export interface GridOptions<TData = null> {
  /** 点中某一格时触发 */
  onSelect: (day: CalendarDay<TData>) => void;
}

/** 日期网格的句柄 */
export interface GridHandle<TData = null> {
  el: HTMLElement;
  /** 换月：更新格子文本与状态（节点复用，不重新创建） */
  render(days: CalendarDay<TData>[]): void;
  /** 只更新选中/今天等状态类，不动文本 */
  updateState(days: CalendarDay<TData>[]): void;
  /**
   * 折叠时只显示指定行；传 null 显示全部 6 行
   *
   * animate 为 false 时直接切换（翻月时使用），避免和位移动画同时触发布局。
   */
  setVisibleRows(rows: readonly number[] | null, animate?: boolean): void;
  destroy(): void;
}
