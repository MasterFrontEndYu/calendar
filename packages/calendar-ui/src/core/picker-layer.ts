import type { PickerLayerHandle, PickerLayerOptions } from "../types";

/**
 * 年月选择层控制器
 *
 * 负责打开/关闭、背景 inert、Esc 与外部点击，以及头部箭头在不同层里的语义。
 */
export const createPickerLayer = function (options: PickerLayerOptions): PickerLayerHandle {
  const { root, header, picker } = options;

  /** 选择层打开时把底层内容设为 inert（头部保留，箭头还要用） */
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

  /** 头部左右按钮在年份层按「年份页边界」禁用，其余情况按「月份边界」 */
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
    setBackgroundInert(true);

    if (!wasOpen) {
      document.addEventListener("pointerdown", onPickerPointerDown, true);
      root.addEventListener("keydown", onPickerKeyDown);
    }
  };

  /** 点年份 / 月份按钮：同一个按钮再点一次关闭，否则切到对应面板 */
  const toggle = function (mode: "month" | "year"): void {
    if (picker.mode() === mode) {
      close();
      return;
    }
    open(mode);
  };

  /** 头部箭头：年份层翻 12 年；月份层收起箭头不响应；关闭时正常翻月 */
  const step = function (direction: -1 | 1): void {
    const mode = picker.mode();
    if (mode === "year") {
      picker.movePage(direction);
      syncNav();
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
