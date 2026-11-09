import { createHeader } from "./components/header";
import { createPicker } from "./components/picker";
import { goTo, selectDay } from "./core/actions";
import {
  clampStartMonth,
  createBounds,
  isMonthOutOfRange,
  isYearOutOfRange,
  resolveMonthCount,
} from "./core/bounds";
import { createCollapse } from "./core/collapse";
import { createInstance } from "./core/instance";
import { createHeaderLabel } from "./core/labels";
import { createPanels, createRoot, mountCalendar } from "./core/layout";
import { createMonthSlide } from "./core/month-slide";
import { resolveOptions } from "./core/options";
import { createPickerLayer } from "./core/picker-layer";
import { createDayBuilder, createRenderer, updateNav } from "./core/render";
import { createState } from "./core/state";
import type { ActionContext, CalendarDay, CalendarInstance, CalendarOptions } from "./types";

/**
 * 在容器里创建一个日历
 *
 * 只依赖 DOM，不依赖任何框架；重复调用 createCalendarUI 会各自独立。
 * 不传 adapter 时就是纯公历，适配器负责提供副标题、标记和透传数据。
 *
 * 这里只做装配：校验 / 状态 / 边界 / 动画 / 折叠 / 选择层 / 渲染 / 实例 API
 * 分别放在 core 下的独立模块里。
 */
export function createCalendarUI<TData = null>(
  container: HTMLElement,
  options: CalendarOptions<TData> = {},
): CalendarInstance {
  const { config, minDate, maxDate, disabledDates, initial } = resolveOptions(options);
  const state = createState(initial);

  const monthCount = resolveMonthCount(config.mode, config.requestedMonths, minDate, maxDate);
  const bounds = createBounds(minDate, maxDate, disabledDates, monthCount);

  // 双视图如果右边界不足两个月，起始月要先往前收一档
  const first = clampStartMonth(bounds, state.year, state.month);
  state.year = first.year;
  state.month = first.month;

  const root = createRoot(config, monthCount);
  const panels = createPanels(config, monthCount, handleSelect);
  const slide = createMonthSlide(panels);
  const collapse = createCollapse({
    config,
    state,
    panels,
    monthCount,
    onApply: () => render(),
  });
  const currentDays = createDayBuilder(config, bounds, state);

  const picker = createPicker({
    locale: config.locale,
    getYear: () => state.year,
    getMonth: () => state.month,
    isMonthDisabled: (year, month) => isMonthOutOfRange(bounds, year, month),
    isYearDisabled: (year) => isYearOutOfRange(bounds, year),
    onPickMonth: (year, month) => {
      pickerLayer.close();
      goToMonth(year, month);
    },
    onPickYear: (year) => {
      pickerLayer.close();
      goToMonth(year, state.month);
    },
  });

  const header = createHeader({
    year: state.year,
    month: state.month,
    locale: config.locale,
    label: createHeaderLabel(config.locale, monthCount),
    onYearClick: () => pickerLayer.toggle("year"),
    onMonthClick: () => pickerLayer.toggle("month"),
    onPrev: () => pickerLayer.step(-1),
    onNext: () => pickerLayer.step(1),
    renderer: config.renderHeader,
  });
  header.el.hidden = !config.showHeader;
  header.setTitleExpanded(false);

  const panelEls = mountCalendar({
    root,
    headerEl: header.el,
    pickerEl: picker.el,
    collapseButton: collapse.button,
    panels,
    monthCount,
  });

  const render = createRenderer({
    root,
    config,
    state,
    bounds,
    header,
    panels,
    panelEls,
    collapse,
    currentDays,
  });

  const actionContext: ActionContext<TData> = {
    config,
    state,
    bounds,
    monthCount,
    root,
    panels,
    collapse,
    slide,
    render,
    currentDays,
  };

  const pickerLayer = createPickerLayer({
    root,
    header,
    picker,
    getMonth: () => ({ year: state.year, month: state.month }),
    updateNav: () => updateNav(header, bounds, state),
    onGoTo: (year, month) => goToMonth(year, month),
  });

  /** 主函数只保留两个动作入口：翻月和点选 */
  function goToMonth(year: number, month: number): void {
    goTo(actionContext, year, month);
  }

  function handleSelect(day: CalendarDay<TData>, index: number): void {
    selectDay(actionContext, day, index);
  }

  root.classList.add("cui--no-animation");
  container.appendChild(root);
  // 首次渲染不播折叠动画
  render(false);
  root.classList.remove("cui--no-animation");

  return createInstance({
    ...actionContext,
    header,
    picker,
    pickerLayer,
    goTo: goToMonth,
  });
}
