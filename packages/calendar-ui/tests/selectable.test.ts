import { describe, expect, it } from "vite-plus/test";
import { dateKey } from "../src/utils/date.ts";
import { findSelectable } from "../src/utils/selectable.ts";

describe("findSelectable 搜索边界", () => {
  it("desired 在兜底范围外时仍能搜到上界附近的可用日期", () => {
    const disabled = new Set<number>();
    const cursor = new Date(1899, 11, 31);
    const lastDisabledKey = dateKey(new Date(2100, 11, 30));

    while (dateKey(cursor) <= lastDisabledKey) {
      disabled.add(dateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const found = findSelectable(new Date(1899, 11, 31), null, null, disabled);

    expect(dateKey(found)).toBe(dateKey(new Date(2100, 11, 31)));
  });
});
