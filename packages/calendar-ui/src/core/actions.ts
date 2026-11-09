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
  /** 是否强制重绘。 */
  forceRender: boolean;
  /** 已有点击的格子对象。 */
  day?: CalendarDay<TData>;
  /** 格子下标。 */
  index?: number;
}

/** 提交范围模式的点选结果。 */
const commitRange = function <TData = null>(
  ctx: ActionContext<TData>,
  target: Date,
  resolveDay: DayResolver<TData>,
): void {
  clickRange(ctx.state, target);
  ctx.render(true);
  ctx.config.onRangeChange?.(copyRange(ctx.state));

  // 回调后再取格子，保证对象反映最新状态
  const day = resolveDay();
  if (day) ctx.config.onSelect?.(withRangeFields(day, ctx.state));
};

/** 提交单选模式的点选结果。 */
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

/** 翻到指定年月。 */
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

  // 只有配置了 slide 才需要读取 CSS 动画参数
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

/** 处理日期格点选。 */
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

/** 把视图移到目标日期所在月份。 */
const seekMonth = function <TData = null>(ctx: ActionContext<TData>, target: Date): void {
  const first = monthIndexOf(ctx.state.year, ctx.state.month);
  const targetIndex = monthIndexOf(target.getFullYear(), target.getMonth() + 1);
  if (targetIndex >= first && targetIndex <= first + ctx.monthCount - 1) return;

  const next = clampStartMonth(ctx.bounds, target.getFullYear(), target.getMonth() + 1);
  ctx.state.year = next.year;
  ctx.state.month = next.month;
};

/** 选中指定日期。 */
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

/** 设置选中范围。 */
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

/** 清空选中范围。 */
export const clearRangeValue = function <TData = null>(ctx: ActionContext<TData>): void {
  clearRange(ctx.state);
  ctx.render(true);
  ctx.config.onRangeChange?.(copyRange(ctx.state));
};

/** 设置可选日期范围。 */
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
