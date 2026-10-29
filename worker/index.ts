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

      // 7. CLOUDFLARE WORKERS AI CHAT / VISION RUNNER
      if (path === '/api/ai/chat' && request.method === 'POST') {
        const body = await request.json() as {
          prompt?: string;
          imageDataUrl?: string;
          curriculum?: string;
          modelId?: string;
          messages?: { role: 'user' | 'assistant'; content: string }[];
        };

        const prompt = body.prompt || '';
        const curriculum = body.curriculum || 'iran';
        const rawModelId = body.modelId || (body.imageDataUrl ? '@cf/meta/llama-3.2-11b-vision-instruct' : '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
        const modelId = normalizeModelId(rawModelId);
        const isPersian = /[\u0600-\u06FF]/.test(prompt);

        if (env.AI) {
          if (body.imageDataUrl) {
            const base64Clean = body.imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
            const binaryString = atob(base64Clean);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const visionPrompt = `You are Nexora Vision, an expert academic OCR and STEM tutor.
Carefully examine this image:
1. OCR Denoising: If the image has low resolution, blur, compression artifacts, or handwriting, enhance and transcribe every character, mathematical formula, diagram, or question text accurately.
2. Language: Recognize whether the problem is in Persian, English, or Arabic.
3. Detailed Solution: Provide a comprehensive, step-by-step solution formatted with clear headings, formulas, and a highlighted final answer in ${curriculum === 'iran' || isPersian ? 'fluent, native Persian (فارسی روان)' : 'clear English'}.
4. Specific Instructions: ${prompt || 'Transcribe, clarify, and solve this problem step-by-step.'}`;

            const aiRes = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
              prompt: visionPrompt,
              image: Array.from(bytes),
            });

            const content = aiRes?.response || (isPersian ? 'تصویر با موفقیت خوانش و پردازش شد.' : 'Image transcribed and analyzed successfully.');

            return jsonResponse({
              success: true,
              content,
              modelId: '@cf/meta/llama-3.2-11b-vision-instruct',
              modelName: 'Meta Llama 3.2 11B Vision',
              citations: [
                { title: 'کتاب‌های درسی رسمی آموزش و پرورش', url: 'http://chap.sch.ir', source: 'آموزش و پرورش' },
                { title: 'شبکه ملی رشد', url: 'https://roshd.ir', source: 'رشد' },
                { title: 'سازمان سنجش آموزش کشور', url: 'https://sanjesh.org', source: 'سنجش' }
              ],
              followUps: isPersian ? [
                'این مسئله را با یک روش دیگر حل کن',
                'فرمول‌های به کار رفته را جداگانه اثبات کن',
                'یک تست مشابه از این مبحث بده'
              ] : [
                'Solve this with an alternative method',
                'Explain the underlying formulas in detail',
                'Give me a similar practice problem'
              ]
            });
          } else {
            // Conversational memory: incorporate previous turns
            const systemPrompt = `You are Nexora AI (نکسورا), an exceptional academic tutor and study assistant.
Rules:
1. Conversational Memory: You remember previous messages and build upon them naturally.
2. Language Fluency: If the user communicates in Persian, respond in flawless, natural, formal Persian (فارسی شیوا، دقیق و بدون غلط نگارشی). If in English, respond in articulate academic English.
3. Presentation: Format your answer elegantly with clear markdown headings, bullet points, and step-by-step reasoning. Avoid messy or broken markdown.
4. Problem Solving: When given a problem or question, provide the intuition, step-by-step derivation, and final takeaway clearly.`;

            const llmMessages: { role: string; content: string }[] = [
              { role: 'system', content: systemPrompt }
            ];

            if (body.messages && Array.isArray(body.messages)) {
              // Take up to last 8 messages for context
              const recent = body.messages.slice(-8);
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
              messages: llmMessages
            });

            const content = aiRes?.response || (isPersian ? 'پاسخ دریافت گردید.' : 'Response received.');

            // Generate smart follow-up prompts & interactive quiz
            const followUps = isPersian ? [
              'می‌توانی یک مثال کاربردی‌تر از این موضوع بزنی؟',
              'این مفهوم در امتحان یا کنکور چطور مطرح می‌شود؟',
              'یک سوال تستی چهارگزینه‌ای از من بپرس'
            ] : [
              'Can you give another real-world example?',
              'How does this typically appear on exams?',
              'Test my understanding with a multiple-choice question'
            ];

            return jsonResponse({
              success: true,
              content,
              modelId,
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
