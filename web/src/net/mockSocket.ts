import type {
  BoardMsg,
  Budget,
  ChipsMsg,
  ClientMessage,
  Pick,
  Prefs,
  Row,
  ServerMessage,
  Status,
  TalkPurpose,
} from '../contract';
import { MOCK_ITEMS, type MockItem } from '../mock/items';
import { formatHM, londonWallTime, MINUTE } from '../lib/time';
import { displayMode } from '../lib/mode';
import { createMockRoom } from './mockRoom';
import type { ConnStatus, VybeSocket } from './socket';

const TICK_MS = 250;
const BOARD_MS = 2000;
const LEAVE_BUFFER_MIN = 5;
const DEPARTED_KEEP_MIN = 10;
const PICK_SLOTS: Pick[] = ['best', 'runner_up', 'wildcard'];

const DEFAULT_PREFS: Prefs = {
  budget: 999,
  student: false,
  adult: true,
  include: [],
  exclude: [],
  company: 1,
};

const MOCK_SENTENCE = 'Me and two mates, want a laugh, nothing over a tenner.';
const MOCK_COMMAND = 'Cheaper, and nothing outdoors.';
const MOCK_SENTENCE_CHIPS: ChipsMsg = { type: 'chips', include: ['a laugh'], exclude: [], budget: 10, company: 3 };
const WORD_MS = 280;
const HEADS_UP_MIN = 10;
const GO_MIN = 2;
const THINK_MS = 700;

/** How the mock reads "not into" tags against its items. */
const EXCLUDES: Record<string, (item: MockItem) => boolean> = {
  outdoors: (i) => i.outdoor,
  'loud music': (i) => i.category === 'music' || i.id === 'booth-nine',
  'late nights': (i) => i.depart >= '22:00',
};

/** Tiny keyword reader standing in for the server's language model. */
function chipsFromText(text: string): ChipsMsg {
  const t = text.toLowerCase();
  const include: string[] = [];
  const exclude: string[] = [];
  const has = (...words: string[]) => words.some((w) => t.includes(w));
  if (has('laugh', 'comedy', 'funny')) include.push('a laugh');
  if (has('chill', 'relax', 'quiet')) include.push('chill');
  if (has('eat', 'food', 'hungry', 'dinner')) include.push('food');
  if (has('music', 'jazz', 'gig')) include.push('live music');
  if (has('active', 'bowling', 'ping')) include.push('active');
  if (has('art', 'gallery', 'culture')) include.push('culture');
  if (has('outdoor', 'outside')) exclude.push('outdoors');
  if (has('loud')) exclude.push('loud music');
  let budget: Budget | undefined;
  const amount = /(?:under|less than|max|over)\s*£?\s*(\d+)/.exec(t)?.[1];
  if (has('tenner', 'cheap', 'skint')) budget = 10;
  else if (amount) budget = Number(amount) <= 10 ? 10 : Number(amount) <= 20 ? 20 : 999;
  let company: number | undefined;
  const mates = /(one|two|three|four|\d) (?:mates|friends|people)/.exec(t)?.[1];
  if (mates) company = 1 + (['one', 'two', 'three', 'four'].indexOf(mates) + 1 || Number(mates));
  else if (has('on my own', 'just me', 'solo')) company = 1;
  return { type: 'chips', include, exclude, budget, company };
}

/**
 * In-browser stand-in for the server. This is the ONLY place on the client that computes statuses.
 */
