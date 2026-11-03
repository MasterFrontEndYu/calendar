import { createSignal, onSettled } from "solid-js";
import { createCalendar } from "@sanguogege/calendar-ui-lunar";
import "@sanguogege/calendar-ui/style.css";
import "./demo.css";

export interface LunarCalendarProps {
  variant?: "builtin" | "custom";
}

const CUSTOM_HOLIDAYS = {
  setFestival: { sFtv: { "0105": ["公司年会"] } },
  setRest: { 2026: { xiu: ["0105"], ban: ["0106"] } },
};

export default function LunarCalendar(props: LunarCalendarProps) {
  let host: HTMLDivElement | undefined;
  const [picked, setPicked] = createSignal("点一个日期看看");

  onSettled(() => {
    if (!host) return;

    const custom = props.variant === "custom";
    const instance = createCalendar(host, {
      initialDate: custom ? new Date(2026, 0, 1) : new Date(2026, 9, 1),
      holidays: custom ? CUSTOM_HOLIDAYS : undefined,
      onSelect: (day) => {
        console.log("day", day);
        const lunar = day.data ? `${day.data.lMonthCn}${day.data.lDayCn}` : "";
        const state = day.data?.ban ? "班" : day.data?.xiu ? "休" : "";
        setPicked(`${day.year}-${day.month}-${day.day} ${lunar} ${state}`);
      },
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
