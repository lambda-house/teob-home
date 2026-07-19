import { join } from "node:path";
import { createSqliteRuntime } from "@lambda-house/teob-ts/sqlite";
import { loadConfig } from "./config.js";
import { HaClient } from "./ha-client.js";
import { startServer } from "./server.js";

const LEVELS = ["debug", "info", "warning", "error"] as const;

const config = loadConfig();
const minLevel = LEVELS.indexOf(config.options.log_level);
const log = (level: string, msg: string): void => {
  if (LEVELS.indexOf(level as (typeof LEVELS)[number]) < minLevel) return;
  console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}`);
};

log("info", `starting teob-home in ${config.mode} mode (shadow=${config.options.shadow_mode})`);

// Event journal — aggregates register here as heuristics land (M0+).
const journalPath = join(config.dataDir, "journal.db");
const { journal } = createSqliteRuntime({ path: journalPath }, []);
log("info", `journal open at ${journalPath}`);

const ha = new HaClient(
  config.haWsUrl,
  config.haToken,
  () => {
    // M0: the HaBridge (allowlist routing, debounce, detectors) lands here.
  },
  log,
);
ha.start();

startServer(
  {
    stats: () => ha.stats,
    mode: config.mode,
    shadowMode: config.options.shadow_mode,
    journalPath,
    startedAt: Date.now(),
  },
  8099,
);
log("info", "http server listening on :8099");

const shutdown = (): void => {
  log("info", "shutting down");
  ha.stop();
  journal.close();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
