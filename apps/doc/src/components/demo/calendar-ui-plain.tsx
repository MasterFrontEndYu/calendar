import { createSignal, onSettled } from "solid-js";
import { createCalendarUI } from "@sanguo-dev/calendar-ui";
import type { CalendarSize, CalendarTheme, WeekStartsOn } from "@sanguo-dev/calendar-ui";
import "@sanguo-dev/calendar-ui/style.css";
import "./demo.css";

export interface CalendarUIPlainProps {
  year: number;
  month: number;
  weekStartsOn?: WeekStartsOn;
  locale?: "zh-CN" | "en-US";
  theme?: CalendarTheme;
  size?: CalendarSize;
}

export default function CalendarUIPlain(props: CalendarUIPlainProps) {
  let host: HTMLDivElement | undefined;
  const [picked, setPicked] = createSignal("点一个日期看看");

  onSettled(() => {
    if (!host) return;

    const instance = createCalendarUI(host, {
      initialDate: `${props.year}-${props.month}-01`,
      weekStartsOn: props.weekStartsOn ?? 1,
      locale: props.locale ?? "zh-CN",
      theme: props.theme,
      size: props.size,
      onSelect: (day) => setPicked(`${day.year}-${day.month}-${day.day}`),
    });

    return () => instance.destroy();
  });

  return (
    <div class={`demo-calendar${props.size === "fill" ? " demo-calendar--fill" : ""}`}>
      <div ref={(el) => (host = el)} />
      <p class="demo-result">选中：{picked()}</p>
    </div>
  );
}
