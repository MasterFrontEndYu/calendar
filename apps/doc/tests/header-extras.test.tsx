import { render } from "@solidjs/testing-library";
import { flush } from "solid-js";
import { describe, expect, it } from "vite-plus/test";
import HeaderExtras from "../src/components/HeaderExtras";

describe("header extras", () => {
  it("adds the GitHub link after the theme selector", () => {
    const nav = document.createElement("div");
    nav.className = "top-nav";
    const group = document.createElement("div");
    group.setAttribute("role", "group");
    group.innerHTML = '<button aria-label="Change theme mode"></button>';
    nav.append(group);
    document.body.append(nav);

    const { unmount } = render(() => <HeaderExtras />);
    flush();

    const link = nav.querySelector<HTMLAnchorElement>(".doc-github-link");
    expect(link).not.toBeNull();
    expect(link?.href).toBe("https://github.com/sanguo-dev/calendar");
    expect(link?.previousElementSibling).toBe(group);

    unmount();
    nav.remove();
  });
});
