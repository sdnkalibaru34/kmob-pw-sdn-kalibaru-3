export type AttendanceStatus =
  | 'Hadir' | 'Izin' | 'Sakit' | 'Cuti' | 'Dinas Luar' | 'Tanpa Keterangan';

export type Employee = {
  id: string;
  employee_code: string;
  full_name: string;
  position: 'Guru' | 'Tenaga Kependidikan';
  ni_pppk: string | null;
};

