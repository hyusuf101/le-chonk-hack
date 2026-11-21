const params = new URLSearchParams(location.search);

export const displayMode = params.has('display');
export const demoMode = params.has('demo');
export const invitedRoom = params.get('room')?.trim() || null;

export function inviteUrl(room: string): string {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('room', room);
  if (params.has('mock') || import.meta.env.VITE_MOCK === '1') url.searchParams.set('mock', '');
  return url.href;
}
