import { createSignal, onSettled } from "solid-js";
import { createCalendarUI } from "@sanguo-dev/calendar-ui";
import type { CalendarAdapter } from "@sanguo-dev/calendar-ui";
import "@sanguo-dev/calendar-ui/style.css";
import { getCompanyRest } from "./company-holidays";
import type { CompanyRest } from "./company-holidays";
import "./demo.css";

const adapter: CalendarAdapter<CompanyRest> = {
  id: "company-holidays",
  decorateMonth({ days }) {
    return days.map((date) => {
      const rest = getCompanyRest(date.date);
      if (!rest) return null;

      return {
        subtitle: rest.subtitle,
        badge:
          rest.type === "holiday" ? { text: "休", tone: "rest" } : { text: "班", tone: "work" },
        data: rest,
      };
    });
  },
};

export default function CalendarUICustom() {
  let host: HTMLDivElement | undefined;
  const [picked, setPicked] = createSignal("点一个日期看看");

  onSettled(() => {
    if (!host) return;

    const instance = createCalendarUI(host, {
      initialDate: "2026-06-01",
      adapter,
      onSelect: (day) => {
        const extra = day.data ? (day.data.type === "holiday" ? "休" : "班") : "普通日";
        setPicked(`${day.year}-${day.month}-${day.day} ${extra}`);
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
