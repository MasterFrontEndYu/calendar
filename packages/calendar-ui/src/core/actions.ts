import type { ActionContext, CalendarDateInput, CalendarDay } from "../types";
import {
  compareDay,
  monthIndexOf,
  normalizeMonth,
  readDate,
  sameDay,
  toDateOnly,
} from "../utils/date";
import {
  normalizeEasing,
  prefersReducedMotion,
  readCssDuration,
  readCssEasing,
} from "../utils/motion";
import { findSelectable } from "../utils/selectable";
import { assertBounds, clampStartMonth, isDisabled, setBounds } from "./bounds";
import { assignRange, clearRange, clickRange, copyRange, withRangeFields } from "./state";

type DayResolver<TData> = () => CalendarDay<TData> | undefined;

interface CommitSingleOptions<TData> {
  /** true 时无论是否折叠都重绘整块日历（select(date) 要同步标题和月份） */
  forceRender: boolean;
  /** 已经有格子对象时直接按 index 取更新后的版本，省一次 find */
  day?: CalendarDay<TData>;
  index?: number;
}

/** 范围模式点选后提交：更新状态、重绘、通知范围变化，再回调本次格子的最新对象 */
const commitRange = function <TData = null>(
  ctx: ActionContext<TData>,
  target: Date,
  resolveDay: DayResolver<TData>,
): void {
  clickRange(ctx.state, target);
  ctx.render(true);
  ctx.config.onRangeChange?.(copyRange(ctx.state));

  // 在回调之后再取格子，和原来「先通知范围、再构造回调对象」的时序一致
  const day = resolveDay();
  if (day) ctx.config.onSelect?.(withRangeFields(day, ctx.state));
};

/** 单选模式点选后提交；updateState 只刷新状态类，forceRender 才重建格子 */
const commitSingle = function <TData = null>(
  ctx: ActionContext<TData>,
  target: Date,
  options: CommitSingleOptions<TData>,
): void {
  ctx.state.selected = toDateOnly(target);

  // 点选不换月，只需要刷新状态类；折叠状态下要重绘整块才能切到新行
  const collapsed = ctx.collapse.isCollapsed();
  const shouldRender = options.forceRender || collapsed;
  const dayLists = shouldRender ? ctx.render(true) : null;
  const days = dayLists?.[0] ?? ctx.currentDays();
  if (!shouldRender) ctx.panels[0]?.grid.updateState(days);

  // 回调用更新后的对象，保证 isSelected 是本次点击的结果
  const day =
    options.day !== undefined && options.index !== undefined
      ? (days[options.index] ?? options.day)
      : days.find((item) => sameDay(item.date, target));
  if (day) ctx.config.onSelect?.(day);
};

/**
 * 翻到某年某月
 *
 * 会先把目标夹进可选范围，再按方向决定滑动方向；
 * 动画时长和缓动优先读根节点上的 CSS 变量，没有声明时用 JS 选项。
 */
export const goTo = function <TData = null>(
  ctx: ActionContext<TData>,
  year: number,
  month: number,
): void {
  const normalized = normalizeMonth(year, month);
  const next = clampStartMonth(ctx.bounds, normalized.year, normalized.month);

  const currentIndex = monthIndexOf(ctx.state.year, ctx.state.month);
  const nextIndex = monthIndexOf(next.year, next.month);
  if (nextIndex === currentIndex) return;

  const direction = nextIndex > currentIndex ? 1 : -1;
  const { monthTransition, monthDuration, monthEasing } = ctx.config.animation;

  // 默认不配置 slide 时跳过 getComputedStyle，省掉一次强制样式读取
  let duration = 0;
  let easing = monthEasing;
  if (monthTransition === "slide") {
    const rootStyle = getComputedStyle(ctx.root);
    duration = readCssDuration(rootStyle, "--cui-month-duration", monthDuration);
    easing = normalizeEasing(readCssEasing(rootStyle, "--cui-month-easing", monthEasing));
  }
  const shouldAnimate = monthTransition === "slide" && duration > 0 && !prefersReducedMotion();

  // 先把上一段停在终点：快速连点时不会让旧克隆和新动画同时存在
  ctx.slide.stop();

  const layers = shouldAnimate ? ctx.slide.capture() : [];
  ctx.state.year = next.year;
  ctx.state.month = next.month;

  // 折叠行瞬时切换：行高过渡和位移动画同时跑会让每一帧都触发布局
  ctx.render(false);
  ctx.slide.sync(layers);

  if (shouldAnimate) ctx.slide.start(direction, layers, duration, easing);

  ctx.config.onMonthChange?.(ctx.state.year, ctx.state.month);
};

