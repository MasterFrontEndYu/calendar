/** 判断是否开启减少动态效果。 */
export const prefersReducedMotion = function (): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/** 解析 CSS 时长并转换为毫秒。 */
export const parseCssDuration = function (value: string, fallback: number): number {
  const match = /^\s*(-?\d*\.?\d+)\s*(ms|s)?\s*$/i.exec(value);
  if (match === null) return fallback;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return fallback;
  return match[2]?.toLowerCase() === "s" ? amount * 1000 : amount;
};

/** 读取 CSS 变量里的时长。 */
export const readCssDuration = function (
  style: CSSStyleDeclaration,
  name: string,
  fallback: number,
): number {
  const value = style.getPropertyValue(name).trim();
  return value === "" ? fallback : parseCssDuration(value, fallback);
};

/** 读取 CSS 变量里的缓动函数。 */
export const readCssEasing = function (
  style: CSSStyleDeclaration,
  name: string,
  fallback: string,
): string {
  const value = style.getPropertyValue(name).trim();
  return value === "" ? fallback : value;
};

/** 规范化缓动函数。 */
export const normalizeEasing = function (easing: string): string {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return easing;
  return CSS.supports("animation-timing-function", easing) ? easing : "ease";
};
