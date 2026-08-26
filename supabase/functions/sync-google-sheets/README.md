# Sinkronisasi Google Sheets

Edge Function ini menyalin data Supabase ke spreadsheet rekap tanpa menaruh kredensial Google di aplikasi atau GitHub.

Project secrets yang dibutuhkan:

- `GOOGLE_SHEETS_SPREADSHEET_ID`: ID spreadsheet tujuan.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: isi lengkap kunci JSON service account Google.

Service account harus diberi akses **Editor** hanya ke spreadsheet tujuan. Fungsi menerima JWT admin KEMOB KW, service-role, atau rahasia cron ber-hash yang nilai aslinya hanya disimpan di Supabase Vault.

Jangan pernah menaruh file JSON service account di repo, aplikasi, Google Sheets, atau pesan chat.
