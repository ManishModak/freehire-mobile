import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import type * as NotificationsType from 'expo-notifications';

/**
 * Push exists on the two native platforms only. On web the module imports fine
 * but every call into it throws ("not available on web"), which took down the
 * root layout's notification effect; Expo Go on Android dropped remote push in
 * SDK 53.
 */
export const isPushSupported =
  (Platform.OS === 'ios' || Platform.OS === 'android') && !(isRunningInExpoGo() && Platform.OS === 'android');

let cachedModule: typeof NotificationsType | null = null;

export function getNotifications(): typeof NotificationsType | null {
  if (!isPushSupported) return null;
  if (cachedModule) return cachedModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-notifications') as typeof NotificationsType;
    return cachedModule;
  } catch {
    return null;
  }
}

export type NotificationResponse = NotificationsType.NotificationResponse;
