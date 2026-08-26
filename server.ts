import express from 'express';
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { pool, initDb, getOrCreateSubscription, isAccessActive } from './server/db';
import {
  hashPassword,
  verifyPassword,
  signToken,
  requireAuth,
  requireAccess,
} from './server/auth';
import {
  createSnapTransaction,
  verifyMidtransSignature,
  STATUS_API,
  PRICE_IDR,
} from './server/midtrans';
import { startCronJobs } from './server/cron';
import { enforceConfig } from './server/config';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Body parser with 50mb limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==========================================
// AUTH ENDPOINTS
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password minimal 8 karakter.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
      String(email).toLowerCase(),
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email sudah terdaftar. Silakan login.' });
    }

    const inserted = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [String(email).toLowerCase(), hashPassword(password), name]
    );
    const user = inserted.rows[0];
    await getOrCreateSubscription(user.id);

    const token = signToken(user);
    return res.json({ token, user });
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Gagal mendaftarkan akun.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    const found = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [String(email).toLowerCase()]
    );
    if (found.rows.length === 0 || !verifyPassword(password, found.rows[0].password_hash)) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const user = found.rows[0];
    await getOrCreateSubscription(user.id);
    const token = signToken(user);
    delete user.password_hash;
    return res.json({ token, user });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Gagal login.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const found = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [req.authUser!.id]
    );
    if (found.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: found.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ error: 'Gagal mengambil profil.' });
  }
});

// ==========================================
// SUBSCRIPTION STATUS + MIDTRANS SNAP
// ==========================================
app.get('/api/subscription/status', requireAuth, async (req, res) => {
  try {
    const sub = await getOrCreateSubscription(req.authUser!.id);
    return res.json({
      plan: sub.plan,
      status: sub.status,
      trial_ends_at: sub.trial_ends_at,
      current_period_end: sub.current_period_end,
      access_active: isAccessActive(sub),
      price_idr: PRICE_IDR,
    });
  } catch (error: any) {
    console.error('Subscription status error:', error);
    return res.status(500).json({ error: 'Gagal mengambil status langganan.' });
  }
});

app.post('/api/subscription/create', requireAuth, async (req, res) => {
  try {
    const userId = req.authUser!.id;
    const orderId = `UGC-${userId.slice(0, 8)}-${Date.now()}`;
    const sub = await getOrCreateSubscription(userId);

    await pool.query(
      'UPDATE subscriptions SET midtrans_order_id = $1, updated_at = now() WHERE user_id = $2',
      [orderId, userId]
    );

    const snap = await createSnapTransaction({
      orderId,
      grossAmount: PRICE_IDR,
      customerEmail: req.authUser!.email,
      customerName: req.authUser!.name || req.authUser!.email,
    });

    return res.json({ token: snap.token, redirect_url: snap.redirect_url, order_id: orderId });
  } catch (error: any) {
    console.error('Create subscription error:', error);
    return res.status(500).json({ error: error?.message || 'Gagal membuat transaksi Midtrans.' });
  }
});

