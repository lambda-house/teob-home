import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/** User-facing options, set via the add-on Configuration tab (or env vars in standalone mode). */
export interface AddonOptions {
  llm_provider: "none" | "openrouter" | "ollama";
  openrouter_api_key: string;
  openrouter_model: string;
  ollama_url: string;
  llm_monthly_budget_usd: number;
  telegram_bot_token: string;
  telegram_chat_id: string;
  signal_retention_days: number;
  shadow_mode: boolean;
  log_level: "debug" | "info" | "warning" | "error";
}

export interface AppConfig {
  /** "addon" when running under the HA Supervisor, "standalone" for dev / HA Container users. */
  mode: "addon" | "standalone";
  haWsUrl: string;
  haToken: string;
  dataDir: string;
  options: AddonOptions;
}

const DEFAULT_OPTIONS: AddonOptions = {
  llm_provider: "none",
  openrouter_api_key: "",
  openrouter_model: "anthropic/claude-sonnet-4.5",
  ollama_url: "",
  llm_monthly_budget_usd: 10,
  telegram_bot_token: "",
  telegram_chat_id: "",
  signal_retention_days: 30,
  shadow_mode: true,
  log_level: "info",
};

export function loadConfig(): AppConfig {
  const supervisorToken = process.env.SUPERVISOR_TOKEN;

  if (supervisorToken) {
    const options = existsSync("/data/options.json")
      ? { ...DEFAULT_OPTIONS, ...JSON.parse(readFileSync("/data/options.json", "utf8")) }
      : DEFAULT_OPTIONS;
    return {
      mode: "addon",
      haWsUrl: "ws://supervisor/core/websocket",
      haToken: supervisorToken,
      dataDir: "/data",
      options,
    };
  }

  const haWsUrl = process.env.HA_WS_URL;
  const haToken = process.env.HA_TOKEN;
  if (!haWsUrl || !haToken) {
    throw new Error(
      "Standalone mode requires HA_WS_URL (e.g. ws://homeassistant.local:8123/api/websocket) " +
        "and HA_TOKEN (a long-lived access token) environment variables.",
    );
  }
  const dataDir = process.env.DATA_DIR ?? join(process.cwd(), ".dev-data");
  mkdirSync(dataDir, { recursive: true });
  return {
    mode: "standalone",
    haWsUrl,
    haToken,
    dataDir,
    options: { ...DEFAULT_OPTIONS, shadow_mode: true },
  };
}
