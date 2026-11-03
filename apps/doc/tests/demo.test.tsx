import { render } from "@solidjs/testing-library";
import { flush } from "solid-js";
import { describe, expect, it } from "vite-plus/test";
import CustomCalendar from "../src/components/demo/CustomCalendar";
import LunarCalendar from "../src/components/demo/LunarCalendar";
import PlainCalendar from "../src/components/demo/PlainCalendar";

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
    expect(container.textContent).toContain("六月公司日");
  });
});
