import { createSignal, onSettled } from "solid-js";
import { createCalendarUI } from "@sanguogege/calendar-ui";
import "@sanguogege/calendar-ui/style.css";
import "./demo.css";

export interface MonthTransitionCalendarProps {
  duration?: number;
  easing?: string;
  label?: string;
}

export default function MonthTransitionCalendar(props: MonthTransitionCalendarProps) {
  let host: HTMLDivElement | undefined;
  const [month, setMonth] = createSignal("2026-10");

  onSettled(() => {
    if (!host) return;

    const instance = createCalendarUI(host, {
      initialDate: "2026-10-15",
      monthTransition: "slide",
      monthTransitionDuration: props.duration ?? 220,
      monthTransitionEasing: props.easing ?? "ease",
      onMonthChange: (year, nextMonth) => {
        setMonth(`${year}-${String(nextMonth).padStart(2, "0")}`);
      },
    });

    return () => instance.destroy();
  });

  return (
    <div class="demo-calendar">
      <div ref={(el) => (host = el)} />
      <p class="demo-result">
        当前：{month()}
        {props.label ? ` · ${props.label}` : ""}，点击日历左右箭头翻月
      </p>
    </div>
  );
}
