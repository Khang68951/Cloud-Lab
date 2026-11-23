import type { Category } from '@cloudlab/catalog';

/** Category colour (OKLCH hue), loosely following AWS architecture-icon colours. */
export const CATEGORY_HUE: Record<Category, number> = {
  client: 250,
  edge: 300,
  network: 280,
  compute: 45,
  database: 255,
  storage: 145,
  messaging: 350,
  security: 25,
  analytics: 270,
  ml: 170,
  management: 320,
  devtools: 225,
  iot: 130,
  media: 70,
  migration: 195,
  business: 5,
};
