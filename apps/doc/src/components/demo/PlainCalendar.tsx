import { createSignal, onSettled } from "solid-js";
import { createCalendar } from "@sanguogege/calendar-ui";
import type { WeekStartsOn } from "@sanguogege/calendar-ui";
import "@sanguogege/calendar-ui/style.css";
import "./demo.css";

export interface PlainCalendarProps {
  year: number;
  month: number;
  weekStartsOn?: WeekStartsOn;
  locale?: "zh-CN" | "en-US";
}

export default function PlainCalendar(props: PlainCalendarProps) {
  let host: HTMLDivElement | undefined;
  const [picked, setPicked] = createSignal("点一个日期看看");

  onSettled(() => {
    if (!host) return;

    const instance = createCalendar(host, {
      initialDate: new Date(props.year, props.month - 1, 1),
      weekStartsOn: props.weekStartsOn ?? 1,
      locale: props.locale ?? "zh-CN",
      onSelect: (day) => setPicked(`${day.year}-${day.month}-${day.day}`),
    });

    return () => instance.destroy();
  });

  return (
    <div class="demo-calendar">
      <div ref={(el) => (host = el)} />
      <p class="demo-result">选中：{picked()}</p>
    </div>
  );
}
