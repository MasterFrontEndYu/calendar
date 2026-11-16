import { createCalendarUI } from "@sanguo-dev/calendar-ui";
import type { CalendarOptions } from "@sanguo-dev/calendar-ui";
import "@sanguo-dev/calendar-ui/style.css";
import { createBench } from "./bench-core";
import "./style.css";

await createBench(
  (host, options) => createCalendarUI(host, options as unknown as CalendarOptions<unknown>),
  { target: "local", label: "workspace dist" },
);
