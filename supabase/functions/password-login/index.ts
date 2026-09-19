import { withSupabase } from "npm:@supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizePhone = (raw: string) => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  return digits;
};

const hashPassword = async (salt: string, password: string) => {
  const data = new TextEncoder().encode(salt + ":" + password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
};

const createSalt = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
};

const safeUser = (row: any, role = "member") => ({
  id: row.id,
  nama: row.nama,
  email: row.email || ((row.nama || "anggota").toLowerCase().replace(/[^a-z0-9]/g, "") + "@pbbilibili162.com"),
  whatsapp: row.whatsapp,
  kategori: row.kategori,
  kategori_atlet: row.kategori_atlet,
  jenis_kelamin: row.jenis_kelamin,
  domisili: row.domisili,
  pengalaman: row.pengalaman,
  foto_url: row.foto_url,
  tanggal_lahir: row.tanggal_lahir,
  sektor_bermain: row.sektor_bermain,
  ukuran_jersey: row.ukuran_jersey,
  role,
});

export default {
  fetch: withSupabase({ auth: "none" }, async (req, ctx) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ ok: false, message: "Method tidak diizinkan." }, 405);

    try {
      const body = await req.json().catch(() => ({}));
      const phone = normalizePhone(body?.phone);
      const password = String(body?.password || "");
      const action = String(body?.action || "");
      const newPassword = String(body?.new_password || "");

      if (!/^62\d{9,13}$/.test(phone)) {
        return json({ ok: false, message: "Nomor WhatsApp tidak valid." }, 400);
      }

      const supabaseAdmin = ctx.supabaseAdmin;

      const { data: members, error: memberError } = await supabaseAdmin
        .from("pendaftaran")
        .select("id,nama,whatsapp,kategori,kategori_atlet,jenis_kelamin,domisili,pengalaman,foto_url,email,tanggal_lahir,sektor_bermain,ukuran_jersey,status,password_hash,password_salt,must_change_password")
        .in("status", ["aktif", "verified", "Diterima", "diterima", "active"]);

      if (memberError) {
        console.error("member lookup error", memberError);
        return json({ ok: false, message: "Database anggota tidak dapat diakses.", code: "MEMBER_LOOKUP_ERROR" }, 500);
      }

      const member = (members || []).find((row: any) => normalizePhone(row.whatsapp || "") === phone);

      const { data: setting, error: settingError } = await supabaseAdmin
        .from("site_settings")
        .select("value")
        .eq("key", "whatsapp_admin_login")
        .maybeSingle();

      if (settingError) console.error("admin setting lookup error", settingError);

      let adminPhone = "";
      try {
        const v = typeof setting?.value === "string" ? JSON.parse(setting.value) : setting?.value;
        adminPhone = normalizePhone(v?.phone_e164 || v?.phone || "");
      } catch (e) {
        console.error("admin setting parse error", e);
      }

      if (adminPhone && phone === adminPhone) {
        if (action === "check_first_login") return json({ ok: true, first_login: false, show_default_notice: false });
        if (password !== "admin") return json({ ok: false, message: "Nomor WhatsApp atau password tidak sesuai." }, 401);
        return json({
          ok: true,
          first_login: false,
          must_change_password: false,
          user: { id: "admin-pb-bilibili-162", nama: "Administrator PB Bilibili 162", email: "admin@pbbilibili162.com", whatsapp: phone, role: "admin" },
        });
      }

      if (!member) {
        return json({ ok: false, message: "Nomor WhatsApp belum terdaftar sebagai anggota aktif PB BILIBILI 162." }, 403);
      }

      const firstLogin = !!member.must_change_password || !member.password_hash || !member.password_salt;

      if (action === "check_first_login") {
        return json({ ok: true, first_login: firstLogin, show_default_notice: firstLogin });
      }

      if (!password) {
        return json({ ok: false, message: "Nomor WhatsApp dan password wajib diisi." }, 400);
      }

      const valid = firstLogin
        ? password === "bili2162"
        : !!member.password_hash && !!member.password_salt &&
          (await hashPassword(member.password_salt, password)) === member.password_hash;

      if (!valid) {
        return json({ ok: false, message: "Nomor WhatsApp atau password tidak sesuai." }, 401);
      }

      if (action === "change_password") {
        if (!member.must_change_password) {
          return json({ ok: false, message: "Password anggota ini sudah pernah diperbarui. Silakan login dengan password terakhir." }, 409);
        }
        if (newPassword.length < 8) {
          return json({ ok: false, message: "Password baru minimal 8 karakter." }, 400);
        }
        if (newPassword === "bili2162") {
          return json({ ok: false, message: "Password baru harus berbeda dari password default." }, 400);
        }

        const salt = createSalt();
        const passwordHash = await hashPassword(salt, newPassword);
        const { error: updateError } = await supabaseAdmin
          .from("pendaftaran")
          .update({ password_hash: passwordHash, password_salt: salt, must_change_password: false })
          .eq("id", member.id);

        if (updateError) {
          console.error("password update error", updateError);
          return json({ ok: false, message: "Password baru gagal disimpan.", code: "PASSWORD_UPDATE_ERROR" }, 500);
        }

        return json({
          ok: true,
          first_login: false,
          must_change_password: false,
          user: safeUser(member, "member"),
        });
      }

      return json({
        ok: true,
        first_login: firstLogin,
        must_change_password: firstLogin,
        user: safeUser(member, "member"),
      });
    } catch (error) {
      console.error("password-login error", error);
      return json({ ok: false, message: "Terjadi kesalahan pada layanan login.", code: "LOGIN_FUNCTION_ERROR" }, 500);
    }
  }),
};