export function createMockSocket(): VybeSocket {
  const listeners = new Set<(msg: ServerMessage) => void>();
  const day = new Date();
  const rainFrom = londonWallTime(day, '19:30').getTime();
  let clock = londonWallTime(day, '18:45').getTime();
  let prefs: Prefs = DEFAULT_PREFS;
  let intervals: number[] = [];
  let joined = false;
  let fast = false;
  let room: ReturnType<typeof createMockRoom> | null = null;
  let area = 'London Bridge';
  const hidden = new Set<string>();
  // Nudge once per item per moment; anything already due when you join stays quiet.
  const announced = new Set<string>();
  const liked = new Set<string>();
  let primed = false;
  let talkTimer: number | undefined;
  let spoken = 0;
  let talkPurpose: TalkPurpose = 'mood';

  const emit = (msg: ServerMessage) => {
    setTimeout(() => listeners.forEach((cb) => cb(msg)), 0);
  };

  function matches(item: MockItem): boolean {
    if (item.your_price !== null && item.your_price > prefs.budget) return false;
    if (item.adult && !prefs.adult) return false;
    return !prefs.exclude.some((tag) => tag === item.category || EXCLUDES[tag]?.(item));
  }

  function toRow(item: MockItem, now: number): Row {
    const { depart, outdoor, adult, checked_min_ago, ...rest } = item;
    const departure = londonWallTime(day, depart).getTime();
    const leaveBy = departure - (item.walk_min + LEAVE_BUFFER_MIN) * MINUTE;
    const mins = (leaveBy - now) / MINUTE;
    let status: Status =
      mins >= 20 ? 'on_time' : mins >= 5 ? 'boarding' : mins >= 0 ? 'last_call' : 'departed';
    if (status !== 'departed' && outdoor && rainFrom <= departure) status = 'delayed_rain';
    return {
      ...rest,
      departure_time: new Date(departure).toISOString(),
      leave_by: new Date(leaveBy).toISOString(),
      status,
      checked_at: new Date(now - checked_min_ago * MINUTE).toISOString(),
    };
  }

  function assignPicks(rows: Row[]) {
    for (const r of rows) {
      if (r.pick && (r.status === 'departed' || r.status === 'delayed_rain')) r.pick = null;
    }
    const taken = new Set(rows.map((r) => r.pick));
    const spare = rows
      .filter((r) => !r.pick && r.status !== 'departed' && r.status !== 'delayed_rain')
      .sort((a, b) => b.score - a.score);
    for (const slot of PICK_SLOTS) {
      if (taken.has(slot)) continue;
      const next = spare.shift();
      if (next) next.pick = slot;
    }
  }

  /** "Basement Stand-Up starts at 19:30", "the deal at Hanabi Ramen Bar ends at 19:15", ... */
  function whatHappens(r: Row): string {
    const t = formatHM(r.departure_time);
    switch (r.departure_label) {
      case 'Starts':
        return `${r.name} starts at ${t}`;
      case 'Deal ends':
        return `the deal at ${r.venue} ends at ${t}`;
      case 'Last entry':
        return `last entry for ${r.name} is ${t}`;
      case 'Kitchen closes':
        return `the kitchen at ${r.venue} closes at ${t}`;
    }
  }

  /**
   * Nudges for things the user cares about (best pick or saved), at the moments that need action:
   * a heads-up ~10 min before leaving and "time to go" at leave time. Nothing fires on first load.
   */
  function announceChanges(rows: Row[], now: number) {
    for (const r of rows) {
      if (r.pick !== 'best' && !liked.has(r.id)) continue;
      const mins = Math.round((Date.parse(r.leave_by) - now) / MINUTE);
      const kind = mins <= HEADS_UP_MIN && mins > GO_MIN ? 'boarding' : mins <= GO_MIN && mins >= -1 ? 'last_call' : null;
      if (!kind) continue;
      const key = `${r.id}:${kind}`;
      if (announced.has(key)) continue;
      announced.add(key);
      if (!primed) continue;
      const what = whatHappens(r);
      emit({
        type: 'announce',
        item_id: r.id,
        kind,
        url: '',
        caption:
          kind === 'boarding'
            ? `Heads up: ${what.charAt(0).toUpperCase() + what.slice(1)}. Leave in about ${mins} min.`
            : `Time to go: leave now, ${what}.`,
      });
    }
    primed = true;
  }

  function board(): BoardMsg {
    const rows = MOCK_ITEMS.filter((item) => !hidden.has(item.id) && matches(item))
      .map((item) => toRow(item, clock))
      .filter((r) => Date.parse(r.leave_by) > clock - DEPARTED_KEEP_MIN * MINUTE)
      .sort((a, b) => Date.parse(a.leave_by) - Date.parse(b.leave_by));
    assignPicks(rows);
    if (joined) announceChanges(rows, clock);
    const members = room?.members() ?? [];
    const boarded: BoardMsg['boarded'] = Object.create(null);
    for (const member of members) {
      if (member.item) (boarded[member.item] ??= []).push(member.name);
    }
    const agreed = members.length > 1 && members.every((member) => member.item && member.item === members[0].item);
    const choice = agreed ? rows.find((row) => row.id === members[0].item && row.status !== 'departed' && row.status !== 'delayed_rain') : undefined;
    return {
      type: 'board',
      now: new Date(clock).toISOString(),
      area,
      weather: { summary: 'Light rain', rain_from: new Date(rainFrom).toISOString() },
      count: rows.filter((r) => r.status !== 'departed' && r.status !== 'cancelled').length,
      members: members.map(({ name }) => name),
      rows,
      boarded,
      decision: choice ? {
        item_id: choice.id,
        by: 'Group',
        plan: { leave_in_min: Math.max(0, Math.ceil((Date.parse(choice.leave_by) - clock) / MINUTE)), walk_min: choice.walk_min },
      } : null,
    };
  }

  function start() {
    if (intervals.length) return;
    let last = performance.now();
    intervals = [
      window.setInterval(() => {
        const t = performance.now();
        clock += (t - last) * (fast ? 60 : 1);
        last = t;
      }, TICK_MS),
      window.setInterval(() => emit(board()), BOARD_MS),
    ];
  }

  return {
    send(msg: ClientMessage) {
      switch (msg.type) {
        case 'join': {
          const code = msg.room ?? `mock-${Math.random().toString(36).slice(2, 9)}`;
          room?.close();
          room = createMockRoom(code, msg.name, displayMode, () => emit(board()));
          joined = true;
          emit({ type: 'joined', room: code, you: room.you });
          start();
          emit(board());
          break;
        }
        case 'board_on':
          room?.boardOn(msg.item_id);
          break;
        case 'prefs': {
          const { type, ...next } = msg;
          prefs = next;
          if (joined) emit(board());
          break;
        }
        case 'talk_start': {
          talkPurpose = msg.purpose;
          const words = (talkPurpose === 'command' ? MOCK_COMMAND : MOCK_SENTENCE).split(' ');
          spoken = 0;
          clearInterval(talkTimer);
          talkTimer = window.setInterval(() => {
            if (spoken >= words.length) return;
            spoken += 1;
            emit({ type: 'transcript', text: words.slice(0, spoken).join(' '), final: false });
          }, WORD_MS);
          break;
        }
        case 'talk_end':
          clearInterval(talkTimer);
          if (talkPurpose === 'command') {
            // Board command: one step cheaper and no outdoor events, then say what changed.
            emit({ type: 'transcript', text: MOCK_COMMAND, final: true });
            const budget: Budget = prefs.budget === 999 ? 20 : 10;
            const removed = MOCK_ITEMS.filter((i) => !hidden.has(i.id) && matches(i) && i.outdoor).length;
            prefs = { ...prefs, budget, exclude: [...new Set([...prefs.exclude, 'outdoors'])] };
            setTimeout(() => {
              emit({ type: 'chips', include: [], exclude: ['outdoors'], budget });
              emit({
                type: 'note',
                text: removed
                  ? `Removed ${removed} outdoor, budget now under \u00a3${budget}`
                  : `Budget now under \u00a3${budget}`,
              });
              emit(board());
            }, THINK_MS);
          } else {
            emit({ type: 'transcript', text: MOCK_SENTENCE, final: true });
            setTimeout(() => emit(MOCK_SENTENCE_CHIPS), THINK_MS);
          }
          break;
        case 'location':
          // The mock keeps its London Bridge listings; it just reflects where you said you are.
          area = msg.label;
          if (joined) emit(board());
          break;
        case 'feedback': {
          const item = MOCK_ITEMS.find((i) => i.id === msg.item_id);
          if (!item) break;
          if (msg.kind === 'skip') {
            hidden.add(item.id);
            emit({ type: 'note', text: `Hidden ${item.name}. We\u2019ll show fewer like it.` });
            emit(board());
          } else {
            liked.add(item.id);
            emit({ type: 'note', text: `Saved ${item.name}` });
          }
          break;
        }
        case 'talk_text':
          setTimeout(() => emit(chipsFromText(msg.text)), THINK_MS);
          break;
        case 'time_travel':
          if (!joined) break;
          if (Number.isFinite(Date.parse(msg.now))) clock = Date.parse(msg.now);
          emit(board());
          break;
        case 'refresh_now':
          if (joined) emit(board());
          break;
        default:
          break;
      }
    },
    sendAudio() {
      // The mock fakes speech recognition; mic frames are ignored.
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    onStatus(cb: (status: ConnStatus) => void) {
      cb('open');
      return () => undefined;
    },
    setFastClock(value) {
      fast = value;
    },
    close() {
      room?.close();
      intervals.forEach(clearInterval);
      intervals = [];
      clearInterval(talkTimer);
      listeners.clear();
    },
  };
}
