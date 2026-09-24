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

const PBKDF2_ITERATIONS = 600000;

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(normalized);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

const derivePasswordBytes = async (password: string, salt: Uint8Array, iterations: number) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
};

const hashPassword = async (password: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derivePasswordBytes(password, salt, PBKDF2_ITERATIONS);
  return {
    hash: `pbkdf2$sha256${PBKDF2_ITERATIONS}${toBase64Url(salt)}${toBase64Url(derived)}`,
    salt: toBase64Url(salt),
  };
};

const verifyPassword = async (password: string, storedHash: string) => {
  if (!storedHash) return false;
  const normalizedPassword = String(password || "").trim();

  // Canonical format: pbkdf2$sha256$iterations$salt$derived
  const parts = storedHash.split("$");
  if (parts.length === 5 && parts[0] === "pbkdf2" && parts[1] === "sha256") {
    const iterations = Number(parts[2]);
    if (!Number.isFinite(iterations) || iterations < 100000) return false;
    try {
      const salt = fromBase64Url(parts[3]);
      const expected = fromBase64Url(parts[4]);
      const actual = await derivePasswordBytes(normalizedPassword, salt, iterations);
      if (actual.length !== expected.length) return false;
      let diff = 0;
      for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
      return diff === 0;
    } catch {
      return false;
    }
  }

  // Legacy format created by earlier AdminUsers versions:
  // pbkdf2$sha256<iterations><salt><derived>
  const legacy = storedHash.match(/^pbkdf2\$sha256(\d+)([A-Za-z0-9_-]{22})([A-Za-z0-9_-]{43})$/);
  if (legacy) {
    const iterations = Number(legacy[1]);
    try {
      const salt = fromBase64Url(legacy[2]);
      const expected = fromBase64Url(legacy[3]);
      const actual = await derivePasswordBytes(password, salt, iterations);
      if (actual.length !== expected.length) return false;
      let diff = 0;
      for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
      return diff === 0;
    } catch {
      return false;
    }
  }

  return false;
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

      // Nomor WhatsApp di database historis bisa tersimpan sebagai 08..., 62...,
      // +62..., atau mengandung spasi/tanda baca. Jangan bergantung pada equality
      // satu format karena itu membuat sebagian anggota tidak bisa login.
      // Hanya mengambil anggota aktif (jumlah kecil) lalu mencocokkan nomor
      // setelah normalisasi di Edge Function.
      const activeStatuses = ["aktif", "verified", "Diterima", "diterima", "active"];

      const [memberResult, settingResult] = await Promise.all([
        supabaseAdmin
          .from("pendaftaran")
          .select("id,nama,whatsapp,kategori,kategori_atlet,jenis_kelamin,domisili,pengalaman,foto_url,tanggal_lahir,status,password_hash,password_salt,must_change_password,updated_at")
          .in("status", activeStatuses)
          .order("updated_at", { ascending: false }),
        supabaseAdmin
          .from("site_settings")
          .select("value")
          .eq("key", "whatsapp_admin_login")
          .maybeSingle(),
      ]);

      const { data: members, error: memberError } = memberResult;
      const { data: setting, error: settingError } = settingResult;

      if (memberError) {
        console.error("member lookup error", memberError);
        return json({ ok: false, message: "Database anggota tidak dapat diakses.", code: "MEMBER_LOOKUP_ERROR" }, 500);
      }

      const member = (members || []).find((row: any) => normalizePhone(row.whatsapp || "") === phone);

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
        : await verifyPassword(password, member.password_hash || "");

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

        const generated = await hashPassword(newPassword);
        const { error: updateError } = await supabaseAdmin
          .from("pendaftaran")
          .update({ password_hash: generated.hash, password_salt: generated.salt, must_change_password: false, password_changed_at: new Date().toISOString() })
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
