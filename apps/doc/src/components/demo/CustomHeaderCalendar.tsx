import { createSignal, onSettled } from "solid-js";
import { createCalendarUI } from "@sanguo-dev/calendar-ui";
import type { CalendarInstance, HeaderRenderer } from "@sanguo-dev/calendar-ui";
import "@sanguo-dev/calendar-ui/style.css";
import "./custom-header.css";
import "./demo.css";

const createHeaderButton = function (
  text: string,
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "demo-header-button";
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", onClick);
  return button;
};

export default function CustomHeaderCalendar() {
  let host: HTMLDivElement | undefined;
  let instance: CalendarInstance | undefined;
  const [picked, setPicked] = createSignal("点一个日期看看");

  const renderHeader: HeaderRenderer = (context) => {
    const { year, month, locale } = context;
    const header = document.createElement("div");
    header.className = "demo-header";

    const prev = createHeaderButton("‹", locale.prevMonth, () => context.prevMonth());
    const next = createHeaderButton("›", locale.nextMonth, () => context.nextMonth());
    const today = createHeaderButton("回到今天", "回到今天", () => {
      instance?.select(new Date());
    });
    today.classList.add("demo-header-button--today");

    const title = document.createElement("div");
    title.className = "demo-header-title";
    title.textContent = locale.monthTitle(year, month);

    header.append(prev, title, today, next);
    return header;
  };

  onSettled(() => {
    if (!host) return;

    instance = createCalendarUI(host, {
      initialDate: "2026-10-15",
      renderHeader,
      onSelect: (day) => setPicked(`${day.year}-${day.month}-${day.day}`),
    });

    return () => instance?.destroy();
  });

  return (
    <div class="demo-calendar">
      <div ref={(el) => (host = el)} />
      <p class="demo-result">选中：{picked()}</p>
    </div>
  );
}
