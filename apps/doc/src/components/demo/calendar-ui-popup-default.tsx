import { createSignal, onSettled } from "solid-js";
import { createCalendarUI } from "@sanguo-dev/calendar-ui";
import type { CalendarDate } from "@sanguo-dev/calendar-ui";
import "@sanguo-dev/calendar-ui/style.css";
import "./calendar-ui-popup.css";
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

/** 系统 UI：每项返回 [time, title, detail] 三个字符串，由库生成默认结构 */
const render = function (day: CalendarDate) {
  return entriesOf(day).map((entry) => [entry.time, entry.title, entry.detail] as const);
};

export default function CalendarUIPopupDefault() {
  let host: HTMLDivElement | undefined;
  const [picked, setPicked] = createSignal("未选择");

  onSettled(() => {
    if (!host) return;

    const instance = createCalendarUI(host, {
      initialDate: "2026-10-01",
      onSelect: (day) => setPicked(keyOf(day)),
      popup: {
        trigger: "click",
        ariaLabel: "日期详情",
        render,
      },
    });

    return () => instance.destroy();
  });

  return (
    <section class="demo-popup-panel">
      <header class="demo-popup-panel-head">
        <h3>系统 UI · 点击触发</h3>
        <p>
          <code>render</code> 每项返回 <code>[time, title, detail]</code> 三个字符串，库生成默认的
          title / detail 结构。
        </p>
      </header>
      <div ref={(el) => (host = el)} />
      <p class="demo-result">已选中：{picked()}</p>
    </section>
  );
}
