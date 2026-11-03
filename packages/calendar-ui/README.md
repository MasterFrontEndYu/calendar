# calendar-ui

纯 DOM、零依赖的公历日历核心，不依赖任何农历 / 节假日库。副标题、左上角标记和透传数据通过 `CalendarAdapter` 注入，第三方可以接自己的日历实现。

## 用法

```ts
import { createCalendar } from "@sanguogege/calendar-ui";
import "@sanguogege/calendar-ui/style.css";

const instance = createCalendar(container, {
  weekStartsOn: 1, // 0 周日 / 1 周一（默认）
  locale: "zh-CN", // 或 "en-US" / 自定义语言包
  onSelect: (day) => console.log(day.year, day.month, day.day, day.data),
});

instance.nextMonth();
instance.select(new Date(2026, 11, 1));
instance.destroy();
```

## 选项

| 选项            | 类型                                    | 说明                              |
| --------------- | --------------------------------------- | --------------------------------- |
| `initialDate`   | `Date`                                  | 初始日期，默认今天                |
| `weekStartsOn`  | `0 \| 1`                                | 一周从哪天开始，默认 1            |
| `locale`        | `CalendarLocale \| CalendarLocaleName`  | 界面语言，默认 `"zh-CN"`          |
| `header`        | `boolean`                               | 是否显示头部，默认 `true`         |
| `renderHeader`  | `HeaderRenderer`                        | 自定义头部，替换默认的 `‹ 标题 ›` |
| `adapter`       | `CalendarAdapter<TData>`                | 日历适配器；不传就是纯公历        |
| `onSelect`      | `(day: CalendarDay<TData>) => void`     | 选中某一天时触发                  |
| `onMonthChange` | `(year: number, month: number) => void` | 切换月份时触发                    |

## 适配器

```ts
interface CalendarAdapter<TData = unknown> {
  readonly id: string;
  decorateMonth(input: MonthInput): ReadonlyArray<DayDecoration<TData> | null>;
}
```

`decorateMonth` 每次拿到 42 个日期，返回同长度的装饰数组：

```ts
{
  subtitle?: string;                  // 格子副标题
  badge?: { text: string; tone?: string }; // 左上角标记，tone 写到 data-tone
  data?: TData;                       // 透传给 onSelect
  ariaLabel?: string;                 // 覆盖默认 aria-label
}
```

核心不解释 `badge` 和 `data` 的含义；`tone` 对应的颜色由 CSS 决定（内置 `rest` / `work` 两种，可通过 `--cui-rest`、`--cui-accent` 覆盖）。

官方农历适配器见 `@sanguogege/calendar-ui-lunar`；第三方也可以按这个接口接入自己的日历。

## 开发

```bash
vp test          # 单元测试
vp run build     # 构建 dist
vp check         # 格式、lint、类型检查
```
