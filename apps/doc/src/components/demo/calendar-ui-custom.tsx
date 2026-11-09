import { createSignal, onSettled } from "solid-js";
import { createCalendarUI } from "@sanguo-dev/calendar-ui";
import type { CalendarAdapter } from "@sanguo-dev/calendar-ui";
import "@sanguo-dev/calendar-ui/style.css";
import "./demo.css";

/** 公司自己的节假日数据：只在这个演示里用，不依赖 @sanguo-dev/calendar */
const COMPANY_REST: Record<
  string,
  { xiu?: string[]; ban?: string[]; names?: Record<string, string> }
> = {
  2026: {
    xiu: ["0101", "0501", "0605", "1001"],
    ban: ["0613"],
    names: {
      "0101": "公司元旦",
      "0501": "公司劳动节",
      "0605": "六月公司日",
      "0613": "公司日补班",
      "1001": "公司国庆",
    },
  },
};

interface CompanyRest {
  /** YYYY-MM-DD */
  date: string;
  type: "holiday" | "makeup";
  /** 格子副标题 */
  subtitle: string;
}

const pad = function (value: number): string {
  return String(value).padStart(2, "0");
};

/** 第三方接口：按日期返回节假日 / 调休数据 */
const getCompanyRest = function (date: Date): CompanyRest | null {
  const year = COMPANY_REST[String(date.getFullYear())];
  if (!year) return null;

  const mmdd = `${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const subtitle = year.names?.[mmdd];

  if (year.ban?.includes(mmdd)) {
    return { date: day, type: "makeup", subtitle: subtitle ?? "公司补班" };
  }
  if (year.xiu?.includes(mmdd)) {
    return { date: day, type: "holiday", subtitle: subtitle ?? "公司假日" };
  }
  return null;
};

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
