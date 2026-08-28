import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.57.4";

const SPREADSHEET_ID = Deno.env.get("GOOGLE_SHEETS_SPREADSHEET_ID") ?? "";
const SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET_SHA256 = "f3f0f748d826e975ec3a19e3a0dfe0c174888f31cf16d782e43a55ad654a4867";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" },
});

async function sha256Hex(value: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(hash, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function base64Url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function googleAccessToken() {
  const account = JSON.parse(SERVICE_ACCOUNT_JSON) as { client_email: string; private_key: string };
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const pem = account.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const der = Uint8Array.from(atob(pem), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${payload}`));
  const assertion = `${header}.${payload}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!response.ok) throw new Error(`Google OAuth gagal (${response.status}).`);
  const token = await response.json() as { access_token: string };
  return token.access_token;
}

async function replaceSheet(token: string, sheet: string, values: unknown[][]) {
  const clearRange = encodeURIComponent(`'${sheet}'!A:Z`);
  const updateRange = encodeURIComponent(`'${sheet}'!A1`);
  const api = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values`;
  const clear = await fetch(`${api}/${clearRange}:clear`, { method: "POST", headers: { authorization: `Bearer ${token}` } });
  if (!clear.ok) throw new Error(`Gagal membersihkan tab ${sheet} (${clear.status}).`);
  const update = await fetch(`${api}/${updateRange}?valueInputOption=RAW`, {
    method: "PUT",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ range: `'${sheet}'!A1`, majorDimension: "ROWS", values }),
  });
  if (!update.ok) throw new Error(`Gagal memperbarui tab ${sheet} (${update.status}).`);
}

Deno.serve(async (req) => {
  let stage = "validasi permintaan";
  try {
    if (req.method !== "POST") return json({ error: "Gunakan metode POST." }, 405);
    if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_JSON) return json({ error: "Integrasi Google Sheets belum dikonfigurasi." }, 503);

    const cronSecret = req.headers.get("x-mbok-cron-secret") ?? "";
    const isCron = cronSecret.length >= 32 && constantTimeEqual(await sha256Hex(cronSecret), CRON_SECRET_SHA256);
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const isServiceRole = bearer === SERVICE_ROLE_KEY;
    if (!isCron && !isServiceRole) {
      const authClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      const { data, error } = await authClient.auth.getUser(bearer);
      if (error || data.user?.app_metadata?.role !== "admin") return json({ error: "Khusus admin." }, 403);
    }

    const requested = await req.json().catch(() => ({})) as { month?: string };
    const jakartaMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date());
    const month = /^\d{4}-\d{2}$/.test(requested.month ?? "") ? requested.month! : jakartaMonth;
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const lastDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
    const from = `${month}-01`;
    const to = `${month}-${String(lastDay).padStart(2, "0")}`;
    const calendarFrom = `${month.slice(0, 4)}-01-01`;
    const calendarTo = `${month.slice(0, 4)}-12-31`;

    stage = "membaca data Supabase";
    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const [employeesResult, shiftsResult, calendarResult, attendanceResult, reportsResult] = await Promise.all([
      db.from("employees").select("id,employee_code,full_name,position,ni_pppk,is_active").order("full_name"),
      db.from("employee_shift_preferences").select("employee_id,default_shift"),
      db.from("work_calendar").select("work_date,is_workday,description").gte("work_date", calendarFrom).lte("work_date", calendarTo).order("work_date"),
      db.from("attendance").select("employee_id,attendance_date,check_in,check_out,shift_label,scheduled_start,scheduled_end,late_minutes,early_leave_minutes,status,note,updated_at").gte("attendance_date", from).lte("attendance_date", to).order("attendance_date"),
      db.from("daily_reports").select("employee_id,report_date,activity,result,note,updated_at").gte("report_date", from).lte("report_date", to).order("report_date"),
    ]);
    const failed = [employeesResult, shiftsResult, calendarResult, attendanceResult, reportsResult].find((result) => result.error);
    if (failed?.error) throw failed.error;

    const employees = employeesResult.data ?? [];
    const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
    const shiftByEmployee = new Map((shiftsResult.data ?? []).map((shift) => [shift.employee_id, shift.default_shift]));
    const attendance = attendanceResult.data ?? [];
    const reports = reportsResult.data ?? [];
    const elapsedWorkdayDates = (calendarResult.data ?? []).filter((day) => day.is_workday && day.work_date >= from && day.work_date <= to && day.work_date < today).map((day) => day.work_date);
    const absenceStatuses = ["Izin", "Sakit", "Cuti", "Dinas Luar"];

    const sheets: Record<string, unknown[][]> = {
      "MASTER PEGAWAI": [
        ["Kode", "Nama", "Jabatan", "NI PPPK", "Status Aktif", "Shift Utama"],
        ...employees.map((employee) => [employee.employee_code, employee.full_name, employee.position, employee.ni_pppk ?? "-", employee.is_active ? "Aktif" : "Nonaktif", shiftByEmployee.get(employee.id) ?? "Pagi"]),
      ],
      "KALENDER KERJA": [
        ["Tanggal", "Hari Kerja", "Keterangan"],
        ...(calendarResult.data ?? []).map((day) => [day.work_date, day.is_workday ? "Ya" : "Tidak", day.description ?? ""]),
      ],
      "ABSENSI HARIAN": [
        ["Tanggal", "Kode", "Nama", "Jabatan", "NI PPPK", "Shift", "Jam Masuk", "Jam Pulang", "Jadwal Masuk", "Jadwal Pulang", "Hasil Masuk", "Hasil Pulang", "Pengajuan Tidak Hadir", "Catatan", "Diperbarui"],
        ...attendance.map((row) => { const employee = employeeById.get(row.employee_id); return [row.attendance_date, employee?.employee_code ?? "", employee?.full_name ?? "", employee?.position ?? "", employee?.ni_pppk ?? "-", row.shift_label, row.check_in ?? "", row.check_out ?? "", row.scheduled_start ?? "", row.scheduled_end ?? "", row.check_in ? (row.late_minutes > 0 ? `Terlambat ${row.late_minutes} menit` : "Tepat waktu") : "", row.check_out ? (row.early_leave_minutes > 0 ? `Terlalu cepat ${row.early_leave_minutes} menit` : "Tepat waktu") : "", absenceStatuses.includes(row.status) ? row.status : "", row.note ?? "", row.updated_at]; }),
      ],
      "REKAP BULANAN": [
        ["Bulan", "Kode", "Nama", "Jabatan", "NI PPPK", "Hari Kerja Berlalu", "Absen Masuk", ...absenceStatuses, "Tanpa Keterangan", "Persentase Kehadiran"],
        ...employees.filter((employee) => employee.is_active).map((employee) => {
          const rows = attendance.filter((row) => row.employee_id === employee.id);
          const covered = new Set(rows.filter((row) => row.check_in || absenceStatuses.includes(row.status)).map((row) => row.attendance_date));
          const present = rows.filter((row) => !!row.check_in && row.attendance_date < today).length;
          const missing = elapsedWorkdayDates.filter((date) => !covered.has(date)).length;
          return [month, employee.employee_code, employee.full_name, employee.position, employee.ni_pppk ?? "-", elapsedWorkdayDates.length, present, ...absenceStatuses.map((status) => rows.filter((row) => row.status === status && row.attendance_date < today).length), missing, elapsedWorkdayDates.length ? present / elapsedWorkdayDates.length : 0];
        }),
      ],
      "LAPORAN HARIAN": [
        ["Tanggal", "Kode", "Nama", "Jabatan", "NI PPPK", "Kegiatan", "Hasil", "Catatan", "Diperbarui"],
        ...reports.map((row) => { const employee = employeeById.get(row.employee_id); return [row.report_date, employee?.employee_code ?? "", employee?.full_name ?? "", employee?.position ?? "", employee?.ni_pppk ?? "-", row.activity, row.result ?? "", row.note ?? "", row.updated_at]; }),
      ],
    };

    stage = "autentikasi Google";
    const token = await googleAccessToken();
    stage = "menulis Google Sheets";
    await Promise.all(Object.entries(sheets).map(([sheet, values]) => replaceSheet(token, sheet, values)));
    return json({ ok: true, month, rows: { employees: employees.length, attendance: attendance.length, reports: reports.length } });
  } catch (error) {
    console.error(error);
    const detail = error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "Sinkronisasi gagal.";
    return json({ error: `${stage}: ${detail}` }, 500);
  }
});
