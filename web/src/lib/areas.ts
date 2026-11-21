import type { Place } from '../contract';

export interface Area {
  name: string;
  lat: number;
  lng: number;
}

/** London areas and stations people plan nights around. The first eight are the quick picks. */
export const AREAS: Area[] = [
  { name: 'London Bridge', lat: 51.5055, lng: -0.0865 },
  { name: 'Shoreditch', lat: 51.5265, lng: -0.0786 },
  { name: 'Soho', lat: 51.5137, lng: -0.1366 },
  { name: "King's Cross", lat: 51.5308, lng: -0.1238 },
  { name: 'Camden', lat: 51.539, lng: -0.1426 },
  { name: 'Brixton', lat: 51.4613, lng: -0.1156 },
  { name: 'Covent Garden', lat: 51.5117, lng: -0.124 },
  { name: 'Peckham', lat: 51.474, lng: -0.069 },
  { name: 'Angel', lat: 51.5322, lng: -0.1058 },
  { name: 'Bank', lat: 51.5133, lng: -0.0886 },
  { name: 'Battersea', lat: 51.4791, lng: -0.1462 },
  { name: 'Bermondsey', lat: 51.4979, lng: -0.0637 },
  { name: 'Bethnal Green', lat: 51.527, lng: -0.0549 },
  { name: 'Borough', lat: 51.5011, lng: -0.0943 },
  { name: 'Canary Wharf', lat: 51.5054, lng: -0.0235 },
  { name: 'Clapham', lat: 51.4618, lng: -0.1384 },
  { name: 'Dalston', lat: 51.5463, lng: -0.0752 },
  { name: 'Elephant & Castle', lat: 51.4943, lng: -0.1001 },
  { name: 'Farringdon', lat: 51.5203, lng: -0.1053 },
  { name: 'Greenwich', lat: 51.4826, lng: -0.0077 },
  { name: 'Hackney', lat: 51.545, lng: -0.0553 },
  { name: 'Islington', lat: 51.5362, lng: -0.1033 },
  { name: 'Leicester Square', lat: 51.5113, lng: -0.1281 },
  { name: 'Liverpool Street', lat: 51.5178, lng: -0.0823 },
  { name: 'Marylebone', lat: 51.5225, lng: -0.1631 },
  { name: 'Notting Hill', lat: 51.5094, lng: -0.196 },
  { name: 'Old Street', lat: 51.5263, lng: -0.0873 },
  { name: 'Oxford Circus', lat: 51.5152, lng: -0.1418 },
  { name: 'Paddington', lat: 51.5154, lng: -0.1755 },
  { name: 'South Bank', lat: 51.5055, lng: -0.116 },
  { name: 'Southwark', lat: 51.5039, lng: -0.105 },
  { name: 'Stratford', lat: 51.5413, lng: -0.0032 },
  { name: 'Vauxhall', lat: 51.4861, lng: -0.1253 },
  { name: 'Waterloo', lat: 51.5031, lng: -0.1132 },
  { name: 'Whitechapel', lat: 51.5195, lng: -0.0599 },
];

export const QUICK_PICKS = AREAS.slice(0, 8);

const fold = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/&/g, 'and');

export function searchAreas(query: string): Area[] {
  const q = fold(query.trim());
  if (!q) return QUICK_PICKS;
  return AREAS.filter((a) => fold(a.name).includes(q));
}

export const placeFromArea = (a: Area): Place => ({ lat: a.lat, lng: a.lng, label: a.name, source: 'search' });

/** Ask the phone where it is. Resolves null if denied, unavailable or slow. */
export function locateMe(): Promise<Place | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Near you', source: 'gps' }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
    );
  });
}
