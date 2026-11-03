import { createSolidBase } from "@kobalte/solidbase/config";
import defaultTheme from "@kobalte/solidbase/default-theme";
import solid from "@solidjs/vite-plugin";
import { defineConfig } from "vite-plus";

const solidBase = createSolidBase(defaultTheme);

export default defineConfig({
  plugins: [
    solidBase.plugin({
      title: "calendar",
      titleTemplate: ":title",
      description: "公历 / 农历日历组件、节假日数据与 Solid 适配器",
      lang: "zh-CN",
      themeConfig: {
        nav: [
          { text: "指南", link: "/guide" },
          { text: "演示", link: "/demo" },
        ],
        sidebar: {
          "/guide": [
            {
              title: "开始",
              collapsed: false,
              items: [
                { title: "简介", link: "/" },
                { title: "calendar 核心", link: "/calendar" },
                { title: "calendar-ui", link: "/calendar-ui" },
                { title: "农历适配器", link: "/lunar" },
              ],
            },
          ],
          "/demo": [
            {
              title: "演示",
              collapsed: false,
              items: [
                { title: "总览", link: "/" },
                { title: "纯公历 · 多实例", link: "/plain" },
                { title: "官方农历适配器", link: "/lunar" },
                { title: "第三方适配器", link: "/custom" },
              ],
            },
          ],
        },
        socialLinks: {
          github: "https://github.com/sanguogege/calendar",
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
});
