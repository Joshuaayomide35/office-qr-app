import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHECKOUT_REMINDER_ID = 'office-checkout-reminder';

export const notificationsSupported = Platform.OS !== 'web';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** hour/minute in 24h local time */
export async function scheduleCheckoutReminder(hour: number, minute: number) {
  if (!notificationsSupported) return;
  await Notifications.cancelScheduledNotificationAsync(CHECKOUT_REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: CHECKOUT_REMINDER_ID,
    content: {
      title: 'Time to check out',
      body: "Don't forget to scan the QR code before you leave the office.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelCheckoutReminder() {
  if (!notificationsSupported) return;
  await Notifications.cancelScheduledNotificationAsync(CHECKOUT_REMINDER_ID).catch(() => {});
}
