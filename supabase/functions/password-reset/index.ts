import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const hash = async (value: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const createSalt = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const PBKDF2_ITERATIONS = 600000;

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const hashPassword = async (password: string) => {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  const salt = toBase64Url(saltBytes);
  const derived = toBase64Url(new Uint8Array(bits));
  return {
    salt,
    hash: `pbkdf2$sha256${PBKDF2_ITERATIONS}${salt}${derived}`,
  };
};

const createOtp = () =>
  String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const metaToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
const templateName = Deno.env.get("WHATSAPP_TEMPLATE_NAME");
const templateLang = Deno.env.get("WHATSAPP_TEMPLATE_LANGUAGE") || "id";
const hashSecretPromise = hash(serviceKey + ":pb-bilibili-162-password-reset-v1");

const supabase = createClient(supabaseUrl, serviceKey);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, message: "Method tidak diizinkan." }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const phone = normalizePhone(body?.phone);
    const challengeId = String(body?.challengeId || "");
    const otp = String(body?.otp || "").replace(/\D/g, "");
    const newPassword = String(body?.new_password || "");

    if (action === "request") {
      if (!/^62\d{9,13}$/.test(phone)) {
        return json({ ok: false, message: "Masukkan nomor WhatsApp yang terdaftar." }, 400);
      }

      const hashSecret = await hashSecretPromise;
      const phoneHash = await hash(hashSecret + ":" + phone);
      const since = new Date(Date.now() - 60_000).toISOString();
      const hourSince = new Date(Date.now() - 3_600_000).toISOString();

      const [{ count: recentCount }, { count: hourlyCount }] = await Promise.all([
        supabase
          .from("password_reset_challenges")
          .select("id", { count: "exact", head: true })
          .eq("phone_hash", phoneHash)
          .gte("created_at", since)
          .is("consumed_at", null),
        supabase
          .from("password_reset_challenges")
          .select("id", { count: "exact", head: true })
          .eq("phone_hash", phoneHash)
          .gte("created_at", hourSince),
      ]);

      if ((recentCount || 0) > 0) {
        return json({ ok: false, message: "Tunggu sekitar 60 detik sebelum meminta kode baru." }, 429);
      }
      if ((hourlyCount || 0) >= 5) {
        return json({ ok: false, message: "Batas permintaan reset tercapai. Coba lagi nanti." }, 429);
      }

      const localPhone = phone.startsWith("62") ? "0" + phone.slice(2) : phone;
      const { data: member, error: memberError } = await supabase
        .from("pendaftaran")
        .select("id,nama,whatsapp,status")
        .eq("whatsapp", localPhone)
        .in("status", ["aktif", "verified", "Diterima", "diterima", "active"])
        .limit(1)
        .maybeSingle();

      if (memberError) {
        console.error("password reset member lookup error", memberError);
        return json({ ok: false, message: "Layanan reset password sedang bermasalah." }, 500);
      }

      // Generic response for unknown numbers prevents account enumeration.
      if (!member) {
        return json({
          ok: true,
          message: "Jika nomor tersebut terdaftar sebagai anggota aktif, kode reset akan dikirim melalui WhatsApp.",
        });
      }

      if (!metaToken || !phoneNumberId || !templateName) {
        console.error("WhatsApp Business API reset credentials are not configured");
        return json({ ok: false, message: "Layanan pengiriman kode reset belum dikonfigurasi." }, 503);
      }

      await supabase
        .from("password_reset_challenges")
        .delete()
        .eq("member_id", member.id)
        .is("consumed_at", null);

      const code = createOtp();
      const otpHash = await hash(hashSecret + ":" + code);
      const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();

      const { data: challenge, error: insertError } = await supabase
        .from("password_reset_challenges")
        .insert({
          member_id: member.id,
          phone_hash: phoneHash,
          otp_hash: otpHash,
          expires_at: expiresAt,
          request_ip: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "",
        })
        .select("id")
        .single();

      if (insertError || !challenge) {
        console.error("password reset challenge insert error", insertError);
        return json({ ok: false, message: "Gagal membuat permintaan reset. Silakan coba lagi." }, 500);
      }

      const graphVersion = Deno.env.get("WHATSAPP_GRAPH_VERSION") || "v23.0";
      const response = await fetch(
        `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${metaToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "template",
            template: {
              name: templateName,
              language: { code: templateLang },
              components: [{ type: "body", parameters: [{ type: "text", text: code }] }],
            },
          }),
        },
      );

      if (!response.ok) {
        console.error("WhatsApp reset provider error", await response.text());
        await supabase.from("password_reset_challenges").delete().eq("id", challenge.id);
        return json({ ok: false, message: "Kode reset belum dapat dikirim. Silakan coba lagi." }, 502);
      }

      return json({
        ok: true,
        challengeId: challenge.id,
        expiresIn: 300,
        message: "Kode reset telah dikirim ke WhatsApp terdaftar.",
      });
    }

    if (action === "reset") {
      if (!challengeId || !/^\d{6}$/.test(otp)) {
        return json({ ok: false, message: "Kode reset tidak valid." }, 400);
      }
      if (newPassword.length < 8) {
        return json({ ok: false, message: "Password baru minimal 8 karakter." }, 400);
      }
      if (newPassword.length > 128) {
        return json({ ok: false, message: "Password baru terlalu panjang." }, 400);
      }
      if (newPassword === "bili2162") {
        return json({ ok: false, message: "Gunakan password baru yang berbeda dari password default." }, 400);
      }

      const { data: challenge, error: challengeError } = await supabase
        .from("password_reset_challenges")
        .select("id,member_id,phone_hash,otp_hash,expires_at,attempts,consumed_at")
        .eq("id", challengeId)
        .maybeSingle();

      if (challengeError || !challenge) {
        return json({ ok: false, message: "Permintaan reset tidak ditemukan. Silakan minta kode baru." }, 400);
      }
      if (challenge.consumed_at || new Date(challenge.expires_at).getTime() < Date.now()) {
        return json({ ok: false, message: "Kode reset sudah kedaluwarsa. Silakan minta kode baru." }, 400);
      }
      if ((challenge.attempts || 0) >= 5) {
        return json({ ok: false, message: "Terlalu banyak percobaan. Silakan minta kode baru." }, 429);
      }

      const hashSecret = await hashSecretPromise;
      const expectedHash = await hash(hashSecret + ":" + otp);
      await supabase
        .from("password_reset_challenges")
        .update({ attempts: (challenge.attempts || 0) + 1 })
        .eq("id", challengeId);

      if (expectedHash !== challenge.otp_hash) {
        return json({ ok: false, message: "Kode reset salah." }, 401);
      }

      const { data: member, error: memberError } = await supabase
        .from("pendaftaran")
        .select("id,nama,whatsapp,status")
        .eq("id", challenge.member_id)
        .in("status", ["aktif", "verified", "Diterima", "diterima", "active"])
        .maybeSingle();

      if (memberError || !member) {
        return json({ ok: false, message: "Akun anggota aktif tidak ditemukan." }, 403);
      }

      const passwordData = await hashPassword(newPassword);

      const { error: updateError } = await supabase
        .from("pendaftaran")
        .update({
          password_hash: passwordData.hash,
          password_salt: passwordData.salt,
          must_change_password: false,
          password_changed_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      if (updateError) {
        console.error("password reset update error", updateError);
        return json({ ok: false, message: "Password baru gagal disimpan. Silakan coba lagi." }, 500);
      }

      await supabase
        .from("password_reset_challenges")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", challengeId);

      return json({
        ok: true,
        message: "Password berhasil direset. Silakan login dengan password baru.",
      });
    }

    return json({ ok: false, message: "Action tidak dikenali." }, 400);
  } catch (error) {
    console.error("password-reset error", error);
    return json({ ok: false, message: "Terjadi kesalahan pada layanan reset password." }, 500);
  }
});
