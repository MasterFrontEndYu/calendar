# @sanguo-dev/calendar-ui

## 0.3.1

### Patch Changes

- 性能：翻月、点选只写入状态发生变化的格子，未启用折叠时跳过重复的行可见性同步。
- 性能：点选复用当前网格，不再每次点击重建整月 42 个日期对象。
- 内存：渲染后不再长期保留 42 个 CalendarDay / Date，点击时按需从 DOM 和 adapter data 组装；单实例 JS 堆约从 17.6 KB 降到 8.8 KB。
- 内存：年月选择层改为第一次打开时创建；没打开过的实例少 13 个 DOM 节点（单月 250 → 237，双月 479 → 466）。
- 内存：格子状态标记和网格索引改用数组，移除 WeakMap；范围双月 JS 堆约从 29.5 KB 降到 14.0 KB。
- 内部：CalendarInstance / CalendarGrid 改为原型方法，减少每实例闭包；空 disabledDates 共享同一个 Set。
- 修复：范围端点移动时正确清理旧端点的 is-selected / aria-pressed。

## 0.3.0

### Minor Changes

- 新增 formatDate() / tryParseDate()：前者按 YYYY-MM-DD 或自定义格式串输出，后者是 CalendarDateInput 的不抛错版本，便于直接接输入框。
  实例新增
- close(options?)：统一关闭年月选择层与日期格 popup、隐藏根节点，并可把焦点还给触发元素。hide() 与隐藏方向的 toggle() 现在走同一条关闭路径，不再遗留选择层的 inert 与外部点击监听。

- open() / close() / close() isOpen 代替 show(), hide(), isVisible()

## 0.2.0

### Minor Changes

- 优化性能
- 移除日历 header api ，show\hide 等，只保留 是否渲染的参数。
- 添加测试案例

## 0.1.0

### Minor Changes

- 新增：popup 页面。功能修改。

## 0.0.5

### Patch Changes

- 优化内部函数
- 修改日历 样式，fill 模板 day cell 改为长方体，以美化。
- 添加文档api

## 0.0.4

### Patch Changes

- 新增 年月选择器。
- 优化 代码结构，代码功能，html生成，css

## 0.0.3

### Patch Changes

- 迁移：github和npm 都迁移到新的组织 sanguogege -> sanguo-dev

## 0.0.2

### Patch Changes

- add: color in weekend
