import type { ClientMessage, ServerMessage } from '../contract';
import { createMockSocket } from './mockSocket';
import { isMock, WS_URL } from './endpoints';
import { createRealSocket } from './realSocket';

export type ConnStatus = 'connecting' | 'open' | 'reconnecting';

/** Shared interface for the real WebSocket and the mock. */
export interface VybeSocket {
  send(msg: ClientMessage): void;
  /** Binary PCM16 mic frame; only between talk_start and talk_end. */
  sendAudio(frame: ArrayBuffer): void;
  subscribe(cb: (msg: ServerMessage) => void): () => void;
  onStatus(cb: (status: ConnStatus) => void): () => void;
  setFastClock?(fast: boolean): void;
  close(): void;
}

export function createSocket(): VybeSocket {
  return isMock ? createMockSocket() : createRealSocket(WS_URL);
}
