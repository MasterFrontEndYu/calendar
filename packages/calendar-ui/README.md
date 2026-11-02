# calendar-ui

纯 DOM 的日历组件：农历、节气、节日与调休来自 `@sanguogege/calendar`，渲染层不依赖任何框架。

## 用法

```ts
import { createCalendar } from "@sanguogege/calendar-ui";
import "@sanguogege/calendar-ui/style.css";

const instance = createCalendar(container, {
  weekStartsOn: 1, // 0 周日 / 1 周一（默认）
  locale: "zh-CN", // 或 "en-US" / 自定义语言包
  onSelect: (day) => console.log(day.year, day.month, day.day, day.lunar?.Nljr),
});

instance.nextMonth();
instance.select(new Date(2026, 11, 1));
instance.destroy();
```

## 选项

| 选项              | 类型                                    | 说明                                                   |
| ----------------- | --------------------------------------- | ------------------------------------------------------ |
| `initialDate`     | `Date`                                  | 初始日期，默认今天                                     |
| `weekStartsOn`    | `0 \| 1`                                | 一周从哪天开始，默认 1                                 |
| `locale`          | `CalendarLocale \| CalendarLocaleName`  | 界面语言，默认 `"zh-CN"`                               |
| `header`          | `boolean`                               | 是否显示头部，默认 `true`                              |
| `renderHeader`    | `HeaderRenderer`                        | 自定义头部，替换默认的 `‹ 标题 ›`                      |
| `holidays`        | `HolidayConfig`                         | 本实例的节假日 / 调休配置                              |
| `replaceHolidays` | `boolean`                               | 为 `true` 时忽略内置节日 / 调休数据，只使用 `holidays` |
| `onSelect`        | `(day: CalendarDay) => void`            | 选中某一天时触发                                       |
| `onMonthChange`   | `(year: number, month: number) => void` | 切换月份时触发                                         |

## 多套节假日配置

`@sanguogege/calendar` 的 `setHolidays()` 是全局的；`calendar-ui` 通过 `holidays` 选项，把配置固定到实例自己的转换器上，所以同一页面里可以并排显示不同地区的节假日：

```ts
const mainland = createCalendar(hostA, { holidays: mainlandHolidays });
const hongKong = createCalendar(hostB, { holidays: hongKongHolidays });
```

- 配置在 `createCalendar()` 时校验并固定，之后修改对象内容不会生效；
- 多个实例传**同一个配置对象**时会共享月份缓存，建议把配置提到模块级常量，不要每次渲染新建对象；
- 不传 `holidays` 时跟随全局 `setHolidays()`。全局配置仍然不会让已经缓存的月份失效，需要在任何 `createCalendar()` 之前调用。

## 开发

```bash
vp test          # 单元测试
vp run build     # 构建 dist
vp check         # 格式、lint、类型检查
```
