'use client';

import type { ServerToClientEvent } from '@api-perf/shared';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

type MessageHandler = (event: ServerToClientEvent) => void;
type StatusHandler = (status: ConnectionStatus, reconnectAttempt?: number) => void;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000/ws';

class ApiPerfWebSocket {
  private ws: WebSocket | null = null;
  // Each new socket gets a unique generation ID. Callbacks from a stale
  // socket (replaced by a newer one) are silently ignored.
  private generation = 0;

  private reconnectAttempts = 0;
  private readonly baseDelay = 1000;
  private readonly maxDelay = 30_000;
  private handlers = new Set<MessageHandler>();
  private statusHandler: StatusHandler | null = null;
  private subscribedRuns = new Set<string>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  // ── Browser event listeners ───────────────────────────────────────────────

  private handleOnline = (): void => {
    if (this.isDestroyed || this.isConnected) return;
    this.cancelReconnectTimer();
    this.reconnectAttempts = 0;
    this.notifyStatus('connecting');
    this.openSocket();
  };

  private handleOffline = (): void => {
    if (this.isDestroyed) return;
    // Cancel any scheduled reconnect — no point retrying while offline.
    this.cancelReconnectTimer();
    // Force-close the socket so handleOnline can open a fresh one.
    // Bump generation first so the resulting onclose fires as a no-op.
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.generation++;
      this.ws.close();
    }
    this.notifyStatus('disconnected');
  };

  private handleVisibilityChange = (): void => {
    if (this.isDestroyed || document.visibilityState !== 'visible') return;
    if (!this.isConnected) {
      // Tab woke from sleep while disconnected — attempt immediately.
      this.cancelReconnectTimer();
      this.openSocket();
    }
  };

  private cancelReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // ── Status ────────────────────────────────────────────────────────────────

  onStatusChange(handler: StatusHandler): void {
    this.statusHandler = handler;
  }

  private notifyStatus(status: ConnectionStatus, attempt = 0): void {
    this.statusHandler?.(status, attempt);
  }

  // ── Connection ────────────────────────────────────────────────────────────

  /** Public entry point — called once by WebSocketProvider on mount. */
  connect(): void {
    if (this.isDestroyed) return;
    if (this.isActiveSocket()) return;
    this.reconnectAttempts = 0;
    this.notifyStatus('connecting');
    this.openSocket();
  }

  private openSocket(): void {
    if (this.isDestroyed) return;
    if (this.isActiveSocket()) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.notifyStatus('disconnected');
      return;
    }

    // Bump the generation so any callbacks from the previous socket become no-ops.
    const gen = ++this.generation;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      if (gen !== this.generation) return;
      this.reconnectAttempts = 0;
      this.notifyStatus('connected');
      this.subscribedRuns.forEach((runId) => this.sendSubscribe(runId));
    };

    this.ws.onmessage = (event) => {
      if (gen !== this.generation) return;
      try {
        const msg = JSON.parse(event.data as string) as ServerToClientEvent & { type: string };
        this.notifyHandlers(msg);
      } catch { /* ignore malformed messages */ }
    };

    this.ws.onclose = () => {
      if (gen !== this.generation) return; // a newer socket was already opened
      if (this.isDestroyed) return;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // Browser fires onclose automatically after onerror.
      // Don't emit status here — onclose will handle it.
    };
  }

  private scheduleReconnect(): void {
    if (this.isDestroyed) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      // Browser is offline; handleOnline will restart when connectivity returns.
      this.notifyStatus('disconnected');
      return;
    }
    this.reconnectAttempts++;
    const delay = Math.min(this.baseDelay * 2 ** (this.reconnectAttempts - 1), this.maxDelay);
    this.notifyStatus('reconnecting', this.reconnectAttempts);
    this.reconnectTimer = setTimeout(() => this.openSocket(), delay);
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  subscribe(runId: string): void {
    this.subscribedRuns.add(runId);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe(runId);
    }
  }

  unsubscribe(runId: string): void {
    this.subscribedRuns.delete(runId);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'UNSUBSCRIBE_RUN', payload: { runId } }));
    }
  }

  private sendSubscribe(runId: string): void {
    this.ws?.send(JSON.stringify({ type: 'SUBSCRIBE_RUN', payload: { runId } }));
  }

  // ── Message handling ──────────────────────────────────────────────────────

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private notifyHandlers(event: ServerToClientEvent): void {
    this.handlers.forEach((h) => h(event));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private isActiveSocket(): boolean {
    return (
      !!this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    );
  }

  destroy(): void {
    this.isDestroyed = true;
    this.cancelReconnectTimer();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    this.ws?.close();
  }
}

let instance: ApiPerfWebSocket | null = null;

export function getWebSocketClient(): ApiPerfWebSocket {
  if (!instance) instance = new ApiPerfWebSocket();
  return instance;
}
