import type { CalendarAdapter, SubtitleRenderer, WeekStartsOn } from "./calendar";
import type { CalendarLocale } from "./locale";

/** buildDays 的入参 */
export interface BuildDaysOptions<TData = null> {
  /** 公历年 */
  year: number;
  /** 公历月，1-12 */
  month: number;
  /** 一周从哪天开始 */
  weekStartsOn: WeekStartsOn;
  /** 今天 */
  today: Date;
  /** 当前选中的日期，未选中传 null */
  selected: Date | null;
  /** 范围起点 */
  rangeStart?: Date | null;
  /** 范围终点 */
  rangeEnd?: Date | null;
  /** 当前界面语言 */
  locale: CalendarLocale;
  /** 判断某个日期是否不可选；不传表示全部都可用 */
  isDisabled?: (date: Date) => boolean;
  /** 自定义副标题，优先于 adapter */
  subtitle?: SubtitleRenderer;
  /** 日历适配器；不传时就是纯公历 */
  adapter?: CalendarAdapter<TData>;
}
