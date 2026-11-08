import type { CalendarLocale } from "../types";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** 英文 */
export const enUS: CalendarLocale = {
  name: "en-US",
  weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  weekdaysLong: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  monthTitle: (year, month) => `${MONTHS[month - 1] ?? month} ${year}`,
  titleOrder: "month-first",
  monthName: (month) => (MONTHS[month - 1] ?? String(month)).slice(0, 3),
  yearLabel: (year) => String(year),
  prevMonth: "Previous month",
  nextMonth: "Next month",
  prevYearPage: "Previous years",
  nextYearPage: "Next years",
  pickMonth: "Choose a month",
  pickYear: "Choose a year",
  collapse: "Collapse calendar",
  expand: "Expand calendar",
};
