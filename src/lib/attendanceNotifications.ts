import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { ShiftLabel, WorkPattern } from './types';

const STORAGE_KEY = 'kemob-attendance-notification-ids';
const CHANNEL_ID = 'attendance-reminders';

if (Platform.OS === 'android') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const timesFor = (shift: ShiftLabel, workPattern: WorkPattern) => {
  if (workPattern === 'Opsi 1') {
    return shift === 'Pagi'
      ? { checkIn: [6, 20], checkOut: [14, 30] }
      : { checkIn: [8, 50], checkOut: [17, 0] };
  }
  return shift === 'Pagi'
    ? { checkIn: [6, 20], checkOut: [13, 0] }
    : { checkIn: [10, 20], checkOut: [17, 0] };
};

async function cancelStoredReminders() {
  if (Platform.OS !== 'android') return;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const ids: string[] = raw ? JSON.parse(raw) : [];
  await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function scheduleAttendanceReminders(shift: ShiftLabel, workPattern: WorkPattern) {
  if (Platform.OS !== 'android') return false;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Pengingat Absensi',
    description: 'Pengingat absen masuk dan absen pulang KEMOB KW.',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 150, 250],
  });

  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  await cancelStoredReminders();
  const times = timesFor(shift, workPattern);
  const weekdays = workPattern === 'Opsi 1' ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7];
  const ids: string[] = [];

  for (const weekday of weekdays) {
    ids.push(await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pengingat Absen Masuk',
        body: 'Jam masuk 10 menit lagi. Jangan lupa tap absen masuk di KEMOB KW.',
        sound: 'default',
        data: { route: '/home', reminder: 'check-in' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: times.checkIn[0],
        minute: times.checkIn[1],
        channelId: CHANNEL_ID,
      },
    }));
    ids.push(await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pengingat Absen Pulang',
        body: 'Jam kerja sudah selesai. Jangan lupa tap absen pulang di KEMOB KW.',
        sound: 'default',
        data: { route: '/home', reminder: 'check-out' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: times.checkOut[0],
        minute: times.checkOut[1],
        channelId: CHANNEL_ID,
      },
    }));
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  return true;
}

export async function cancelAttendanceReminders() {
  await cancelStoredReminders();
}
