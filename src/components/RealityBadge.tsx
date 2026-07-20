import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import { getColors, Radius } from '@/constants/freehire';
import { postingContrast, realityBadge } from '@/lib/reality';
import type { Reality } from '@/lib/types';

// Amber isn't in the freehire palette (it's a one-off warning tone), so the
// "warn" chip carries its own values — matching the web's amber-500/700/400.
const AMBER = {
  border: 'rgba(245, 158, 11, 0.4)', // amber-500/40
  bg: 'rgba(245, 158, 11, 0.1)', // amber-500/10
  textLight: '#b45309', // amber-700
  textDark: '#fbbf24', // amber-400
};

/**
 * The job-reality trust signal as a facts-backed chip. Renders nothing for a
 * fresh or unclassified job (realityBadge returns null). `detailed` appends the
 * complementary evidence — the posting-date contrast plus the copy/repost counts
 * — beside the chip, exactly as the web's detail view does.
 */
export function RealityBadge({
  reality,
  postedAt,
  detailed = false,
}: {
  reality?: Reality | null;
  postedAt?: string | null;
  detailed?: boolean;
}) {
  const scheme = useColorScheme();
  const c = getColors(scheme);

  const badge = realityBadge(reality);
  if (!badge) return null;

  // The posting-contrast note first (when the source date reads fresher than the
  // true age), then the remaining evidence — joined the same way as the web.
  const detail =
    reality && detailed
      ? [postingContrast(reality, postedAt), badge.evidence].filter(Boolean).join(' · ')
      : '';

  const warn = badge.tone === 'warn';
  const chipStyle = warn
    ? { borderColor: AMBER.border, backgroundColor: AMBER.bg }
    : { borderColor: c.border, backgroundColor: 'transparent' };
  const textColor = warn ? (scheme === 'dark' ? AMBER.textDark : AMBER.textLight) : c.mutedForeground;

  return (
    <View style={styles.row}>
      <View style={[styles.chip, chipStyle]}>
        <Text style={[styles.chipText, { color: textColor }]}>{badge.label}</Text>
      </View>
      {detail ? <Text style={[styles.detail, { color: c.mutedForeground }]}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detail: {
    fontSize: 12,
  },
});
