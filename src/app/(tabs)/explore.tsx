import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getColors, Space } from '@/constants/freehire';

/**
 * Placeholder for the second tab. Search / saved jobs land here next; for now it
 * keeps the brand look so the app never falls back to the Expo starter content.
 */
export default function ExploreScreen() {
  const c = getColors(useColorScheme());
  return (
    <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: c.background }]}>
      <Text style={[styles.title, { color: c.foreground }]}>Search</Text>
      <Text style={[styles.body, { color: c.mutedForeground }]}>
        Filters, saved jobs and alerts are coming here soon.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: Space.sm, padding: Space.xl },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4 },
  body: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
