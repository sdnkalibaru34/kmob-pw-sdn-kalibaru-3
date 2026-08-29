import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.57.4";

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
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers });
    if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${serviceKey}` } } });
    const body = await req.json().catch(() => ({}));

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const authClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: authData } = await authClient.auth.getUser(token);
    if (!authData.user || authData.user.app_metadata?.role !== 'admin') return respond({ error: 'Akses admin diperlukan.' }, 403);

    if (body.action === 'list') {
      const { data, error } = await db.from('password_reset_requests').select('id,requested_at,login_code').eq('status', 'pending').order('requested_at');
      if (error) return respond({ error: 'Permintaan reset belum dapat dimuat.' }, 500);
      return respond({ ok: true, requests: data ?? [] });
    }

    if (body.action === 'approve') {
      const { data: request, error: requestError } = await db.from('password_reset_requests').select('id,login_code').eq('id', String(body.requestId ?? '')).eq('status', 'pending').maybeSingle();
      if (requestError) return respond({ error: requestError.message }, 500);
      if (!request?.login_code) return respond({ error: 'Permintaan reset tidak ditemukan.' }, 404);
      let { data: employee, error: employeeError } = await db.from('employees').select('id,full_name,employee_code,auth_user_id').eq('employee_code', request.login_code).eq('is_active', true).maybeSingle();
      if (!employee && !employeeError) {
        const fallback = await db.from('employees').select('id,full_name,employee_code,auth_user_id').eq('ni_pppk', request.login_code).eq('is_active', true).maybeSingle();
        employee = fallback.data;
        employeeError = fallback.error;
      }
      if (employeeError) return respond({ error: employeeError.message }, 500);
      if (!employee?.auth_user_id) return respond({ error: 'Akun pegawai tidak ditemukan.' }, 404);
      const password = randomPassword();
      const { error: authError } = await db.auth.admin.updateUserById(employee.auth_user_id, { password, user_metadata: { must_change_password: false } });
      if (authError) return respond({ error: authError.message }, 500);
      const { error: updateError } = await db.from('password_reset_requests').update({ status: 'completed', employee_id: employee.id, completed_at: new Date().toISOString(), completed_by: authData.user.id }).eq('id', request.id);
      if (updateError) return respond({ error: updateError.message }, 500);
      return respond({ ok: true, fullName: employee.full_name, employeeCode: employee.employee_code, temporaryPassword: password });
    }

    if (body.action === 'dismiss') {
      const { error } = await db.from('password_reset_requests').update({ status: 'cancelled', completed_at: new Date().toISOString(), completed_by: authData.user.id }).eq('id', String(body.requestId ?? '')).eq('status', 'pending');
      if (error) return respond({ error: error.message }, 500);
      return respond({ ok: true });
    }
    return respond({ error: 'Aksi tidak dikenali.' }, 400);
  } catch (error) {
    console.error(error);
    return respond({ error: 'Layanan reset password sedang bermasalah.' }, 500);
  }
});
