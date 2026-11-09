import type { CalendarConfig, CalendarOptions, ResolvedCalendarOptions } from "../types";
import { resolveLocale } from "../locales";
import { dateKey, parseDateInput, readDate } from "../utils/date";
import { findSelectable } from "../utils/selectable";
import { assertBounds } from "./bounds";

const readDuration = function (value: number | undefined, fallback: number, path: string): number {
  const duration = value ?? fallback;
  if (!Number.isFinite(duration) || duration < 0) {
    throw new TypeError(`[calendar-ui] ${path} 必须是大于等于 0 的数字`);
  }
  return duration;
};

const readEasing = function (value: string | undefined, path: string): string {
  const easing = value ?? "ease";
  if (typeof easing !== "string" || easing.trim() === "") {
    throw new TypeError(`[calendar-ui] ${path} 必须是非空字符串`);
  }
  return easing;
};

/** 校验并补全创建配置。 */
export const resolveOptions = function <TData = null>(
  options: CalendarOptions<TData>,
): ResolvedCalendarOptions<TData> {
  const locale = resolveLocale(options.locale);
  const today = new Date();

  const size = options.size ?? "normal";
  if (size !== "min" && size !== "normal" && size !== "fill") {
    throw new TypeError("[calendar-ui] size 必须是 min、normal 或 fill");
  }

  // 动画默认全关：传了 slide 才滑，传了 collapse 才有折叠箭头
  const animation = options.animation;
  if (animation !== undefined && (animation === null || typeof animation !== "object")) {
    throw new TypeError("[calendar-ui] animation 必须是对象");
  }
  const slide = animation?.slide ?? null;
  const collapse = animation?.collapse ?? null;
  const monthDuration = readDuration(slide?.duration, 220, "animation.slide.duration");
  const monthEasing = readEasing(slide?.easing, "animation.slide.easing");
  const collapseDuration = readDuration(collapse?.duration, 200, "animation.collapse.duration");
  const collapseEasing = readEasing(collapse?.easing, "animation.collapse.easing");

  const mode = options.mode ?? "single";
  if (mode !== "single" && mode !== "range") {
    throw new TypeError("[calendar-ui] mode 必须是 single 或 range");
  }

  const requestedMonths = options.months ?? 1;
  if (requestedMonths !== 1 && requestedMonths !== 2) {
    throw new RangeError("[calendar-ui] months 只能是 1 或 2");
  }

  const minDate = readDate(options.minDate, "minDate");
  const maxDate = readDate(options.maxDate, "maxDate");
  assertBounds(minDate, maxDate);

  const disabledDates = options.disabledDates ?? [];
  if (!Array.isArray(disabledDates)) {
    throw new TypeError("[calendar-ui] disabledDates 必须是 Date 数组");
  }
  const disabled = new Set<number>();
  disabledDates.forEach((value, index) => {
    const date = readDate(value, `disabledDates[${index}]`);
    if (date !== null) disabled.add(dateKey(date));
  });

  const initial = findSelectable(
    parseDateInput(options.initialDate ?? today, "initialDate"),
    minDate,
    maxDate,
    disabled,
  );

  const config: CalendarConfig<TData> = {
    weekStartsOn: options.weekStartsOn ?? 1,
    locale,
    adapter: options.adapter,
    theme: options.theme ?? "auto",
    size,
    today,
    mode,
    requestedMonths,
    subtitle: options.subtitle,
    showHeader: options.header !== false,
    renderHeader: options.renderHeader,
    onSelect: options.onSelect,
    onMonthChange: options.onMonthChange,
    onRangeChange: options.onRangeChange,
    animation: {
      monthTransition: slide === null ? "none" : "slide",
      monthDuration,
      monthEasing,
      collapsible: collapse !== null,
      collapseDuration,
      collapseEasing,
      defaultCollapsed: collapse?.defaultCollapsed === true,
    },
  };

  return { config, minDate, maxDate, disabledDates: disabled, initial };
};
