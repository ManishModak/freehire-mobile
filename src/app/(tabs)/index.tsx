import { FlashList } from '@shopify/flash-list';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { JobCard } from '@/components/JobCard';
import { getColors, Space } from '@/constants/freehire';
import { useJobsFeed } from '@/lib/useJobsFeed';
import type { Job } from '@/lib/types';

export default function FeedScreen() {
  const c = getColors(useColorScheme());
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useJobsFeed();

  // Flatten the paged envelope into one job array for the list. The total (there
  // are millions) rides along for the header count.
  const jobs = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data]);
  const total = data?.pages[0]?.meta.total ?? 0;

  const header = (
    <View style={styles.header}>
      {/* Original freehire lockup: the ring-and-diamond mark beside the monochrome
          wordmark, both tracking the theme foreground (matches web TopBar). */}
      <View style={styles.brand}>
        <BrandMark size={26} color={c.foreground} />
        <Text style={[styles.wordmark, { color: c.foreground }]}>freehire</Text>
      </View>
      <Text style={[styles.tagline, { color: c.mutedForeground }]}>
        {total > 0
          ? `${total.toLocaleString('en-US')} open jobs · no login, no noise`
          : 'Fresh jobs from every board'}
      </Text>
    </View>
  );

  // Initial load: a centered spinner rather than an empty list flash.
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.fill, styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.brand} />
      </SafeAreaView>
    );
  }

  // Hard failure on the first page — offer the wordmark plus the reason.
  if (isError && jobs.length === 0) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[styles.fill, styles.center, { backgroundColor: c.background }]}>
        {header}
        <Text style={[styles.errorText, { color: c.mutedForeground }]}>
          Couldn’t load jobs.{'\n'}
          {(error as Error)?.message ?? 'Please try again.'}
        </Text>
        <Text onPress={() => refetch()} style={[styles.retry, { color: c.brand }]}>
          Tap to retry
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: c.background }]}>
      <FlashList<Job>
        data={jobs}
        keyExtractor={(job) => job.public_slug}
        renderItem={({ item }) => <JobCard job={item} />}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: Space.md }} />}
        // Load the next page a screenful before the end so scrolling stays smooth.
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={refetch}
            tintColor={c.brand}
            colors={[c.brand]}
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={c.brand} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: Space.md },
  listContent: {
    paddingHorizontal: Space.lg,
    paddingBottom: Space.xl,
  },
  header: {
    paddingTop: Space.sm,
    paddingBottom: Space.lg,
    gap: 4,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  wordmark: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  tagline: {
    fontSize: 13,
  },
  footer: {
    paddingVertical: Space.lg,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: Space.xl,
  },
  retry: {
    fontSize: 15,
    fontWeight: '600',
  },
});
