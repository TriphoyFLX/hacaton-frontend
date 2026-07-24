import { io, Socket } from 'socket.io-client';
import { SOCKET_ORIGIN } from '../api/client';

const MAX_RECONNECT_ATTEMPTS = 5;

/** Shared app-wide Socket.IO connection (Header + chats share one handshake). */
class AppSocketManager {
  private socket: Socket | null = null;
  private token: string | null = null;
  private refCount = 0;
  private releaseTimer: ReturnType<typeof setTimeout> | null = null;

  acquire(token: string): Socket {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    if (this.socket && this.token === token) {
      this.refCount += 1;
      return this.socket;
    }

    this.destroy();
    this.token = token;
    this.refCount = 1;
    this.socket = io(SOCKET_ORIGIN, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 10000,
    });

    return this.socket;
  }

  release() {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount > 0) return;

    // Keep briefly so Header ↔ route transitions don't reconnect
    this.releaseTimer = setTimeout(() => {
      this.releaseTimer = null;
      if (this.refCount === 0) this.destroy();
    }, 2500);
  }

  get(): Socket | null {
    return this.socket;
  }

  private destroy() {
    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
    this.refCount = 0;
  }
}

export const appSocket = new AppSocketManager();
