/**
 * Nexora Cloudflare Worker Backend
 * Powered by Cloudflare D1 (SQLite) and Workers AI
 */

export interface Env {
  DB: D1Database;
  AI?: any;
  ASSETS?: { fetch: (req: Request | string) => Promise<Response> };
  GEMINI_API_KEY?: string;
  CF_AI_GATEWAY_URL?: string;
  OPENAI_API_KEY?: string;
}

// Chunked conversion to avoid Maximum call stack size exceeded errors in V8
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

// Helper: CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-gemini-key',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Password hashing using Web Crypto API (universal across Edge & Node)
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  const salt = enc.encode('nexora-global-salt-2026');
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    true,
    ['sign']
  );
  const exported = await crypto.subtle.exportKey('raw', key);
  return Array.from(new Uint8Array(exported))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate random UUID / Session Token
function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
}

// Strict Academic Olympiad and Konkoor Tutor System Instruction
const ACADEMIC_SYSTEM_INSTRUCTION = `تو یک استاد برجسته، دقیق و المپیادی در دروس ریاضی، فیزیک، شیمی و زیست‌شناسی هستی. هنگام دریافت تصویر، صوت یا متن سوال طبق این مراحل عمل کن:
۱. استخراج دقیق اطلاعات: ابتدا تمام جزئیات تصویر یا صورت سوال شامل ساختارهای شیمیایی، پیوندهای دوگانه و سه‌گانه، گروه‌های عاملی، اعداد، اندیس‌ها و متغیرها را با دقت بالا تحلیل کن.
۲. حل گام‌به‌گام پیش از اعلام نتیجه: هرگز در خط اول بدون استدلال فقط شماره گزینه را نگو. ابتدا مسئله را گام‌به‌گام با استدلال علمی و فرمول‌های استاندارد حل کن.
۳. فرمت‌بندی استاندارد فرمول‌ها: تمام فرمول‌های ریاضی، فیزیک و معادلات شیمیایی را حتماً داخل تگ‌های استاندارد LaTeX قرار بده (از $...$ برای فرمول‌های درون‌خطی و از $$...$$ برای فرمول‌های مستقل در خط جداگانه استفاده کن).
۴. تحلیل تمام گزینه‌ها: در سوالات تستی، دلیل علمی رد شدن گزینه‌های نادرست و دلیل درستی گزینه هدف را به تفکیک توضیح بده و در انتها گزینه صحیح را به صورت کاملاً مشخص اعلام کن.
۵. لحن و نگارش: پاسخ‌ها باید کاملاً به زبان فارسی روان، علمی، آموزشی و راست‌چین (RTL) باشند.`;

// Clean and sanitize LLM outputs to remove cross-lingual token leaks while preserving LaTeX math ($$, $)
function sanitizeAiResponse(raw: string, persian: boolean): string {
  if (!raw) return '';
  let s = raw;

  // 1. Replace escaped multiplication asterisks (\* -> ×)
  s = s.replace(/\\\*/g, '×');

  // 2. Eradicate markdown asterisks only outside of LaTeX math blocks
  const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$)/g;
  const parts = s.split(mathRegex);
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i]) {
      parts[i] = parts[i]
        .replace(/\*{2,}/g, '')
        .replace(/(^|\n)\s*\*\s+/g, '$1• ')
        .replace(/\*/g, '');
    }
  }
  s = parts.join('');

  if (persian) {
    // Replace Chinese homoglyphs
    s = s.replace(/作用/g, 'اثر');
    s = s.replace(/是的/g, 'بله');
    s = s.replace(/لیکن/g, 'اما');
    s = s.replace(/但是/g, 'اما');
    s = s.replace(/因为/g, 'زیرا');
    s = s.replace(/所以/g, 'بنابراین');
    // Remove all Chinese / CJK characters & ideographs & symbols
    s = s.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/g, '');
    // Remove foreign tokens leaked by tokenizer
    s = s.replace(/\blực\b/gi, 'نیرو');
    s = s.replace(/\bfuerza\b/gi, 'نیروی');
    s = s.replace(/\baqu[íi]\b/gi, '');
    s = s.replace(/\bHola\b/gi, '');
    s = s.replace(/\bpero\b/gi, 'اما');
    s = s.replace(/\bcomo\b/gi, '');
    s = s.replace(/\bpara\b/gi, 'برای');
    s = s.replace(/\bporque\b/gi, 'زیرا');
    s = s.replace(/\(\s*\)/g, '');
    s = s.replace(/[ \t]{2,}/g, ' ');
  }
  return s.trim();
}

