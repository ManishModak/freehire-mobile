import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/authStore';
import { getColors, Radius, Space } from '@/constants/freehire';
import { formatDate } from '@/lib/format';

/**
 * The account screen (modal) for a signed-in user: their email, a couple of
 * status badges, and a sign-out button. Signing out clears the session and
 * closes the modal back to the feed.
 */
export default function AccountScreen() {
  const c = getColors(useColorScheme());
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    setBusy(true);
    await signOut();
    router.back();
  }

  const joined = formatDate(user?.created_at);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.fill, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.foreground }]}>Account</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => pressed && { opacity: 0.5 }}>
          <SymbolView name="xmark" size={20} weight="semibold" tintColor={c.foreground} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.identity}>
          <SymbolView name="person.crop.circle.fill" size={56} tintColor={c.brandStrong} />
          <Text style={[styles.email, { color: c.foreground }]} numberOfLines={1}>
            {user?.email ?? 'Signed in'}
          </Text>
          <View style={styles.badges}>
            {user?.role && user.role !== 'user' ? (
              <View style={[styles.badge, { backgroundColor: c.brandMuted }]}>
                <Text style={[styles.badgeText, { color: c.brandStrong }]}>{user.role}</Text>
              </View>
            ) : null}
            {user?.beta_tester ? (
              <View style={[styles.badge, { backgroundColor: c.brandMuted }]}>
                <Text style={[styles.badgeText, { color: c.brandStrong }]}>beta</Text>
              </View>
            ) : null}
          </View>
          {joined ? (
            <Text style={[styles.joined, { color: c.mutedForeground }]}>Joined {joined}</Text>
          ) : null}
        </View>

        <Pressable
          onPress={onSignOut}
          disabled={busy}
          style={({ pressed }) => [
            styles.signOut,
            { borderColor: c.border, backgroundColor: c.card },
            pressed && { backgroundColor: c.accent },
          ]}>
          {busy ? (
            <ActivityIndicator color={c.mutedForeground} />
          ) : (
            <Text style={[styles.signOutText, { color: c.foreground }]}>Sign out</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  body: {
    flex: 1,
    paddingHorizontal: Space.lg,
    paddingTop: Space.xl,
    justifyContent: 'space-between',
  },
  identity: {
    alignItems: 'center',
    gap: Space.sm,
  },
  email: {
    fontSize: 18,
    fontWeight: '600',
    maxWidth: '100%',
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  joined: {
    fontSize: 13,
  },
  signOut: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.lg,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
