import type { ClientMessage, ServerMessage } from '../contract';
import { createMockSocket } from './mockSocket';
import { createRealSocket } from './realSocket';

export type ConnStatus = 'connecting' | 'open' | 'reconnecting';

/** Shared interface for the real WebSocket and the mock. */
export interface VybeSocket {
  send(msg: ClientMessage): void;
  /** Binary PCM16 mic frame; only between talk_start and talk_end. */
  sendAudio(frame: ArrayBuffer): void;
  subscribe(cb: (msg: ServerMessage) => void): () => void;
  onStatus(cb: (status: ConnStatus) => void): () => void;
  close(): void;
}

export const isMock =
  new URLSearchParams(location.search).has('mock') || import.meta.env.VITE_MOCK === '1';

export function createSocket(): VybeSocket {
  if (isMock) return createMockSocket();
  return createRealSocket(`${location.origin.replace(/^http/, 'ws')}/ws`);
}
