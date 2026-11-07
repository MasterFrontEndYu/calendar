# calendar

公历 / 农历日历工具集：纯 TypeScript 换算核心、零依赖 DOM 日历组件，以及官方农历适配器。

[![docs - GitHub Pages](https://img.shields.io/badge/docs-GitHub%20Pages-2ea44f?logo=githubpages&logoColor=white)](https://sanguogege.github.io/calendar/)
[![docs - Netlify](https://img.shields.io/badge/docs-Netlify-00c7b7?logo=netlify&logoColor=white)](https://calendardocs.netlify.app/)
[![license](https://img.shields.io/npm/l/@sanguogege/calendar.svg?color=blue)](packages/calendar/LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22.18-339933?logo=node.js&logoColor=white)](package.json)

## 三个包

| 包                                         | 版本                         | 下载                         | 说明                                    | README                                         |
| ------------------------------------------ | ---------------------------- | ---------------------------- | --------------------------------------- | ---------------------------------------------- |
| [@sanguogege/calendar][npm-cal]            | [![npm][v-cal]][npm-cal]     | [![dm][dm-cal]][npm-cal]     | 公历 / 农历换算、节气、干支、节日与调休 | [README](packages/calendar/README.md)          |
| [@sanguogege/calendar-ui][npm-ui]          | [![npm][v-ui]][npm-ui]       | [![dm][dm-ui]][npm-ui]       | 纯 DOM、零依赖的公历日历 UI             | [README](packages/calendar-ui/README.md)       |
| [@sanguogege/calendar-ui-lunar][npm-lunar] | [![npm][v-lunar]][npm-lunar] | [![dm][dm-lunar]][npm-lunar] | 把农历接入 calendar-ui 的官方适配器     | [README](packages/calendar-ui-lunar/README.md) |

[npm-cal]: https://www.npmjs.com/package/@sanguogege/calendar
[npm-ui]: https://www.npmjs.com/package/@sanguogege/calendar-ui
[npm-lunar]: https://www.npmjs.com/package/@sanguogege/calendar-ui-lunar
[v-cal]: https://img.shields.io/npm/v/@sanguogege/calendar.svg?label=%20&color=cb3837
[v-ui]: https://img.shields.io/npm/v/@sanguogege/calendar-ui.svg?label=%20&color=cb3837
[v-lunar]: https://img.shields.io/npm/v/@sanguogege/calendar-ui-lunar.svg?label=%20&color=cb3837
[dm-cal]: https://img.shields.io/npm/dm/@sanguogege/calendar.svg?label=%20
[dm-ui]: https://img.shields.io/npm/dm/@sanguogege/calendar-ui.svg?label=%20
[dm-lunar]: https://img.shields.io/npm/dm/@sanguogege/calendar-ui-lunar.svg?label=%20

## 特性

- **公历 ⇄ 农历全量互转**：覆盖 1900-01-31 ~ 2100-12-31，附节气、干支（年 / 月 / 日 / 时）、生肖、星座、星期。
- **节日与调休**：内置 2026、2027 年国务院放假安排，支持按年注入、`replace` 丢弃内置数据、多实例互不影响。
- **纯 DOM 日历 UI**：零运行时依赖，支持单选 / 范围、双月、折叠、翻月动画，light / dark / auto 主题，周末固定标红。
- **适配器机制**：`CalendarAdapter` 可接任意数据源；官方农历适配器提供节气 / 节日副标题与休 / 班角标，附带农历喜庆红皮肤。
- **TypeScript**：全量类型定义，配置在创建时校验一次、深拷贝并冻结，没有全局可变状态。

## 快速开始

```bash
bun add @sanguogege/calendar
bun add @sanguogege/calendar-ui @sanguogege/calendar-ui-lunar
```

### 只要日期换算

```ts
import createCalendar from "@sanguogege/calendar";

const calendar = createCalendar();
const day = calendar.solarToLunar(2026, 10, 1);

day.lMonthCn; // "八月"
day.lDayCn; // "廿一"
day.gljr; // ["国庆节", "国际音乐日", "国际老人节"]
day.xiu; // true
```

### 只要公历日历

```ts
import { createCalendarUI } from "@sanguogege/calendar-ui";
import "@sanguogege/calendar-ui/style.css";

const ui = createCalendarUI(container, { initialDate: "2026-10-01" });
ui.select("2026-10-08");
```

### 公历 + 农历 + 节假日

```ts
import { createCalendarLunar } from "@sanguogege/calendar-ui-lunar";
import "@sanguogege/calendar-ui/style.css";
import "@sanguogege/calendar-ui-lunar/theme.css";

const ui = createCalendarLunar(container, {
  initialDate: "2026-10-01",
  onSelect: (day) => console.log(day.data?.lMonthCn, day.data?.nljr),
});
```

## 数据

- 农历、节气数据覆盖 1900–2100，超出范围会抛 `RangeError`。
- 内置节假日来自国务院办公厅通知：[2026 年](https://www.gov.cn/zhengce/content/202511/content_7047090.htm)、[2027 年](https://www.gov.cn/zhengce/content/202611/content_7085101.htm)。
- 周末固定标红，与节假日数据无关；调休补班用 `ban` 标记。

## 文档

完整 API、选项与在线示例，两个站点内容一致：

| 站点         | 地址                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| GitHub Pages | [sanguogege.github.io/calendar](https://sanguogege.github.io/calendar/) |
| Netlify      | [calendardocs.netlify.app](https://calendardocs.netlify.app/)           |

## 开发

```bash
bun install
vp run dev        # 文档站
vp run ready      # 格式 + 测试 + 构建
vp run -r test    # 全部测试
vp run -r build   # 构建全部包
```

发布走 changesets + npm Trusted Publishing（OIDC），流程见 [.github/workflows/Release.yml](.github/workflows/Release.yml)。

## License

[MIT](packages/calendar/LICENSE)
