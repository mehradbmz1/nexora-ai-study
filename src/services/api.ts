import type { User, AuthResponse, Conversation, EducationalCurriculum } from '../types';

const TOKEN_KEY = 'nexora_auth_token';
const USER_KEY = 'nexora_user_data';

export const AuthService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getLocalUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setLocalUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async register(firstName: string, lastName: string, email: string, password: string): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      const data = await res.json();
      if (data.success && data.token && data.user) {
        this.setToken(data.token);
        this.setLocalUser(data.user);
      }
      return data;
    } catch {
      return {
        success: false,
        error: 'خطا در ارتباط با سرور کلودفلر',
      };
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success && data.token && data.user) {
        this.setToken(data.token);
        this.setLocalUser(data.user);
      }
      return data;
    } catch {
      return { success: false, error: 'خطا در ورود' };
    }
  },

  async getMe(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.user) {
        this.setLocalUser(data.user);
        return data.user;
      }
    } catch {
      return this.getLocalUser();
    }
    return this.getLocalUser();
  },

  logout() {
    this.clearToken();
    localStorage.removeItem('nexora_cached_chats');
  },
};

export const ChatSyncService = {
  // Only load conversations if the user is registered / authenticated
  async getConversations(): Promise<Conversation[]> {
    const token = AuthService.getToken();
    if (!token) {
      // Guest mode: Do NOT load persistent chats! Fresh session each time!
      return [];
    }

    try {
      const res = await fetch('/api/chats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        localStorage.setItem('nexora_cached_chats', JSON.stringify(data.conversations));
        return data.conversations;
      }
    } catch {
      // offline fallback for registered users only
      const local = localStorage.getItem('nexora_cached_chats');
      return local ? JSON.parse(local) : [];
    }
    return [];
  },

  // Save conversation ONLY if registered / authenticated
  async saveConversation(conv: Conversation): Promise<boolean> {
    const token = AuthService.getToken();
    if (!token) {
      // Guest mode: DO NOT persist! Chat will vanish on page refresh as requested!
      return false;
    }

    // Persist locally and to Cloudflare for logged in users
    const local = localStorage.getItem('nexora_cached_chats');
    const existing: Conversation[] = local ? JSON.parse(local) : [];
    const idx = existing.findIndex(c => c.id === conv.id);
    if (idx >= 0) existing[idx] = conv;
    else existing.unshift(conv);
    localStorage.setItem('nexora_cached_chats', JSON.stringify(existing));

    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(conv),
      });
      const data = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  },

  async deleteConversation(id: string): Promise<boolean> {
    const token = AuthService.getToken();
    if (!token) return true;

    const local = localStorage.getItem('nexora_cached_chats');
    if (local) {
      const existing: Conversation[] = JSON.parse(local);
      const filtered = existing.filter(c => c.id !== id);
      localStorage.setItem('nexora_cached_chats', JSON.stringify(filtered));
    }

    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return !!data.success;
    } catch {
      return false;
    }
  },

  // Direct AI chat & Multimodal Vision text reading with chosen Cloudflare model
  async sendToAI(
    prompt: string,
    imageDataUrl?: string,
    curriculum: EducationalCurriculum = 'iran',
    modelId?: string,
    messages?: { role: string; content: string }[]
  ) {
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imageDataUrl, curriculum, modelId, messages }),
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return {
        success: false,
        content: 'خطا در ارتباط با هوش مصنوعی نکسورا: ' + e.message,
      };
    }
  },
};
