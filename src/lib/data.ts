import { supabase } from './supabase';
import type { Attendance, AttendanceStatus, DailyReport, Employee, ShiftLabel, WorkPattern } from './types';

let employeeCache: { userId: string; value: Employee } | null = null;
let employeeRequest: Promise<Employee> | null = null;
let preferenceCache: { employeeId: string; value: { shift: ShiftLabel; workPattern: WorkPattern } } | null = null;

export function clearLocalDataCache() {
  employeeCache = null;
  employeeRequest = null;
  preferenceCache = null;
}

export async function currentEmployee(): Promise<Employee> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Sesi login tidak ditemukan.');
  if (employeeCache?.userId === userId) return employeeCache.value;
  if (employeeRequest) return employeeRequest;
  employeeRequest = (async () => {
    const { data, error } = await supabase.from('employees').select('id,employee_code,full_name,position,ni_pppk').eq('auth_user_id', userId).single();
    if (error || !data) throw new Error('Akun belum terhubung dengan data pegawai.');
    const value = data as Employee;
    employeeCache = { userId, value };
    return value;
  })();
  try { return await employeeRequest; } finally { employeeRequest = null; }
}

export async function saveAttendance(input: {
  date: string; checkIn: string; checkOut: string; shiftLabel: ShiftLabel; workPattern: WorkPattern; status: AttendanceStatus; note: string;
}) {
  const employee = await currentEmployee();
  const { error } = await supabase.from('attendance').upsert({
    employee_id: employee.id,
    attendance_date: input.date,
    check_in: input.checkIn || null,
    check_out: input.checkOut || null,
    shift_label: input.shiftLabel,
    work_pattern: input.workPattern,
    status: input.status,
    note: input.note.trim() || null,
  }, { onConflict: 'employee_id,attendance_date' });
  if (error) throw error;
}

export async function recordCheckIn(date: string, shiftLabel: ShiftLabel, workPattern: WorkPattern, checkIn: string): Promise<Attendance> {
  const employee = await currentEmployee();
  const { data, error } = await supabase.from('attendance').upsert({
    employee_id: employee.id,
    attendance_date: date,
    check_in: checkIn,
    shift_label: shiftLabel,
    work_pattern: workPattern,
    status: 'Hadir',
  }, { onConflict: 'employee_id,attendance_date' }).select('*').single();
  if (error || !data) throw error ?? new Error('Absensi masuk belum dapat disimpan.');
  return data as Attendance;
}

export async function recordCheckOut(date: string, shiftLabel: ShiftLabel, workPattern: WorkPattern, checkOut: string): Promise<Attendance> {
  const employee = await currentEmployee();
  const { data, error } = await supabase.from('attendance').update({
    check_out: checkOut,
    shift_label: shiftLabel,
    work_pattern: workPattern,
    status: 'Hadir',
  }).eq('employee_id', employee.id).eq('attendance_date', date).not('check_in', 'is', null).select('*').single();
  if (error || !data) throw error ?? new Error('Absensi pulang belum dapat disimpan.');
  return data as Attendance;
}

export async function submitAbsenceRequest(input: {
  startDate: string; endDate: string; status: Exclude<AttendanceStatus, 'Hadir' | 'Tanpa Keterangan'>; note: string; shiftLabel: ShiftLabel; workPattern: WorkPattern;
}) {
  const employee = await currentEmployee();
  const dates = (await workCalendar(input.startDate, input.endDate, input.workPattern)).map(row => row.work_date);
  if (!dates.length) throw new Error('Rentang ini tidak memiliki hari kerja.');
  const existing = await ownAttendance(input.startDate, input.endDate);
  if (existing.some(row => row.check_in || row.check_out)) throw new Error('Sebagian rentang sudah memiliki data absensi.');
  const { error } = await supabase.from('attendance').upsert(dates.map(date => ({
    employee_id: employee.id, attendance_date: date, check_in: null, check_out: null,
    shift_label: input.shiftLabel, work_pattern: input.workPattern, status: input.status, note: input.note.trim(),
  })), { onConflict: 'employee_id,attendance_date' });
  if (error) throw error;
  return dates.length;
}

export async function ownProfilePhotoUrl(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;
  const { data } = await supabase.from('profile_photos').select('avatar_path').eq('user_id', userId).maybeSingle();
  if (!data?.avatar_path) return null;
  const { data: signed } = await supabase.storage.from('profile-photos').createSignedUrl(data.avatar_path, 3600);
  return signed?.signedUrl ?? null;
}

