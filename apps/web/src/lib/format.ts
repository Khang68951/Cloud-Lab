import type { Locale } from '@cloudlab/shared';

const INTL_LOCALE: Record<Locale, string> = { en: 'en-US', vi: 'vi-VN' };

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(INTL_LOCALE[locale], options).format(value);
}

/** AWS prices are always USD. */
export function formatUsd(amount: number, locale: Locale) {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount !== 0 && Math.abs(amount) < 1 ? 4 : 2,
  }).format(amount);
}

export function formatVnd(amount: number, locale: Locale) {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "$1,234.50" or "$1,234.50 (≈ 32.097.000 ₫)" depending on settings. */
export function formatPrice(
  usd: number,
  locale: Locale,
  opts: { showVnd: boolean; vndPerUsd: number },
): string {
  const base = formatUsd(usd, locale);
  return opts.showVnd ? `${base} (≈ ${formatVnd(usd * opts.vndPerUsd, locale)})` : base;
}
