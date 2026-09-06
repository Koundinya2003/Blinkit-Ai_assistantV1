/**
 * Rupees with Indian digit grouping (1,23,456). Written out rather than left to
 * `Intl` so the server and the browser always agree — ICU data differs between
 * Node builds and browsers, and a mismatch here breaks hydration.
 */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(Math.abs(amount));
  const digits = String(rounded);
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return `${amount < 0 ? "-" : ""}\u20B9${grouped}`;
}

/**
 * Compact counts are formatted by hand rather than with Intl's `compact`
 * notation: Node and browsers ship different ICU data for en-IN (one renders
 * 14200 as "14.2T", the other as "14.2K"), which breaks hydration.
 */
export function formatCount(value: number): string {
  if (value >= 10_000_000) return `${trim(value / 10_000_000)}Cr`;
  if (value >= 100_000) return `${trim(value / 100_000)}L`;
  if (value >= 1_000) return `${trim(value / 1_000)}k`;
  return String(Math.round(value));
}

function trim(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
