import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { ShiftLabel, WorkPattern } from './types';

const STORAGE_KEY = 'kemob-attendance-notification-ids';
const CHANNEL_ID = 'attendance-reminders-v2';
const SCHEDULER_VERSION = 2;
const SCHEDULE_DAYS = 90;
const RESCHEDULE_WHEN_DAYS_LEFT = 14;

type StoredReminders = {
  signature: string;
  ids: string[];
  scheduledUntil: string;
  version: number;
};

export type ReminderScheduleResult =
  | { ok: true; scheduledCount: number }
  | { ok: false; reason: 'unsupported' | 'permission-denied' | 'schedule-failed' };

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

const isWorkday = (date: Date, workPattern: WorkPattern) => {
  const day = date.getDay();
  return day >= 1 && day <= (workPattern === 'Opsi 1' ? 5 : 6);
};

const atLocalTime = (date: Date, [hour, minute]: number[]) => {
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
};

const readStoredReminders = async (): Promise<StoredReminders | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredReminders> | string[];
    if (Array.isArray(parsed)) return null;
    if (!parsed.signature || !Array.isArray(parsed.ids) || !parsed.scheduledUntil || parsed.version !== SCHEDULER_VERSION) return null;
    return parsed as StoredReminders;
  } catch {
    return null;
  }
};

async function cancelStoredReminders() {
  if (Platform.OS !== 'android') return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: string[] | Partial<StoredReminders> = raw ? JSON.parse(raw) : [];
    const ids = Array.isArray(parsed) ? parsed : Array.isArray(parsed.ids) ? parsed.ids : [];
    await Promise.allSettled(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
  } catch {
    // A corrupt local cache must not prevent a clean schedule from being created.
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
}

async function storedScheduleIsHealthy(stored: StoredReminders, signature: string) {
  if (stored.signature !== signature || stored.ids.length === 0) return false;
  const refreshAt = new Date(stored.scheduledUntil);
  refreshAt.setDate(refreshAt.getDate() - RESCHEDULE_WHEN_DAYS_LEFT);
  if (refreshAt.getTime() <= Date.now()) return false;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const liveIds = new Set(scheduled.map(item => item.identifier));
  return stored.ids.every(id => liveIds.has(id));
}

async function scheduleOne(date: Date, kind: 'check-in' | 'check-out') {
  const isCheckIn = kind === 'check-in';
  return Notifications.scheduleNotificationAsync({
    content: {
      title: isCheckIn ? 'Pengingat Absen Masuk' : 'Pengingat Absen Pulang',
      body: isCheckIn
        ? 'Jam masuk 10 menit lagi. Jangan lupa tap absen masuk di KEMOB KW.'
        : 'Jam kerja sudah selesai. Jangan lupa tap absen pulang di KEMOB KW.',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { route: '/home', reminder: kind },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: CHANNEL_ID,
    },
  });
}

export async function scheduleAttendanceReminders(
  shift: ShiftLabel,
  workPattern: WorkPattern,
  force = false,
): Promise<ReminderScheduleResult> {
  if (Platform.OS !== 'android') return { ok: false, reason: 'unsupported' };

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Pengingat Absensi',
    description: 'Pengingat absen masuk dan absen pulang KEMOB KW.',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 300, 150, 300],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'permission-denied' };

  const signature = `${SCHEDULER_VERSION}|${workPattern}|${shift}`;
  const stored = await readStoredReminders();
  if (!force && stored && await storedScheduleIsHealthy(stored, signature)) {
    return { ok: true, scheduledCount: stored.ids.length };
  }

  await cancelStoredReminders();
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + SCHEDULE_DAYS);
  end.setHours(23, 59, 59, 999);
  const times = timesFor(shift, workPattern);
  const ids: string[] = [];

  try {
    for (const cursor = new Date(now); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      if (!isWorkday(cursor, workPattern)) continue;
      const checkIn = atLocalTime(cursor, times.checkIn);
      const checkOut = atLocalTime(cursor, times.checkOut);
      if (checkIn.getTime() > now.getTime()) ids.push(await scheduleOne(checkIn, 'check-in'));
      if (checkOut.getTime() > now.getTime()) ids.push(await scheduleOne(checkOut, 'check-out'));
    }

    if (ids.length === 0) return { ok: false, reason: 'schedule-failed' };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      signature,
      ids,
      scheduledUntil: end.toISOString(),
      version: SCHEDULER_VERSION,
    } satisfies StoredReminders));
    return { ok: true, scheduledCount: ids.length };
  } catch {
    await Promise.allSettled(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    await AsyncStorage.removeItem(STORAGE_KEY);
    return { ok: false, reason: 'schedule-failed' };
  }
}

export async function cancelAttendanceReminders() {
  await cancelStoredReminders();
}

export async function notifyRecapDownloadComplete(fileName: string) {
  if (Platform.OS !== 'android') return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Download Rekap Selesai',
      body: `${fileName} selesai dibuat.`,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null,
  });
}
