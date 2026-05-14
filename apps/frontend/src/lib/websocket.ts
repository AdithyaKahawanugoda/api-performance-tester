'use client';

import type { ServerToClientEvent } from '@api-perf/shared';

type MessageHandler = (event: ServerToClientEvent) => void;

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000/ws';

class ApiPerfWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnects = 8;
  private readonly baseDelay = 1000;
  private handlers = new Set<MessageHandler>();
  private subscribedRuns = new Set<string>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  connect(): void {
    if (this.isDestroyed || this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.subscribedRuns.forEach((runId) => this.sendSubscribe(runId));
      this.notifyHandlers({ type: 'RUN_STATUS_CHANGED', payload: { runId: '__ws__', status: 'running' } } as unknown as ServerToClientEvent);
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerToClientEvent & { type: string };
        this.notifyHandlers(msg);
      } catch { /* ignore */ }
    };

    this.ws.onclose = () => {
      if (this.isDestroyed) return;
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnects) return;
    const delay = Math.min(this.baseDelay * 2 ** this.reconnectAttempts, 16_000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

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

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private notifyHandlers(event: ServerToClientEvent): void {
    this.handlers.forEach((h) => h(event));
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  destroy(): void {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}

let instance: ApiPerfWebSocket | null = null;

export function getWebSocketClient(): ApiPerfWebSocket {
  if (!instance) instance = new ApiPerfWebSocket();
  return instance;
}
