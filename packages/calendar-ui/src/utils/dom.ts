/** 创建元素节点。 */
export const node = function <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

/** 设置行的可见性。 */
export const setRowVisibility = function (row: HTMLElement, visible: boolean): void {
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
