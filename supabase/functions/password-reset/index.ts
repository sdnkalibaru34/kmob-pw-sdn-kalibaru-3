import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@1.4.1";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const randomPassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `kemobkw!${Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("")}`;
};

const securedHandler = withSupabase({ auth: "user" }, async (req, ctx) => {
  try {
    if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

    const adminId = ctx.userClaims?.id ?? ctx.jwtClaims?.sub;
    if (!adminId) return respond({ error: "Akses admin diperlukan." }, 403);

    const { data: adminData, error: adminError } =
      await ctx.supabaseAdmin.auth.admin.getUserById(adminId);
    if (adminError || adminData.user?.app_metadata?.role !== "admin") {
      return respond({ error: "Akses admin diperlukan." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const db = ctx.supabaseAdmin;

    if (body.action === "list") {
      const { data, error } = await db
        .from("password_reset_requests")
        .select("id,requested_at,login_code")
        .eq("status", "pending")
        .order("requested_at");
      if (error) {
        console.error("list reset requests:", error);
        return respond({ error: "Permintaan reset belum dapat dimuat." }, 500);
      }
      return respond({ ok: true, requests: data ?? [] });
    }

    if (body.action === "approve") {
      const requestId = String(body.requestId ?? "");
      const { data: request, error: requestError } = await db
        .from("password_reset_requests")
        .select("id,login_code")
        .eq("id", requestId)
        .eq("status", "pending")
        .maybeSingle();
      if (requestError) {
        console.error("find reset request:", requestError);
        return respond({ error: "Permintaan reset belum dapat diproses." }, 500);
      }
      if (!request?.login_code) {
        return respond({ error: "Permintaan reset tidak ditemukan." }, 404);
      }

      let { data: employee, error: employeeError } = await db
        .from("employees")
        .select("id,full_name,employee_code,auth_user_id")
        .eq("employee_code", request.login_code)
        .eq("is_active", true)
        .maybeSingle();
      if (!employee && !employeeError) {
        const fallback = await db
          .from("employees")
          .select("id,full_name,employee_code,auth_user_id")
          .eq("ni_pppk", request.login_code)
          .eq("is_active", true)
          .maybeSingle();
        employee = fallback.data;
        employeeError = fallback.error;
      }
      if (employeeError) {
        console.error("find employee:", employeeError);
        return respond({ error: "Data pegawai belum dapat dimuat." }, 500);
      }
      if (!employee?.auth_user_id) {
        return respond({ error: "Akun pegawai tidak ditemukan." }, 404);
      }

      const password = randomPassword();
      const { error: authError } = await db.auth.admin.updateUserById(
        employee.auth_user_id,
        { password, user_metadata: { must_change_password: false } },
      );
      if (authError) {
        console.error("update auth password:", authError);
        return respond({ error: "Password akun belum dapat diperbarui." }, 500);
      }

      const { error: updateError } = await db
        .from("password_reset_requests")
        .update({
          status: "completed",
          employee_id: employee.id,
          completed_at: new Date().toISOString(),
          completed_by: adminId,
        })
        .eq("login_code", request.login_code)
        .eq("status", "pending");
      if (updateError) {
        console.error("complete reset requests:", updateError);
        return respond({ error: "Password berhasil diubah, tetapi status permintaan belum diperbarui." }, 500);
      }

      return respond({
        ok: true,
        fullName: employee.full_name,
        employeeCode: employee.employee_code,
        temporaryPassword: password,
      });
    }

    if (body.action === "dismiss") {
      const requestId = String(body.requestId ?? "");
      const { data, error } = await db
        .from("password_reset_requests")
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
          completed_by: adminId,
        })
        .eq("id", requestId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("dismiss reset request:", error);
        return respond({ error: "Permintaan reset belum dapat diabaikan." }, 500);
      }
      if (!data) {
        return respond({ error: "Permintaan reset tidak ditemukan atau sudah ditangani." }, 404);
      }
      return respond({ ok: true });
    }

    return respond({ error: "Aksi tidak dikenali." }, 400);
  } catch (error) {
    console.error("password-reset unhandled:", error);
    return respond({ error: "Layanan reset password sedang bermasalah." }, 500);
  }
});

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  return securedHandler(req);
});
