import type { CalendarAdapter, WeekStartsOn } from "./calendar";
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
  /** 当前界面语言 */
  locale: CalendarLocale;
  /** 日历适配器；不传时就是纯公历 */
  adapter?: CalendarAdapter<TData>;
}
