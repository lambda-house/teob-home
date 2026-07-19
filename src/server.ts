import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { HaClientStats } from "./ha-client.js";

export interface ServerDeps {
  stats: () => HaClientStats;
  mode: "addon" | "standalone";
  shadowMode: boolean;
  journalPath: string;
  startedAt: number;
}

/**
 * Single HTTP server on :8099 — ingress UI, API, and the supervisor watchdog /health.
 * All URLs are relative so the page works behind the ingress path prefix.
 */
export function startServer(deps: ServerDeps, port: number): void {
  const app = new Hono();

  app.get("/health", (c) => {
    const s = deps.stats();
    return c.json({
      status: s.connected ? "ok" : "degraded",
      uptimeSec: Math.round((Date.now() - deps.startedAt) / 1000),
      ha: s,
      mode: deps.mode,
      shadowMode: deps.shadowMode,
    });
  });

  app.get("/api/stats", (c) => c.json(deps.stats()));

  app.get("/", (c) => {
    const s = deps.stats();
    return c.html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TEOB Home</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 2rem auto; max-width: 40rem; padding: 0 1rem; line-height: 1.5; }
    .badge { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 1rem; font-size: 0.85rem; }
    .ok { background: #2e7d3230; } .bad { background: #c6282830; }
    dl { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; }
    dt { font-weight: 600; }
  </style>
</head>
<body>
  <h1>TEOB Home</h1>
  <p>Event-sourced smart-home brain — pre-alpha skeleton (M0 in progress).</p>
  <dl>
    <dt>Home Assistant</dt>
    <dd><span class="badge ${s.connected ? "ok" : "bad"}">${s.connected ? "connected" : "disconnected"}</span>
        ${s.haVersion ?? ""}</dd>
    <dt>Events seen</dt><dd>${s.eventsSeen}</dd>
    <dt>Reconnects</dt><dd>${s.reconnects}</dd>
    <dt>Mode</dt><dd>${deps.mode}${deps.shadowMode ? " · shadow (no actuation)" : ""}</dd>
    <dt>Journal</dt><dd><code>${deps.journalPath}</code></dd>
  </dl>
  <p><a href="api/stats">stats JSON</a> · <a href="health">health</a></p>
</body>
</html>`);
  });

  serve({ fetch: app.fetch, port, hostname: "0.0.0.0" });
}
