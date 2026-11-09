import { createSignal, onSettled } from "solid-js";
import { createCalendarUI } from "@sanguo-dev/calendar-ui";
import "@sanguo-dev/calendar-ui/style.css";
import "./demo.css";

export default function CalendarUIHeadless() {
  let host: HTMLDivElement | undefined;
  const [picked, setPicked] = createSignal("点一个日期看看");

  onSettled(() => {
    if (!host) return;

    const instance = createCalendarUI(host, {
      initialDate: "2026-10-01",
      header: false,
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
