import { StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/freehire';

/**
 * A company's monogram tile: its first letter over a colour hashed from the full
 * name, so one company keeps the same tile everywhere in the feed. This is the
 * web card's fallback path (hire/web CompanyLogo) — we go straight to it rather
 * than logo.dev, whose key is Referer-locked to freehire.dev and won't resolve
 * from a native app.
 */
export function CompanyLogo({ name, size = 28 }: { name: string; size?: number }) {
  const trimmed = name.trim();
  const initial = (trimmed[0] ?? '?').toUpperCase();

  // Same hash as the web monogram: fold char codes into a 0–359 hue so the tile
  // is stable per company and spread across the wheel.
  let hue = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hue = (hue * 31 + trimmed.charCodeAt(i)) % 360;
  }

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: Radius.md,
          backgroundColor: `hsl(${hue}, 52%, 45%)`,
        },
      ]}>
      <Text style={[styles.letter, { fontSize: size * 0.5 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
