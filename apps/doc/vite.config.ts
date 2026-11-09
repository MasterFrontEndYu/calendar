import process from "node:process";
import { createSolidBase } from "@kobalte/solidbase/config";
import defaultTheme from "@kobalte/solidbase/default-theme";
import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vite-plus";

const solidBase = createSolidBase(defaultTheme);

/** 把 API 名称展开成侧栏链接；link 相对于所属分组的 base */
const apiLinks = (names: readonly string[]) =>
  names.map((name) => ({ title: name, link: `/${name}` }));

/** calendar 包的 utils，顺序与 utils 对象一致 */
const CALENDAR_UTILS = [
  "lYearDays",
  "leapMonth",
  "leapDays",
  "lMonthDays",
  "toChinaMonth",
  "toChinaDay",
  "toChinaNum",
  "solarDays",
  "solarFirstWeek",
  "nthWeekdayOfMonth",
  "toAstro",
  "getAnimal",
  "getTerm",
  "getSolarTerm",
  "toGanZhi",
  "toGanZhiYear",
  "toHourGanZhi",
] as const;

/** calendar-ui 实例方法，顺序与 CalendarInstance 接口一致 */
const CALENDAR_UI_METHODS = [
  "setMonth",
  "getMonth",
  "prevMonth",
  "nextMonth",
  "select",
  "getSelected",
  "getRange",
  "setRange",
  "clearRange",
  "show",
  "hide",
  "toggle",
  "isVisible",
  "showHeader",
  "hideHeader",
  "toggleHeader",
  "isHeaderVisible",
  "getMinDate",
  "setMinDate",
  "getMaxDate",
  "setMaxDate",
  "getTheme",
  "setTheme",
  "destroy",
] as const;

export default defineConfig(({ command }) => {
  // 部署基路径由 DOC_BASE 决定：
  // - GitHub Pages 项目站点：/calendar/（workflow 里设置）
  // - Netlify / 本地：/
  // 本地 dev 始终使用根路径。
  const base = command === "build" ? (process.env.DOC_BASE ?? "/") : "/";

  return {
    base,
    plugins: [
      solidBase.plugin({
        title: "calendar",
        titleTemplate: ":title",
        description: "公历 / 农历日历组件、节假日数据与 Solid 适配器",
        lang: "zh-CN",
        themeConfig: {
          nav: [
            { text: "指南", link: "/guide" },
            { text: "calendar-ui", link: "/calendar-ui" },
            { text: "calendar-ui-lunar", link: "/calendar-ui-lunar" },
            { text: "API", link: "/api" },
          ],
          sidebar: {
            "/guide": [
              {
                title: "指南",
                collapsed: false,
                items: [
                  { title: "总览", link: "/" },
                  { title: "calendar", link: "/calendar" },
                  { title: "calendar-ui", link: "/calendar-ui" },
                  { title: "calendar-ui-lunar", link: "/calendar-ui-lunar" },
                ],
              },
            ],
            "/calendar-ui": [
              {
                title: "演示",
                collapsed: false,
                items: [
                  { title: "总览", link: "/" },
                  { title: "基础与多实例", link: "/plain" },
                  { title: "翻月动画", link: "/transition" },
                  { title: "范围选择", link: "/range" },
                  { title: "折叠", link: "/collapse" },
                  { title: "自定义头部", link: "/header" },
                  { title: "无头日历", link: "/headless" },
                  { title: "日期格 popup", link: "/popup" },
                  { title: "第三方适配器", link: "/custom" },
                ],
              },
            ],
            "/calendar-ui-lunar": [
              {
                title: "演示",
                collapsed: false,
                items: [
                  { title: "总览", link: "/" },
                  { title: "自定义 holidays", link: "/custom" },
                ],
              },
            ],
            "/api": [
              { title: "总览", link: "/" },
              {
                title: "calendar",
                base: "/calendar",
                collapsed: false,
                items: [
                  { title: "包总览", link: "/" },
                  { title: "createCalendar", link: "/createCalendar" },
                  { title: "solarToLunar", link: "/solarToLunar" },
                  { title: "lunarToSolar", link: "/lunarToSolar" },
                  { title: "getHolidays", link: "/getHolidays" },
                  {
                    title: "utils",
                    base: "/utils",
                    collapsed: false,
                    items: [{ title: "utils 总览", link: "/" }, ...apiLinks(CALENDAR_UTILS)],
                  },
                  {
                    title: "类型",
                    base: "/types",
                    collapsed: false,
                    items: [
                      { title: "LunarResult", link: "/lunar-result" },
                      { title: "HolidayConfig", link: "/holiday-config" },
                      { title: "Calendar", link: "/calendar" },
                    ],
                  },
                ],
              },
              {
                title: "calendar-ui",
                base: "/calendar-ui",
                collapsed: false,
                items: [
                  { title: "包总览", link: "/" },
                  { title: "createCalendarUI", link: "/createCalendarUI" },
                  { title: "CalendarOptions", link: "/CalendarOptions" },
                  { title: "resolveLocale", link: "/resolveLocale" },
                  { title: "locales", link: "/locales" },
                  { title: "样式", link: "/styles" },
                  {
                    title: "实例方法",
                    base: "/instance",
                    collapsed: false,
                    items: [
                      { title: "CalendarInstance", link: "/" },
                      ...apiLinks(CALENDAR_UI_METHODS),
                    ],
                  },
                  {
                    title: "类型",
                    base: "/types",
                    collapsed: false,
                    items: [
                      { title: "CalendarDate", link: "/calendar-date" },
                      { title: "CalendarDay", link: "/calendar-day" },
                      { title: "CalendarAdapter", link: "/calendar-adapter" },
                      { title: "CalendarLocale", link: "/calendar-locale" },
                      { title: "CalendarAnimationOptions", link: "/calendar-animation" },
                      { title: "CalendarPopupOptions", link: "/calendar-popup" },
                      { title: "HeaderRenderer", link: "/header-renderer" },
                      { title: "枚举与别名", link: "/aliases" },
                    ],
                  },
                ],
              },
              {
                title: "calendar-ui-lunar",
                base: "/calendar-ui-lunar",
                collapsed: false,
                items: [
                  { title: "包总览", link: "/" },
                  { title: "createCalendarLunar", link: "/createCalendarLunar" },
                  { title: "createLunarAdapter", link: "/createLunarAdapter" },
                ],
              },
            ],
          },
          socialLinks: {
            github: "https://github.com/sanguo-dev/calendar",
          },
          text: {
            editPage: "编辑此页",
            copyPage: "复制页面",
            copiedPage: "已复制",
            copyFailedPage: "复制失败",
          },
        },
      }),
      solid(solidBase.startConfig({ diagnostics: false })),
    ],
    server: {
      port: 3000,
    },
    test: {
      environment: "jsdom",
      globals: false,
      setupFiles: ["./vitest-setup.ts"],
      isolate: false,
      // 文档站暂时没有测试文件，避免 `vp test` 因 "No test files found" 退出 1
      passWithNoTests: true,
    },
    build: {
      target: "esnext",
      assetsInlineLimit: 0,
    },
  };
});
