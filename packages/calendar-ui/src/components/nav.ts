import type { NavHandle, NavOptions } from "../types";
import { createArrowIcon, node } from "../utils/dom";

/** 头部左右切换按钮：同一个向上箭头，靠 data-direction 旋转成左 / 右 */
export const createNav = function (options: NavOptions): NavHandle {
  const el = node("button", "cui__nav");
  el.type = "button";
  el.dataset.direction = options.direction;
  el.setAttribute("aria-label", options.ariaLabel);
  el.append(createArrowIcon());
  el.addEventListener("click", options.onClick);

  return {
    el,
    setDisabled: (disabled: boolean) => {
      el.disabled = disabled;
      if (disabled) el.setAttribute("aria-disabled", "true");
      else el.removeAttribute("aria-disabled");
    },
    destroy: () => el.removeEventListener("click", options.onClick),
  };
};
