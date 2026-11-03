import { Title } from "@solidjs/meta";
import { createSignal, onSettled } from "solid-js";
import { createCalendar } from "@sanguogege/calendar-ui-lunar";
import "@sanguogege/calendar-ui/style.css";

export default function CalendarPage() {
  let host: HTMLDivElement | undefined;
  const [picked, setPicked] = createSignal("点一个日期看看");

  // calendar-ui 是纯 DOM 的，等 DOM 就绪后再挂载，卸载时 destroy
  onSettled(() => {
    if (!host) return;
    const instance = createCalendar(host, {
      onSelect: (day) => {
        const lunar = day.data ? `${day.data.lMonthCn}${day.data.lDayCn}` : "";
        const festivals = day.data ? [...day.data.nljr, ...day.data.gljr].join(" / ") : "";
        setPicked(
          `${day.year}-${day.month}-${day.day} ${lunar}${festivals ? ` · ${festivals}` : ""}`,
        );
      },
    });
    return () => instance.destroy();
  });

  return (
    <main>
      <Title>日历演示 - calendar</Title>
      <h1>日历演示</h1>
      <p>纯 DOM 日历，挂在这个页面里；左上角会显示休 / 班标记。</p>
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
