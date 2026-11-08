import { compareDay, dateKey, toDateOnly } from "./date";

/** 没有显式 min/max 时，搜索可选日期的兜底范围 */
const SEARCH_MIN = new Date(1900, 0, 1);
const SEARCH_MAX = new Date(2100, 11, 31);

const SEARCH_MIN_KEY = dateKey(SEARCH_MIN);
const SEARCH_MAX_KEY = dateKey(SEARCH_MAX);

/**
 * 在 [min, max] 内找离 desired 最近的可选日期
 *
 * 用两个游标同步向两侧走，每轮只 setDate 一天：
 * 比每轮都 addDays 少两次 Date 分配，长距离跳过禁用日期时差别明显。
 */
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

  const lower = minDate ?? SEARCH_MIN;
  const upper = maxDate ?? SEARCH_MAX;
  // 游标只在 [lower, upper] 内比较 key，避免每轮再算两次 Date
  const lowerKey = minDate === null ? SEARCH_MIN_KEY : minKey;
  const upperKey = maxDate === null ? SEARCH_MAX_KEY : maxKey;
  // 注意：dateKey 不是逐日递增的，偏移量必须用真实天数算
  const maxOffset = Math.max(0, compareDay(upper, lower));

  const forward = new Date(candidate);
  const backward = new Date(candidate);

  // 同时向两侧扩展，先遇到的可选日期就是距离最近的
  for (let offset = 1; offset <= maxOffset; offset++) {
    forward.setDate(forward.getDate() + 1);
    const forwardKey = dateKey(forward);
    if (forwardKey <= upperKey && !disabled.has(forwardKey)) return forward;

    backward.setDate(backward.getDate() - 1);
    const backwardKey = dateKey(backward);
    if (backwardKey >= lowerKey && !disabled.has(backwardKey)) return backward;
  }

  throw new RangeError("[calendar-ui] 当前日期约束下没有可选日期");
};