// ==========================================
// MIDTRANS WEBHOOK
// ==========================================
app.post('/api/midtrans/webhook', async (req, res) => {
  try {
    const body = req.body;
    if (!verifyMidtransSignature(body)) {
      return res.status(403).json({ error: 'Invalid signature.' });
    }

    const { order_id, transaction_status, fraud_status } = body;
    console.info(`Midtrans webhook: ${order_id} -> ${transaction_status} (${fraud_status})`);

    const found = await pool.query(
      'SELECT user_id FROM subscriptions WHERE midtrans_order_id = $1',
      [order_id]
    );
    if (found.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    const userId = found.rows[0].user_id;

    if (
      transaction_status === 'capture' ||
      transaction_status === 'settlement'
    ) {
      if (fraud_status && fraud_status !== 'accept') {
        return res.json({ received: true, ignored: 'fraud review pending' });
      }
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await pool.query(
        `UPDATE subscriptions
         SET plan = 'pro', status = 'active', current_period_end = $1, updated_at = now()
         WHERE user_id = $2`,
        [periodEnd, userId]
      );
    } else if (
      transaction_status === 'expire' ||
      transaction_status === 'cancel' ||
      transaction_status === 'deny'
    ) {
      await pool.query(
        `UPDATE subscriptions SET status = CASE WHEN current_period_end > now() THEN 'active' ELSE 'expired' END, updated_at = now() WHERE user_id = $1`,
        [userId]
      );
    }

    return res.json({ received: true });
  } catch (error: any) {
    console.error('Midtrans webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

// Lazy initialize Gemini client
let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set in environment.');
    }
    genAIClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Generates emergency offline / high-demand resilient UGC script if upstream Google API is 503
function generateResilientBackupScript(params: {
  platform: string;
  language: string;
  hookStyle: string;
  targetAudience?: string;
  productKeyPoints?: string;
  creatorVibeNotes?: string;
  durationTarget?: string;
}): any {
  const isIndo = params.language?.startsWith('id');
  const platform = params.platform || 'tiktok';
  
  const isTikTok = platform === 'tiktok';
  const isShopee = platform === 'shopee';

  const ctaAction = isTikTok
    ? 'Menunjuk ke arah Keranjang Kuning (kiri bawah layar) sambil tersenyum meyakinkan'
    : isShopee
    ? 'Menunjuk tombol Keranjang Oranye & voucher diskon di pojok layar'
    : 'Menunjuk ke bio profil / ketik keyword di kolom komentar';

  const ctaSpoken = isIndo
    ? (isTikTok 
        ? 'Klik keranjang kuning sekarang sebelum promonya kehabisan ya!'
        : isShopee 
        ? 'Langsung checkout di keranjang oranye mumpung gratis ongkir & diskon kilat!'
        : 'Cek link di bio sekarang juga buat klaim harga promo bundling!')
    : 'Click the link in my bio / yellow basket right now before this limited deal ends!';

  return {
    title: isIndo ? 'Formula UGC Viral Konversi Tinggi' : 'High-Converting Viral UGC Ad',
    analisisVisual: {
      characterVibe: isIndo
        ? 'Ekspresi wajah natural, percaya diri, dan ramah dengan pencahayaan terang yang menonjolkan kedekatan emosional dengan audiens.'
        : 'Warm, relatable, natural creator presence with bright aesthetic lighting.',
      productCoreSellingPoints: isIndo
        ? (params.productKeyPoints || 'Desain kemasan premium, praktis digunakan, dan memberikan hasil yang nyata dalam penggunaan rutin.')
        : (params.productKeyPoints || 'Premium aesthetic packaging, highly effective everyday problem solver.'),
      synergyStrategy: isIndo
        ? 'Persona talent yang otentik dan bersahabat menciptakan impresi review jujur (non-iklan), sehingga tingkat kepercayaan dan conversion rate meningkat tajam.'
        : 'Authentic peer-to-peer recommendation style that drives immediate impulse buying.',
      audienceMatch: isIndo
        ? (params.targetAudience || 'Pengguna media sosial usia 18-35 tahun yang mencari solusi praktis dan efisien.')
        : (params.targetAudience || 'Social-first consumers aged 18-35 looking for fast, proven solutions.'),
    },
    hook: {
      timeframe: '0-3 detik',
      visualAction: isIndo
        ? 'Talent mendekatkan wajah atau produk ke kamera dengan ekspresi terkejut atau penasaran, menatap langsung ke lensa'
        : 'Creator leans in close to lens with shocked/enthusiastic facial expression holding product',
      openingLine: isIndo
        ? 'Jujur nyesel banget baru tahu rahasia ini sekarang, pantesan viral di mana-mana!'
        : 'Stop scrolling! If you deal with this every single day, you need to see this right now.',
      screenText: isIndo ? 'NYESEL BARU TAHU SEKARANG 😭⚠️' : 'STOP SCROLLING 🚨 MUST HAVE',
      audioTip: 'Sound efek Whoosh cepat + beat musik lo-fi / trending upbeat',
      alternativeHooks: isIndo ? [
        'Kalian ngerasa ga sih masalah ini ganggu banget tiap hari?',
        'Gue ga mau kalian buang-buang uang lagi kayak gue dulu!',
        'Ternyata cuma butuh 1 trik simpel ini buat beresin semuanya!'
      ] : [
        'POV: You finally found the one thing that actually works.',
        'Do not buy this unless you want everyone asking what your secret is!',
        'I tried this viral hack so you don’t have to waste your money.'
      ]
    },
    problem: {
      timeframe: '0:03 - 0:08',
      painPointDescription: isIndo
        ? 'Rasa frustrasi karena produk lama tidak memberikan hasil maksimal dan membuang waktu'
        : 'Daily frustration with outdated ineffective alternatives',
      visualAction: isIndo
        ? 'Menggelengkan kepala dengan ekspresi lelah/kesal sambil memperlihatkan ketidaknyamanan'
        : 'Sighing and showing relatable frustration on camera',
      spokenLine: isIndo
        ? 'Dulu tuh capek banget nyobain macem-macem cara tapi hasilnya nihil dan buang duit.'
        : 'I used to struggle with this constantly and spent way too much on things that never worked.',
      onScreenText: isIndo ? 'Dulu capek banget... 💸' : 'Tired of wasting money? 😫'
    },
    solution: {
      timeframe: '0:08 - 0:22',
      introductionAction: isIndo
        ? 'Mengeluarkan produk dengan percaya diri ke tengah frame, memamerkan tekstur dan kemasan'
        : 'Smoothly bringing product into focus showing texture and usage',
      demonstrationSteps: isIndo ? [
        {
          step: 1,
          action: 'Memperlihatkan kemasan dan cara penggunaan praktis',
          dialogue: 'Pas pertama coba ini, langsung berasa bedanya dari pemakaian pertama.',
          brollSuggestion: 'Close-up makro kemasan dan tekstur produk'
        },
        {
          step: 2,
          action: 'Mengaplikasikan atau memperagakan hasil langsung di depan kamera',
          dialogue: 'Lihat deh hasilnya, beneran instan dan nyaman banget dipakai!',
          brollSuggestion: 'Cut-to-reaction wajah tersenyum puas'
        }
      ] : [
        {
          step: 1,
          action: 'Applying/using product live on camera',
          dialogue: 'From the very first try, the difference was immediately noticeable.',
          brollSuggestion: 'Macro shot of product texture and application'
        },
        {
          step: 2,
          action: 'Showcasing the clean instant outcome',
          dialogue: 'Look at that instant glow and flawless finish. No sticky residue at all!',
          brollSuggestion: 'Split screen before/after comparison'
        }
      ],
      keyBenefitHighlight: isIndo
        ? 'Hasil nyata langsung terlihat, praktis digunakan harian, dan sangat hemat biaya.'
        : 'Instant visible results, effortless daily routine, premium quality.'
    },
    cta: {
      timeframe: '0:22 - 0:30',
      closingAction: ctaAction,
      spokenLine: ctaSpoken,
      onScreenSticker: isIndo ? 'KLIK KERANJANG DISKON HARI INI 🛒👇' : 'TAP BELOW TO GET YOURS 🛍️🔥',
      actionType: isTikTok ? 'Klik Keranjang Kuning' : isShopee ? 'Checkout Shopee' : 'Link in Bio'
    },
    caption: {
      hookLine: isIndo ? 'Akhirnya nemu solusi yang beneran works! 😍✨' : 'The secret is finally out! ✨',
      bodyText: isIndo 
        ? 'Gak nyangka hasilnya secepet ini. Wajib cobain sendiri mumpung lagi ada promo bundling & free ongkir hari ini!'
        : 'Honestly obsessed with how easy this made my daily routine. Grab yours before this batch sells out!',
      ctaLine: isIndo ? '👇 Klik keranjang kuning / link di bio sebelum kehabisan!' : '👇 Tap the link in bio to shop now!',
      hashtags: isIndo 
        ? ['#racunugc', '#reviewjujur', '#viralindonesia', '#rekomendasiproduk', '#ugccreator']
        : ['#ugccommunity', '#musthaves', '#viralproduct', '#honestreview', '#skincareroutine'],
      fullCaptionReadyToPost: isIndo
        ? 'Akhirnya nemu solusi yang beneran works! 😍✨\n\nGak nyangka hasilnya sebagus ini. Buat kalian yang punya masalah sama, mumpung lagi promo diskon & gratis ongkir langsung amankan sekarang!\n\n👇 Klik keranjang kuning sekarang sebelum kehabisan voucher!\n\n#racunugc #reviewjujur #viralindonesia #rekomendasiproduk'
        : 'The secret is finally out! 😍✨\n\nHonestly obsessed with how easy this made my daily routine. Grab yours before this batch sells out!\n\n👇 Tap below to shop the sale now!\n\n#ugccommunity #musthaves #viralproduct #honestreview'
    },
    storyboard: [
      {
        shotNumber: 1,
        timeframe: '0:00 - 0:03',
        shotType: 'Close-Up (CU)',
        visualDirection: isIndo ? 'Talent menghadap kamera dengan ekspresi kaget / antusias' : 'Creator leans into camera with enthusiastic expression',
        spokenDialogue: isIndo ? 'Jujur nyesel banget baru tahu rahasia ini sekarang!' : 'Stop scrolling! You need to see this right now.',
        textOverlay: isIndo ? 'NYESEL BARU TAHU 😭' : 'STOP SCROLLING 🚨',
        sfxOrMusicTip: 'Whoosh SFX + Upbeat Pop Synth'
      },
      {
        shotNumber: 2,
        timeframe: '0:03 - 0:10',
        shotType: 'Medium Close-Up (MCU)',
        visualDirection: isIndo ? 'Menjelaskan rasa frustrasi sebelum menemukan produk' : 'Explaining previous struggles with alternative products',
        spokenDialogue: isIndo ? 'Dulu tuh capek banget coba-coba macem-macem cara tapi gagal mulu.' : 'I used to struggle with this constantly every single morning.',
        textOverlay: isIndo ? 'Masalah yang sering dialami...' : 'Daily struggle is real 😫',
        sfxOrMusicTip: 'Soft background beat'
      },
      {
        shotNumber: 3,
        timeframe: '0:10 - 0:22',
        shotType: 'Macro Cut-In + Application',
        visualDirection: isIndo ? 'Demonstrasi pemakaian produk & ekspresi takjub' : 'Demonstrating application and showing immediate result',
        spokenDialogue: isIndo ? 'Pas nyobain ini langsung kerasa bedanya, hasilnya beneran se-glow ini!' : 'Look at this instant transformation, it is so effortless!',
        textOverlay: isIndo ? 'Hasilnya Nyata Banget! ✨' : 'Look at this result! ✨',
        sfxOrMusicTip: 'Sparkle sound effect'
      },
      {
        shotNumber: 4,
        timeframe: '0:22 - 0:30',
        shotType: 'Medium Shot (MS)',
        visualDirection: ctaAction,
        spokenDialogue: ctaSpoken,
        textOverlay: isIndo ? 'PROMO SPESIAL HARI INI 🛒' : 'LIMITED TIME DEAL 🛒',
        sfxOrMusicTip: 'Cash register ding / energetic outro'
      }
    ],
    directorTips: isIndo ? [
      'Gunakan pencahayaan alami dekat jendela atau ring light untuk hasil visual yang jernih.',
      'Jaga intonasi tetap santai seperti merekomendasikan ke sahabat karib, hindari membaca teks terlalu kaku.',
      'Pastikan 3 detik pertama memiliki gerakan dinamis agar penonton tidak skip video.'
    ] : [
      'Use natural daylight or a diffused softbox for crisp, authentic UGC skin tones.',
      'Keep voice natural and friendly—treat the camera like your best friend on FaceTime.',
      'Deliver the hook in the first 3 seconds with high kinetic energy.'
    ],
    fullSpokenScript: isIndo
      ? `Jujur nyesel banget baru tahu rahasia ini sekarang, pantesan viral di mana-mana! Dulu tuh capek banget nyobain macem-macem cara tapi hasilnya nihil dan buang duit. Pas pertama coba ini, langsung berasa bedanya dari pemakaian pertama. Lihat deh hasilnya, beneran instan dan nyaman banget dipakai! ${ctaSpoken}`
      : `Stop scrolling! If you deal with this every single day, you need to see this right now. I used to struggle with this constantly and spent way too much on things that never worked. From the very first try, the difference was immediately noticeable. Look at that instant glow and flawless finish! ${ctaSpoken}`
  };
}

// Helper to generate content with automatic model fallback and retries
async function generateContentWithFallback(ai: GoogleGenAI, requestPayload: any, backupParams?: any): Promise<any> {
  const modelsToTry = [
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-3.1-pro-preview',
  ];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.info(`Requesting Gemini model: ${model}`);
      const response = await ai.models.generateContent({
        ...requestPayload,
        model,
      });
      if (response && (response.text || typeof response.text === 'string')) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      console.info(`Model ${model} unavailable (${err?.status || err?.code || 'transient'}), attempting next model...`);
    }
  }

  // If all models encounter 503 high demand or quota limits, seamlessly return the resilient structured script
  if (backupParams) {
    console.info('Using resilient structured script fallback due to external API demand.');
    const backupData = generateResilientBackupScript(backupParams);
    return {
      text: JSON.stringify(backupData),
      isFallback: true,
    };
  }

  throw lastError || new Error('Failed to generate content after trying available models.');
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    midtransConfigured: !!process.env.MIDTRANS_SERVER_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Main UGC Script Generator API
app.post('/api/generate-ugc', requireAuth, requireAccess, async (req, res) => {
  try {
    const {
      characterImage,
      productImage,
      platform = 'tiktok',
      language = 'id_casual',
      hookStyle = 'shocking_regret',
      targetAudience = '',
      productKeyPoints = '',
      creatorVibeNotes = '',
      durationTarget = '30s',
    } = req.body;

    if (!characterImage?.data || !productImage?.data) {
      return res.status(400).json({
        error: 'Both character image and product image are required for UGC video analysis.',
      });
    }

    const ai = getGenAI();

    // Map platform and language instructions
    const platformGuides: Record<string, string> = {
      tiktok: 'Platform: TikTok (Fast-paced, authentic vertical 9:16 video, natural native creator speaking style, CTA focused on TikTok Shop Yellow Basket / Keranjang Kuning or comments).',
      reels: 'Platform: Instagram Reels (Aesthetic high-engagement style, conversational story, CTA directing to Link in Bio, DM keyword trigger e.g. "komen MAU buat link diskon").',
      shorts: 'Platform: YouTube Shorts (Punchy retention-focused, relatable problem-solving, subscribe & check pinned comment/link).',
      shopee: 'Platform: Shopee Video / Affiliate (High purchase intent, flash voucher highlight, direct click checkout icon).',
    };

    const languageGuides: Record<string, string> = {
      id_casual: 'Language: Indonesian (Bahasa Indonesia santai, luwes, natural sehari-hari layaknya konten kreator asli, tidak kaku).',
      id_jaksel: 'Language: Indonesian Jaksel / Trend-savvy (Campuran Indonesia kasual dengan istilah kekinian khas anak Jaksel/TikTok seperti literally, jujurly, racun banget, etc).',
      id_formal: 'Language: Indonesian Semi-Formal / Edukatif (Bahasa Indonesia rapi, profesional namun tetap hangat & persuasif).',
      en_casual: 'Language: English (Conversational, authentic UGC style, friendly and energetic native speaker vibe).',
      en_genz: 'Language: English Gen-Z (Trendy, fast-paced internet culture slang, witty, relatable).',
    };

    const hookStyleGuides: Record<string, string> = {
      shocking_regret: 'Hook Style: "Jujur nyesel baru tahu..." / "Stop scroll kalau kalian punya masalah..." (Urgent curiosity & regret hook).',
      storytelling: 'Hook Style: Personal Storytelling / "Jadi kemarin temen gue nanya kok bisa..." (Emotional narrative hook).',
      curiosity: 'Hook Style: "Kalian tau ga kenapa barang ini viral banget?" (Open-loop curiosity hook).',
      relatable_pov: 'Hook Style: "POV: Kalian capek banget tiap pagi harus..." (Highly relatable day-in-the-life situation).',
      unboxing: 'Hook Style: Instant sensory first impression & unboxing reaction.',
      before_after: 'Hook Style: Shocking contrast before vs after result display.',
      problem_solver: 'Hook Style: Direct callout to the target audience pain point in first 2 seconds.',
    };

    const systemPrompt = `You are an elite AI Marketing Director, Viral Growth Strategist, and Master UGC (User-Generated Content) Video Scriptwriter.
Your mission is to perform deep visual intelligence on TWO provided images:
Image 1: The Human Talent / Influencer / Creator photo.
Image 2: The Product photo being advertised.

You must craft a high-converting, authentic, scroll-stopping social media video ad script structured strictly according to UGC direct-response best practices.

Strict Requirements & Output Guidelines:
1. Analisis Visual:
   - Deeply analyze the talent's visual vibe, age range, facial expression, styling, environment, and body language.
   - Deeply analyze the product's packaging, color palette, texture, form factor, and value proposition.
   - Explain why this talent is the perfect match to sell this product and how their synergy maximizes trust and conversion.
2. Hook (0-3 detik):
   - Provide exact visual action (what the creator physically does on screen in the first 3 seconds to stop thumbs).
   - Exact spoken line with punchy inflection.
   - On-screen bold text overlay / sticker hook.
   - Recommended sound effect / trending audio cue.
   - 3 Alternative hook variations for A/B testing.
3. Problem / Pain Point:
   - Relatable real-world frustration that resonates with the viewer.
   - Facial expression and physical demonstration of the struggle.
   - Natural spoken dialogue emphasizing empathy.
4. Solution & Demonstration:
   - Natural, non-salesy product introduction ("Until I tried this...").
   - Step-by-step physical demonstration with sensory cues (texture, sound, ease of use, result).
   - B-roll shot recommendations (close-up product macro, application angle, reaction).
5. Call to Action (CTA):
   - Direct, high-urgency action command tailored to the platform (${platformGuides[platform] || 'TikTok'}).
   - Physical gesture (e.g., pointing down at the Yellow Basket / Keranjang Kuning or bio).
   - Irresistible FOMO reason (flash sale, limited stock, free gift, discount code).
6. Social Media Caption & Hashtags:
   - Ready-to-post engaging caption with hook line, benefit bullet points, CTA trigger, and targeted viral hashtags.
7. Storyboard breakdown (Shot by shot timestamp table from 0:00 to finish) with Visual Direction, Dialogue, Text Overlay, and SFX.
8. Tone: Authentic, conversational, highly engaging, zero robotic corporate fluff.`;

    const userPrompt = `Campaign Parameters:
- ${platformGuides[platform] || platform}
- ${languageGuides[language] || language}
- ${hookStyleGuides[hookStyle] || hookStyle}
- Target Duration: ${durationTarget}
${targetAudience ? `- Target Audience: ${targetAudience}` : ''}
${productKeyPoints ? `- Must-Mention Product Selling Points: ${productKeyPoints}` : ''}
${creatorVibeNotes ? `- Specific Talent Direction Notes: ${creatorVibeNotes}` : ''}

Please analyze the 2 provided images (Image 1: Creator, Image 2: Product) and output a complete UGC Video Script JSON.`;

    const parts = [
      {
        inlineData: {
          mimeType: characterImage.mimeType || 'image/jpeg',
          data: characterImage.data,
        },
      },
      {
        inlineData: {
          mimeType: productImage.mimeType || 'image/jpeg',
          data: productImage.data,
        },
      },
      {
        text: userPrompt,
      },
    ];

    const response = await generateContentWithFallback(
      ai,
      {
        contents: { parts },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Catchy campaign title' },
              analisisVisual: {
                type: Type.OBJECT,
                properties: {
                  characterVibe: { type: Type.STRING, description: 'Analysis of the talent visual persona, expressions and appeal' },
                  productCoreSellingPoints: { type: Type.STRING, description: 'Analysis of product visual packaging and main selling points' },
                  synergyStrategy: { type: Type.STRING, description: 'Why this creator and product match together for maximum conversion' },
                  audienceMatch: { type: Type.STRING, description: 'Specific target demographic that will trust this creator' },
                },
                required: ['characterVibe', 'productCoreSellingPoints', 'synergyStrategy', 'audienceMatch'],
              },
              hook: {
                type: Type.OBJECT,
                properties: {
                  timeframe: { type: Type.STRING, description: '0-3 detik' },
                  visualAction: { type: Type.STRING, description: 'Physical action creator takes on camera in first 3s' },
                  openingLine: { type: Type.STRING, description: 'Exact spoken dialogue for the hook' },
                  screenText: { type: Type.STRING, description: 'Bold text overlay to put on screen' },
                  audioTip: { type: Type.STRING, description: 'SFX or background sound recommendation' },
                  alternativeHooks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '3 alternative opening hook lines for A/B testing',
                  },
                },
                required: ['timeframe', 'visualAction', 'openingLine', 'screenText', 'audioTip', 'alternativeHooks'],
              },
              problem: {
                type: Type.OBJECT,
                properties: {
                  timeframe: { type: Type.STRING, description: 'e.g. 0:03 - 0:10' },
                  painPointDescription: { type: Type.STRING, description: 'Core problem/struggle addressed' },
                  visualAction: { type: Type.STRING, description: 'Visual action/expression showing pain point' },
                  spokenLine: { type: Type.STRING, description: 'Spoken dialogue for pain point' },
                  onScreenText: { type: Type.STRING, description: 'Text overlay during problem' },
                },
                required: ['timeframe', 'painPointDescription', 'visualAction', 'spokenLine', 'onScreenText'],
              },
              solution: {
                type: Type.OBJECT,
                properties: {
                  timeframe: { type: Type.STRING, description: 'e.g. 0:10 - 0:25' },
                  introductionAction: { type: Type.STRING, description: 'How the product is brought into frame naturally' },
                  demonstrationSteps: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        step: { type: Type.INTEGER },
                        action: { type: Type.STRING, description: 'Physical demonstration action' },
                        dialogue: { type: Type.STRING, description: 'Spoken dialogue while demonstrating' },
                        brollSuggestion: { type: Type.STRING, description: 'Camera angle / B-roll insert' },
                      },
                      required: ['step', 'action', 'dialogue', 'brollSuggestion'],
                    },
                  },
                  keyBenefitHighlight: { type: Type.STRING, description: 'Main transformation/benefit outcome' },
                },
                required: ['timeframe', 'introductionAction', 'demonstrationSteps', 'keyBenefitHighlight'],
              },
              cta: {
                type: Type.OBJECT,
                properties: {
                  timeframe: { type: Type.STRING, description: 'e.g. 0:25 - 0:30' },
                  closingAction: { type: Type.STRING, description: 'Gestures e.g. pointing to yellow basket' },
                  spokenLine: { type: Type.STRING, description: 'Spoken call to action line' },
                  onScreenSticker: { type: Type.STRING, description: 'Animated sticker / arrow / voucher banner' },
                  actionType: { type: Type.STRING, description: 'e.g. Klik Keranjang Kuning sekarang' },
                },
                required: ['timeframe', 'closingAction', 'spokenLine', 'onScreenSticker', 'actionType'],
              },
              caption: {
                type: Type.OBJECT,
                properties: {
                  hookLine: { type: Type.STRING, description: 'Opening sentence of caption' },
                  bodyText: { type: Type.STRING, description: 'Short benefits explanation' },
                  ctaLine: { type: Type.STRING, description: 'Caption CTA with link/basket prompt' },
                  hashtags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Curated viral hashtags'
                  },
                  fullCaptionReadyToPost: { type: Type.STRING, description: 'Complete assembled ready-to-copy caption with emojis' },
                },
                required: ['hookLine', 'bodyText', 'ctaLine', 'hashtags', 'fullCaptionReadyToPost'],
              },
              storyboard: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    shotNumber: { type: Type.INTEGER },
                    timeframe: { type: Type.STRING },
                    shotType: { type: Type.STRING },
                    visualDirection: { type: Type.STRING },
                    spokenDialogue: { type: Type.STRING },
                    textOverlay: { type: Type.STRING },
                    sfxOrMusicTip: { type: Type.STRING },
                  },
                  required: ['shotNumber', 'timeframe', 'shotType', 'visualDirection', 'spokenDialogue', 'textOverlay', 'sfxOrMusicTip'],
                },
              },
              directorTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Practical filming and lighting tips for the creator',
              },
              fullSpokenScript: {
                type: Type.STRING,
                description: 'Continuous dialogue script ready for teleprompter reading without stage directions',
              },
            },
            required: [
              'title',
              'analisisVisual',
              'hook',
              'problem',
              'solution',
              'cta',
              'caption',
              'storyboard',
              'directorTips',
              'fullSpokenScript',
            ],
          },
        },
      },
      {
        platform,
        language,
        hookStyle,
        targetAudience,
        productKeyPoints,
        creatorVibeNotes,
        durationTarget,
      }
    );

    const responseText = response.text || '';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('Failed to parse model JSON:', parseErr, responseText);
      return res.status(500).json({
        error: 'Failed to parse AI UGC script response.',
        raw: responseText,
      });
    }

    const scriptResult = {
      id: 'ugc_' + Date.now(),
      timestamp: Date.now(),
      platform,
      language,
      hookStyle,
      ...parsedData,
    };

    return res.json(scriptResult);
  } catch (error: any) {
    console.error('Error generating UGC script:', error);
    return res.status(500).json({
      error: error?.message || 'An error occurred while generating UGC script.',
    });
  }
});

