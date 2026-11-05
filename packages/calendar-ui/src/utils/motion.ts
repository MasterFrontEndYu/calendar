/** 是否开启了「减少动态效果」；jsdom 等环境没有 matchMedia 时当作未开启 */
export const prefersReducedMotion = function (): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/** 把 CSS 里的时长读成毫秒，支持 `200ms` / `0.2s` / 纯数字；非法值回退 */
export const parseCssDuration = function (value: string, fallback: number): number {
  const match = /^\s*(-?\d*\.?\d+)\s*(ms|s)?\s*$/i.exec(value);
  if (match === null) return fallback;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return fallback;
  return match[2]?.toLowerCase() === "s" ? amount * 1000 : amount;
};

/** 当前元素上的 CSS 变量优先，CSS 变量没有声明时用 JS 选项 */
export const readCssDuration = function (
  style: CSSStyleDeclaration,
  name: string,
  fallback: number,
): number {
  const value = style.getPropertyValue(name).trim();
  return value === "" ? fallback : parseCssDuration(value, fallback);
};

export const readCssEasing = function (
  style: CSSStyleDeclaration,
  name: string,
  fallback: string,
): string {
  const value = style.getPropertyValue(name).trim();
  return value === "" ? fallback : value;
};

/** WAAPI 的 easing 不认非法值会抛错，这里退回到 ease */
export const normalizeEasing = function (easing: string): string {
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return easing;
  return CSS.supports("animation-timing-function", easing) ? easing : "ease";
};
