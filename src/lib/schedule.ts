import type { ShiftLabel, WorkPattern } from './types';

export type WorkSchedule = { start: string; end: string };

export function scheduleFor(date: string, shift: ShiftLabel, workPattern: WorkPattern = 'Opsi 1'): WorkSchedule | null {
  const day = new Date(`${date}T00:00:00`).getDay();
  if (day === 0) return null;
  if (workPattern === 'Opsi 1') {
    if (day === 6) return null;
    return shift === 'Pagi' ? { start: '06:30', end: '14:30' } : { start: '09:00', end: '17:00' };
  }
  return shift === 'Pagi' ? { start: '06:30', end: '13:00' } : { start: '10:30', end: '17:00' };
}

export const scheduleText = (date: string, shift: ShiftLabel, workPattern: WorkPattern = 'Opsi 1') => {
  const schedule = scheduleFor(date, shift, workPattern);
  return schedule ? `${schedule.start}–${schedule.end}` : null;
};

export const checkInResult = (lateMinutes: number) =>
  lateMinutes > 0 ? `Terlambat ${lateMinutes} menit` : 'Tepat waktu';

export const checkOutResult = (earlyLeaveMinutes: number) =>
  earlyLeaveMinutes > 0 ? `Terlalu cepat ${earlyLeaveMinutes} menit` : 'Tepat waktu';
