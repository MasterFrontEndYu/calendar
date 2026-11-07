import process from "node:process";
import { createSolidBase } from "@kobalte/solidbase/config";
import defaultTheme from "@kobalte/solidbase/default-theme";
import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vite-plus";

const solidBase = createSolidBase(defaultTheme);

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
