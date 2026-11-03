import { Title } from "@solidjs/meta";
import { createSignal, onSettled } from "solid-js";
import { createCalendar } from "@sanguogege/calendar-ui";
import "@sanguogege/calendar-ui/style.css";

export default function CalendarPage() {
  let host: HTMLDivElement | undefined;
  const [picked, setPicked] = createSignal("点一个日期看看");

  // calendar-ui 是纯 DOM 的，等 DOM 就绪后再挂载，卸载时 destroy
  onSettled(() => {
    if (!host) return;
    const instance = createCalendar(host, {
      onSelect: (day) => {
        console.log("onSelect", day);
        const lunar = day.lunar ? `${day.lunar.lMonthCn}${day.lunar.lDayCn}` : "";
        const festivals = day.lunar ? [...day.lunar.nljr, ...day.lunar.gljr].join(" / ") : "";
        setPicked(
          `${day.year}-${day.month}-${day.day} ${lunar}${festivals ? ` · ${festivals}` : ""}`,
        );
      },
    });
    return () => instance.destroy();
  });

  return (
    <main>
      <Title>日历 - calendar-ui</Title>
      <h1>calendar-ui</h1>
      <p>纯 DOM 日历，挂在这个页面里。</p>
      <div
        style={{
          width: "100%",
          margin: "0 auto",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
        }}
        ref={(el) => (host = el)}
      />
      <p>{picked()}</p>
    </main>
  );
}
