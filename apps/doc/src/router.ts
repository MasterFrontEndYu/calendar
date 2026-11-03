import { pageRoutes } from "virtual:file-routes";
import { createRouter } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export const Router = createRouter({
  routes: fileRoutes(pageRoutes),
  base: base || undefined,
});

export const { paths } = Router;
