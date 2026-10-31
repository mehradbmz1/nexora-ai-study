/**
 * Nexora Cloudflare Worker Backend
 * Powered by Cloudflare D1 (SQLite) and Workers AI
 */

export interface Env {
  DB: D1Database;
  AI?: any;
  ASSETS?: { fetch: (req: Request | string) => Promise<Response> };
}

// Helper: CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

// Clean and sanitize LLM outputs to remove cross-lingual token leaks and eliminate annoying asterisks
function sanitizeAiResponse(raw: string, persian: boolean): string {
  if (!raw) return '';
  let s = raw;

  // 1. Replace escaped multiplication asterisks (\* -> ×)
  s = s.replace(/\\\*/g, '×');

  // 2. Eradicate markdown bold/italic asterisks completely (**text** -> text, *text* -> text)
  s = s.replace(/\*{2,}/g, '');
  s = s.replace(/(^|\n)\s*\*\s+/g, '$1• ');
  s = s.replace(/\*/g, '');

  if (persian) {
    // Replace Chinese homoglyphs
    s = s.replace(/作用/g, 'اثر');
    s = s.replace(/是的/g, 'بله');
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
      headers: { 'User-Agent': 'NexoraAIStudyPlatform/2.0' }
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
          { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', name: 'Meta Llama 3.3 70B Instruct', provider: 'Meta', isFree: true, isDefault: true },
          { id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 Distill Qwen 32B', provider: 'DeepSeek', isFree: true },
          { id: '@cf/meta/llama-3.2-11b-vision-instruct', name: 'Meta Llama 3.2 11B Vision', provider: 'Meta', isFree: true, supportsVision: true },
          { id: '@cf/qwen/qwen2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B Instruct', provider: 'Alibaba Qwen', isFree: true },
          { id: '@cf/meta/llama-3.1-70b-instruct', name: 'Meta Llama 3.1 70B Instruct', provider: 'Meta', isFree: true },
          { id: '@cf/meta/llama-3.2-3b-instruct', name: 'Meta Llama 3.2 3B Instruct', provider: 'Meta', isFree: true },
          { id: '@cf/meta/llama-3.2-1b-instruct', name: 'Meta Llama 3.2 1B Instruct', provider: 'Meta', isFree: true }
        ];
        return jsonResponse({ success: true, models });
      }

      // 6b. SPEECH TO TEXT TRANSCRIBE (Cloudflare Workers AI Whisper)
      if (path === '/api/ai/transcribe' && request.method === 'POST') {
        let bytes: number[] = [];
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const body = await request.json() as { audio?: number[]; audioBase64?: string };
          if (body.audio && Array.isArray(body.audio)) {
            bytes = body.audio;
          } else if (body.audioBase64) {
            const clean = body.audioBase64.replace(/^data:audio\/[a-z0-9-]+;base64,/, '');
            const binary = atob(clean);
            const uint = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              uint[i] = binary.charCodeAt(i);
            }
            bytes = Array.from(uint);
          }
        } else {
          const buf = await request.arrayBuffer();
          bytes = Array.from(new Uint8Array(buf));
        }

        if (bytes.length === 0) {
          return jsonResponse({ success: false, error: 'No audio data received' }, 400);
        }

        if (env.AI) {
          try {
            const aiRes = await env.AI.run('@cf/openai/whisper', {
              audio: bytes
            });
            const text = (aiRes?.text || '').trim();
            return jsonResponse({ success: true, text });
          } catch (err: any) {
            return jsonResponse({ success: false, error: err.message || 'Speech recognition failed' }, 500);
          }
        }

        return jsonResponse({ success: false, error: 'AI binding not available' }, 500);
      }

      // 7. CLOUDFLARE WORKERS AI CHAT / VISION RUNNER
      if (path === '/api/ai/chat' && request.method === 'POST') {
        const body = await request.json() as {
          prompt?: string;
          imageDataUrl?: string;
          imageDataUrls?: string[];
          curriculum?: string;
          modelId?: string;
          user?: { firstName?: string; lastName?: string; email?: string; gradeLevel?: string };
          messages?: { role: 'user' | 'assistant'; content: string }[];
          isVoiceMode?: boolean;
        };

        const prompt = body.prompt || '';
        const curriculum = body.curriculum || 'iran';
        const isVoice = !!body.isVoiceMode;
        const userGrade = body.user?.gradeLevel || '';
        const rawModelId = body.modelId || (body.imageDataUrl || (body.imageDataUrls && body.imageDataUrls.length > 0)
          ? '@cf/meta/llama-3.2-11b-vision-instruct'
          : '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
        const modelId = normalizeModelId(rawModelId);
        const isPersian =
          curriculum === 'iran' ||
          /[\u0600-\u06FF]/.test(prompt) ||
          (body.messages && body.messages.some(m => /[\u0600-\u06FF]/.test(m.content)));

        // Detect if user specifically asked for "فقط گزینه"
        const wantsOnlyOption = /فقط\s*گزینه|فقط\s*پاسخ|فقط\s*جواب|just\s*(the\s*)?option/i.test(prompt);

        // Gather all image URLs provided
        const allImages: string[] = [];
        if (body.imageDataUrls && Array.isArray(body.imageDataUrls)) {
          allImages.push(...body.imageDataUrls.filter(Boolean));
        } else if (body.imageDataUrl) {
          allImages.push(body.imageDataUrl);
        }

        // Live Academic References Search (skip in voice mode or short conversational greetings)
        const isGreetingOrShort = /^(سلام|درود|خوبی|چطوری|صبح بخیر|عصر بخیر|سلام علیکم|hello|hi|hey)[\s!.,؟]*$/i.test(prompt.trim()) || prompt.trim().length < 3;
        const academicSources = (isVoice || isGreetingOrShort) ? [] : await searchAcademicSources(prompt, isPersian);
        let academicContext = '';
        if (academicSources.length > 0) {
          academicContext = `\n\n### مراجع علمی و مستندات یافت‌شده برای این موضوع:\n` +
            academicSources.map(s => `- ${s.title}: ${s.snippet}`).join('\n') +
            `\n(از این مراجع علمی در راستی‌آزمایی، اثبات دقیق و ذکر دلیل علمی پاسخ خود استفاده کن و به هیچ وجه از ستاره در متن استفاده نکن.)`;
        }

        if (env.AI) {
          if (allImages.length > 0) {
            try {
              const ocrResults: string[] = [];

              for (let i = 0; i < allImages.length; i++) {
                const imgData = allImages[i];
                let bytes: number[] = [];
                try {
                  const base64Part = imgData.includes(',') ? imgData.split(',')[1] : imgData;
                  const cleanBase64 = base64Part.trim().replace(/[\r\n\s]/g, '').replace(/-/g, '+').replace(/_/g, '/');
                  const padLen = (4 - (cleanBase64.length % 4)) % 4;
                  const padded = cleanBase64 + '='.repeat(padLen);
                  const binaryString = atob(padded);
                  bytes = new Array<number>(binaryString.length);
                  for (let j = 0; j < binaryString.length; j++) {
                    bytes[j] = binaryString.charCodeAt(j);
                  }
                } catch (e) {
                  console.error('Base64 decode error:', e);
                  continue;
                }

                if (bytes.length === 0) continue;

                // High-precision direct Persian solving prompt for Meta Llama 3.2 11B Vision
                const directVisionPrompt = isPersian
                  ? `شما «نکسورا» هستید؛ استاد و راهنمای برجسته حل تمرین و تدریس دروس.
این تصویر را با بالاترین دقت بررسی کن و تمامی مسائل و سوالات موجود در آن را ۱۰۰٪ به زبان فارسی رسمی و روان حل کن:
۱. صورت کامل سوالات، مقادیر، اعداد و گزینه‌ها را بخوان.
۲. تمام محاسبات، فرمول‌ها و مراحل استدلال علمی را گام‌به‌گام و دقیق به فارسی تشریح کن.
۳. در پایان هر سوال، گزینه صحیح یا پاسخ نهایی را به صورت مشخص بنویس:
پاسخ نهایی: [پاسخ یا گزینه صحیح]
۴. اگر تصویر فقط یک عکس، نمودار یا شیء است، تمام جزئیات آن را به فارسی دقیق توضیح بده.
۵. اکیداً از علامت ستاره (*) استفاده نکن.
${prompt ? `درخواست ویژه دانش‌آموز: ${prompt}` : ''}`
                  : `You are Nexora AI, an expert academic problem-solving tutor.
Analyze this image carefully. Transcribe all problems and multiple-choice options.
Solve each question step-by-step with formulas and calculations, stating the final answer clearly.
Do NOT use asterisks (*).
${prompt ? `User request: ${prompt}` : ''}`;

                let transcribed = '';
                try {
                  const visionRes = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
                    prompt: directVisionPrompt,
                    image: bytes,
                    max_tokens: 1500,
                  });
                  transcribed = (visionRes as any)?.response || '';
                } catch (err: any) {
                  console.warn('Vision primary model error:', err);
                  transcribed = isPersian
                    ? 'تصویر با موفقیت دریافت شد. در حال حاضر تصویر قابل پردازش نبود، لطفاً عکس واضح‌تر و مستقیم‌تری از سوال ارسال فرمایید.'
                    : 'The image could not be processed. Please provide a clearer image.';
                }

                if (transcribed) {
                  ocrResults.push(allImages.length > 1 ? `[تصویر ${i + 1}]:\n${transcribed}` : transcribed);
                }
              }

              let combinedResult = ocrResults.join('\n\n---\n\n');

              if (!combinedResult.trim()) {
                combinedResult = isPersian
                  ? 'تصویری برای پردازش بازخوانی نشد. لطفاً مجدداً عکس خود را ارسال کنید.'
                  : 'No content could be extracted from the image. Please re-upload.';
              }

              // If user specifically asked for "فقط گزینه", run a fast 70B distillation
              if (wantsOnlyOption && combinedResult.length > 20) {
                try {
                  const solverRes = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
                    messages: [
                      { role: 'system', content: 'بر اساس این متن و حل مسئله، فقط شماره گزینه صحیح را بدون هیچ توضیح اضافی و بدون ستاره بنویس: گزینه صحیح: گزینه [شماره]' },
                      { role: 'user', content: combinedResult }
                    ],
                    max_tokens: 60,
                  });
                  const opt = (solverRes as any)?.response;
                  if (opt && opt.trim()) combinedResult = opt.trim();
                } catch {}
              }

              const content = sanitizeAiResponse(combinedResult, isPersian);

              const citations = academicSources.length > 0
                ? academicSources.map(s => ({
                    title: s.title,
                    url: s.url,
                    source: isPersian ? 'دانشنامه علمی' : 'Academic Reference'
                  }))
                : (isPersian ? [
                    { title: 'کتاب‌های درسی رسمی آموزش و پرورش', url: 'http://chap.sch.ir', source: 'آموزش و پرورش' },
                    { title: 'شبکه ملی رشد', url: 'https://roshd.ir', source: 'رشد' },
                    { title: 'سازمان سنجش آموزش کشور', url: 'https://sanjesh.org', source: 'سنجش' }
                  ] : [
                    { title: 'Stanford Encyclopedia of Science', url: 'https://plato.stanford.edu', source: 'Stanford' }
                  ]);

              return jsonResponse({
                success: true,
                content,
                modelId: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
                modelName: 'Nexora Flagship Vision + Llama 3.3 70B',
                citations,
                followUps: isPersian ? [
                  'می‌توانی یک سوال تستی چهارگزینه‌ای از این مبحث بپرسی؟',
                  'یک سوال تشریحی مفهومی از من بپرس تا یادگیری‌ام را بسنجم',
                  'یک روش دوم یا راه میان‌بر تستی برای این مسئله بگو'
                ] : [
                  'Test my understanding with a multiple-choice question',
                  'Ask me a conceptual practice question',
                  'Can you solve this using an alternative method?'
                ]
              });
            } catch (err: any) {
              return jsonResponse({
                success: false,
                error: 'خطا در تحلیل تصویر: ' + (err.message || 'Vision analysis failed')
              }, 500);
            }
          } else {
            // Conversational memory: incorporate previous turns
            const userGreeting = body.user?.firstName
              ? `دانش‌آموز گرامی: «${body.user.firstName} ${body.user.lastName || ''}»`
              : '';

            const isAskingForQuiz = /سوال\s*(بپرس|طرح\s*کن|مطرح\s*کن|بده)|تست\s*(بپرس|طرح\s*کن|بزن|بده)|کوئیز\s*(بگیر|بپرس)|از\s*من\s*سوال|امتحان\s*بگیر|ask\s*(me\s*)?(a\s*)?question/i.test(prompt);

            const reasoningDirective = wantsOnlyOption
              ? `کاربر صریحاً خواسته است که «فقط گزینه» مشخص شود.
الزام حیاتی ضدباگ:
۱. درستی سوال و تمامی فرمول‌ها و محاسبات را در ذهن خود با بالاترین دقت علمی چک و راستی‌آزمایی کن تا هیچ باگ یا اشتباهی در گزینه رخ ندهد.
۲. بدون هیچ‌گونه توضیح اضافی، اطاله کلام، مقدمه‌چینی یا آوردن مراحل و بدون استفاده از هرگونه ستاره (* یا **)، مستقیماً و فقط گزینه صحیح را اعلام نما:
گزینه صحیح: گزینه [شماره گزینه]`
              : `الزام حیاتی علمی، استدلالی و جلوگیری از باگ:
۱. برای هر پاسخ، حتماً «دلیل علمی»، «اثبات فرمولی»، «محاسبات گام‌به‌گام» و «علت رد سایر گزینه‌ها» را به طور دقیق تشریح کن تا پاسخ کاملاً مستدل، مستند و اثبات‌پذیر باشد و هیچ باگی نداشته باشد.
۲. از ارائه پاسخ‌های شتاب‌زده یا بدون دلیل اکیداً خودداری کن.
۳. اکیداً از به کار بردن علامت ستاره (* یا **) در سراسر متن خودداری کن. به جای آن، عنوان‌ها را ساده و تمیز بنویس.
۴. در پایان پس از اثبات کامل، گزینه صحیح یا پاسخ نهایی را به صورت ساده و شفاف اعلام کن:
پاسخ نهایی: [پاسخ]`;

            let systemPrompt = '';
            if (isVoice) {
              systemPrompt = isPersian
                ? `شما «نکسورا» در یک گفتگوی صوتی زنده (Voice Call) با دانش‌آموز هستید.
دستورالعمل‌های حیاتی برای مکالمه صوتی بدون باگ:
۱. فقط و دقیقاً نسبت به همان سوالی که کاربر به صورت صوتی پرسیده است پاسخ کوتاه، مستقیم و محاوره‌ای بده.
۲. از زیاده‌گویی، مقدمه‌چینی، سخنرانی طولانی یا پاسخ‌های کش‌دار اکیداً خودداری کن؛ پاسخ باید حداکثر ۲ تا ۳ جمله کوتاه، روان و شبیه یک مکالمه واقعی باشد تا خوانش صوتی سریع و طبیعی باشد.
۳. به هیچ وجه از علائم ستاره (* یا **)، فرمول‌های طولانی چندخطی، جداول یا فهرست‌های شماره‌دار استفاده نکن.
۴. به مکالمات قبلی همین چت وفادار بمان و تا زمانی که کاربر نخواسته، از موضوع چت خارج نشو.`
                : `You are Nexora in a live oral voice call.
Answer directly, concisely, and conversationally in 2-3 short sentences.
Only answer specifically what was asked. No asterisks, formulas, or long lists. Stay strictly on the current conversation topic.`;
            } else {
              systemPrompt = isPersian
                ? `شما «نکسورا» (Nexora) هستید؛ یک استاد و معلم خصوصی دانشمند، بسیار مسلط، دقیق، شکیبا و صمیمی.
${userGreeting ? `شما با ${userGreeting} گفتگو می‌کنید.` : ''} ${userGrade ? `(پایه تحصیلی: ${userGrade})` : ''}
${academicContext}

دستورالعمل‌های حیاتی:
۱. زبان پاسخ: تمام پاسخ‌های شما باید ۱۰۰٪ به زبان فارسی رسمی، بسیار روان، شیوا، علمی، سلیس و کاملاً طبیعی با رسم‌الخط استاندارد فارسی باشد. اکیداً از به کار بردن کاراکترهای چینی، لغات اسپانیایی یا کلمات انگلیسی در میان متن فارسی خودداری کن.
۲. اکیداً از به کار بردن هرگونه علامت ستاره (* یا **) در سراسر متن خودداری کن. عناوین و گزینه‌ها را به صورت متن تمیز و ساده بنویس.
۳. ${reasoningDirective}
۴. توضیحات کامل و عمیق: پاسخ‌ها را خلاصه یا ناقص رها نکن. برای هر پرسش، مفاهیم پایه‌ای، تعاریف علمی، فرمول‌های مرتبط، مثال‌های روشن و نتیجه‌گیری دقیق را شرح بده تا موضوع به شکل عمیق درک شود.
۵. وفاداری به موضوع و حافظه چت: تمام پیام‌های قبلی این گفتگو را به دقت در نظر داشته باش. پاسخ‌های جدید باید دقیقاً بر پایه مباحث و درس‌هایی باشد که در همین گفتگو مطرح شده است و تا زمانی که کاربر نخواسته، از موضوع اصلی چت خارج نشو.
۶. ${isAskingForQuiz ? `طرح سوال و آزمون بر اساس محتوای چت (درخواست صریح کاربر):
کاربر از شما خواسته است که سوال یا تست بپرسید:
- سوال را دقیقاً و منحصراً از همان موضوع و مبحثی که در پیام‌های قبلی همین گفتگو مطرح شد طرح کن.
- سوال باید کاملاً منطقی، آموزشی و متناسب با پایه تحصیلی دانش‌آموز (${userGrade || 'پایه تحصیلی کاربر'}) باشد.
- صورت سوال و گزینه‌ها را دقیق مطرح کن و از کاربر بخواه پاسخ دهد تا یادگیری‌اش سنجیده شود. هرگز پاسخ و گزینه درست را در همان پیام اول لو نده تا کاربر خودش فکر کند و پاسخ دهد!` : `عدم تحمیل آزمون تستی خودسرانه: هرگز به صورت ناخواسته سوال تستی مطرح نکنید، مگر اینکه کاربر صریحاً بخواهد. در پایان درس، فقط در صورت لزوم محترمانه پیشنهاد دهید:
«💡 آیا مایلید برای سنجش تسلط شما بر این مبحث، یک تست یا سوال مفهومی از همین درس بپرسم؟»`}
۷. انطباق با مقطع و پایه تحصیلی:
سطح دشواری مباحث، فرمول‌ها و شیوه تدریس را با مقطع و پایه تحصیلی دانش‌آموز (${userGrade || 'متوسطه دوم / کنکور'}) تطبیق بده. اگر پایه دانش‌آموز هنوز مشخص نیست و کاربر درباره مسائل کلی صحبت می‌کند، در فرصتی مناسب بپرس که کلاس چندم است تا محتوا دقیقاً منطبق بر کتاب‌های درسی همان پایه ارائه شود.`
                : `You are Nexora AI, a world-class academic study assistant.
${body.user?.firstName ? `Student: ${body.user.firstName} ${body.user.lastName || ''}` : ''} ${userGrade ? `(Grade: ${userGrade})` : ''}
${wantsOnlyOption ? 'The student wants ONLY the correct option. Verify all calculations rigorously in your internal reasoning, then output ONLY: Correct Option: Option [X] (without asterisks)' : 'Provide rigorous step-by-step reasoning with formulas explaining WHY the answer is correct without using asterisks.'}
Rules:
1. Deliver articulate, comprehensive, and step-by-step academic explanations in English without asterisks.
2. Solve problems step-by-step with formulas and clearly state the final answer without asterisks.
3. Retain conversational memory across previous turns within this session. Stick strictly to the conversation topic.
4. If the student asks for a question or quiz, generate a logical question from the active chat's subject matter.`;
            }

            const llmMessages: { role: string; content: string }[] = [
              { role: 'system', content: systemPrompt }
            ];

            if (body.messages && Array.isArray(body.messages)) {
              // Take up to last 20 messages for deep conversational memory
              const recent = body.messages.slice(-20);
              for (const m of recent) {
                if (m.role === 'user' || m.role === 'assistant') {
                  llmMessages.push({ role: m.role, content: m.content });
                }
              }
            }

            // Ensure current prompt is present as the final user message
            const lastMsg = llmMessages[llmMessages.length - 1];
            if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== prompt) {
              if (prompt.trim()) {
                llmMessages.push({ role: 'user', content: prompt });
              }
            }

            const aiRes = await env.AI.run(modelId, {
              messages: llmMessages,
              max_tokens: isVoice ? 180 : (wantsOnlyOption ? 100 : 3500)
            });

            const rawContent = aiRes?.response || (isPersian ? 'پاسخ دریافت گردید.' : 'Response received.');
            const content = sanitizeAiResponse(rawContent, isPersian);

            // Generate smart, contextually-relevant follow-up prompts
            const followUps = isPersian ? [
              'می‌توانی یک سوال تستی چهارگزینه‌ای از این مبحث بپرسی؟',
              'یک سوال تشریحی مفهومی از من بپرس تا یادگیری‌ام را بسنجم',
              'یک مثال کاربردی‌تر از این موضوع بزن'
            ] : [
              'Test my understanding with a multiple-choice question',
              'Ask me a conceptual practice question',
              'Can you give another real-world example?'
            ];

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

            return jsonResponse({
              success: true,
              content,
              modelId,
              citations,
              followUps
            });
          }
        }

        return jsonResponse({
          success: true,
          content: 'پاسخ هوش مصنوعی نکسورا پردازش گردید.',
          modelId
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
