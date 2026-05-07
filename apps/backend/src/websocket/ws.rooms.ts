import type { WebSocket } from 'ws';

const rooms = new Map<string, Set<WebSocket>>();

export const wsRooms = {
  join(runId: string, socket: WebSocket): void {
    if (!rooms.has(runId)) {
      rooms.set(runId, new Set());
    }
    rooms.get(runId)!.add(socket);
  },

  leave(runId: string, socket: WebSocket): void {
    const room = rooms.get(runId);
    if (room) {
      room.delete(socket);
      if (room.size === 0) rooms.delete(runId);
    }
  },

  broadcast(runId: string, message: string): void {
    const room = rooms.get(runId);
    if (!room) return;
    for (const socket of room) {
      if (socket.readyState === 1) {
        socket.send(message);
      }
    }
  },

  removeSocket(socket: WebSocket): void {
    for (const [runId, room] of rooms) {
      room.delete(socket);
      if (room.size === 0) rooms.delete(runId);
    }
  },

  getRoomSize(runId: string): number {
    return rooms.get(runId)?.size ?? 0;
  },
};
