import dotenv from 'dotenv';

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'UGC Scriptwriter <onboarding@resend.dev>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn(`[email] RESEND_API_KEY not set. Skipping email to ${to}: "${subject}"`);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      console.error(`[email] Resend error ${res.status} for ${to}:`, await res.text());
      return false;
    }
    console.info(`[email] Sent "${subject}" to ${to}`);
    return true;
  } catch (err) {
    console.error(`[email] Failed to send email to ${to}:`, err);
    return false;
  }
}

function layout(title: string, body: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
    <h2 style="color:#e879f9;margin-top:0;">✨ UGC Scriptwriter</h2>
    <h3 style="margin-bottom:8px;">${title}</h3>
    <div style="line-height:1.6;font-size:14px;color:#cbd5e1;">${body}</div>
    <p style="margin-top:24px;font-size:12px;color:#64748b;">
      Email otomatis — jangan balas email ini.
    </p>
  </div>`;
}

export function sendTrialReminderEmail(to: string, name: string, daysLeft: number, trialEndsAt: Date) {
  return sendEmail(
    to,
    `⏳ Trial Anda berakhir dalam ${daysLeft} hari`,
    layout(
      `Halo ${name},`,
      `<p>Masa trial gratis Anda akan berakhir pada <b>${trialEndsAt.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b> (sisa ${daysLeft} hari).</p>
       <p>Berlangganan PRO sekarang sebesar <b>Rp 99.000/bulan</b> agar akses script UGC, video Veo, dan Image Studio tetap terbuka tanpa henti.</p>
       <p style="text-align:center;margin-top:20px;">
         <a href="${APP_URL}/pricing" style="background:#c026d3;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">Upgrade ke PRO</a>
       </p>`
    )
  );
}

export function sendTrialExpiredEmail(to: string, name: string) {
  return sendEmail(
    to,
    'Trial Anda telah berakhir',
    layout(
      `Halo ${name},`,
      `<p>Masa trial gratis 7 hari Anda sudah berakhir. Akses untuk membuat script & video baru saat ini terkunci.</p>
       <p>Kabar baiknya: semua pekerjaan Anda tersimpan aman. Berlangganan PRO sekarang dan langsung lanjutkan kembali berkarya.</p>
       <p style="text-align:center;margin-top:20px;">
         <a href="${APP_URL}/pricing" style="background:#c026d3;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">Berlangganan Sekarang</a>
       </p>`
    )
  );
}
