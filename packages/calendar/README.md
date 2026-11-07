# calendar

零依赖的公历 / 农历换算库，支持农历、节气、干支、生肖、节日和调休。

```bash
bun add @sanguo-dev/calendar
```

## 快速开始

```ts
import createCalendar from "@sanguo-dev/calendar";

const calendar = createCalendar();

const day = calendar.solarToLunar(2026, 10, 1);
console.log(day.lMonthCn, day.lDayCn, day.gljr, day.xiu);
```

`createCalendar()` 不传参数时使用内置数据。每次调用都会创建一个独立实例，没有全局可变状态。

## createCalendar

```ts
const calendar = createCalendar(config?, options?);
```

| 参数              | 类型            | 说明                                      |
| ----------------- | --------------- | ----------------------------------------- |
| `config`          | `HolidayConfig` | 节假日 / 调休配置，默认与内置数据合并     |
| `options.replace` | `boolean`       | 为 `true` 时丢弃内置数据，只使用 `config` |

```ts
const company = createCalendar(
  { setRest: { 2027: { xiu: ["0101", "0102"], ban: ["0104"] } } },
  { replace: true },
);

company.solarToLunar(2027, 1, 4).ban; // true
createCalendar().solarToLunar(2027, 1, 4).ban; // false
```

- 配置在创建时校验、深拷贝并冻结；
- 多个实例互不影响；
- 修改传入对象不会影响已经创建的实例；
- 配置错误立即抛 `TypeError`，错误信息带 `createCalendar.…` 字段路径。

## 实例方法

| 方法                                  | 说明                                                     |
| ------------------------------------- | -------------------------------------------------------- |
| `solarToLunar(y?, m?, d?)`            | 公历转农历；不传参数返回今天                             |
| `lunarToSolar(y, m, d, isLeapMonth?)` | 农历转公历，`isLeapMonth` 只接受布尔值                   |
| `getHolidays(options?)`               | 当前配置的深拷贝；`{ merged: false }` 只导出你传入的部分 |

```ts
const calendar = createCalendar();

calendar.solarToLunar(); // 今天
calendar.solarToLunar(2026, 10, 1);

calendar.lunarToSolar(2024, 1, 1); // 2024-02-10
calendar.lunarToSolar(2020, 4, 1, true); // 闰四月

// 完整配置（内置 + 你注入的）
const snapshot = calendar.getHolidays();

// 只导出你注入的部分，方便存到后端或单独维护
const own = calendar.getHolidays({ merged: false });
```

## LunarResult

`solarToLunar` / `lunarToSolar` 都返回完整结果：

| 字段                        | 类型                | 说明                         |
| --------------------------- | ------------------- | ---------------------------- |
| `xiu`                       | `boolean`           | 是否在放假日列表；与周末无关 |
| `ban`                       | `boolean`           | 是否在补班日列表             |
| `gljr`                      | `readonly string[]` | 公历节日                     |
| `nljr`                      | `readonly string[]` | 农历节日                     |
| `lYear` / `lMonth` / `lDay` | `number`            | 农历年 / 月 / 日             |
| `isLeap`                    | `boolean`           | 是否闰月                     |
| `lMonthCn` / `lDayCn`       | `string`            | 农历月 / 日中文              |
| `animal`                    | `string`            | 生肖                         |
| `cYear` / `cMonth` / `cDay` | `number`            | 公历年 / 月 / 日             |
| `gzYear`                    | `string`            | 干支年（立春为界）           |
| `gzYearLunar`               | `string`            | 干支年（正月初一为界）       |
| `gzMonth` / `gzDay`         | `string`            | 干支月 / 日                  |
| `gzHour`                    | `string[]`          | 十二时辰干支                 |
| `isToday`                   | `boolean`           | 是否今天                     |
| `nWeek`                     | `number`            | 星期 1-7，周日为 7           |
| `dayOfWeek`                 | `number`            | 星期 0-6，周日为 0           |
| `ncWeek`                    | `string`            | 星期中文                     |
| `term`                      | `string \| null`    | 节气名                       |
| `astro`                     | `string`            | 星座                         |

支持范围：`1900-01-31 ~ 2100-12-31`。越界、非法日期、不存在的闰月都抛 `RangeError`。

## 节日与调休

### HolidayConfig

```ts
interface HolidayConfig {
  setFestival?: {
    sFtv?: Record<string, string[]>; // 公历节日，MMDD
    lFtv?: Record<string, string[]>; // 农历节日，MMDD
  };
  setRest?: {
    [year: string]: {
      xiu?: string[]; // 放假 MMDD
      ban?: string[]; // 补班 MMDD
    };
  };
}
```

