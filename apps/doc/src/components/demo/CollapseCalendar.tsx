import { createSignal, onSettled } from "solid-js";
import { createCalendarUI } from "@sanguo-dev/calendar-ui";
import type { CalendarRange } from "@sanguo-dev/calendar-ui";
import "@sanguo-dev/calendar-ui/style.css";
import "./demo.css";

export interface CollapseCalendarProps {
  mode?: "single" | "range";
}

const pad = function (value: number): string {
  return String(value).padStart(2, "0");
};

const formatRange = function (range: CalendarRange): string {
  if (range.start === null) return "先选起点，再选终点";
  const start = `${range.start.getFullYear()}-${pad(range.start.getMonth() + 1)}-${pad(range.start.getDate())}`;
  if (range.end === null) return `起点：${start}，再选终点`;
  const end = `${range.end.getFullYear()}-${pad(range.end.getMonth() + 1)}-${pad(range.end.getDate())}`;
  return `${start} → ${end}`;
};

export default function CollapseCalendar(props: CollapseCalendarProps) {
  let host: HTMLDivElement | undefined;
  const [range, setRange] = createSignal("先选起点，再选终点");

  onSettled(() => {
    if (!host) return;

    const instance = createCalendarUI(host, {
      mode: props.mode ?? "single",
      initialDate: "2026-10-15",
      animation: { collapse: {} },
      onRangeChange: (next) => setRange(formatRange(next)),
    });

    return () => instance.destroy();
  });

  return (
    <div class="demo-calendar">
      <div ref={(el) => (host = el)} />
      {props.mode === "range" ? <p class="demo-result">{range()}</p> : null}
      <p class="demo-result">点击底部箭头折叠，再点一次展开。</p>
    </div>
  );
}
