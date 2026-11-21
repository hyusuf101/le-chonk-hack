import type { CSSProperties } from 'react';
import type { Category, Row, VenueColors } from '../contract';

// A touch richer than the original spec values, which read muddy on the dark station chrome.
export const CATEGORY_COLORS: Record<Category, VenueColors> = {
  comedy: { deep: '#45303C', soft: '#6A4C5D', light: '#F0DDE7' },
  games: { deep: '#2F3F2A', soft: '#4F6547', light: '#DFEBD1' },
  food: { deep: '#493424', soft: '#6E513A', light: '#F3DFCA' },
  music: { deep: '#2C3350', soft: '#4B5784', light: '#DCE3F4' },
  culture: { deep: '#3F3A31', soft: '#635B4D', light: '#EEE6D7' },
  bar: { deep: '#46302F', soft: '#6C4B48', light: '#F4DFDB' },
  other: { deep: '#33334A', soft: '#53536E', light: '#E5E2F1' },
};

/** Server colours first, then category fallback. (Photo extraction lands in P3.) */
export function venueColors(row: Row): VenueColors {
  return row.colors ?? CATEGORY_COLORS[row.category];
}

/** CSS custom properties that put a subtree into the venue's colour world. */
export function venueStyle(c: VenueColors): CSSProperties {
  return { '--deep': c.deep, '--soft': c.soft, '--light': c.light } as CSSProperties;
}
