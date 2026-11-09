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
- 项目站点地址是 `https://sanguo-dev.github.io/calendar/`。

GitHub workflow 的 Build 步骤设置了：

```yaml
env:
  DOC_BASE: /calendar/
```

[vite.config.ts](vite.config.ts) 用这个环境变量决定 base：

```ts
const base = command === "build" ? (process.env.DOC_BASE ?? "/") : "/";
```

- 本地 dev 始终用 `/`；
- 默认构建（不设 `DOC_BASE`）用 `/`，适合 Netlify / 用户站点 / 自定义域名；
- GitHub Pages 项目站点用 `/calendar/`；
- 如果仓库改名或绑定自定义域名，改 workflow 里的 `DOC_BASE` 即可。

构建必须是 `vp run -r build`，不能只构建 `apps/doc`：文档站依赖 `@sanguo-dev/calendar-ui` 和 `-lunar` 的 `dist`，这两个目录不在 git 里。

## Netlify

仓库根目录的 [netlify.toml](../../netlify.toml) 已经配好：

```toml
[build]
command = "bun install --frozen-lockfile && ./node_modules/.bin/vp run -r build"
publish = "apps/doc/dist/client"

[build.environment]
NODE_VERSION = "22"
BUN_VERSION = "1.4.4"
DOC_BASE = "/"
```

Netlify 上：

1. 连接同一个仓库；
2. Base directory 留空（仓库根目录）；
3. Build command / Publish directory 直接使用 `netlify.toml` 里的值；
4. 部署后站点在域名根路径，`DOC_BASE=/` 保证资源链接不带 `/calendar/`。

GitHub Pages 和 Netlify 可以同时存在：它们各自构建，区别只在 `DOC_BASE`。两边的 `404.html` 都会生成；不需要 SPA fallback，也不要加 `/* /index.html 200` 重定向。

## 结构

```text
src/
  App.tsx                  SolidBaseRoot + Router
  Document.tsx             SSR document shell（getHtmlProps）
  router.ts                fileRoutes(pageRoutes)
  routes/                  只放 .mdx
    index.mdx              首页（layout: home）
    guide/
      index.mdx            指南总览
      calendar.mdx         calendar 使用指南
      calendar-ui.mdx      calendar-ui 使用指南
      calendar-ui-lunar.mdx calendar-ui-lunar 使用指南
    calendar-ui/
      index.mdx            演示总览
      plain.mdx            基础与多实例
      range.mdx            范围选择
      collapse.mdx         折叠
      header.mdx           自定义头部
      headless.mdx         无头日历
      custom.mdx           第三方适配器
    calendar-ui-lunar/
      index.mdx            内置农历演示
      custom.mdx           自定义 holidays
    api/
      index.mdx            API 总览
      calendar/
        index.mdx          包总览
        createCalendar.mdx
        solarToLunar.mdx
        lunarToSolar.mdx
        getHolidays.mdx
        utils/             17 个 utils 函数（每个一个文件）
        types/             LunarResult / HolidayConfig / Calendar
      calendar-ui/
        index.mdx          包总览
        createCalendarUI.mdx
        CalendarOptions.mdx
        resolveLocale.mdx
        locales.mdx
        styles.mdx         样式与 CSS 变量
        instance/          CalendarInstance 与 24 个实例方法
        types/             CalendarDate / CalendarDay / CalendarAdapter 等
      calendar-ui-lunar/
        index.mdx          包总览
        createCalendarLunar.mdx
        createLunarAdapter.mdx
    [...404].mdx           404（渲染 NotFound 组件）
  components/
    demo/
      calendar-ui-index.tsx       演示总览实例
      calendar-ui-plain.tsx        纯公历实例
      calendar-ui-transition.tsx   翻月动画实例
      calendar-ui-range.tsx        范围选择实例
      calendar-ui-collapse.tsx     折叠实例
      calendar-ui-header.tsx       自定义头部实例
      calendar-ui-headless.tsx     无头日历实例
      calendar-ui-custom.tsx       第三方适配器实例（数据 / 方法内联）
      calendar-ui-lunar-index.tsx  官方农历实例
      calendar-ui-lunar-custom.tsx 农历自定义 holidays 实例
      calendar-ui-header.css       自定义头部样式
      calendar-ui-lunar-theme.css  农历示例配色
      demo.css                     演示布局
    HeaderExtras.tsx       头部 GitHub 图标
    header-extras.css      头部 GitHub 图标样式
    NotFound.tsx           404 内容 + httpStatus(404)
  global.d.ts              SolidBase 虚拟模块类型
tests/
  demo.test.tsx            演示组件挂载测试
  header-extras.test.tsx   头部 GitHub 图标测试
vite.config.ts             SolidBase / Solid 插件与主题配置
```

顶部导航在 `vite.config.ts` 的 `themeConfig.nav` 中配置：指南、calendar-ui、calendar-ui-lunar、API。左侧栏在 `themeConfig.sidebar` 中按 `/guide`、`/calendar-ui`、`/calendar-ui-lunar`、`/api` 分组。

演示代码放在 `components/demo`，路由只负责组合；每个实例下面紧跟对应的代码块，示例数据和方法直接写在对应 demo 文件里。

404 也走 `.mdx`：`[...404].mdx` 渲染 `components/NotFound.tsx`，组件在 SSR 时调用 `httpStatus(404)`，所以路由目录保持纯 `.mdx`，同时能返回真正的 404 状态码。

## 相关包

- `@sanguo-dev/calendar`：公历 / 农历换算
- `@sanguo-dev/calendar-ui`：纯公历 DOM 核心
- `@sanguo-dev/calendar-ui-lunar`：官方农历适配器
