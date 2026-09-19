import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

const getSecretKey = () => {
  const grouped = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (grouped) {
    try {
      const parsed = JSON.parse(grouped);
      if (parsed?.default) return parsed.default;
    } catch {}
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
};

const hashPassword = async (salt: string, password: string) => {
  const data = new TextEncoder().encode(salt + ":" + password);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, message: "Method tidak diizinkan." }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(body?.phone);
    const password = String(body?.password || "");
    const action = String(body?.action || "");

    if (!/^62\d{9,13}$/.test(phone)) {
      return json({ ok: false, message: "Nomor WhatsApp tidak valid." }, 400);
    }
    if (action !== "check_first_login" && !password) {
      return json({ ok: false, message: "Nomor WhatsApp dan password wajib diisi." }, 400);
    }

    const serviceKey = getSecretKey();
    if (!serviceKey) return json({ ok: false, message: "Konfigurasi server Supabase belum lengkap." }, 503);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    const { data: setting } = await supabase.from("site_settings").select("value").eq("key", "whatsapp_admin_login").maybeSingle();
    let adminPhone = "";
    try {
      const v = typeof setting?.value === "string" ? JSON.parse(setting.value) : setting?.value;
      adminPhone = normalizePhone(v?.phone_e164 || v?.phone || "");
    } catch {}

    if (adminPhone && phone === adminPhone) {
      if (password !== "admin") return json({ ok: false, message: "Nomor WhatsApp atau password tidak sesuai." }, 401);
      return json({
        ok: true,
        first_login: false,
        must_change_password: false,
        user: { id: "admin-pb-bilibili-162", nama: "Administrator PB Bilibili 162", email: "admin@pbbilibili162.com", whatsapp: phone, role: "admin" },
      });
    }

    const { data: members, error } = await supabase
      .from("pendaftaran")
      .select("id,nama,whatsapp,kategori,kategori_atlet,jenis_kelamin,domisili,pengalaman,foto_url,email,tanggal_lahir,sektor_bermain,ukuran_jersey,status,password_hash,password_salt,must_change_password")
      .in("status", ["aktif", "verified", "Diterima", "diterima", "active"]);

    if (error) throw error;

    const member = (members || []).find((row: any) => normalizePhone(row.whatsapp || "") === phone);
    if (!member) return json({ ok: false, message: "Nomor WhatsApp belum terdaftar sebagai anggota aktif PB BILIBILI 162." }, 403);

    if (action === "check_first_login") {
      const firstLogin = !member.password_hash || !!member.must_change_password;
      return json({ ok: true, first_login: firstLogin, show_default_notice: firstLogin });
    }

    const defaultPassword = "12345678";
    let valid = false;
    let firstLogin = !member.password_hash;
    if (member.password_hash && member.password_salt) {
      valid = (await hashPassword(member.password_salt, password)) === member.password_hash;
    } else {
      valid = password === defaultPassword;
    }

    if (!valid) return json({ ok: false, message: "Nomor WhatsApp atau password tidak sesuai." }, 401);

    return json({
      ok: true,
      first_login: firstLogin || !!member.must_change_password,
      must_change_password: firstLogin || !!member.must_change_password,
      user: safeUser(member, "member"),
    });
  } catch (error) {
    console.error("password-login error", error);
    return json({ ok: false, message: "Terjadi kesalahan pada layanan login." }, 500);
  }
});
