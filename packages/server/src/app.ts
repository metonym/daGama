import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { csrf } from "hono/csrf";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { handleChat } from "./chat";
import { NODE_ENV, PORT, SITE_URL } from "./constants";
import { router } from "./trpc-router";

const app = new Hono();

if (NODE_ENV === "production") {
  if (SITE_URL) {
    app.use(csrf({ origin: new URL(SITE_URL).host }));
  }

  app
    .use(secureHeaders())
    .use(logger())
    .use("/*", serveStatic({ root: "./dist" }));
}

app.get("/ping", (c) => c.text("pong"));
app.post("/api/chat", handleChat);
app.use("/api/*", trpcServer({ router }));

export default {
  port: PORT,
  fetch: app.fetch,
};
