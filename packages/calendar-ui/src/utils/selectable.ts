import { compareDay, dateKey, toDateOnly } from "./date";

/** 没有显式 min/max 时，搜索可选日期的兜底范围 */
const SEARCH_MIN = new Date(1900, 0, 1);
const SEARCH_MAX = new Date(2100, 11, 31);

const SEARCH_MIN_KEY = dateKey(SEARCH_MIN);
const SEARCH_MAX_KEY = dateKey(SEARCH_MAX);

/** 查找离目标日期最近的可选日期。 */
export const findSelectable = function (
  desired: Date,
  minDate: Date | null,
  maxDate: Date | null,
  disabled: ReadonlySet<number>,
): Date {
  const minKey = minDate === null ? Number.NEGATIVE_INFINITY : dateKey(minDate);
  const maxKey = maxDate === null ? Number.POSITIVE_INFINITY : dateKey(maxDate);

  let candidate = toDateOnly(desired);
  if (minDate !== null && compareDay(candidate, minDate) < 0) candidate = minDate;
  if (maxDate !== null && compareDay(candidate, maxDate) > 0) candidate = maxDate;

  const candidateKey = dateKey(candidate);
  if (candidateKey >= minKey && candidateKey <= maxKey && !disabled.has(candidateKey)) {
    return candidate;
  }

  const lowerKey = minDate === null ? SEARCH_MIN_KEY : minKey;
  const upperKey = maxDate === null ? SEARCH_MAX_KEY : maxKey;

  const forward = new Date(candidate);
  const backward = new Date(candidate);
  let forwardKey = dateKey(forward);
  let backwardKey = dateKey(backward);

  // 同时向两侧扩展，先遇到的可选日期就是距离最近的；
  // 不预计算偏移上界，避免 desired 落在兜底范围外时提前停止。
  while (forwardKey <= upperKey || backwardKey >= lowerKey) {
    if (forwardKey <= upperKey) {
      forward.setDate(forward.getDate() + 1);
      forwardKey = dateKey(forward);
      if (forwardKey <= upperKey && !disabled.has(forwardKey)) return forward;
    }

    if (backwardKey >= lowerKey) {
      backward.setDate(backward.getDate() - 1);
      backwardKey = dateKey(backward);
      if (backwardKey >= lowerKey && !disabled.has(backwardKey)) return backward;
    }
  }

  throw new RangeError("[calendar-ui] 当前日期约束下没有可选日期");
};
