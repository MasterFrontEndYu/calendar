/** 简单建节点：文本一律走 textContent，避免节假日名里的特殊字符被当成 HTML */
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

/** 统一折叠行的可见性：class / inert / aria-hidden 三处同步 */
export const setRowVisibility = function (row: HTMLElement, visible: boolean): void {
  row.classList.toggle("is-collapsed-hidden", !visible);
  row.toggleAttribute("inert", !visible);
  if (visible) row.removeAttribute("aria-hidden");
  else row.setAttribute("aria-hidden", "true");
};

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * 向下箭头
 *
 * 同一个图标靠 CSS 旋转复用：左/右翻月转 ±90°，折叠箭头转 180°。
 */
export const createArrowIcon = function (): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "cui__icon");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", "M3.5 5.5 8 10l4.5-4.5");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  svg.append(path);
  return svg;
};
