import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { getColors } from '@/constants/freehire';
import { FilterProvider } from '@/lib/filterStore';

SplashScreen.preventAutoHideAsync();

// One client for the app's lifetime. `staleTime` keeps the feed from refetching
// the moment you switch tabs and back — job listings don't change second-to-second.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2 },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const c = getColors(colorScheme);

  // Root Stack. The `(tabs)` group owns the tab bar and renders headerless; the
  // job-detail screen pushes over it with a native back button, tinted to match
  // the freehire palette so the header reads as part of the app, not chrome.
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        {/* FilterProvider wraps the whole Stack so the feed and the Filters
            modal share one filter state. */}
        <FilterProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: c.background },
              headerTintColor: c.brandStrong,
              headerTitleStyle: { color: c.foreground },
              contentStyle: { backgroundColor: c.background },
            }}>
            {/* The feed is the app's single root screen (no bottom tab bar). */}
            <Stack.Screen name="index" options={{ headerShown: false }} />
            {/* No native header — the detail screen draws its own compact back
                chevron so the empty header bar never eats vertical space. */}
            <Stack.Screen name="jobs/[slug]" options={{ headerShown: false }} />
            {/* The Filters screen presents as a modal over the feed. */}
            <Stack.Screen name="filters" options={{ headerShown: false, presentation: 'modal' }} />
          </Stack>
        </FilterProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
