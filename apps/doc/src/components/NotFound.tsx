import { Title } from "@solidjs/meta";
import { httpStatus } from "@solidjs/web";

export default function NotFound() {
  httpStatus(404);

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
