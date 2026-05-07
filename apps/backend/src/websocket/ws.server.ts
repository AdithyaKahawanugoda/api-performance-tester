import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { wsRooms } from './ws.rooms';
import { logger } from '../lib/logger';
import { HEARTBEAT_INTERVAL_MS } from '../config/constants';
import type { ClientToServerEvent } from '@api-perf/shared';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  subscribedRuns: Set<string>;
}

let wss: WebSocketServer | null = null;

export function createWsServer(): WebSocketServer {
  wss = new WebSocketServer({ noServer: true });

  const heartbeatInterval = setInterval(() => {
    wss!.clients.forEach((rawSocket) => {
      const socket = rawSocket as ExtendedWebSocket;
      if (!socket.isAlive) {
        wsRooms.removeSocket(socket);
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => clearInterval(heartbeatInterval));

  wss.on('connection', (rawSocket: WebSocket, req: IncomingMessage) => {
    const socket = rawSocket as ExtendedWebSocket;
    socket.isAlive = true;
    socket.subscribedRuns = new Set();

    logger.debug({ ip: req.socket.remoteAddress }, 'WebSocket client connected');

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', (data) => {
      try {
        const event: ClientToServerEvent = JSON.parse(data.toString());
        handleClientMessage(socket, event);
      } catch {
        socket.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid message format' }, timestamp: Date.now() }));
      }
    });

    socket.on('close', () => {
      wsRooms.removeSocket(socket);
      logger.debug('WebSocket client disconnected');
    });

    socket.on('error', (err) => {
      logger.warn({ err }, 'WebSocket error');
      wsRooms.removeSocket(socket);
    });

    socket.send(JSON.stringify({ type: 'CONNECTED', payload: { message: 'WebSocket connected' }, timestamp: Date.now() }));
  });

  return wss;
}

function handleClientMessage(socket: ExtendedWebSocket, event: ClientToServerEvent): void {
  switch (event.type) {
    case 'SUBSCRIBE_RUN': {
      const { runId } = event.payload;
      socket.subscribedRuns.add(runId);
      wsRooms.join(runId, socket);
      socket.send(JSON.stringify({ type: 'SUBSCRIBED', payload: { runId }, timestamp: Date.now() }));
      break;
    }
    case 'UNSUBSCRIBE_RUN': {
      const { runId } = event.payload;
      socket.subscribedRuns.delete(runId);
      wsRooms.leave(runId, socket);
      break;
    }
    case 'CANCEL_RUN': {
      break;
    }
  }
}

export function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
  if (!wss) return;
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss!.emit('connection', ws, req);
  });
}
