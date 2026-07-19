# TEOB Home

**An event-sourced brain for your smart home.** Program your automation
heuristics as typed, testable TypeScript state machines instead of visual
flows — and get a home that can explain every decision it makes.

[![Add repository to my Home Assistant](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Flambda-house%2Fteob-home)

> **Status: pre-alpha.** The current add-on connects, observes, and journals.
> Heuristics, the decision timeline, energy management, and the LLM copilot are
> landing milestone by milestone (see [Roadmap](#roadmap)). Watch the repo if
> you want to follow along.

## Why

Visual automation tools (Node-RED, GUI automations) are great until the tenth
flow. Then: no types, no tests, no diffs, no code review, and — when the
heating comes on at 06:42 and you don't know why — no answers.

TEOB Home is built on [teob-ts](https://github.com/lambda-house/teob-ts), an
event-sourcing/CQRS framework, and turns your home's logic into event-sourced
state machines:

- **Every decision is a journaled event** with a causation chain. "Why?" is a
  one-tap query, not log spelunking: `ActuationConfirmed ← CallSucceeded ←
  BoostStarted ← HumidityRoseDetected ← signal(sensor.bathroom_extract_rh)`.
- **Heuristics are code**: a directory with a manifest, an aggregate, and
  tests. Ten lines for a motion light; a Petri-net flow for a multi-stage,
  cancellable, verify-and-compensate episode. Property-test invariants like
  *"the fan boost always ends"* run in CI.
- **Shadow mode first**: every heuristic can run in dry-run, journaling what it
  *would* have done — including side by side with your existing automation
  system, diffed decision by decision, until you trust it enough to flip it live.
- **One actuation choke point**: static bounds, per-entity ownership, rate
  limits, and confirmation tracking guard every service call. The optional LLM
  copilot (OpenRouter or local Ollama — bring your own key or your own GPU)
  explains decisions, writes nightly digests, and drafts new heuristics, but
  has **no actuation tools by construction**.
- **Replayable reality**: recorded signals can be replayed against a new
  heuristic before it ever touches your hardware.

## Install

TEOB Home is a Home Assistant **add-on** (Home Assistant OS / Supervised):

1. Click the badge above (or add `https://github.com/lambda-house/teob-home`
   under **Settings → Add-ons → Add-on Store → ⋮ → Repositories**).
2. Install **TEOB Home** and start it — a **TEOB** panel appears in the sidebar.
3. It starts in **shadow mode**: nothing is actuated until you say so.

Running HA Container/Core, or developing on a laptop? The same app runs
standalone against any Home Assistant instance with a long-lived access token —
see [DOCS](teob-home/DOCS.md#running-outside-home-assistant-os).

Updates ship through the normal add-on update flow: when a new version is
released, Home Assistant shows an **Update** button (changelog included).

## Architecture (short version)

```
HA WebSocket ──► allowlist bridge ──► signals.db (ring, 30 d)
   events           + detectors   └─► semantic commands ──► aggregates ──► journal.db (forever)
                                                               │                │
                                            SafeActuator ◄─────┘                └──► projections ──► ingress panel
                                        (bounds · ownership                          (timeline, live tiles,
                                         · shadow gate)                               energy, heuristics)
```

One Node.js process, three SQLite files in `/data`, no external dependencies.
Deeper docs land in `docs/` as the implementation progresses.

## Roadmap

- **M0 — Watch your house think**: ingest + decision timeline panel (read-only)
- **M1 — First heuristics**: lighting/ventilation ports, shadow → active ladder
- **M2 — Energy manager**: solar-surplus dispatch, tariff awareness, gas/heat-pump arbitrage
- **M3 — LLM copilot**: explain, nightly digest, ask, draft-a-heuristic pipeline
- **M4 — Full takeover**: retire the legacy automation system, optional expert tiers

## Development

```bash
pnpm install
pnpm build
HA_WS_URL=ws://homeassistant.local:8123/api/websocket HA_TOKEN=... pnpm start
```

The add-on image builds from `teob-home/Dockerfile` with the repo root as
context; CI publishes `amd64` + `aarch64` images to GHCR on every release.

## License

Apache-2.0
