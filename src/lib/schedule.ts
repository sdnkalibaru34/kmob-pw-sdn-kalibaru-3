import type { ShiftLabel } from './types';

export type WorkSchedule = { start: string; end: string };

export function scheduleFor(date: string, shift: ShiftLabel): WorkSchedule | null {
  const day = new Date(`${date}T00:00:00`).getDay();
  if (day === 0) return null;
  if (day === 6) return shift === 'Pagi'
    ? { start: '06:30', end: '11:30' }
    : { start: '09:00', end: '14:00' };
  return shift === 'Pagi'
    ? { start: '06:30', end: '14:30' }
    : { start: '09:00', end: '17:00' };
}

export const scheduleText = (date: string, shift: ShiftLabel) => {
  const schedule = scheduleFor(date, shift);
  return schedule ? `${schedule.start}–${schedule.end}` : null;
};

export const checkInResult = (lateMinutes: number) =>
  lateMinutes > 0 ? `Terlambat ${lateMinutes} menit` : 'Tepat waktu';

export const checkOutResult = (earlyLeaveMinutes: number) =>
  earlyLeaveMinutes > 0 ? `Terlalu cepat ${earlyLeaveMinutes} menit` : 'Tepat waktu';
