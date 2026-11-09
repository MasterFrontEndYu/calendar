import { createSignal, onSettled } from "solid-js";
import { createCalendarUI } from "@sanguo-dev/calendar-ui";
import type { CalendarDate, CalendarInstance, DayPopupItem } from "@sanguo-dev/calendar-ui";
import "@sanguo-dev/calendar-ui/style.css";
import "./calendar-ui-popup.css";
import "./demo.css";

interface PopupEntry {
  title: string;
  detail: string;
  time: string;
}

/** 业务数据：日期 -> 这一天的条目；库不关心你的数据格式 */
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

/** 把 CalendarDate 对到业务数据的 key */
const keyOf = function (day: CalendarDate): string {
  return `${day.year}-${day.month}-${day.day}`;
};

/** 取这一天的数据；没有就是空数组 */
const entriesOf = function (day: CalendarDate): readonly PopupEntry[] {
  return POPUPS[keyOf(day)] ?? [];
};

/** 系统 UI：每一条数据返回一个字符串，交给库的默认 popup 样式 */
const renderStrings = function (day: CalendarDate): string[] {
  return entriesOf(day).map((entry) => `${entry.time} · ${entry.title}：${entry.detail}`);
};

/** 自定义 UI：每一条数据返回一个带自己类名的 Node */
const createRow = function (entry: PopupEntry): HTMLElement {
  const row = document.createElement("article");
  row.className = "demo-popup-row";

  const time = document.createElement("span");
  time.className = "demo-popup-time";
  time.textContent = entry.time;

  const title = document.createElement("strong");
  title.className = "demo-popup-title";
  title.textContent = entry.title;

  const detail = document.createElement("span");
  detail.className = "demo-popup-detail";
  detail.textContent = entry.detail;

  row.append(time, title, detail);
  return row;
};

const renderNodes = function (day: CalendarDate): HTMLElement[] {
  return entriesOf(day).map((entry) => createRow(entry));
};

/** 两个实例共用同一份数据，只换触发方式和 render */
const mountCalendar = function (
  host: HTMLElement,
  trigger: "click" | "hover",
  render: (day: CalendarDate) => readonly DayPopupItem[],
  onPick: (day: CalendarDate) => void,
): CalendarInstance {
  return createCalendarUI(host, {
    initialDate: "2026-10-01",
    onSelect: onPick,
    popup: {
      trigger,
      ariaLabel: "日期详情",
      render,
    },
  });
};

export default function CalendarUIPopup() {
  let systemHost: HTMLDivElement | undefined;
  let customHost: HTMLDivElement | undefined;

  const [pickedSystem, setPickedSystem] = createSignal("未选择");
  const [pickedCustom, setPickedCustom] = createSignal("未选择");

  onSettled(() => {
    if (!systemHost || !customHost) return;

    const systemCalendar = mountCalendar(systemHost, "click", renderStrings, (day) =>
      setPickedSystem(keyOf(day)),
    );

    const customCalendar = mountCalendar(customHost, "hover", renderNodes, (day) =>
      setPickedCustom(keyOf(day)),
    );

    // 自定义示例：只在这里给日历根节点加类，CSS 由使用方自己写
    customCalendar.el.classList.add("demo-calendar--custom");

    return () => {
      systemCalendar.destroy();
      customCalendar.destroy();
    };
  });

  return (
    <div class="demo-popup-grid">
      <section class="demo-popup-panel">
        <header class="demo-popup-panel-head">
          <h3>系统 UI · 点击触发</h3>
          <p>
            <code>render</code> 返回字符串数组，直接用库的默认弹层样式；绿点和「日期 ·
            条数」由库内部算。
          </p>
        </header>
        <div ref={(el) => (systemHost = el)} />
        <p class="demo-result">已选中：{pickedSystem()}</p>
      </section>

      <section class="demo-popup-panel demo-popup-panel--custom">
        <header class="demo-popup-panel-head">
          <h3>自定义 UI · 悬停触发</h3>
          <p>
            <code>render</code> 返回 Node 数组，每个 Node 带自己的类名，样式完全由使用方 CSS 决定。
          </p>
        </header>
        <div ref={(el) => (customHost = el)} />
        <p class="demo-result">已选中：{pickedCustom()}</p>
      </section>
    </div>
  );
}
