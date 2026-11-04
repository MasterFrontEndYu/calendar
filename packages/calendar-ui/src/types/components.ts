import type { CalendarDay, HeaderRenderer } from "./calendar";
import type { CalendarLocale } from "./locale";

/** 头部左右切换按钮的入参 */
export interface NavOptions {
  /** 按钮上显示的字符，例如 ‹ › */
  label: string;
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
  /** 自定义标题文本；不传时使用 locale.monthTitle */
  title?: (year: number, month: number) => string;
  /** 上个月 */
  onPrev: () => void;
  /** 下个月 */
  onNext: () => void;
  /** 自定义渲染函数，提供时替换默认的 ‹ 标题 › */
  renderer?: HeaderRenderer;
}

/** 头部的句柄 */
export interface HeaderHandle {
  el: HTMLElement;
  /** 换月时更新标题或重绘自定义头部 */
  update(year: number, month: number): void;
  /** 更新左右按钮的禁用状态 */
  setNavDisabled(prevDisabled: boolean, nextDisabled: boolean): void;
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
  /** 折叠时只显示指定行；传 null 显示全部 6 行 */
  setVisibleRows(rows: readonly number[] | null): void;
  destroy(): void;
}