export async function saveOwnProfilePhoto(bytes: ArrayBuffer, contentType: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('Sesi login tidak ditemukan.');
  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/profile.${extension}`;
  const { error: uploadError } = await supabase.storage.from('profile-photos').upload(path, bytes, { contentType, upsert: true });
  if (uploadError) throw uploadError;
  const { error } = await supabase.from('profile_photos').upsert({ user_id: userId, avatar_path: path, updated_at: new Date().toISOString() });
  if (error) throw error;
  return ownProfilePhotoUrl();
}

export async function ownDefaultShift(): Promise<ShiftLabel> {
  return (await ownWorkPreference()).shift;
}

export async function ownWorkPreference(): Promise<{ shift: ShiftLabel; workPattern: WorkPattern }> {
  const employee = await currentEmployee();
  if (preferenceCache?.employeeId === employee.id) return preferenceCache.value;
  const { data, error } = await supabase.from('employee_shift_preferences').select('default_shift,work_pattern').eq('employee_id', employee.id).single();
  if (error || !data) throw new Error('Shift utama belum dapat dimuat.');
  const value = { shift: data.default_shift as ShiftLabel, workPattern: data.work_pattern as WorkPattern };
  preferenceCache = { employeeId: employee.id, value };
  return value;
}

export async function updateOwnWorkPreference(defaultShift: ShiftLabel, workPattern: WorkPattern) {
  const employee = await currentEmployee();
  const { error } = await supabase.from('employee_shift_preferences').update({ default_shift: defaultShift, work_pattern: workPattern, updated_at: new Date().toISOString() }).eq('employee_id', employee.id);
  if (error) throw error;
  preferenceCache = { employeeId: employee.id, value: { shift: defaultShift, workPattern } };
}

export async function ownAttendance(from?: string, to?: string): Promise<Attendance[]> {
  const employee = await currentEmployee();
  let query = supabase.from('attendance').select('*').eq('employee_id', employee.id).order('attendance_date', { ascending: false });
  if (from) query = query.gte('attendance_date', from);
  if (to) query = query.lte('attendance_date', to);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Attendance[];
}

export async function workCalendar(from: string, to: string, workPattern?: WorkPattern) {
  const { data, error } = await supabase.from('work_calendar').select('work_date,is_workday,description').gte('work_date', from).lte('work_date', to).eq('is_workday', true).order('work_date');
  if (error) throw error;
  return (data ?? []).filter(row => workPattern !== 'Opsi 1' || new Date(`${row.work_date}T00:00:00`).getDay() !== 6);
}

export async function addDailyReport(input: { date: string; activity: string; result: string; note: string; }) {
  const employee = await currentEmployee();
  const { error } = await supabase.from('daily_reports').upsert({
    employee_id: employee.id,
    report_date: input.date,
    activity: input.activity.trim(),
    result: input.result.trim() || null,
    note: input.note.trim() || null,
  }, { onConflict: 'employee_id,report_date' });
  if (error) throw error;
}

export async function ownReportForDate(date: string): Promise<DailyReport | null> {
  const employee = await currentEmployee();
  const { data, error } = await supabase.from('daily_reports').select('*').eq('employee_id', employee.id).eq('report_date', date).maybeSingle();
  if (error) throw error;
  return (data as DailyReport | null) ?? null;
}

export async function ownReports(limit = 31): Promise<DailyReport[]> {
  const employee = await currentEmployee();
  const { data, error } = await supabase.from('daily_reports').select('*').eq('employee_id', employee.id).order('report_date', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as DailyReport[];
}

export async function ownReportsRange(from: string, to: string): Promise<DailyReport[]> {
  const employee = await currentEmployee();
  const { data, error } = await supabase.from('daily_reports').select('*').eq('employee_id', employee.id).gte('report_date', from).lte('report_date', to).order('report_date');
  if (error) throw error;
  return (data ?? []) as DailyReport[];
}

export async function syncGoogleSheets(month: string) {
  const { data, error } = await supabase.functions.invoke('sync-google-sheets', { body: { month } });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? 'Sinkronisasi Google Sheets gagal.');
  return data as { ok: true; month: string; rows: { employees: number; attendance: number; reports: number } };
}
