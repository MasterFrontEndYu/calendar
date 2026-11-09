import { compareDay, sameDay } from "./date";

/** 一个日期在范围里的四个状态 */
export interface RangeFields {
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isInRange: boolean;
  isSelected: boolean;
}

/**
 * 计算日期在范围里的状态
 *
 * buildDays 生成 42 个格子、withRangeFields 生成回调对象都走这里，
 * 避免两套同样的 sameDay / compareDay 判断。
 * 传入 out 时复用同一个对象，避免 42 个格子各分配一次。
 */
export const rangeFields = function (
  date: Date,
  start: Date | null,
  end: Date | null,
  out?: RangeFields,
): RangeFields {
  const fields = out ?? {
    isRangeStart: false,
    isRangeEnd: false,
    isInRange: false,
    isSelected: false,
  };
  fields.isRangeStart = start !== null && sameDay(date, start);
  fields.isRangeEnd = end !== null && sameDay(date, end);
  fields.isInRange =
    start !== null && end !== null && compareDay(date, start) >= 0 && compareDay(date, end) <= 0;
  fields.isSelected = fields.isRangeStart || fields.isRangeEnd;

  return fields;
};