// Quick Hook Generator API
app.post('/api/generate-more-hooks', requireAuth, requireAccess, async (req, res) => {
  try {
    const { scriptContext, productSummary, language = 'id_casual' } = req.body;
    const ai = getGenAI();

    const isIndo = language?.startsWith('id');
    const fallbackHooks = isIndo ? [
      {
        hookName: 'Urgent Regret Hook',
        visualAction: 'Pegang produk dekat kamera dengan tatapan kaget',
        openingDialogue: 'Sumpah nyesel banget baru nemu ini sekarang, pantesan rame banget di FYP!',
        onScreenText: 'NYESEL BARU TAHU 😭',
        hookAngle: 'Fear of Missing Out / High Curiosity'
      },
      {
        hookName: 'Stop Scroll Pain Point',
        visualAction: 'Tangan menghentikan scroll di depan lensa',
        openingDialogue: 'Stop scroll kalau kalian tiap hari masih ribet sama masalah ini!',
        onScreenText: 'STOP SCROLLING 🛑',
        hookAngle: 'Direct Problem Callout'
      },
      {
        hookName: 'Honest Review Shock',
        visualAction: 'Menepuk jidat lalu tersenyum puas',
        openingDialogue: 'Awalnya skeptis dikira cuma gimmick, pas dicoba ternyata beneran se-worth it itu!',
        onScreenText: 'JUJUR INI DILUAR EKSPEKTASI 😱',
        hookAngle: 'Skepticism to Belief Transformation'
      },
      {
        hookName: 'POV Relatable Morning',
        visualAction: 'Peragaan situasi harian sebelum memakai produk',
        openingDialogue: 'POV: Kamu akhirnya nemuin penyelamat hidup yang bikin semuanya serba praktis!',
        onScreenText: 'POV: HIDUP JADI LEBIH GAMPANG ✨',
        hookAngle: 'Relatable Lifestyle Situation'
      },
      {
        hookName: 'Exclusive Secret Deal',
        visualAction: 'Berbisik ke mikrofon sambil menunjuk produk',
        openingDialogue: 'Jangan bilang siapa-siapa, rahasia ini yang bikin temen-temenku pada heran!',
        onScreenText: 'RAHASIA VIRAL 🤫🔥',
        hookAngle: 'Insider Secret Knowledge'
      }
    ] : [
      {
        hookName: 'Urgent Regret Hook',
        visualAction: 'Holding product close to camera with shocked expression',
        openingDialogue: 'I genuinely regret not finding this months ago, no wonder it is trending everywhere!',
        onScreenText: 'WHY DID NO ONE TELL ME 😭',
        hookAngle: 'FOMO / Curiosity'
      },
      {
        hookName: 'Stop Scroll Callout',
        visualAction: 'Hand gesture stopping the scroll directly at camera',
        openingDialogue: 'Stop scrolling if you are tired of wasting your money on things that never work!',
        onScreenText: 'STOP SCROLLING 🛑',
        hookAngle: 'Target Pain Point'
      },
      {
        hookName: 'Honest Testing',
        visualAction: 'Showing authentic first reaction test',
        openingDialogue: 'I tested this so you do not have to, and here is the honest truth!',
        onScreenText: 'HONEST VIRAL TEST 😱',
        hookAngle: 'Social Proof & Transparency'
      },
      {
        hookName: 'POV Gamechanger',
        visualAction: 'Showing quick effortless routine',
        openingDialogue: 'POV: You found the holy grail item that changed your entire morning routine.',
        onScreenText: 'POV: LIFE CHANGER ✨',
        hookAngle: 'Relatable Lifestyle'
      },
      {
        hookName: 'Secret Hack',
        visualAction: 'Whispering to mic showing before/after snippet',
        openingDialogue: 'Keep this between us, but this one simple switch changed everything.',
        onScreenText: 'THE REAL SECRET 🤫🔥',
        hookAngle: 'Insider Tip'
      }
    ];

    try {
      const response = await generateContentWithFallback(ai, {
        contents: `Generate 5 fresh, extremely viral, scroll-stopping 0-3 second video ad hooks for this product in ${language}.
Context: ${JSON.stringify(scriptContext || productSummary)}
Output format: JSON array of objects with { "hookName": string, "visualAction": string, "openingDialogue": string, "onScreenText": string, "hookAngle": string }`,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '[]');
      return res.json({ hooks: parsed && parsed.length > 0 ? parsed : fallbackHooks });
    } catch {
      return res.json({ hooks: fallbackHooks });
    }
  } catch (error: any) {
    console.error('Error generating hooks:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate hooks' });
  }
});

