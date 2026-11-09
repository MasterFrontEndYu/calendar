---
"@sanguo-dev/calendar-ui": minor
---

新增日期格 popup：`popup.render(day)` 在创建 / 重绘时返回 `string | Node` 数组，库按数组是否为空自动显示绿点，并缓存结果到打开时使用；弹层自动补一行「日期 · 条数」头部。数据在创建日历前准备好，`render` 是同步纯函数，库不负责请求。支持 `click` / `hover` / `focus` / `auto` 触发和 `placement` / `role` / `ariaLabel` 配置；默认皮肤提供 `.cui__popup` 卡片、`.cui__popup-head` 头部和 `.cui__popup-item` 内容层，可直接用 CSS 覆盖。
