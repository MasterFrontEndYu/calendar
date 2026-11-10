# @sanguo-dev/calendar

## 1.0.2

### Patch Changes

- 优化性能

## 1.0.1

### Patch Changes

- 迁移：github和npm 都迁移到新的组织 sanguogege -> sanguo-dev

## 2.0.1

### Patch Changes

- v 2.0.1
  ### 更新
  - 优化内部方法

## 2.0.0

### Major Changes

- 9defc9c: 2.0.0：修掉一批会静默返回错误结果的问题，并统一了配置与节假日的语义。

  ### 破坏性变更
  - 非法入参一律抛异常：越界日期、不存在的日期（如 2 月 30 日）、只传部分参数、闰月不匹配，都改抛 `RangeError`；不再静默回退成“今天”、不再自动进位、`lunarToSolar` 不再返回 `-1`。
  - `gzYear` 改为以立春为界，与 `gzMonth` 口径一致；同一时刻不会再出现“乙巳年 + 庚寅月”这种不存在的组合。需要按正月初一换年的用新增的 `gzYearLunar`。
  - `xiu` / `ban` 完全由 rest.json 的放假日 / 补班日列表决定，不再自动包含周末；新增 `dayOfWeek` 字段。
  - `setRest` 由“整年覆盖”改为“按年、按列表合并”。
  - 不再有全局配置：删除 `setHolidays` / `resetHolidays`，改为 `createCalendar(config, options)` 返回独立实例；新增 `getHolidays()` 导出当前配置；`createCalendar(config, { replace: true })` 可丢弃内置数据。
  - `gljr` / `nljr` 统一为只读数组（`Object.freeze`），不再出现“有的日子能 push、有的日子抛错”。

  ### 修复
  - 闰月不过节：闰五月初五不再显示端午、闰八月十五不再显示中秋。
  - 除夕改为按“腊月最后一天”计算，腊月为小月的年份（2022、2025、2026、2027 等）不再漏掉除夕。
  - 母亲节 / 父亲节 / 感恩节改为按规则计算，不再写死成某一年的日期。
  - 节日数据修正：世界微笑日移到 5 月 8 日，寒衣节移到农历十月初一。
  - 修复星座名错字（摩羯座、天秤座）与星座边界日期（4/20、10/23）。
  - `createCalendar` 不再原地改写内置 JSON：自定义节日无法撤销、重复调用不断叠加的问题解决。
  - 配置校验失败会立刻抛 `TypeError` 并带出字段路径；新增日期真实性与互斥校验：
    - 公历节日 / 调休日期必须真实存在（`0230`、`0431` 这类直接抛错）；
    - 农历节日按每月最多 30 天校验；
    - 同一天不能既在 `xiu` 又在 `ban`；
    - `lunarToSolar` 的 `isLeapMonth` 只接受布尔值。
  - 新增 `getHolidays({ merged: false })`，只导出用户注入的部分，方便单独维护或存到后端。
  - 农历表越界（如 `lYearDays(1899)`）抛 `RangeError`，不再返回 348 之类的假数据。
  - `utils` 补齐 `toChinaNum`、`getTerm`、`getSolarTerm`、`toGanZhi`、`toGanZhiYear`、`toHourGanZhi`、`nthWeekdayOfMonth`。
  - 内部换算改用 UTC 毫秒数，跨时区结果一致。
  - 打包保持 1.x 的产物形态：`index.mjs` / `index.cjs` / `index.umd.js` / `index.iife.js` 与 `.d.mts` / `.d.cts`，全局变量名仍是 `calendar`。
  - 补充 vitest 用例：73,384 天公历/农历往返、干支年月一致性、闰月、边界、配置合并与校验。

## 1.4.1

### Patch Changes

- 1

## 1.4.0

### Minor Changes

- c427834: 本次更新将插件升级为 **“数据驱动”** 模式，通过 JSON 配置与逻辑分离，使其完美适配所有 Web 开发环境（Vue, React, 原生 JS 等）。

  ### 🛠 核心改动
  1.  **逻辑与数据解耦**：

      - 源码不再硬编码变动的节假日，改由 `globalConfig` 统一管理。
      - 通过 `setHolidays()` 接口动态注入远程或本地 JSON 数据。

  2.  **无损合并算法**：

      - **节日合并**：使用 `checkData` 逻辑，将外部数据与本地基础数据进行去重合并，不再是简单的覆盖。
      - **调休合并**：支持按年（Year-based）批量注入 `xiu`（休）和 `ban`（班）名单。

  3.  **TS 类型定义**：
      - 完整定义了 `LunarResult` 接口，提供精确的 IDE 智能提示。
      - 移除了不必要的中间状态返回，确保 API 只输出当前日期相关的数据。

## 1.3.10

### Patch Changes

- fix: del useless function

- this will the last version in sometime later.

- a good project to test

## 1.3.9

### Patch Changes

- bun run --workspaces build

## 1.3.8

### Patch Changes

- 0080de2: just change version

## 1.3.7

### Patch Changes

- 8241540: add one

## 1.3.6

### Patch Changes

- add a func

## 1.3.5

### Patch Changes

- fix: function better

## 1.3.4

### Patch Changes

- change some type and clean

## 1.3.3

### Patch Changes

- fix:function work done

## 1.3.2

### Patch Changes

- add dist

## 1.3.1

### Patch Changes

- 0460657: 1.3.1

## 1.3.0

### Minor Changes

- fix: code error

### Patch Changes

- c246d62: add

## 1.2.7

### Patch Changes

- fix: function

## 1.2.6

### Patch Changes

- fix:substr to slice

## 1.2.5

### Patch Changes

- change version

## 1.2.4

### Patch Changes

- add

## 1.2.3

### Patch Changes

- cdd043a: change something
