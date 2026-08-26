# KEMOB KW

KEMOB KW adalah aplikasi absensi PPPK Paruh Waktu SDN Kalibaru 3. Aplikasi pegawai berjalan di Android, sedangkan pengelolaan dan rekap seluruh pegawai tersedia melalui dashboard web admin.

## Fitur inti

- Login memakai NI PPPK/kode pegawai dan kata sandi
- Absen masuk/pulang dan koreksi data kapan saja
- Kalender kelengkapan absensi pribadi
- Laporan kegiatan harian per pegawai
- Rekap bulanan seluruh pegawai untuk admin
- Sinkronisasi ke Google Spreadsheet
- Kebijakan privasi dan penegasan bukan aplikasi resmi KMOB
- Penggantian kata sandi mandiri
- Dashboard admin khusus web untuk rekap bulanan dan laporan harian

Sinkronisasi Google Sheets dijalankan oleh Supabase Edge Function. Kredensial Google wajib disimpan sebagai Supabase project secrets dan tidak boleh dimasukkan ke aplikasi atau repo. Petunjuknya ada di `supabase/functions/sync-google-sheets/README.md`.

## Menjalankan

Salin `.env.example` menjadi `.env`, isi URL dan publishable key Supabase, lalu jalankan:

```bash
npm install
npm run start
```
