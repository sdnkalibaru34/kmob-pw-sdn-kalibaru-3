export type AbsenceStatus = 'Izin' | 'Sakit' | 'Cuti' | 'Dinas Luar';
export type AttendanceStatus = 'Hadir' | AbsenceStatus | 'Tanpa Keterangan';

export type ShiftLabel = 'Pagi' | 'Siang';

export type Employee = {
  id: string;
  employee_code: string;
  full_name: string;
  position: 'Guru' | 'Tenaga Kependidikan';
  ni_pppk: string | null;
};

export type Attendance = {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  shift_label: ShiftLabel;
  scheduled_start: string | null;
  scheduled_end: string | null;
  late_minutes: number;
  early_leave_minutes: number;
  status: AttendanceStatus;
  note: string | null;
  updated_at: string;
};

export type DailyReport = {
  id: string;
  employee_id: string;
  report_date: string;
  activity: string;
  result: string | null;
  note: string | null;
  updated_at: string;
};
