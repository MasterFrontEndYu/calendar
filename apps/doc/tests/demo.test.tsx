import { render } from "@solidjs/testing-library";
import { flush } from "solid-js";
import { describe, expect, it } from "vite-plus/test";
import CalendarUICustom from "../src/components/demo/calendar-ui-custom";
import CalendarUIHeadless from "../src/components/demo/calendar-ui-headless";
import CalendarUIPopup from "../src/components/demo/calendar-ui-popup";
import CalendarUIHeader from "../src/components/demo/calendar-ui-header";
import CalendarUICollapse from "../src/components/demo/calendar-ui-collapse";
import CalendarUILunarIndex from "../src/components/demo/calendar-ui-lunar-index";
import CalendarUITransition from "../src/components/demo/calendar-ui-transition";
import CalendarUIPlain from "../src/components/demo/calendar-ui-plain";
import CalendarUIRange from "../src/components/demo/calendar-ui-range";

describe("demo components", () => {
  it("plain renders two independent calendars", () => {
    const { container } = render(() => (
      <div>
        <CalendarUIPlain year={2026} month={10} />
        <CalendarUIPlain year={2026} month={12} weekStartsOn={0} locale="en-US" />
      </div>
    ));
    flush();

    expect(container.querySelectorAll(".cui")).toHaveLength(2);
  });

  it("month transition demo renders calendars", () => {
    const { container } = render(() => (
      <div>
        <CalendarUITransition />
        <CalendarUITransition duration={600} easing="linear" />
      </div>
    ));
    flush();

    expect(container.querySelectorAll(".cui")).toHaveLength(2);
    expect(container.textContent).toContain("当前：2026-10");
  });

  it("lunar renders built-in and custom configurations", () => {
    const { container } = render(() => (
      <div>
        <CalendarUILunarIndex variant="builtin" />
        <CalendarUILunarIndex variant="custom" />
      </div>
    ));
    flush();

    expect(container.querySelectorAll(".cui")).toHaveLength(2);
    expect(container.querySelectorAll('.cui__day-tag[data-tone="rest"]')).not.toHaveLength(0);
  });

  it("lunar custom style is opt-in", () => {
    const { container } = render(() => (
      <div>
        <CalendarUILunarIndex variant="builtin" />
        <CalendarUILunarIndex variant="builtin" styled />
      </div>
    ));
    flush();

    expect(container.querySelectorAll(".cui")).toHaveLength(2);
    expect(container.querySelectorAll(".cui--lunar-demo")).toHaveLength(1);
  });

  it("custom header replaces the default header controls", () => {
    const { container } = render(() => <CalendarUIHeader />);
    flush();

    expect(container.querySelector(".demo-header")).not.toBeNull();
    expect(container.querySelector(".cui__title")).toBeNull();
    expect(container.textContent).toContain("2026 年");
    expect(container.textContent).toContain("10 月");

    const next = container.querySelector<HTMLButtonElement>(
      '.demo-header-button[aria-label="下个月"]',
    );
    next?.click();
    flush();

    expect(container.textContent).toContain("11 月");
  });

  it("custom header can open the year and month pickers", () => {
    const { container } = render(() => <CalendarUIHeader />);
    flush();

    container.querySelector<HTMLButtonElement>('[aria-label="选择年份"]')?.click();
    flush();
    expect(container.querySelector(".cui__picker")?.classList.contains("is-open")).toBe(true);

    container.querySelectorAll<HTMLButtonElement>(".cui__picker-cell")[0]?.click();
    flush();
    expect(container.textContent).toContain("2016 年");

    container.querySelector<HTMLButtonElement>('[aria-label="选择月份"]')?.click();
    flush();
    expect(container.querySelector(".cui__picker")?.classList.contains("is-month")).toBe(true);

    container.querySelectorAll<HTMLButtonElement>(".cui__picker-cell")[2]?.click();
    flush();
    expect(container.textContent).toContain("3 月");
  });

  it("headless renders without a visible header", () => {
    const { container } = render(() => <CalendarUIHeadless />);
    flush();

    expect(container.querySelectorAll(".cui")).toHaveLength(1);
    expect(container.querySelector<HTMLElement>(".cui__header")?.hidden).toBe(true);
    expect(container.querySelectorAll(".cui__day")).toHaveLength(42);
  });

  it("popup demo shows dots and opens content", () => {
    const { container } = render(() => <CalendarUIPopup />);
    flush();

    expect(container.querySelectorAll(".cui")).toHaveLength(2);
    expect(container.querySelectorAll(".cui.demo-calendar--custom")).toHaveLength(1);

    const cell = container.querySelector<HTMLButtonElement>('.cui__day[data-date="2026-10-1"]');
    expect(cell?.querySelector(".cui__day-dot")?.hasAttribute("hidden")).toBe(false);
    // 只有有 popup 的日期才有绿点
    expect(
      container
        .querySelector('.cui__day[data-date="2026-10-2"] .cui__day-dot')
        ?.hasAttribute("hidden"),
    ).toBe(true);

    cell?.click();
    flush();

    const popup = document.querySelector(".cui__popup");
    expect(popup?.querySelector(".cui__popup-head")?.textContent).toBe("10 月 1 日 · 2 条");
    expect(popup?.querySelector(".cui__popup-title")?.textContent).toContain("国庆节");
    expect(popup?.querySelector(".cui__popup-detail")?.textContent).toBe("10 月 1 日 - 7 日放假");
    // 点击外部 / Esc 已经能关闭，示例里不再放关闭按钮
    expect(popup?.querySelector("button")).toBeNull();
  });

  it("custom renders a third-party adapter", () => {
    const { container } = render(() => <CalendarUICustom />);
    flush();

    expect(container.querySelectorAll(".cui")).toHaveLength(1);
    expect(container.querySelectorAll('.cui__day-tag[data-tone="rest"]')).not.toHaveLength(0);
    expect(container.querySelectorAll('.cui__day-tag[data-tone="work"]')).not.toHaveLength(0);
    expect(container.textContent).toContain("六月公司日");
  });

  it("range renders single and dual views", () => {
    const { container } = render(() => (
      <div>
        <CalendarUIRange months={1} />
        <CalendarUIRange months={2} />
      </div>
    ));
    flush();

    expect(container.querySelectorAll(".cui")).toHaveLength(2);
    expect(container.querySelectorAll(".cui__grid")).toHaveLength(3);
    expect(container.querySelectorAll(".cui--range")).toHaveLength(1);
  });

  it("collapse renders the bottom arrow", () => {
    const { container } = render(() => (
      <div>
        <CalendarUICollapse mode="single" />
        <CalendarUICollapse mode="range" />
      </div>
    ));
    flush();

    expect(container.querySelectorAll(".cui__collapse")).toHaveLength(2);
    expect(container.querySelectorAll(".cui__week.is-collapsed-hidden")).toHaveLength(0);
  });
});
