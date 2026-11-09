import { createSignal, onSettled } from "solid-js";
import { createCalendarUI } from "@sanguo-dev/calendar-ui";
import type { CalendarInstance, HeaderRenderer } from "@sanguo-dev/calendar-ui";
import "@sanguo-dev/calendar-ui/style.css";
import "./calendar-ui-header.css";
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

export default function CalendarUIHeader() {
  let host: HTMLDivElement | undefined;
  let instance: CalendarInstance | undefined;
  const [picked, setPicked] = createSignal("点一个日期看看");

  const renderHeader: HeaderRenderer = (context) => {
    const { year, month, locale, pickerMode, prevDisabled, nextDisabled } = context;
    const header = document.createElement("div");
    header.className = "demo-header";

    const prev = createHeaderButton("‹", locale.prevMonth, () => context.prevMonth());
    const next = createHeaderButton("›", locale.nextMonth, () => context.nextMonth());
    prev.disabled = prevDisabled;
    next.disabled = nextDisabled;

    const title = document.createElement("div");
    title.className = "demo-header-title";

    const yearButton = createHeaderButton(
      locale.yearLabel?.(year) ?? String(year),
      locale.pickYear ?? "选择年份",
      () => context.toggleYearPicker(),
    );
    yearButton.classList.add("demo-header-title-button");
    yearButton.dataset.cuiTitle = "";
    yearButton.setAttribute("aria-haspopup", "dialog");
    yearButton.setAttribute("aria-expanded", String(pickerMode === "year"));

    const monthButton = createHeaderButton(
      locale.monthName?.(month) ?? String(month),
      locale.pickMonth ?? "选择月份",
      () => context.toggleMonthPicker(),
    );
    monthButton.classList.add("demo-header-title-button");
    monthButton.setAttribute("aria-haspopup", "dialog");
    monthButton.setAttribute("aria-expanded", String(pickerMode === "month"));

    title.append(yearButton, monthButton);

    const today = createHeaderButton("回到今天", "回到今天", () => {
      if (pickerMode === "year") context.toggleYearPicker();
      else if (pickerMode === "month") context.toggleMonthPicker();
      instance?.select(new Date());
    });
    today.classList.add("demo-header-button--today");

    // 月份层没有翻月语义，隐藏左右箭头；年份层保留箭头用于翻页
    if (pickerMode === "month") {
      prev.hidden = true;
      next.hidden = true;
    }

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
