import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const randomPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `kemobkw!${Array.from(bytes, value => alphabet[value % alphabet.length]).join('')}`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: authData } = await db.auth.getUser(token);
  if (!authData.user || authData.user.app_metadata?.role !== 'admin') return respond({ error: 'Akses admin diperlukan.' }, 403);

  if (body.action === 'list') {
    const { data, error } = await db.from('password_reset_requests').select('id,requested_at,login_code').eq('status', 'pending').order('requested_at');
    if (error) return respond({ error: 'Permintaan reset belum dapat dimuat.' }, 500);
    return respond({ ok: true, requests: data ?? [] });
  }

  if (body.action === 'approve') {
    const { data: request } = await db.from('password_reset_requests').select('id,login_code').eq('id', String(body.requestId ?? '')).eq('status', 'pending').maybeSingle();
    if (!request?.login_code) return respond({ error: 'Permintaan reset tidak ditemukan.' }, 404);
    const { data: employee } = await db.from('employees').select('id,full_name,employee_code,auth_user_id').or(`employee_code.ilike.${request.login_code},ni_pppk.eq.${request.login_code}`).eq('is_active', true).maybeSingle();
    if (!employee?.auth_user_id) return respond({ error: 'Akun pegawai tidak ditemukan.' }, 404);
    const password = randomPassword();
    const { error: authError } = await db.auth.admin.updateUserById(employee.auth_user_id, { password, user_metadata: { must_change_password: true } });
    if (authError) return respond({ error: 'Password sementara belum dapat dibuat.' }, 500);
    await db.from('password_reset_requests').update({ status: 'completed', employee_id: employee.id, completed_at: new Date().toISOString(), completed_by: authData.user.id }).eq('id', request.id);
    return respond({ ok: true, fullName: employee.full_name, employeeCode: employee.employee_code, temporaryPassword: password });
  }
  return respond({ error: 'Aksi tidak dikenali.' }, 400);
});
