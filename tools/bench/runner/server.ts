import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

export interface StaticServer {
  origin: string;
  close(): Promise<void>;
}

/** 只服务 tools/bench/dist，并为 performance.now 精度开 COOP/COEP。 */
export function startStaticServer(root: string): Promise<StaticServer> {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(url.pathname);
      const relative = pathname === "/" ? "/local.html" : pathname;
      const filePath = path.resolve(root, `.${relative}`);

      if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end("forbidden");
        return;
      }

      const body = await readFile(filePath);
      response.writeHead(200, {
        "content-type": MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream",
        "cache-control": "no-store",
        "cross-origin-opener-policy": "same-origin",
        "cross-origin-embedder-policy": "require-corp",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("not found");
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("无法获取静态服务端口"));
        return;
      }
      resolve({
        origin: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}
