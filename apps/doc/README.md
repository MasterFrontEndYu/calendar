# calendar 文档站

基于 [SolidBase](https://solidbase.dev/) 的文档站，同时包含一个可交互的日历演示。

## 开发

```bash
bun install
vp dev        # http://localhost:3000
```

## 构建

```bash
vp build      # 静态产物输出到 dist/client
vp preview    # 本地预览构建结果
```

SolidBase 会在构建时预渲染 `src/routes` 下的页面；`dist/client` 可以直接部署到任意静态托管。

## 结构

```text
src/
  App.tsx                  SolidBaseRoot + Router
  Document.tsx             SSR document shell（getHtmlProps）
  router.ts                fileRoutes(pageRoutes)
  routes/
    index.mdx              首页（layout: home）
    guide/
      index.mdx            简介
      calendar.mdx         calendar 核心
      calendar-ui.mdx      纯公历 UI
      lunar.mdx            农历适配器
    calendar.tsx           可交互日历演示
    [...404].tsx           404
  global.d.ts              SolidBase 虚拟模块类型
vite.config.ts             SolidBase / Solid 插件与主题配置
```

侧边栏、导航和社交链接在 `vite.config.ts` 的 `themeConfig` 中配置；页面标题和落款信息用 Markdown frontmatter。

## 相关包

- `@sanguogege/calendar`：公历 / 农历换算
- `@sanguogege/calendar-ui`：纯公历 DOM 核心
- `@sanguogege/calendar-ui-lunar`：官方农历适配器
