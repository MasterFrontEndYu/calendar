# calendar-ui-lunar

`@sanguogege/calendar-ui` 的官方农历适配器，把 `@sanguogege/calendar` 的农历、节气、节日和调休数据接到纯公历核心上。

## 用法

```ts
import { createCalendar } from "@sanguogege/calendar-ui-lunar";
import "@sanguogege/calendar-ui/style.css";

const instance = createCalendar(container, {
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

## 数据

- `day.subtitle`：节气 > 农历节日 > 公历节日 > 农历日；
- `day.badge`：`xiu` 为休、`ban` 为班，均来自 `rest.json`，与周末无关；
- `day.data`：完整的 `LunarResult`，包括 `lunar.xiu`、`lunar.ban`、`gljr`、`nljr` 等。

`day.data` 在 1900-01-31 ~ 2100-12-31 之外为 `null`。

## 多套配置

```ts
const mainland = createCalendar(hostA, { holidays: mainlandHolidays });
const hongKong = createCalendar(hostB, { holidays: hongKongHolidays });
```

- 配置在 `createCalendar()` 时校验并固定，之后修改对象内容不会生效；
- 多个实例传**同一个配置对象**时会共享月份缓存，建议把配置提到模块级常量；
- 不传 `holidays` 时跟随全局 `setHolidays()`。

## 开发

```bash
vp test
vp run build
vp check
```
