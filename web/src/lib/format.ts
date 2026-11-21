import type { Category, Row, Status } from '../contract';

export const STATUS_LABEL: Record<Status, string> = {
  on_time: 'On time',
  boarding: 'Boarding',
  last_call: 'Last call',
  departed: 'Departed',
  delayed_rain: 'Delayed',
  cancelled: 'Cancelled',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  comedy: 'Comedy',
  games: 'Games',
  food: 'Food',
  music: 'Music',
  culture: 'Culture',
  bar: 'Bar',
  other: 'Other',
};

function pounds(n: number): string {
  return Number.isInteger(n) ? `£${n}` : `£${n.toFixed(2)}`;
}

/** "Free", "£8", "£8 student" — or null when the price is unknown. */
export function formatPrice(row: Row, student: boolean): string | null {
  if (row.your_price === null) return null;
  if (row.your_price === 0) return 'Free';
  const base = pounds(row.your_price);
  return student && row.was_price !== null ? `${base} student` : base;
}
