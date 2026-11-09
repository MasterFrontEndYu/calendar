import { createSignal, onSettled } from "solid-js";
import { createCalendarUI } from "@sanguo-dev/calendar-ui";
import type { CalendarDate } from "@sanguo-dev/calendar-ui";
import "@sanguo-dev/calendar-ui/style.css";
import "./calendar-ui-popup.css";
import "./calendar-ui-popup-custom.css";
import "./demo.css";

interface PopupEntry {
  title: string;
  detail: string;
  time: string;
}

/** 演示数据 */
const POPUPS: Record<string, readonly PopupEntry[]> = {
  "2026-10-1": [
    { title: "国庆节", detail: "10 月 1 日 - 7 日放假", time: "全天" },
    { title: "升旗仪式", detail: "广场集合，提前 10 分钟到场", time: "10:00" },
  ],
  "2026-10-8": [{ title: "寒露", detail: "早晚温差大，记得添衣", time: "节气" }],
  "2026-10-18": [{ title: "重阳节", detail: "登高、敬老", time: "农历九月初九" }],
  "2026-10-23": [{ title: "霜降", detail: "秋季最后一个节气", time: "节气" }],
  "2026-10-31": [{ title: "万圣夜", detail: "18:00 公司活动", time: "18:00" }],
};

/** 日期 -> 数据 key */
const keyOf = function (day: CalendarDate): string {
  return `${day.year}-${day.month}-${day.day}`;
};

/** 取这一天的数据 */
const entriesOf = function (day: CalendarDate): readonly PopupEntry[] {
  return POPUPS[keyOf(day)] ?? [];
};

/** 不绑定数据的通用署名，拼在每条 detail 末尾 */
const createSignature = function (): HTMLElement {
  const sign = document.createElement("span");
  sign.className = "demo-popup-event-sign";
  sign.textContent = "· XX 公司";
  return sign;
};

/** 自定义 UI：一条数据返回一个完全自定义的 timeline 节点 */
const createRow = function (entry: PopupEntry, highlight: boolean): HTMLElement {
  const row = document.createElement("article");
  row.className = "demo-popup-event";

  const time = document.createElement("time");
  time.className = "demo-popup-event-time";
  time.textContent = entry.time;

  // 不绑定数据：国庆节当天的时间后面补一个表情
  if (highlight) {
    const emoji = document.createElement("span");
    emoji.className = "demo-popup-event-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = "🎉";
    time.append(emoji);
  }

  const title = document.createElement("strong");
  title.className = "demo-popup-event-title";
  title.textContent = entry.title;

  // 不绑定数据：只给「国庆节」这一条标题加旗子，同一天的另一条不加
  if (highlight && entry.title === "国庆节") {
    const flag = document.createElement("span");
    flag.className = "demo-popup-event-flag";
    flag.setAttribute("aria-hidden", "true");
    flag.textContent = "🚩";
    title.append(flag);
  }

  const detail = document.createElement("p");
  detail.className = "demo-popup-event-detail";
  detail.textContent = entry.detail;
  detail.append(createSignature());

  row.append(time, title, detail);
  return row;
};

const render = function (day: CalendarDate): HTMLElement[] {
  // 只是示例里的额外装饰，不属于 POPUPS 数据
  const highlight = day.year === 2026 && day.month === 10 && day.day === 1;
  return entriesOf(day).map((entry) => createRow(entry, highlight));
};

export default function CalendarUIPopupCustom() {
  let host: HTMLDivElement | undefined;
  const [picked, setPicked] = createSignal("未选择");

  onSettled(() => {
    if (!host) return;

    const instance = createCalendarUI(host, {
      initialDate: "2026-10-01",
      onSelect: (day) => setPicked(keyOf(day)),
      popup: {
        trigger: "hover",
        ariaLabel: "日期详情",
        render,
      },
    });

    // 自定义示例：只在这里给日历根节点加类，CSS 由使用方自己写
    instance.el.classList.add("demo-calendar--custom");

    return () => instance.destroy();
  });

  return (
    <section class="demo-popup-panel demo-popup-panel--custom">
      <header class="demo-popup-panel-head">
        <h3>自定义 UI · 悬停触发</h3>
        <p>
          <code>render</code> 返回 Node 数组，每个 Node 带自己的类名，样式完全由使用方 CSS 决定。
        </p>
      </header>
      <div ref={(el) => (host = el)} />
      <p class="demo-result">已选中：{picked()}</p>
    </section>
  );
}
