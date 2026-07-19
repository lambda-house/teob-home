/**
 * Minimal Home Assistant WebSocket client: auth handshake, state_changed subscription,
 * reconnect with jittered backoff. This is the seed of the full HaClient (allowlist
 * routing, detectors, get_states resync) described in the architecture plan.
 */

export interface HaStateChange {
  entityId: string;
  newState: string | null;
  oldState: string | null;
  at: number;
}

export interface HaClientStats {
  connected: boolean;
  eventsSeen: number;
  reconnects: number;
  connectedSince: number | null;
  haVersion: string | null;
}

export class HaClient {
  private ws: WebSocket | null = null;
  private msgId = 0;
  private closed = false;
  private backoffMs = 1_000;
  readonly stats: HaClientStats = {
    connected: false,
    eventsSeen: 0,
    reconnects: 0,
    connectedSince: null,
    haVersion: null,
  };

  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly onStateChange: (change: HaStateChange) => void,
    private readonly log: (level: string, msg: string) => void,
  ) {}

  start(): void {
    this.closed = false;
    this.connect();
  }

  stop(): void {
    this.closed = true;
    this.ws?.close();
  }

  private connect(): void {
    if (this.closed) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data));
      switch (msg.type) {
        case "auth_required":
          ws.send(JSON.stringify({ type: "auth", access_token: this.token }));
          break;
        case "auth_ok":
          this.stats.connected = true;
          this.stats.connectedSince = Date.now();
          this.stats.haVersion = msg.ha_version ?? null;
          this.backoffMs = 1_000;
          this.msgId += 1;
          ws.send(
            JSON.stringify({ id: this.msgId, type: "subscribe_events", event_type: "state_changed" }),
          );
          this.log("info", `connected to Home Assistant ${this.stats.haVersion ?? ""}`);
          break;
        case "auth_invalid":
          this.log("error", "Home Assistant rejected the token (auth_invalid)");
          ws.close();
          break;
        case "event": {
          const data = msg.event?.data;
          if (!data?.entity_id) return;
          this.stats.eventsSeen += 1;
          this.onStateChange({
            entityId: data.entity_id,
            newState: data.new_state?.state ?? null,
            oldState: data.old_state?.state ?? null,
            at: Date.parse(msg.event.time_fired ?? "") || Date.now(),
          });
          break;
        }
      }
    };

    ws.onclose = () => {
      this.stats.connected = false;
      if (this.closed) return;
      const delay = this.backoffMs + Math.floor(Math.random() * 500);
      this.backoffMs = Math.min(this.backoffMs * 2, 60_000);
      this.stats.reconnects += 1;
      this.log("warning", `connection lost, reconnecting in ${Math.round(delay / 1000)}s`);
      setTimeout(() => this.connect(), delay);
    };

    ws.onerror = () => {
      // onclose fires next; backoff handled there
    };
  }
}
