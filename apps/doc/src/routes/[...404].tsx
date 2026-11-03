import { Title } from "@solidjs/meta";
import type { RouteDefinition } from "@solidjs/router";
import { httpStatus } from "@solidjs/web";

// The catch-all route. httpStatus() is a no-op in the browser and takes
// effect when SSR is enabled; it runs in preload so the status code is set
// before the response head flushes.
export const route = {
  preload: () => httpStatus(404),
} satisfies RouteDefinition;

export default function NotFound() {
  return (
    <main>
      <Title>页面不存在 - calendar</Title>
      <h1>页面不存在</h1>
      <p>这个地址没有对应的文档或演示。</p>
      <p>
        回到 <a href="/">首页</a>，或从 <a href="/guide">指南</a> 开始阅读。
      </p>
    </main>
  );
}
