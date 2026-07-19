# TEOB Home

An event-sourced brain for your smart home. Instead of wiring visual flows, you
program heuristics as typed, testable TypeScript state machines — and every
decision the house makes is an immutable journaled event you can inspect,
explain, and replay.

> **Status: pre-alpha.** This version observes and journals only. Heuristics,
> the decision timeline, energy management, and the LLM copilot land milestone
> by milestone — see the [roadmap](https://github.com/lambda-house/teob-home#roadmap).

## Core ideas

- **Signals ≠ events.** Raw sensor ticks live in a bounded ring store (default
  30 days). The journal records *decisions* — threshold crossings, actuations,
  overrides — and keeps them forever. "Why did the heating come on at 06:42?"
  is a causation-chain query, not log spelunking.
- **Shadow mode first.** Every heuristic starts in shadow: it decides and
  journals what it *would* do without touching anything. You promote it to
  active when the decision log has earned your trust — and demote it back with
  one tap.
- **One actuation choke point.** All service calls pass a safety gate with
  static bounds, per-entity ownership, rate limits, and confirmation tracking.
  LLM features have no actuation tools at all.

## Configuration

| Option | Meaning |
|---|---|
| `llm_provider` | `none` (default), `openrouter`, or `ollama` |
| `openrouter_api_key` / `openrouter_model` | OpenRouter credentials for the AI copilot |
| `ollama_url` | Ollama server URL for local inference |
| `llm_monthly_budget_usd` | Hard LLM spend cap (spend guard) |
| `telegram_bot_token` / `telegram_chat_id` | Optional Telegram notification channel |
| `signal_retention_days` | Raw-signal ring retention (decisions are kept forever) |
| `shadow_mode` | Global dry-run: journal decisions, never actuate (default on) |
| `log_level` | Add-on log verbosity |

## Data

Everything durable lives in `/data` (included in Home Assistant backups):
`journal.db` (decisions, kept forever) and `views.db` (rebuildable read models).
The raw-signal ring `signals.db` is excluded from backups by design.

Your heuristics live in this add-on's config folder (visible in the
`addon_configs` share via the Samba or Studio Code Server add-ons) and are
hot-loaded — no rebuild required.

## Running outside Home Assistant OS

The same app runs standalone (HA Container/Core users, or development on a
laptop) against any Home Assistant instance:

```bash
HA_WS_URL=ws://homeassistant.local:8123/api/websocket \
HA_TOKEN=<long-lived access token> \
node dist/main.js
```

State goes to `./.dev-data`. Standalone mode always starts in shadow mode.
