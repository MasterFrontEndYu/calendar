[![NPM Version](https://img.shields.io/npm/v/@sanguogege/calendar.svg?style=for-the-badge)](https://www.npmjs.com/package/@sanguogege/calendar)
[![](https://img.shields.io/npm/dm/@sanguogege/calendar.svg?style=for-the-badge)](https://www.npmjs.com/package/@sanguogege/calendar)

<p align="center"> <b>万年历生成器</b> </p>

公历 / 农历互转，附带干支、节气、生肖、星座、节日与节假日调休。纯 TypeScript，零依赖，支持 ESM / CJS / UMD / IIFE。

## 安装

```bash
npm i @sanguogege/calendar
```

## 快速开始

```ts
import calendar from "@sanguogege/calendar";

// 不传参：今天
const today = calendar.solarToLunar();

// 传参：指定公历日期
const day = calendar.solarToLunar(2026, 4, 5);
console.log(day.LMonthCn + day.LDayCn); // 二月十八
console.log(day.Term); // 清明
console.log(day.gzYear, day.gzMonth, day.gzDay); // 丙午 壬辰 己酉
```

## 支持范围

| 项目 | 范围                        |
| ---- | --------------------------- |
| 公历 | `1900-01-31` ~ `2100-12-31` |
| 农历 | `1900` ~ `2100` 年          |

超出范围、日期不存在（如 2 月 30 日、农历三十一）、参数类型不对，一律抛异常，**不会**再静默回退到今天或自动进位。

## 核心方法

### `solarToLunar(y?: number, m?: number, d?: number)`

公历转农历。不传参返回今天；传参时年、月、日必须同时传入。

```ts
calendar.solarToLunar(2024, 2, 10); // 2024 年正月初一
calendar.solarToLunar(); // 今天
```

### `lunarToSolar(y: number, m: number, d: number, isLeapMonth?: boolean)`

农历转公历。闰月不存在时抛 `RangeError`，不再返回 `-1`。

```ts
calendar.lunarToSolar(2024, 1, 1); // 2024-02-10
calendar.lunarToSolar(2020, 4, 1, true); // 2020-05-23（闰四月）
```

### 返回值 `LunarResult`

| 字段                        | 类型           | 说明                                             |
| --------------------------- | -------------- | ------------------------------------------------ |
| `cYear` / `cMonth` / `cDay` | number         | 公历年 / 月 / 日                                 |
| `lYear` / `lMonth` / `lDay` | number         | 农历年 / 月 / 日                                 |
| `isLeap`                    | boolean        | 是否闰月                                         |
| `LMonthCn` / `LDayCn`       | string         | 农历月 / 日中文，如 `"闰四月"`、`"廿一"`         |
| `Animal`                    | string         | 生肖，以农历年为准                               |
| `gzYear`                    | string         | 干支年，**以立春为界**，与 `gzMonth` 口径一致    |
| `gzYearLunar`               | string         | 干支年，以正月初一为界，与 `Animal` 口径一致     |
| `gzMonth` / `gzDay`         | string         | 干支月（以节气为界）/ 干支日                     |
| `gzHour`                    | string[]       | 当天十二个时辰的干支                             |
| `Term`                      | string \| null | 节气名，非节气日为 `null`                        |
| `astro`                     | string         | 星座，如 `"摩羯座"`                              |
| `Gljr` / `Nljr`             | string[]       | 公历节日 / 农历节日                              |
| `Xiu`                       | boolean        | 是否休息：周末或法定节假日，且不是补班日         |
| `Ban`                       | boolean        | 是否调休补班                                     |
| `isToday`                   | boolean        | 是否今天（按运行环境本地时区）                   |
| `nWeek`                     | number         | 星期 1-7，**周日为 7**                           |
| `dayOfWeek`                 | number         | 星期 0-6，**周日为 0**，与 `solarFirstWeek` 一致 |
| `ncWeek`                    | string         | 星期中文，如 `"星期日"`                          |

## 节假日与调休

内置数据只包含 **2020、2021** 两年的法定节假日安排，2022 年及以后请按年注入（国务院办公厅每年 11 月左右发布次年安排）。

```ts
calendar.setHolidays({
  setFestival: {
    sFtv: { "0419": ["项目上线日"] }, // 公历节日，key 为 MMDD
    lFtv: { "0101": ["春节"] }, // 农历节日，key 为 MMDD
  },
  setRest: {
    2027: { xiu: ["0101", "0102"], ban: ["0104"] },
  },
});
```

- `setHolidays(config, options?)`：默认与内置数据**合并去重**，不会修改内置数据，也不会修改你传入的对象。重复调用继续叠加。
- `setHolidays(config, { replace: true })`：丢弃内置数据，只保留你传入的。
- `resetHolidays()`：恢复到内置数据。
- `getHolidays()`：取当前配置的深拷贝，可直接再传给 `setHolidays()`。

**休息语义**：`Xiu = 周末或法定节假日，且不是补班日`。补班日（`ban`）即使落在周末也是工作日。某个年份没有注入数据时，只按周末计算，不会报错。

**不需要写进数据的节日**：`除夕`（腊月最后一天）、`母亲节`（5 月第 2 个周日）、`父亲节`（6 月第 3 个周日）、`感恩节`（11 月第 4 个周四）由规则计算，写死在数据里反而会错年份。

配置格式不合法会抛 `TypeError`，错误信息里有完整字段路径，例如：

```
[calendar] setHolidays.setFestival.sFtv.1-1 节日 key 必须是四位 "MMDD"（如 "0101"），收到 "1-1"
```

## 错误处理

| 异常         | 场景                                               |
| ------------ | -------------------------------------------------- |
| `RangeError` | 日期越界、日期不存在、闰月不匹配、工具函数参数越界 |
| `TypeError`  | `setHolidays` 的配置结构 / 类型不合法              |

```ts
try {
  calendar.solarToLunar(2024, 2, 30);
} catch (e) {
  console.error(e.message); // [calendar] solarToLunar(day) 必须在 1-29 之间，收到 30
}
```

## 工具方法

```ts
calendar.utils.lYearDays(2026); // 农历年天数
calendar.utils.leapMonth(2026); // 闰几月，0 表示不闰
calendar.utils.leapDays(2026); // 闰月天数
calendar.utils.lMonthDays(2026, 3); // 农历某月天数
calendar.utils.toChinaMonth(3); // "三月"
calendar.utils.toChinaDay(21); // "廿一"
calendar.utils.toChinaNum(3); // "三"
calendar.utils.solarDays(2026, 2); // 28
calendar.utils.solarFirstWeek(2026, 4); // 3（4/1 是周三，0 为周日）
calendar.utils.nthWeekdayOfMonth(2026, 5, 0, 2); // 10（5 月第 2 个周日）
calendar.utils.toAstro(4, 19); // "白羊座"
calendar.utils.getAnimal(2026); // "马"
calendar.utils.getTerm(2026, 3); // 4（立春在 2 月 4 日）
calendar.utils.getSolarTerm(0); // "小寒"
calendar.utils.toGanZhi(40); // "甲辰"
calendar.utils.toGanZhiYear(2024); // "甲辰"
calendar.utils.toHourGanZhi(40); // ["甲子", "乙丑", ...]
```

## 传统页面直接引入

```html
<script src="https://cdn.jsdelivr.net/npm/@sanguogege/calendar/dist/index.umd.js"></script>
<script>
  const day = calendar.solarToLunar(2026, 4, 5);
</script>
```

也可以直接使用 `dist/index.iife.js`，全局变量名同样是 `calendar`。

## 从 1.x 升级

这是 2.0，行为有不兼容变更：

1. 非法入参一律抛异常，不再 `return -1`、不再静默取今天、不再自动进位（如 `2024-02-30` 不再变成 3 月 1 日）。
2. `lunarToSolar` 不再返回 `-1`。
3. `gzYear` 改为以**立春**为界，与 `gzMonth` 一致；需要按正月初一换年的用新增的 `gzYearLunar`。
4. `Xiu` 现在包含周末，并扣除调休补班日；新增 `dayOfWeek`。
5. `setRest` 由“整年覆盖”改为“按年按列表合并”。
6. 除夕、母亲节、父亲节、感恩节改为规则计算，数据文件里已移除对应写法。
7. 修复星座名（`摩羯座`、`天秤座`）与星座边界日期。
8. 节日数据修正：世界微笑日移到 5 月 8 日，寒衣节移到农历十月初一。

## 数据维护规范

```json
{
  "setFestival": {
    "sFtv": { "MMDD": ["节日名称"] },
    "lFtv": { "MMDD": ["节日名称"] }
  },
  "setRest": {
    "YYYY": {
      "xiu": ["MMDD", "MMDD"],
      "ban": ["MMDD", "MMDD"]
    }
  }
}
```

- `MMDD` 必须是四位，月份 01-12、日期 01-31；
- `setRest` 的年份范围 1900-2100，`xiu` / `ban` 缺省时按空数组处理；
- 写错格式会在 `setHolidays()` 调用处立刻抛 `TypeError`，不会等到查询时才出现 `undefined`。

## License

MIT
