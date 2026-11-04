import type { NavHandle, NavOptions } from "../types";
import { node } from "../utils/dom";

/** 头部左右切换按钮 */
export const createNav = function (options: NavOptions): NavHandle {
  const el = node("button", "cui__nav", options.label);
  el.type = "button";
  el.setAttribute("aria-label", options.ariaLabel);
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
