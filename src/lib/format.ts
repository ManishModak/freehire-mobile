/**
 * Presentation helpers for a job card. Pure functions that turn the API's
 * controlled-vocabulary codes and raw fields into display strings — ported from
 * the web app (hire/web/src/lib/enrichment.ts + utils.ts) so a card reads the
 * same on phone and web. The client never re-validates; it only formats.
 */

import type { Enrichment, Job } from './types';

// --- Label maps (only codes whose label differs from the title-cased fallback) --

const REGION_LABELS: Record<string, string> = {
  global: 'Global',
  north_america: 'North America',
  latam: 'LATAM',
  eu: 'Europe',
  uk: 'UK',
  mena: 'MENA',
  africa: 'Africa',
  apac: 'APAC',
  cis: 'CIS',
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
};

const WORK_MODE_LABELS: Record<string, string> = { onsite: 'On-site' };
const SENIORITY_LABELS: Record<string, string> = { c_level: 'C-level' };

const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
const PERIOD_SUFFIX: Record<string, string> = {
  month: ' / mo',
  day: ' / day',
  hour: ' / hr',
  // `year` is the implicit default and reads cleaner with no suffix.
};

/** Title-case an unknown snake_case code, so a future vocabulary addition never
 *  renders blank (e.g. "data_engineering" → "Data engineering"). */
function humanize(value: string): string {
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function label(map: Record<string, string>, value: string): string {
  return map[value] ?? humanize(value);
}

// --- Time -------------------------------------------------------------------

const TIME_UNITS: [string, number][] = [
  ['y', 31536000],
  ['mo', 2592000],
  ['w', 604800],
  ['d', 86400],
  ['h', 3600],
  ['m', 60],
];

/**
 * Compact "how long ago" for the card's top-right corner: "3d", "5h", "2w".
 * Deliberately short (unlike the web's "3 days ago") because the corner is tight.
 * Returns "now" for anything under a minute, "" for a missing/invalid timestamp.
 */
export function timeAgo(ts: string | null | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'now';
  for (const [unit, span] of TIME_UNITS) {
    if (seconds >= span) return `${Math.round(seconds / span)}${unit}`;
  }
  return 'now';
}

// --- Salary -----------------------------------------------------------------

/** Group thousands with thin spaces, matching the web's salary line. */
function groupThousands(n: number): string {
  return n.toLocaleString('en-US').replace(/,/g, ' ');
}

/**
 * Render the compensation line, or null when no salary is stated. Handles the
 * full range, a min-only floor ("from …"), and a max-only ceiling ("up to …").
 * The currency symbol and period suffix trail the amount, as in the design.
 */
export function formatSalary(e: Enrichment | null | undefined): string | null {
  if (!e) return null;
  const { salary_min, salary_max } = e;
  if (salary_min == null && salary_max == null) return null;

  const symbol = e.salary_currency
    ? CURRENCY_SYMBOL[e.salary_currency] ?? e.salary_currency
    : '';
  const period = e.salary_period ? PERIOD_SUFFIX[e.salary_period] ?? '' : '';
  const tail = `${symbol}${period}`;

  let amount: string;
  if (salary_min != null && salary_max != null) {
    amount = `${groupThousands(salary_min)} – ${groupThousands(salary_max)}`;
  } else if (salary_min != null) {
    amount = `from ${groupThousands(salary_min)}`;
  } else {
    amount = `up to ${groupThousands(salary_max as number)}`;
  }
  return tail ? `${amount} ${tail}` : amount;
}

// --- Chips ------------------------------------------------------------------

/**
 * The quiet outline chips under the title: work mode, region(s), employment
 * type, seniority — in that order of signal, matching the web card. Absent
 * facets are simply skipped, so a sparse job shows fewer chips rather than
 * empty placeholders.
 */
export function cardTags(job: Job): string[] {
  const e = job.enrichment;
  const tags: string[] = [];

  if (e?.work_mode) tags.push(label(WORK_MODE_LABELS, e.work_mode));
  if (job.regions?.length) {
    tags.push(job.regions.map((r) => label(REGION_LABELS, r)).join(', '));
  }
  if (e?.employment_type) tags.push(label(EMPLOYMENT_LABELS, e.employment_type));
  if (e?.seniority) tags.push(label(SENIORITY_LABELS, e.seniority));

  return tags;
}

// --- Blurb ------------------------------------------------------------------

/**
 * A one-line description for the card. Prefer the clean model-written summary,
 * but only tech jobs are enriched — fall back to a plain-text snippet of the raw
 * HTML posting so non-tech jobs still show something. Strips tags and collapses
 * whitespace, then truncates on a word boundary.
 */
export function blurb(job: Job, max = 160): string | null {
  const summary = job.enrichment?.summary?.trim();
  if (summary) return summary;

  const raw = job.description ?? '';
  if (!raw) return null;
  const text = raw
    .replace(/<[^>]*>/g, ' ') // drop tags
    .replace(/&[a-z]+;|&#\d+;/gi, ' ') // drop entities
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max)}…`;
}
