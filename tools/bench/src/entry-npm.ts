import { createCalendarUI } from "calendar-ui-npm";
import type { CalendarOptions } from "calendar-ui-npm";
import "calendar-ui-npm/style.css";
import { createBench } from "./bench-core";
import "./style.css";

await createBench(
  (host, options) => createCalendarUI(host, options as unknown as CalendarOptions<unknown>),
  { target: "npm", label: "npm latest" },
);
