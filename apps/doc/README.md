# calendar 文档站

基于 [SolidBase](https://solidbase.dev/) 的文档站。

## 开发

```bash
bun install
vp dev        # http://localhost:3000
```

## 构建

```bash
# 在仓库根目录：先构建 calendar / calendar-ui / lunar，再构建文档
vp run -r build

# 在 apps/doc 里预览构建结果
vp preview
```

SolidBase 会在构建时预渲染 `src/routes` 下的页面；`apps/doc/dist/client` 可以直接部署到任意静态托管。

## GitHub Pages

仓库自带 [.github/workflows/docs.yml](../../.github/workflows/docs.yml)：

- 在仓库 `Settings → Pages → Build and deployment` 里把 Source 设为 **GitHub Actions**；
- push 到 `master`（或手动 Run workflow）会构建全部 workspace 包，然后部署 `apps/doc/dist/client`；
- 项目站点地址是 `https://sanguogege.github.io/calendar/`。

对应的 base 在 [vite.config.ts](vite.config.ts) 里：

```ts
const base = command === "build" ? "/calendar/" : "/";
```

- 本地 dev 用 `/`；
- GitHub Pages 生产构建用 `/calendar/`；
- 如果仓库改名、改成用户站点或自定义域名，把 `/calendar/` 改成对应的基路径（用户站点/自定义域名通常是 `/`）。

构建必须是 `vp run -r build`，不能只构建 `apps/doc`：文档站依赖 `@sanguogege/calendar-ui` 和 `-lunar` 的 `dist`，这两个目录不在 git 里。

## 结构

```text
src/
  App.tsx                  SolidBaseRoot + Router
  Document.tsx             SSR document shell（getHtmlProps）
  router.ts                fileRoutes(pageRoutes)
  routes/                  只放 .mdx
    index.mdx              首页（layout: home）
    guide/
      index.mdx            简介
      calendar.mdx         calendar 核心
      calendar-ui.mdx      纯公历 UI
      lunar.mdx            农历适配器
      adapter.mdx          第三方适配器接口
    demo/
      index.mdx            演示总览
      plain.mdx            纯公历 · 多实例
      lunar.mdx            官方农历适配器
      custom.mdx           第三方适配器
    [...404].mdx           404（渲染 NotFound 组件）
  components/
    demo/
      PlainCalendar.tsx    纯公历实例
      LunarCalendar.tsx    官方农历实例
      CustomCalendar.tsx   第三方适配器实例
      CompanyRestTable.tsx 第三方 xiu / ban 数据表
      demo.css             演示布局
    NotFound.tsx           404 内容 + httpStatus(404)
  demo/
    company-holidays.ts    第三方节假日 / 调休方法
  global.d.ts              SolidBase 虚拟模块类型
tests/
  demo.test.tsx            演示组件挂载测试
vite.config.ts             SolidBase / Solid 插件与主题配置
```

侧边栏、导航和社交链接在 `vite.config.ts` 的 `themeConfig` 中配置；页面标题和落款信息用 Markdown frontmatter。

演示代码放在 `components/demo`，路由只负责组合；每个实例下面紧跟对应的代码块。第三方数据方法放在 `src/demo/company-holidays.ts`。

404 也走 `.mdx`：`[...404].mdx` 渲染 `components/NotFound.tsx`，组件在 SSR 时调用 `httpStatus(404)`，所以路由目录保持纯 `.mdx`，同时能返回真正的 404 状态码。

## 相关包

- `@sanguogege/calendar`：公历 / 农历换算
- `@sanguogege/calendar-ui`：纯公历 DOM 核心
- `@sanguogege/calendar-ui-lunar`：官方农历适配器
