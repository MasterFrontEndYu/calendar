import type { PickerLayerHandle, PickerLayerOptions } from "../types";

/** 创建年月选择层控制器。 */
export const createPickerLayer = function (options: PickerLayerOptions): PickerLayerHandle {
  const { root, header, picker } = options;

  /** 设置选择层背景的 inert 状态。 */
  const setBackgroundInert = function (inert: boolean): void {
    Array.from(root.children).forEach((child) => {
      if (child === picker.el || child === header.el) return;
      (child as HTMLElement).inert = inert;
    });
  };

  function close(): void {
    if (!picker.isOpen()) return;

    const hadFocus = picker.el.contains(document.activeElement);
    picker.close();
    header.setNavVisible(true);
    syncNav();
    header.setTitleExpanded(false);
    header.refresh();
    setBackgroundInert(false);
    document.removeEventListener("pointerdown", onPickerPointerDown, true);
    root.removeEventListener("keydown", onPickerKeyDown);
    if (hadFocus) header.focusTitle();
  }

  const onPickerPointerDown = function (event: PointerEvent): void {
    const target = event.target as Node | null;
    if (target !== null && root.contains(target)) return;
    close();
  };

  const onPickerKeyDown = function (event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    close();
  };

  /** 同步头部翻页按钮的禁用状态。 */
  const syncNav = function (): void {
    if (picker.mode() === "year") {
      header.setNavDisabled(!picker.canPage(-1), !picker.canPage(1));
      return;
    }
    options.updateNav();
  };

  const open = function (mode: "month" | "year"): void {
    const wasOpen = picker.isOpen();
    picker.el.style.top = `${header.el.offsetTop + header.el.offsetHeight}px`;
    picker.open(mode);
    header.setNavVisible(mode === "year");
    syncNav();
    header.setTitleExpanded(true);
    header.refresh();
    setBackgroundInert(true);

    if (!wasOpen) {
      document.addEventListener("pointerdown", onPickerPointerDown, true);
      root.addEventListener("keydown", onPickerKeyDown);
    }
  };

  /** 切换选择层。 */
  const toggle = function (mode: "month" | "year"): void {
    if (picker.mode() === mode) {
      close();
      return;
    }
    open(mode);
  };

  /** 处理头部箭头的翻页动作。 */
  const step = function (direction: -1 | 1): void {
    const mode = picker.mode();
    if (mode === "year") {
      picker.movePage(direction);
      syncNav();
      header.refresh();
      return;
    }
    if (mode === "month") return;

    const month = options.getMonth();
    options.onGoTo(month.year, month.month + direction);
  };

  return {
    toggle,
    close,
    step,
    isOpen: () => picker.isOpen(),
    destroy: () => {
      close();
      document.removeEventListener("pointerdown", onPickerPointerDown, true);
      root.removeEventListener("keydown", onPickerKeyDown);
    },
  };
};