```ts
const calendar = createCalendar({
  setFestival: {
    sFtv: { "0419": ["项目上线日"] },
  },
  setRest: {
    2027: { xiu: ["0101", "0102"], ban: ["0104"] },
  },
});

calendar.solarToLunar(2027, 1, 4).ban; // true
```

### xiu / ban

`xiu` / `ban` 完全由配置决定，和周末无关：

```ts
day.xiu; // 在放假日列表
day.ban; // 在补班日列表
day.dayOfWeek; // 0-6，判断周末用这个
```

内置数据来自国务院办公厅通知：[2026 年](https://www.gov.cn/zhengce/content/202511/content_7047090.htm)、[2027 年](https://www.gov.cn/zhengce/content/202611/content_7085101.htm)：

**2026 年**

| 假期   | 放假        | 补班        |
| ------ | ----------- | ----------- |
| 元旦   | 1/1 - 1/3   | 1/4         |
| 春节   | 2/15 - 2/23 | 2/14、2/28  |
| 清明节 | 4/4 - 4/6   | -           |
| 劳动节 | 5/1 - 5/5   | 5/9         |
| 端午节 | 6/19 - 6/21 | -           |
| 中秋节 | 9/25 - 9/27 | -           |
| 国庆节 | 10/1 - 10/7 | 9/20、10/10 |

**2027 年**

| 假期   | 放假        | 补班       |
| ------ | ----------- | ---------- |
| 元旦   | 1/1 - 1/3   | -          |
| 春节   | 2/5 - 2/13  | 1/31、2/14 |
| 清明节 | 4/3 - 4/5   | -          |
| 劳动节 | 5/1 - 5/5   | 5/8        |
| 端午节 | 6/9         | -          |
| 中秋节 | 9/15        | -          |
| 国庆节 | 10/1 - 10/7 | 9/26、10/9 |

### 快照

```ts
const snapshot = createCalendar().getHolidays();
const copy = createCalendar(snapshot);
```

`getHolidays()` 返回深拷贝，不会共享内部数组。

注意：`getHolidays()` 返回的是**当前生效的配置**（含内置数据）。如果实例是用 `{ replace: true }` 建的空配置，快照就是空的；再传给 `createCalendar()` 时若不带 `{ replace: true }`，内置数据会重新合并回来。想只导出自己注入的部分用 `getHolidays({ merged: false })`。

## 校验规则

| 规则          | 说明                                                  |
| ------------- | ----------------------------------------------------- |
| 公历 MMDD     | 必须真实存在，`0230`、`0431` 这类会直接抛 `TypeError` |
| 农历 MMDD     | 每月最多 30 天（农历任意月都可能是 30 天）            |
| `xiu` / `ban` | 同一天不能既放假又补班，冲突会抛 `TypeError`          |
| 闰月节日      | 闰月不过节：闰五月初五不算端午、闰八月十五不算中秋    |
| `isLeapMonth` | 只接受布尔值，传 `"true"`、`1` 会抛 `TypeError`       |
| 年份          | `setRest` 的 key 必须在 1900-2100 之间                |

## 工具函数

`utils` 是具名导出的无状态函数，不读取实例配置：

```ts
import { utils } from "@sanguo-dev/calendar";

utils.lYearDays(2026);
utils.leapMonth(2026);
utils.leapDays(2026);
utils.lMonthDays(2026, 3);
utils.toChinaMonth(3); // "三月"
utils.toChinaDay(21); // "廿一"
utils.toChinaNum(3); // "三"
utils.solarDays(2026, 2); // 28
utils.solarFirstWeek(2026, 4); // 3
utils.nthWeekdayOfMonth(2026, 5, 0, 2); // 10
utils.toAstro(4, 19); // "白羊座"
utils.getAnimal(2026); // "马"
utils.getTerm(2026, 3); // 4
utils.getSolarTerm(0); // "小寒"
utils.toGanZhi(40); // "甲辰"
utils.toGanZhiYear(2024); // "甲辰"
utils.toHourGanZhi(40); // ["甲子", "乙丑", ...]
```

## 错误

| 异常         | 场景                                               |
| ------------ | -------------------------------------------------- |
| `RangeError` | 日期越界、日期不存在、闰月不匹配、工具函数参数越界 |
| `TypeError`  | `createCalendar` 的配置结构或类型不合法            |

## 2.x 变化

- 默认导出改成 `createCalendar` 函数；不再有 `calendar.solarToLunar` 这种默认对象；
- 删除全局 `setHolidays` / `resetHolidays`，配置只通过 `createCalendar(config)` 传入；
- `createConverter` 重命名为 `createCalendar`；
- `utils` 改为具名导出；
- 每次调用 `createCalendar()` 都是独立实例，没有跨实例状态。
