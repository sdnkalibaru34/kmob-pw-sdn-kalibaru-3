import { supabase } from './supabase';
import type { Attendance, AttendanceStatus, DailyReport, Employee, ShiftLabel } from './types';

export async function currentEmployee(): Promise<Employee> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Sesi login tidak ditemukan.');
  const { data, error } = await supabase.from('employees').select('id,employee_code,full_name,position,ni_pppk').eq('auth_user_id', userData.user.id).single();
  if (error || !data) throw new Error('Akun belum terhubung dengan data pegawai.');
  return data as Employee;
}

export async function saveAttendance(input: {
  date: string; checkIn: string; checkOut: string; shiftLabel: ShiftLabel; status: AttendanceStatus; note: string;
}) {
  const employee = await currentEmployee();
  const { error } = await supabase.from('attendance').upsert({
    employee_id: employee.id,
    attendance_date: input.date,
    check_in: input.checkIn || null,
    check_out: input.checkOut || null,
    shift_label: input.shiftLabel,
    status: input.status,
    note: input.note.trim() || null,
  }, { onConflict: 'employee_id,attendance_date' });
  if (error) throw error;
}

export async function ownDefaultShift(): Promise<ShiftLabel> {
  const employee = await currentEmployee();
  const { data, error } = await supabase.from('employee_shift_preferences').select('default_shift').eq('employee_id', employee.id).single();
  if (error || !data) throw new Error('Shift utama belum dapat dimuat.');
  return data.default_shift as ShiftLabel;
}

export async function updateOwnDefaultShift(defaultShift: ShiftLabel) {
  const employee = await currentEmployee();
  const { error } = await supabase.from('employee_shift_preferences').update({ default_shift: defaultShift, updated_at: new Date().toISOString() }).eq('employee_id', employee.id);
  if (error) throw error;
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

export async function workCalendar(from: string, to: string) {
  const { data, error } = await supabase.from('work_calendar').select('work_date,is_workday,description').gte('work_date', from).lte('work_date', to).eq('is_workday', true).order('work_date');
  if (error) throw error;
  return data ?? [];
}

export async function addDailyReport(input: { date: string; activity: string; result: string; note: string; }) {
  const employee = await currentEmployee();
  const { error } = await supabase.from('daily_reports').insert({
    employee_id: employee.id,
    report_date: input.date,
    activity: input.activity.trim(),
    result: input.result.trim() || null,
    note: input.note.trim() || null,
  });
  if (error) throw error;
}

export async function ownReports(limit = 31): Promise<DailyReport[]> {
  const employee = await currentEmployee();
  const { data, error } = await supabase.from('daily_reports').select('*').eq('employee_id', employee.id).order('report_date', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as DailyReport[];
}