/** 处理格子点选：补位格只改选中，不切换展示月份 */
export const selectDay = function <TData = null>(
  ctx: ActionContext<TData>,
  day: CalendarDay<TData>,
  index: number,
): void {
  if (day.isDisabled) return;

  if (ctx.config.mode === "range") {
    commitRange(ctx, day.date, () => day);
    return;
  }

  commitSingle(ctx, day.date, { forceRender: false, day, index });
};

/** 目标日期不在当前展示范围内时，把视图移到目标月份 */
const seekMonth = function <TData = null>(ctx: ActionContext<TData>, target: Date): void {
  const first = monthIndexOf(ctx.state.year, ctx.state.month);
  const targetIndex = monthIndexOf(target.getFullYear(), target.getMonth() + 1);
  if (targetIndex >= first && targetIndex <= first + ctx.monthCount - 1) return;

  const next = clampStartMonth(ctx.bounds, target.getFullYear(), target.getMonth() + 1);
  ctx.state.year = next.year;
  ctx.state.month = next.month;
};

/** 外部 select(date)：单选直接切换；范围模式走和点击相同的赋值规则 */
export const selectDate = function <TData = null>(
  ctx: ActionContext<TData>,
  input: CalendarDateInput,
): void {
  const target = readDate(input, "select(date)");
  if (target === null || isDisabled(ctx.bounds, target)) return;

  seekMonth(ctx, target);

  if (ctx.config.mode === "range") {
    const offset =
      monthIndexOf(target.getFullYear(), target.getMonth() + 1) -
      monthIndexOf(ctx.state.year, ctx.state.month);
    commitRange(ctx, target, () =>
      ctx.currentDays(offset).find((item) => sameDay(item.date, target)),
    );
    return;
  }

  commitSingle(ctx, target, { forceRender: true });
};

/** 外部 setRange(start, end)：禁用日期直接忽略，反向输入自动交换 */
export const setRangeValue = function <TData = null>(
  ctx: ActionContext<TData>,
  start: CalendarDateInput | null,
  end?: CalendarDateInput | null,
): void {
  const nextStart = readDate(start, "setRange(start)");
  const nextEnd = end === undefined ? null : readDate(end, "setRange(end)");

  if (
    nextStart !== null &&
    (isDisabled(ctx.bounds, nextStart) || (nextEnd !== null && isDisabled(ctx.bounds, nextEnd)))
  ) {
    return;
  }

  assignRange(ctx.state, nextStart, nextEnd);
  ctx.render(true);
  ctx.config.onRangeChange?.(copyRange(ctx.state));
};

export const clearRangeValue = function <TData = null>(ctx: ActionContext<TData>): void {
  clearRange(ctx.state);
  ctx.render(true);
  ctx.config.onRangeChange?.(copyRange(ctx.state));
};

/**
 * setMinDate / setMaxDate：校验、找最近的可用日期、整体替换后再重绘
 *
 * 范围模式以 rangeStart 为锚点：起点夹回新范围；终点只有仍然可选且不早于
 * 新起点时才保留，否则清空让用户重新选择，避免出现反向或越界范围。
 */
export const applyBounds = function <TData = null>(
  ctx: ActionContext<TData>,
  nextMin: Date | null,
  nextMax: Date | null,
): void {
  assertBounds(nextMin, nextMax);

  const { state, bounds } = ctx;
  const isRange = ctx.config.mode === "range";
  const anchor = isRange ? (state.rangeStart ?? state.selected) : state.selected;

  // 先确认还有可选日期，再整体替换，失败时不破坏现有状态
  const nextSelected = findSelectable(anchor, nextMin, nextMax, bounds.disabled);

  let nextStart: Date | null = null;
  let nextEnd: Date | null = null;
  if (isRange) {
    // rangeStart 非空时它本来就是 anchor，nextSelected 就是夹取后的起点
    if (state.rangeStart !== null) nextStart = nextSelected;
    if (state.rangeEnd !== null && nextStart !== null) {
      const resolvedEnd = findSelectable(state.rangeEnd, nextMin, nextMax, bounds.disabled);
      if (sameDay(resolvedEnd, state.rangeEnd) && compareDay(resolvedEnd, nextStart) >= 0) {
        nextEnd = state.rangeEnd;
      }
    }
  }

  setBounds(bounds, nextMin, nextMax);

  const focus = isRange && nextStart !== null ? nextStart : nextSelected;
  state.selected = focus;
  if (isRange) {
    state.rangeStart = nextStart;
    state.rangeEnd = nextEnd;
  }

  const first = clampStartMonth(bounds, focus.getFullYear(), focus.getMonth() + 1);
  state.year = first.year;
  state.month = first.month;

  ctx.render(true);
};
