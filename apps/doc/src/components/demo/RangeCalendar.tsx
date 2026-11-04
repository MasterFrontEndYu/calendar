import { createSignal, onSettled } from "solid-js";
import { createCalendarUI } from "@sanguogege/calendar-ui";
import type { CalendarRange } from "@sanguogege/calendar-ui";
import "@sanguogege/calendar-ui/style.css";
import "./demo.css";

export interface RangeCalendarProps {
  /** 1 = 单视图，2 = 相邻两个月 */
  months?: 1 | 2;
}

const pad = function (value: number): string {
  return String(value).padStart(2, "0");
};

const formatDate = function (date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatRange = function (range: CalendarRange): string {
  if (range.start === null) return "还没有选择范围";
  if (range.end === null) return `起点：${formatDate(range.start)}，再点一个终点`;
  return `${formatDate(range.start)} → ${formatDate(range.end)}`;
};

export default function RangeCalendar(props: RangeCalendarProps) {
  let host: HTMLDivElement | undefined;
  const [range, setRange] = createSignal("还没有选择范围");

  onSettled(() => {
    if (!host) return;

    const instance = createCalendarUI(host, {
      mode: "range",
      months: props.months ?? 1,
      initialDate: "2026-10-15",
      onRangeChange: (next) => setRange(formatRange(next)),
    });

    return () => instance.destroy();
  });

  return (
    <div class={`demo-calendar${props.months === 2 ? " demo-calendar--range" : ""}`}>
      <div ref={(el) => (host = el)} />
      <p class="demo-result">{range()}</p>
    </div>
  );
}
