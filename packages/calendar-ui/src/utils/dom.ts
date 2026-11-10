/** 创建元素节点。 */
export const node = function <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
  doc: Document = document,
): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

/** 每行最近一次写入的可见性，值没变就不碰 DOM */
const rowVisibility = new WeakMap<HTMLElement, boolean>();

/** 设置行的可见性。 */
export const setRowVisibility = function (row: HTMLElement, visible: boolean): void {
  if (rowVisibility.get(row) === visible) return;
  rowVisibility.set(row, visible);

  row.classList.toggle("is-collapsed-hidden", !visible);
  row.toggleAttribute("inert", !visible);
  if (visible) row.removeAttribute("aria-hidden");
  else row.setAttribute("aria-hidden", "true");
};

/** 创建箭头图标。 */
export const createArrowIcon = function (): HTMLSpanElement {
  const icon = node("span", "cui__icon");
  icon.setAttribute("aria-hidden", "true");
  return icon;
};