// Live Academic References Search (Persian & English Encyclopedia)
async function searchAcademicSources(query: string, isPersian: boolean): Promise<{ title: string; snippet: string; url: string }[]> {
  try {
    const clean = query
      .replace(/سلام|درود|خوبی|چطوری|صبح بخیر|عصر بخیر|لطفاً|حل کن|توضیح بده|بگو|گزینه|چیست|چگونه|پاسخ|تست|مسئله|تصویر|عکس|حل|در مورد|درباره|معنی|مفهوم|سوال بپرس/gi, '')
      .replace(/[?!؟.,;:]/g, '')
      .trim();

    const searchTerm = clean.slice(0, 40).trim();
    if (!searchTerm || searchTerm.length < 2) return [];

    const lang = isPersian ? 'fa' : 'en';
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchTerm)}&limit=2&namespace=0&format=json&origin=*`;

    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'NexoraAIStudyPlatform/2.0' },
      signal: AbortSignal.timeout(2000)
    });
    if (!res.ok) return [];

    const data = await res.json() as [string, string[], string[], string[]];
    const titles = data[1] || [];
    const urls = data[3] || [];

    if (titles.length === 0) return [];

    const results: { title: string; snippet: string; url: string }[] = [];

    for (let i = 0; i < Math.min(titles.length, 2); i++) {
      const title = titles[i];
      const pageUrl = urls[i] || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
      try {
        const sumRes = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, {
          headers: { 'User-Agent': 'NexoraAIStudyPlatform/2.0' }
        });
        if (sumRes.ok) {
          const sumData = await sumRes.json() as any;
          if (sumData.extract) {
            results.push({
              title: sumData.title || title,
              snippet: (sumData.extract || '').slice(0, 200),
              url: pageUrl
            });
            continue;
          }
        }
      } catch {
        // Fallback
      }
      results.push({
        title,
        snippet: `مدخل علمی تخصصی «${title}»`,
        url: pageUrl
      });
    }

    return results;
  } catch {
    // Fail gracefully without interrupting main AI flow
  }
  return [];
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Route static frontend assets if non-API request
    if (!path.startsWith('/api/') && env.ASSETS) {
      return await env.ASSETS.fetch(request);
    }

    try {
      // 1. REGISTER: Create Account (First Name, Last Name, Unique Email, Password)
      if (path === '/api/auth/register' && request.method === 'POST') {
        const body = await request.json() as {
          firstName?: string;
          lastName?: string;
          email?: string;
          password?: string;
        };

        const firstName = body.firstName?.trim();
        const lastName = body.lastName?.trim();
        const email = body.email?.trim().toLowerCase();
        const password = body.password;

        if (!firstName || !lastName || !email || !password) {
          return jsonResponse({ success: false, error: 'First name, last name, email, and password are required.' }, 400);
        }

        if (password.length < 6) {
          return jsonResponse({ success: false, error: 'Password must be at least 6 characters long.' }, 400);
        }

        // Check if email already exists
        const existing = await env.DB.prepare('SELECT id FROM nexora_users WHERE email = ?').bind(email).first();
        if (existing) {
          return jsonResponse({
            success: false,
            error: 'این ایمیل قبلاً ثبت‌نام شده است. لطفاً وارد شوید. (This email is already registered. Please sign in.)'
          }, 409);
        }

        const userId = 'usr_' + crypto.randomUUID();
        const passwordHash = await hashPassword(password);
        const createdAt = new Date().toISOString();

        await env.DB.prepare(
          'INSERT INTO nexora_users (id, first_name, last_name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(userId, firstName, lastName, email, passwordHash, createdAt).run();

        const token = generateToken();
        const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(); // 30 days
        await env.DB.prepare(
          'INSERT INTO nexora_sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
        ).bind(token, userId, expiresAt).run();

        return jsonResponse({
          success: true,
          user: { id: userId, firstName, lastName, email, createdAt },
          token,
          message: 'Account created successfully globally on Cloudflare.'
        });
      }

      // 2. LOGIN: Email & Password
      if (path === '/api/auth/login' && request.method === 'POST') {
        const body = await request.json() as { email?: string; password?: string };
        const email = body.email?.trim().toLowerCase();
        const password = body.password;

        if (!email || !password) {
          return jsonResponse({ success: false, error: 'Email and password are required.' }, 400);
        }

        const userRow = await env.DB.prepare(
          'SELECT id, first_name, last_name, email, password_hash, created_at FROM nexora_users WHERE email = ?'
        ).bind(email).first<{
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          password_hash: string;
          created_at: string;
        }>();

        if (!userRow) {
          return jsonResponse({
            success: false,
            error: 'کاربری با این ایمیل یافت نشد. (No account found with this email.)'
          }, 404);
        }

        const inputHash = await hashPassword(password);
        if (inputHash !== userRow.password_hash) {
          return jsonResponse({
            success: false,
            error: 'رمز عبور اشتباه است. (Incorrect password.)'
          }, 401);
        }

        const token = generateToken();
        const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
        await env.DB.prepare(
          'INSERT INTO nexora_sessions (token, user_id, expires_at) VALUES (?, ?, ?)'
        ).bind(token, userRow.id, expiresAt).run();

        return jsonResponse({
          success: true,
          user: {
            id: userRow.id,
            firstName: userRow.first_name,
            lastName: userRow.last_name,
            email: userRow.email,
            createdAt: userRow.created_at
          },
          token
        });
      }

      // 3. AUTH ME: Verify Session Token
      if (path === '/api/auth/me' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '').trim();
        if (!token) return jsonResponse({ success: false, error: 'Unauthorized' }, 401);

        const session = await env.DB.prepare(
          'SELECT s.user_id, u.first_name, u.last_name, u.email, u.created_at FROM nexora_sessions s JOIN nexora_users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > ?'
        ).bind(token, new Date().toISOString()).first<{
          user_id: string;
          first_name: string;
          last_name: string;
          email: string;
          created_at: string;
        }>();

        if (!session) return jsonResponse({ success: false, error: 'Invalid or expired session' }, 401);

        return jsonResponse({
          success: true,
          user: {
            id: session.user_id,
            firstName: session.first_name,
            lastName: session.last_name,
            email: session.email,
            createdAt: session.created_at
          }
        });
      }

      // 4. CHATS SYNC: Get user conversations
      if (path === '/api/chats' && request.method === 'GET') {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '').trim();
        if (!token) return jsonResponse({ success: false, error: 'Unauthorized' }, 401);

        const session = await env.DB.prepare('SELECT user_id FROM nexora_sessions WHERE token = ?').bind(token).first<{ user_id: string }>();
        if (!session) return jsonResponse({ success: false, error: 'Unauthorized' }, 401);

        const rows = await env.DB.prepare(
          'SELECT id, title, subject, category, messages_json, updated_at FROM nexora_conversations WHERE user_id = ? ORDER BY updated_at DESC'
        ).bind(session.user_id).all();

        const conversations = (rows.results || []).map((r: any) => ({
          id: r.id,
          userId: session.user_id,
          title: r.title,
          subject: r.subject,
          category: r.category,
          updatedAt: r.updated_at,
          messages: JSON.parse(r.messages_json || '[]')
        }));

        return jsonResponse({ success: true, conversations });
      }

      // 5. CHAT SAVE / UPSERT
      if (path === '/api/chats' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '').trim();
        if (!token) return jsonResponse({ success: false, error: 'Unauthorized' }, 401);

        const session = await env.DB.prepare('SELECT user_id FROM nexora_sessions WHERE token = ?').bind(token).first<{ user_id: string }>();
        if (!session) return jsonResponse({ success: false, error: 'Unauthorized' }, 401);

        const body = await request.json() as {
          id: string;
          title: string;
          subject?: string;
          category?: string;
          messages: any[];
        };

        const now = new Date().toISOString();
        await env.DB.prepare(
          `INSERT INTO nexora_conversations (id, user_id, title, subject, category, messages_json, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title=excluded.title,
             subject=excluded.subject,
             category=excluded.category,
             messages_json=excluded.messages_json,
             updated_at=excluded.updated_at`
        ).bind(
          body.id,
          session.user_id,
          body.title,
          body.subject || 'physics',
          body.category || 'Today',
          JSON.stringify(body.messages || []),
          now
        ).run();

        return jsonResponse({ success: true, id: body.id, updatedAt: now });
      }

      // 5b. CHAT DELETE
      if (path.startsWith('/api/chats/') && request.method === 'DELETE') {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '').trim();
        if (!token) return jsonResponse({ success: false, error: 'Unauthorized' }, 401);

        const session = await env.DB.prepare('SELECT user_id FROM nexora_sessions WHERE token = ?').bind(token).first<{ user_id: string }>();
        if (!session) return jsonResponse({ success: false, error: 'Unauthorized' }, 401);

        const chatId = path.replace('/api/chats/', '').trim();
        await env.DB.prepare('DELETE FROM nexora_conversations WHERE id = ? AND user_id = ?').bind(chatId, session.user_id).run();
        return jsonResponse({ success: true, message: 'Chat deleted successfully' });
      }

function normalizeModelId(modelId?: string): string {
  if (!modelId || modelId === '@cf/meta/llama-3.3-70b-instruct') {
    return '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
  }
  if (modelId === '@cf/meta/llama-3.1-8b-instruct' || modelId === '@cf/meta/llama-3-8b-instruct') {
    return '@cf/meta/llama-3.2-3b-instruct';
  }
  if (modelId === '@cf/qwen/qwen2.5-72b-instruct' || modelId === '@cf/qwen/qwen1.5-14b-chat-awq') {
    return '@cf/qwen/qwen2.5-coder-32b-instruct';
  }
  if (modelId.includes('deepseek-math') || modelId.includes('deepseek-coder')) {
    return '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b';
  }
  return modelId;
}

      // 6. GET CLOUDFLARE AI MODELS LIST
      if (path === '/api/ai/models' && request.method === 'GET') {
        const models = [
          { id: 'gemini-2.5-flash', name: 'Google Gemini 2.5 Flash', provider: 'Google', isFree: true, supportsVision: true, isDefault: true },
          { id: 'gemini-2.5-pro', name: 'Google Gemini 2.5 Pro (Olympiad)', provider: 'Google', isFree: true, supportsVision: true },
          { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', name: 'Meta Llama 3.3 70B Instruct', provider: 'Meta', isFree: true },
          { id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 Distill Qwen 32B', provider: 'DeepSeek', isFree: true },
          { id: '@cf/meta/llama-3.2-11b-vision-instruct', name: 'Meta Llama 3.2 11B Vision', provider: 'Meta', isFree: true, supportsVision: true },
          { id: '@cf/qwen/qwen2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B Instruct', provider: 'Alibaba Qwen', isFree: true },
          { id: '@cf/meta/llama-3.1-70b-instruct', name: 'Meta Llama 3.1 70B Instruct', provider: 'Meta', isFree: true },
          { id: '@cf/meta/llama-3.2-3b-instruct', name: 'Meta Llama 3.2 3B Instruct', provider: 'Meta', isFree: true },
          { id: '@cf/meta/llama-3.2-1b-instruct', name: 'Meta Llama 3.2 1B Instruct', provider: 'Meta', isFree: true }
        ];
        return jsonResponse({ success: true, models });
      }

      // 6b. SPEECH TO TEXT TRANSCRIBE (Google Gemini Multimodal Audio or Cloudflare Whisper)
      if (path === '/api/ai/transcribe' && request.method === 'POST') {
        const contentType = request.headers.get('content-type') || '';
        let audioBuffer: ArrayBuffer | null = null;
        let audioMime = 'audio/webm';

        if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          const file = (formData.get('audio') || formData.get('file')) as File | null;
          if (file) {
            audioBuffer = await file.arrayBuffer();
            audioMime = file.type || 'audio/webm';
          }
        } else if (contentType.includes('application/json')) {
          const body = await request.json() as { audio?: number[]; audioBase64?: string };
          if (body.audio && Array.isArray(body.audio)) {
            audioBuffer = new Uint8Array(body.audio).buffer;
          } else if (body.audioBase64) {
            const clean = body.audioBase64.replace(/^data:audio\/[a-z0-9-]+;base64,/, '');
            const binary = atob(clean);
            const uint = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              uint[i] = binary.charCodeAt(i);
            }
            audioBuffer = uint.buffer;
          }
        } else {
          audioBuffer = await request.arrayBuffer();
          audioMime = contentType || 'audio/webm';
        }

        if (!audioBuffer || audioBuffer.byteLength === 0) {
          return jsonResponse({ success: false, error: 'No audio data received' }, 400);
        }

        const geminiKey = request.headers.get('x-gemini-key') || env.GEMINI_API_KEY;

        // 1. High-accuracy Persian speech transcription via Google Gemini Multimodal Audio
        if (geminiKey) {
          try {
            const base64Audio = arrayBufferToBase64(audioBuffer);
            const cleanMime = audioMime.split(';')[0] || 'audio/webm';
            const geminiBase = env.CF_AI_GATEWAY_URL
              ? env.CF_AI_GATEWAY_URL.replace(/\/+$/, '') + '/v1beta/models'
              : 'https://generativelanguage.googleapis.com/v1beta/models';

            const geminiRes = await fetch(`${geminiBase}/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: 'شما دستیار دقیق تبدیل صوت به متن فارسی هستید. تمام کلمات گفته‌شده را با املای درست، دقیق و بدون هیچ توضیح یا سلام اضافه‌ای بازنویسی کن. فقط متن گفتار را خروجی بده.' }]
                },
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { text: 'لطفاً این فایل صوتی را به متن فارسی تبدیل کن:' },
                      { inlineData: { mimeType: cleanMime, data: base64Audio } }
                    ]
                  }
                ],
                generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
              })
            });

            if (geminiRes.ok) {
              const data = await geminiRes.json() as any;
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
              if (text) {
                return jsonResponse({ success: true, text });
              }
            }
          } catch (e) {
            console.warn('Gemini audio transcription fallback:', e);
          }
        }

        // 2. Fallback to Cloudflare Workers AI Whisper
        if (env.AI) {
          try {
            const bytes = Array.from(new Uint8Array(audioBuffer));
            const aiRes = await env.AI.run('@cf/openai/whisper', {
              audio: bytes
            });
            const text = (aiRes?.text || '').trim();
            return jsonResponse({ success: true, text });
          } catch (err: any) {
            return jsonResponse({ success: false, error: err.message || 'Speech recognition failed' }, 500);
          }
        }

        return jsonResponse({ success: false, error: 'AI transcription binding not available' }, 500);
      }

      // 7. UNIFIED MULTIMODAL AI CHAT & VISION RUNNER (Google Gemini 2.5 + Cloudflare Workers AI Fallback)
      if (path === '/api/ai/chat' && request.method === 'POST') {
        const contentType = request.headers.get('content-type') || '';
        let prompt = '';
        let curriculum = 'iran';
        let rawModelId = '';
        let isVoice = false;
        let user: { firstName?: string; lastName?: string; email?: string; gradeLevel?: string } | undefined;
        let messages: { role: 'user' | 'assistant'; content: string }[] | undefined;

        interface ParsedMedia {
          mimeType: string;
          base64: string;
          buffer?: ArrayBuffer;
        }

        const parsedImages: ParsedMedia[] = [];
        let parsedAudio: ParsedMedia | null = null;

        // A. Handle Multipart/FormData (Preferred: Zero payload bloat, high-fidelity binary)
        if (contentType.includes('multipart/form-data')) {
          const formData = await request.formData();
          prompt = (formData.get('prompt') as string) || '';
          curriculum = (formData.get('curriculum') as string) || 'iran';
          rawModelId = (formData.get('modelId') as string) || '';
          isVoice = formData.get('isVoiceMode') === 'true';

          if (formData.has('user')) {
            try { user = JSON.parse(formData.get('user') as string); } catch {}
          }
          if (formData.has('messages')) {
            try { messages = JSON.parse(formData.get('messages') as string); } catch {}
          }

          // Extract all image files
          const imageEntries = formData.getAll('images').concat(formData.getAll('image'));
          for (const item of imageEntries) {
            if (item instanceof File && item.size > 0) {
              const buf = await item.arrayBuffer();
              const base64 = arrayBufferToBase64(buf);
              parsedImages.push({
                mimeType: item.type || 'image/jpeg',
                base64,
                buffer: buf,
              });
            }
          }

          // Extract audio file if provided
          const audioEntry = formData.get('audio') as File | null;
          if (audioEntry && audioEntry.size > 0) {
            const buf = await audioEntry.arrayBuffer();
            parsedAudio = {
              mimeType: audioEntry.type || 'audio/webm',
              base64: arrayBufferToBase64(buf),
              buffer: buf,
            };
          }
        } else {
          // B. Handle Application/JSON (Legacy Support)
          const body = await request.json() as any;
          prompt = body.prompt || '';
          curriculum = body.curriculum || 'iran';
          rawModelId = body.modelId || '';
          isVoice = !!body.isVoiceMode;
          user = body.user;
          messages = body.messages;

          const legacyUrls: string[] = [];
          if (body.imageDataUrls && Array.isArray(body.imageDataUrls)) {
            legacyUrls.push(...body.imageDataUrls.filter(Boolean));
          } else if (body.imageDataUrl) {
            legacyUrls.push(body.imageDataUrl);
          }

          for (const url of legacyUrls) {
            const match = url.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              parsedImages.push({
                mimeType: match[1] || 'image/jpeg',
                base64: match[2].trim(),
              });
            } else {
              parsedImages.push({
                mimeType: 'image/jpeg',
                base64: url.trim(),
              });
            }
          }
        }

        const userGrade = user?.gradeLevel || '';
        const isPersian =
          curriculum === 'iran' ||
          /[\u0600-\u06FF]/.test(prompt) ||
          (messages && messages.some(m => /[\u0600-\u06FF]/.test(m.content)));

        const wantsOnlyOption = /فقط\s*گزینه|فقط\s*پاسخ|فقط\s*جواب|just\s*(the\s*)?option/i.test(prompt);

        // Academic Reference Search
        const isGreetingOrShort = /^(سلام|درود|خوبی|چطوری|صبح بخیر|عصر بخیر|سلام علیکم|hello|hi|hey)[\s!.,؟]*$/i.test(prompt.trim()) || prompt.trim().length < 3;
        const academicSources = (isVoice || isGreetingOrShort) ? [] : await searchAcademicSources(prompt, isPersian);
        let academicContext = '';
        if (academicSources.length > 0) {
          academicContext = `\n\n### مراجع علمی و مستندات یافت‌شده برای این موضوع:\n` +
            academicSources.map(s => `- ${s.title}: ${s.snippet}`).join('\n') +
            `\n(از این مراجع علمی در راستی‌آزمایی، اثبات دقیق و ذکر دلیل علمی پاسخ خود استفاده کن.)`;
        }

        // Construct System Instruction based on mode
        let activeSystemPrompt = ACADEMIC_SYSTEM_INSTRUCTION;
        if (isVoice) {
          activeSystemPrompt = isPersian
            ? `شما «نکسورا» در یک گفتگوی صوتی زنده (Voice Call) با دانش‌آموز هستید.
دستورالعمل‌های حیاتی برای مکالمه صوتی بدون باگ:
۱. فقط و دقیقاً نسبت به همان سوالی که کاربر صوتی پرسیده پاسخ کوتاه، مستقیم و محاوره‌ای در ۲ تا ۳ جمله روان بده.
۲. از زیاده‌گویی، مقدمه‌چینی، سخنرانی طولانی یا پاسخ‌های کش‌دار اکیداً خودداری کن تا خوانش صوتی سریع و طبیعی باشد.
۳. به هیچ وجه از علائم ستاره (* یا **)، فرمول‌های طولانی چندخطی یا جداول استفاده نکن.
۴. به مکالمات قبلی همین چت وفادار بمان.`
            : `You are Nexora in a live oral voice call. Answer directly, concisely, and conversationally in 2-3 short sentences. No asterisks, formulas, or long lists. Stay strictly on the current conversation topic.`;
        } else if (wantsOnlyOption) {
          activeSystemPrompt += `\nکاربر صریحاً خواسته است که «فقط گزینه» مشخص شود. محاسبات و استدلال را در ذهن انجام بده، سپس فقط گزینه را اعلام کن: گزینه صحیح: گزینه [شماره]`;
        }

        if (academicContext) {
          activeSystemPrompt += academicContext;
        }

        // Follow-ups & citations template
        const citations = isVoice
          ? []
          : (academicSources.length > 0
            ? academicSources.map(s => ({
                title: s.title,
                url: s.url,
                source: isPersian ? 'دانشنامه علمی' : 'Academic Reference'
              }))
            : (isGreetingOrShort
              ? []
              : (isPersian ? [
                  { title: 'کتاب‌های درسی رسمی آموزش و پرورش', url: 'http://chap.sch.ir', source: 'آموزش و پرورش' },
                  { title: 'شبکه ملی رشد', url: 'https://roshd.ir', source: 'رشد' },
                  { title: 'سازمان سنجش آموزش کشور', url: 'https://sanjesh.org', source: 'سنجش' }
                ] : [])));

        const followUps = isPersian ? [
          'می‌توانی یک سوال تستی چهارگزینه‌ای از این مبحث بپرسی؟',
          'یک سوال تشریحی مفهومی از من بپرس تا یادگیری‌ام را بسنجم',
          'یک روش دوم یا راه میان‌بر تستی برای این مسئله بگو'
        ] : [
          'Test my understanding with a multiple-choice question',
          'Ask me a conceptual practice question',
          'Can you solve this using an alternative method?'
        ];

        // 1. PRIMARY ENGINE: Google Gemini 2.5 API (Vision, Audio & Academic Reasoning)
        const geminiKey = request.headers.get('x-gemini-key') || env.GEMINI_API_KEY;

        if (geminiKey) {
          try {
            const targetModel = rawModelId.includes('pro') ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
            const geminiBase = env.CF_AI_GATEWAY_URL
              ? env.CF_AI_GATEWAY_URL.replace(/\/+$/, '') + '/v1beta/models'
              : 'https://generativelanguage.googleapis.com/v1beta/models';

            const geminiContents: any[] = [];

            // Add previous conversational history turns
            if (messages && Array.isArray(messages)) {
              for (const m of messages.slice(-16)) {
                geminiContents.push({
                  role: m.role === 'assistant' ? 'model' : 'user',
                  parts: [{ text: m.content }]
                });
              }
            }

            // Construct current user message parts
            const currentParts: any[] = [];
            if (prompt.trim()) {
              currentParts.push({ text: prompt });
            } else if (parsedImages.length > 0) {
              currentParts.push({ text: 'لطفاً این تصویر را با دقت بررسی و گام‌به‌گام با فرمول‌های دقیق LaTeX حل کن.' });
            }

            for (const img of parsedImages) {
              currentParts.push({
                inlineData: {
                  mimeType: img.mimeType,
                  data: img.base64
                }
              });
            }

            if (parsedAudio) {
              currentParts.push({
                inlineData: {
                  mimeType: parsedAudio.mimeType,
                  data: parsedAudio.base64
                }
              });
            }

            geminiContents.push({
              role: 'user',
              parts: currentParts
            });

            const isStreamRequested = url.searchParams.get('stream') === 'true' ||
              request.headers.get('accept')?.includes('text/event-stream');

            if (isStreamRequested) {
              const streamRes = await fetch(`${geminiBase}/${targetModel}:streamGenerateContent?alt=sse&key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  systemInstruction: {
                    parts: [{ text: activeSystemPrompt }]
                  },
                  contents: geminiContents,
                  generationConfig: {
                    temperature: 0.35,
                    maxOutputTokens: isVoice ? 350 : 4096
                  }
                })
              });

              if (streamRes.ok && streamRes.body) {
                return new Response(streamRes.body, {
                  headers: {
                    ...corsHeaders,
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                  }
                });
              }
            }

            // Standard JSON Request
            const genRes = await fetch(`${geminiBase}/${targetModel}:generateContent?key=${geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: activeSystemPrompt }]
                },
                contents: geminiContents,
                generationConfig: {
                  temperature: 0.35,
                  maxOutputTokens: isVoice ? 350 : 4096
                }
              })
            });

            if (genRes.ok) {
              const gData = await genRes.json() as any;
              const rawText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (rawText) {
                const content = sanitizeAiResponse(rawText, isPersian);
                return jsonResponse({
                  success: true,
                  content,
                  modelId: targetModel,
                  modelName: targetModel.includes('pro') ? 'Google Gemini 2.5 Pro (Olympiad STEM)' : 'Google Gemini 2.5 Flash (Academic STEM Pro)',
                  citations,
                  followUps
                });
              }
            }
          } catch (geminiErr) {
            console.warn('Gemini upstream failed, falling back to Workers AI:', geminiErr);
          }
        }

        // 2. FALLBACK ENGINE: Cloudflare Workers AI
        if (env.AI) {
          if (parsedImages.length > 0) {
            try {
              const ocrResults: string[] = [];

              for (let i = 0; i < parsedImages.length; i++) {
                const img = parsedImages[i];
                let bytes: number[] = [];

                if (img.buffer) {
                  bytes = Array.from(new Uint8Array(img.buffer));
                } else if (img.base64) {
                  const binaryString = atob(img.base64);
                  bytes = new Array<number>(binaryString.length);
                  for (let j = 0; j < binaryString.length; j++) {
                    bytes[j] = binaryString.charCodeAt(j);
                  }
                }

                if (bytes.length === 0) continue;

                const directVisionPrompt = isPersian
                  ? `${ACADEMIC_SYSTEM_INSTRUCTION}\n\nتصویر را با نهایت دقت بررسی و حل کن:\n${prompt || 'مسئله درسی را حل کن.'}`
                  : `Analyze this image carefully. Solve academic problems step-by-step with LaTeX formulas.\n${prompt || 'Solve the question.'}`;

                let transcribed = '';
                try {
                  const visionRes = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
                    prompt: directVisionPrompt,
                    image: bytes,
                    max_tokens: 1800,
                  });
                  transcribed = (visionRes as any)?.response || '';
                } catch (err: any) {
                  console.warn('Vision primary model error:', err);
                  transcribed = isPersian
                    ? 'تصویر دریافت شد. لطفاً در صورت امکان عکس مستقیم‌تر و واضح‌تری ارسال فرمایید.'
                    : 'The image could not be processed.';
                }

                if (transcribed) {
                  ocrResults.push(parsedImages.length > 1 ? `[تصویر ${i + 1}]:\n${transcribed}` : transcribed);
                }
              }

              let combinedResult = ocrResults.join('\n\n---\n\n');
              if (!combinedResult.trim()) {
                combinedResult = isPersian
                  ? 'تصویری برای پردازش بازخوانی نشد. لطفاً مجدداً عکس خود را ارسال کنید.'
                  : 'No content could be extracted from the image.';
              }

              const content = sanitizeAiResponse(combinedResult, isPersian);

              return jsonResponse({
                success: true,
                content,
                modelId: '@cf/meta/llama-3.2-11b-vision-instruct',
                modelName: 'Meta Llama 3.2 11B Vision',
                citations,
                followUps
              });
            } catch (err: any) {
              return jsonResponse({
                success: false,
                error: 'خطا در تحلیل تصویر: ' + (err.message || 'Vision analysis failed')
              }, 500);
            }
          } else {
            // Text Conversation
            const llmMessages: { role: string; content: string }[] = [
              { role: 'system', content: activeSystemPrompt }
            ];

            if (messages && Array.isArray(messages)) {
              for (const m of messages.slice(-16)) {
                if (m.role === 'user' || m.role === 'assistant') {
                  llmMessages.push({ role: m.role, content: m.content });
                }
              }
            }

            const lastMsg = llmMessages[llmMessages.length - 1];
            if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== prompt) {
              if (prompt.trim()) {
                llmMessages.push({ role: 'user', content: prompt });
              }
            }

            const chosenModel = normalizeModelId(rawModelId || '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
            const aiRes = await env.AI.run(chosenModel, {
              messages: llmMessages,
              max_tokens: isVoice ? 180 : (wantsOnlyOption ? 100 : (isGreetingOrShort ? 300 : 2500))
            });

            const rawContent = aiRes?.response || (isPersian ? 'پاسخ دریافت گردید.' : 'Response received.');
            const content = sanitizeAiResponse(rawContent, isPersian);

            return jsonResponse({
              success: true,
              content,
              modelId: chosenModel,
              modelName: 'Meta Llama 3.3 70B Instruct',
              citations,
              followUps
            });
          }
        }

        return jsonResponse({
          success: true,
          content: 'پاسخ هوش مصنوعی نکسورا پردازش گردید.',
          modelId: '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
        });
      }

      if (env.ASSETS) {
        return await env.ASSETS.fetch(request);
      }
      return jsonResponse({ error: 'Endpoint not found' }, 404);
    } catch (err: any) {
      return jsonResponse({ success: false, error: err.message || 'Internal Cloudflare Error' }, 500);
    }
  }
};
