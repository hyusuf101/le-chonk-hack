interface Member {
  id: string;
  name: string;
  item: string | null;
}

type RoomMessage =
  | { type: 'presence'; member: Member; reply: boolean }
  | { type: 'leave'; id: string };

const PRESENCE_MS = 2_000;
const EXPIRE_MS = 8_000;

/** Mock rooms share presence and votes between tabs on this browser and origin. */
export function createMockRoom(room: string, name: string | undefined, observer: boolean, onChange: () => void) {
  const id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  const self: Member = { id, name: name ?? `Guest ${id.slice(0, 4)}`, item: null };
  const peers = new Map<string, { member: Member; seen: number }>();
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(`vybe-mock:${room}`);
  const publish = (reply = false) => {
    if (!observer) channel?.postMessage({ type: 'presence', member: self, reply } satisfies RoomMessage);
  };
  if (channel) channel.onmessage = ({ data }: MessageEvent<RoomMessage>) => {
    if (data.type === 'leave') {
      if (peers.delete(data.id)) onChange();
      return;
    }
    const previous = peers.get(data.member.id)?.member;
    peers.set(data.member.id, { member: data.member, seen: Date.now() });
    if (data.reply) publish();
    if (!previous || previous.item !== data.member.item || previous.name !== data.member.name) onChange();
  };
  publish(true);
  const timer = window.setInterval(() => {
    let changed = false;
    for (const [key, peer] of peers) {
      if (Date.now() - peer.seen > EXPIRE_MS) changed = peers.delete(key) || changed;
    }
    publish();
    if (changed) onChange();
  }, PRESENCE_MS);
  const leave = () => {
    if (!observer) channel?.postMessage({ type: 'leave', id } satisfies RoomMessage);
  };
  window.addEventListener('pagehide', leave);
  return {
    you: self.name,
    members: () => [...(observer ? [] : [self]), ...Array.from(peers.values(), ({ member }) => member)],
    boardOn(item: string | null) {
      if (observer) return;
      self.item = item;
      publish();
      onChange();
    },
    close() {
      window.removeEventListener('pagehide', leave);
      clearInterval(timer);
      leave();
      channel?.close();
    },
  };
}
