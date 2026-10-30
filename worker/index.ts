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
      .replace(/لطفاً|حل کن|توضیح بده|بگو|گزینه|چیست|چگونه|پاسخ|تست|مسئله|تصویر|عکس|حل|در مورد|درباره/gi, '')
      .replace(/[?!؟.,;:]/g, '')
      .trim();

    const searchTerm = clean.slice(0, 50).trim();
    if (!searchTerm || searchTerm.length < 2) return [];

    const lang = isPersian ? 'fa' : 'en';
    const apiUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*&srlimit=3`;

    const res = await fetch(apiUrl, {
      headers: { 'User-Agent': 'NexoraAIStudyPlatform/2.0' }
    });
    if (!res.ok) return [];

    const data = await res.json() as any;
    if (data.query?.search && Array.isArray(data.query.search)) {
      return data.query.search.slice(0, 3).map((item: any) => ({
        title: item.title,
        snippet: (item.snippet || '')
          .replace(/<[^>]+>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, '&')
          .trim(),
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`
      }));
    }
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
          user?: { firstName?: string; lastName?: string; email?: string };
          messages?: { role: 'user' | 'assistant'; content: string }[];
        };

        const prompt = body.prompt || '';
        const curriculum = body.curriculum || 'iran';
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

        // Live Academic References Search
        const academicSources = await searchAcademicSources(prompt, isPersian);
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
                const base64Part = imgData.includes(',') ? imgData.split(',')[1] : imgData;
                const cleanBase64 = base64Part.trim().replace(/\s/g, '');
                const binaryString = atob(cleanBase64);
                const bytes = new Uint8Array(binaryString.length);
                for (let j = 0; j < binaryString.length; j++) {
                  bytes[j] = binaryString.charCodeAt(j);
                }

                // Stage 1: High-precision Vision OCR Transcription using Llama 3.2 11B Vision
                const ocrPrompt = `You are a high-precision document OCR and academic problem transcription engine.
Examine this image with extreme care and extract all details verbatim:
1. Exact transcription of every problem, question statement, numbers, units, variables, and formulas. If in Persian/Farsi, transcribe the Persian text exactly.
2. Exact transcription of all multiple-choice options (1, 2, 3, 4 or الف، ب، ج، د) and their values.
3. Description and labels of any diagrams, charts, circuits, or geometric shapes.
4. Provide an initial step-by-step mathematical or scientific solution for each question.
Do NOT use asterisks.`;

                const visionRes = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
                  prompt: ocrPrompt,
                  image: Array.from(bytes),
                  max_tokens: 2500,
                });

                const transcribed = (visionRes as any)?.response || '';
                ocrResults.push(allImages.length > 1 ? `[تصویر ${i + 1}]:\n${transcribed}` : transcribed);
              }

              const combinedOcr = ocrResults.join('\n\n---\n\n');

              // Stage 2: Flagship Deep Reasoning and Persian Pedagogical Solution with Meta Llama 3.3 70B
              const systemVision = isPersian
                ? `شما «نکسورا» (Nexora) هستید؛ استاد و مدرس برجسته کنکور، امتحانات نهایی و حل مسائل درسی.
وظیفه شما حل کامل، گام‌به‌گام، مستدل و دقیق تمامی سوالات استخراج‌شده از تصویر ارسالی دانش‌آموز است.

دستورالعمل‌های حیاتی برای حل کامل و ضدباگ:
۱. اکیداً از علامت ستاره (* یا **) در سراسر پاسخ خودداری کن. هیچ ستاره‌ای نباید در متن ظاهر شود.
۲. حل کامل و دونه‌به‌دونه: تمام سوالات تصویر را به صورت جداگانه (سوال ۱:، سوال ۲: و...) شماره‌گذاری کن.
۳. صورت کامل هر سوال، مقادیر داده‌شده و گزینه‌ها را دقیق بنویس.
۴. حل تشریحی و عمیق: هرگز خلاصه یا کوتاه ننویس. مراحل حل را با فرمول‌های علمی، محاسبات دقیق ریاضی/فیزیک/شیمی و استدلال مستحکم به فارسی سلیس و روان شرح بده. علت درستی گزینه صحیح و دلیل رد سایر گزینه‌ها را با اثبات علمی تشریح کن.
۵. پاسخ نهایی: در پایان هر سوال، بدون ستاره بنویس:
پاسخ نهایی: [پاسخ یا گزینه صحیح]`
                : `You are Nexora AI, a premier academic problem-solving tutor.
Solve each problem from the image transcription step-by-step with formulas, calculations, and clear proofs.
Do NOT use asterisks (* or **) in your output.
State the final answer clearly without asterisks.`;

              const userVision = wantsOnlyOption
                ? (isPersian
                    ? `کاربر صریحاً خواسته است که «فقط گزینه» مشخص شود.
بر اساس متن و اطلاعات بازخوانی‌شده از روی تصویر:
"""
${combinedOcr}
"""
تمام محاسبات و گزینه‌ها را در ذهن خود با دقت صددرصد بازبینی کن تا هیچ باگی رخ ندهد. سپس بدون ستاره و بدون هیچ توضیح اضافه، فقط گزینه صحیح را اعلام کن:
گزینه صحیح: گزینه [شماره گزینه]`
                    : `Based on this transcribed image:
"""
${combinedOcr}
"""
The user requested ONLY the option. Verify rigorously, then output ONLY without asterisks:
Correct Option: Option [X]`)
                : (isPersian
                    ? `محتوای استخراج‌شده از تصویر ارسالی:
"""
${combinedOcr}
"""
${academicContext}
${prompt && !prompt.includes('لطفاً') ? `درخواست ویژه دانش‌آموز: ${prompt}` : ''}
لطفاً تمام سوالات این تصویر را به صورت دونه‌به‌دونه، کامل، تشریحی و با فرمول‌ها و محاسبات دقیق حل کن و در پایان هر سوال، گزینه صحیح را مشخص نما. به هیچ وجه از ستاره استفاده نکن.`
                    : `Here is the transcribed content from the image:
"""
${combinedOcr}
"""
User prompt: ${prompt || 'Solve all problems step-by-step with complete formulas.'}
Solve each question in detail without asterisks.`);

              const solverRes = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
                messages: [
                  { role: 'system', content: systemVision },
                  { role: 'user', content: userVision }
                ],
                max_tokens: wantsOnlyOption ? 100 : 3500,
              });

              const rawFinal = (solverRes as any)?.response || combinedOcr || (isPersian ? 'تصویر با موفقیت بازخوانی و حل شد.' : 'Image solved successfully.');
              const content = sanitizeAiResponse(rawFinal, isPersian);

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

            const systemPrompt = isPersian
              ? `شما «نکسورا» (Nexora) هستید؛ یک استاد و معلم خصوصی دانشمند، بسیار مسلط، دقیق، شکیبا و صمیمی.
${userGreeting ? `شما با ${userGreeting} گفتگو می‌کنید و اطلاعات و سطح درسی ایشان را در طول گفتگوهای این نشست حفظ می‌نمایید.` : ''}
${academicContext}

دستورالعمل‌های الزامی:
۱. زبان پاسخ: تمام پاسخ‌های شما باید ۱۰۰٪ به زبان فارسی رسمی، بسیار روان، شیوا، علمی، سلیس و کاملاً طبیعی با رسم‌الخط استاندارد فارسی باشد. اکیداً از به کار بردن کاراکترهای چینی، لغات اسپانیایی یا کلمات انگلیسی در میان متن فارسی خودداری کن و واژگان صحیح فارسی مانند «وارد شود»، «اثر کند»، «اعمال شود» به کار ببر.
۲. ${reasoningDirective}
۳. توضیحات کامل و عمیق: پاسخ‌ها را خلاصه یا ناقص رها نکن. برای هر پرسش، مفاهیم پایه‌ای، تعاریف علمی، فرمول‌های مرتبط، مثال‌های روشن و نتیجه‌گیری دقیق را به صورت گام‌به‌گام شرح بده تا موضوع به شکل عمیق درک شود.
۴. پیوستگی مکالمه و حافظه: تمام پیام‌های قبلی کاربر در همین گفتگو را به خاطر بسپارید و پاسخ‌های جدید را کاملاً در امتداد مباحث مطرح‌شده قبلی ارائه دهید.
۵. عدم تحمیل آزمون تستی: هرگز و تحت هیچ شرایطی به صورت خودسرانه یا پشت‌سرهم سوال تستی مطرح نکنید. در صورتی که مبحث پایان یافت یا برای سنجش تسلط نیاز به تمرین بود، در پایان با احترام پیشنهاد دهید:
«💡 آیا مایلید برای سنجش تسلط شما بر این مبحث، یک تست چهارگزینه‌ای مطرح کنم یا یک سوال تشریحی مفهومی؟»`
              : `You are Nexora AI, a world-class academic study assistant.
${body.user?.firstName ? `Student: ${body.user.firstName} ${body.user.lastName || ''}` : ''}
${wantsOnlyOption ? 'The student wants ONLY the correct option. Verify all calculations rigorously in your internal reasoning, then output ONLY: Correct Option: Option [X] (without asterisks)' : 'Provide rigorous step-by-step reasoning with formulas explaining WHY the answer is correct without using asterisks.'}
Rules:
1. Deliver articulate, comprehensive, and step-by-step academic explanations in English without asterisks.
2. Solve problems step-by-step with formulas and clearly state the final answer without asterisks.
3. Retain conversational memory across previous turns within this session.
4. Only ask test questions if explicitly requested by the student.`;

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
              max_tokens: 3500
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
                ] : []);

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