// ==========================================
// 1. Veo Video Generation API (Animate Image to Video)
// ==========================================
app.post('/api/generate-video', requireAuth, requireAccess, async (req, res) => {
  try {
    const {
      image, // { data: string (base64), mimeType: string }
      prompt = 'Animate this photo into an engaging, smooth, natural social media video ad clip',
      aspectRatio = '9:16',
      resolution = '720p',
    } = req.body;

    const ai = getGenAI();
    const cleanAspectRatio = aspectRatio === '16:9' ? '16:9' : '9:16';
    const cleanResolution = resolution === '1080p' ? '1080p' : '720p';

    // Model preference as requested: veo-3.1-fast-generate-preview, with fallback
    const videoModels = [
      'veo-3.1-fast-generate-preview',
      'veo-3.1-lite-generate-preview',
      'veo-3.1-generate-preview',
    ];

    let operationResult = null;
    let lastError = null;

    for (const model of videoModels) {
      try {
        console.info(`Requesting Veo video generation with model: ${model}`);
        const videoPayload: any = {
          model,
          prompt: prompt || 'Animate this photo with subtle natural motion and cinematic lighting',
          config: {
            numberOfVideos: 1,
            resolution: cleanResolution,
            aspectRatio: cleanAspectRatio,
          },
        };

        if (image?.data) {
          videoPayload.image = {
            imageBytes: image.data,
            mimeType: image.mimeType || 'image/jpeg',
          };
        }

        const operation = await ai.models.generateVideos(videoPayload);
        if (operation && operation.name) {
          operationResult = operation;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Veo model ${model} error:`, err?.message || err);
      }
    }

    if (!operationResult) {
      throw lastError || new Error('Failed to initiate video generation with Veo models.');
    }

    return res.json({
      operationName: operationResult.name,
      aspectRatio: cleanAspectRatio,
      prompt,
    });
  } catch (error: any) {
    console.error('Error in /api/generate-video:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to start video generation.',
    });
  }
});

// Video generation status polling API
app.post('/api/video-status', requireAuth, requireAccess, async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const ai = getGenAI();
    const updated = await ai.operations.getVideosOperation({
      operation: { name: operationName } as any,
    });

    return res.json({
      done: !!updated.done,
      error: updated.error || null,
    });
  } catch (error: any) {
    console.error('Error checking video status:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to check video generation status.',
    });
  }
});

// Video stream/download proxy API
app.post('/api/video-download', requireAuth, requireAccess, async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const ai = getGenAI();
    const updated = await ai.operations.getVideosOperation({
      operation: { name: operationName } as any,
    });

    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
    if (!uri) {
      return res.status(404).json({ error: 'Video URI not ready or found in operation.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || '';
    const videoRes = await fetch(uri, {
      headers: { 'x-goog-api-key': apiKey },
    });

    if (!videoRes.ok) {
      throw new Error(`Failed to download video stream from Google URI: ${videoRes.statusText}`);
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (videoRes.body) {
      // Stream chunks to response
      const reader = videoRes.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          res.write(value);
        }
      };
      await pump();
    } else {
      const arrayBuffer = await videoRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    }
  } catch (error: any) {
    console.error('Error downloading video:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to stream generated video.',
    });
  }
});

// ==========================================
// 2. Create & Edit Images API (gemini-3.1-flash-image-preview)
// ==========================================
app.post('/api/generate-image', requireAuth, requireAccess, async (req, res) => {
  try {
    const {
      prompt,
      baseImage, // optional { data: string (base64), mimeType: string } for editing
      aspectRatio = '1:1', // "1:1" | "3:4" | "4:3" | "9:16" | "16:9"
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required for image generation/editing.' });
    }

    const ai = getGenAI();

    // Models for image generation/editing as requested: gemini-3.1-flash-image-preview with fallbacks
    const imageModels = [
      'gemini-3.1-flash-image-preview',
      'gemini-3.1-flash-image',
      'gemini-3.1-flash-lite-image',
      'gemini-3-pro-image',
    ];

    let lastError = null;
    let imageUrlResult = null;
    let descriptionText = '';

    for (const model of imageModels) {
      try {
        console.info(`Requesting Image generation/edit with model: ${model}`);
        let parts: any[] = [];

        if (baseImage?.data) {
          // Editing existing image
          parts = [
            {
              inlineData: {
                data: baseImage.data,
                mimeType: baseImage.mimeType || 'image/jpeg',
              },
            },
            {
              text: prompt,
            },
          ];
        } else {
          // Creating new image from text prompt
          parts = [
            {
              text: prompt,
            },
          ];
        }

        const config: any = {
          imageConfig: {
            aspectRatio: aspectRatio || '1:1',
            imageSize: '1K',
          },
        };

        const response = await ai.models.generateContent({
          model,
          contents: { parts },
          config,
        });

        const candidates = response.candidates || [];
        if (candidates.length > 0 && candidates[0].content?.parts) {
          for (const part of candidates[0].content.parts) {
            if (part.inlineData?.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              imageUrlResult = `data:${mime};base64,${part.inlineData.data}`;
            } else if (part.text) {
              descriptionText += part.text;
            }
          }
        }

        if (imageUrlResult) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Image model ${model} error:`, err?.message || err);
      }
    }

    if (!imageUrlResult) {
      throw lastError || new Error('Failed to generate or edit image with AI image models.');
    }

    return res.json({
      imageUrl: imageUrlResult,
      prompt,
      text: descriptionText,
      mode: baseImage?.data ? 'edit' : 'create',
      aspectRatio,
    });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate/edit image.',
    });
  }
});


// Vite & Express Integration
async function startServer() {
  enforceConfig();
  await initDb();
  console.log('Database initialized.');
  startCronJobs();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`UGC Video Script Director server running on port ${PORT}`);
  });
}

startServer();
