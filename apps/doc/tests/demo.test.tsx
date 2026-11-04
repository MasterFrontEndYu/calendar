import { render } from "@solidjs/testing-library";
import { flush } from "solid-js";
import { describe, expect, it } from "vite-plus/test";
import CustomCalendar from "../src/components/demo/CustomCalendar";
import CollapseCalendar from "../src/components/demo/CollapseCalendar";
import LunarCalendar from "../src/components/demo/LunarCalendar";
import PlainCalendar from "../src/components/demo/PlainCalendar";
import RangeCalendar from "../src/components/demo/RangeCalendar";

describe("demo components", () => {
  it("plain renders two independent calendars", () => {
    const { container } = render(() => (
      <div>
        <PlainCalendar year={2026} month={10} />
        <PlainCalendar year={2026} month={12} weekStartsOn={0} locale="en-US" />
      </div>
    ));
    flush();

    expect(container.querySelectorAll(".cui")).toHaveLength(2);
  });

  it("lunar renders built-in and custom configurations", () => {
    const { container } = render(() => (
      <div>
        <LunarCalendar variant="builtin" />
        <LunarCalendar variant="custom" />
      </div>
    ));
    flush();

    expect(container.querySelectorAll(".cui")).toHaveLength(2);
    expect(container.querySelectorAll('.cui__day-tag[data-tone="rest"]')).not.toHaveLength(0);
  });

  it("custom renders a third-party adapter", () => {
    const { container } = render(() => <CustomCalendar />);
    flush();

    expect(container.querySelectorAll(".cui")).toHaveLength(1);
    expect(container.querySelectorAll('.cui__day-tag[data-tone="rest"]')).not.toHaveLength(0);
    expect(container.querySelectorAll('.cui__day-tag[data-tone="work"]')).not.toHaveLength(0);
    expect(container.textContent).toContain("六月公司日");
  });

  it("range renders single and dual views", () => {
    const { container } = render(() => (
      <div>
        <RangeCalendar months={1} />
        <RangeCalendar months={2} />
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
        <CollapseCalendar mode="single" />
        <CollapseCalendar mode="range" />
      </div>
    ));
    flush();

    expect(container.querySelectorAll(".cui__collapse")).toHaveLength(2);
    expect(container.querySelectorAll(".cui__week.is-collapsed-hidden")).toHaveLength(0);
  });
});
