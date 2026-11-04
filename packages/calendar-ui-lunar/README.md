# calendar-ui-lunar

`@sanguogege/calendar-ui` 的官方农历适配器，把 `@sanguogege/calendar` 的农历、节气、节日和调休数据接到纯公历核心上。

## 用法

```ts
import { createCalendarLunar } from "@sanguogege/calendar-ui-lunar";
import "@sanguogege/calendar-ui/style.css";

const instance = createCalendarLunar(container, {
  weekStartsOn: 1,
  onSelect: (day) => {
    console.log(day.data?.lMonthCn, day.data?.nljr);
  },
});
```

## 选项

在 `@sanguogege/calendar-ui` 的全部选项之外，额外支持：

| 选项              | 类型            | 说明                                                   |
| ----------------- | --------------- | ------------------------------------------------------ |
| `holidays`        | `HolidayConfig` | 本实例的节假日 / 调休配置                              |
| `replaceHolidays` | `boolean`       | 为 `true` 时忽略内置节日 / 调休数据，只使用 `holidays` |

不传 `holidays` 时使用**内置数据**，不再有全局 `setHolidays()`。

## 数据

- `day.subtitle`：节气 > 农历节日 > 公历节日 > 农历日；
- `day.badge`：`xiu` 为休、`ban` 为班，均来自配置数据，与周末无关；
- `day.data`：完整的 `LunarResult`，包括 `xiu`、`ban`、`gljr`、`nljr` 等。

`day.data` 在 1900-01-31 ~ 2100-12-31 之外为 `null`。

## 多套配置

```ts
const mainland = createCalendarLunar(hostA, { holidays: mainlandHolidays });
const hongKong = createCalendarLunar(hostB, { holidays: hongKongHolidays });
```

- 配置在 `createCalendarLunar()` 时校验并固定，之后修改对象内容不会生效；
- 不同配置对象互不影响；
- 多个实例传**同一个配置对象**时会共享月份缓存，建议把配置提到模块级常量。

## 直接使用适配器

```ts
import { createCalendarUI } from "@sanguogege/calendar-ui";
import { createLunarAdapter } from "@sanguogege/calendar-ui-lunar";

const adapter = createLunarAdapter({
  holidays: { setRest: { 2027: { xiu: ["0101"], ban: ["0104"] } } },
});

const instance = createCalendarUI(container, { adapter });
```

## 开发

```bash
vp test
vp run build
vp check
```
