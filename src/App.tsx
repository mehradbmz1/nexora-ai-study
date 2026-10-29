import { useState, useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { SuggestedTopics } from './components/SuggestedTopics';
import { ChatInterface } from './components/ChatInterface';
import { ChatInput } from './components/ChatInput';
import { VoiceOverlay } from './components/VoiceMode/VoiceOverlay';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { ModelSelectorModal } from './components/ModelSelectorModal';
import { AuthService, ChatSyncService } from './services/api';
import { DEFAULT_AI_MODEL_ID, getAiModelById } from './data/aiModels';
import type {
  Conversation,
  ChatMessage,
  SubjectId,
  AppSettings,
  MessageAttachment,
  User,
} from './types';

export function App() {
  const { theme, toggleTheme } = useTheme();

  // User Authentication
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Registered user conversations (Cloudflare synced)
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Guest user temporary in-memory chat (Vanishes on page refresh!)
  const [guestMessages, setGuestMessages] = useState<ChatMessage[]>([]);

  // UI state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // User Settings
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    persona: 'aura',
    speechRate: 1.0,
    useRealMic: false,
    autoPlayVoice: true,
    studyMode: 'socratic',
    curriculum: 'iran',
    preferredLanguage: 'auto',
    selectedModelId: DEFAULT_AI_MODEL_ID,
  });

  // Active chat calculation
  const activeConversation = currentUser
    ? conversations.find(c => c.id === activeConversationId)
    : null;

  const currentMessages = currentUser
    ? activeConversation?.messages || []
    : guestMessages;

  // On mount: Check authentication. If logged in, fetch Cloudflare D1 chats. If not, guest mode is completely fresh!
  useEffect(() => {
    async function initUser() {
      const user = await AuthService.getMe();
      if (user) {
        setCurrentUser(user);
        const cloudChats = await ChatSyncService.getConversations();
        setConversations(cloudChats);
        if (cloudChats.length > 0) {
          setActiveConversationId(cloudChats[0].id);
        }
      } else {
        // Guest mode: do NOT load any persistent chats; start clean!
        setCurrentUser(null);
        setConversations([]);
        setGuestMessages([]);
      }
    }
    initUser();
  }, []);

  // Keyboard shortcut Ctrl+K for New Chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  const handleNewChat = () => {
    if (currentUser) {
      setActiveConversationId(null);
    } else {
      // For guest: reset single in-memory conversation
      setGuestMessages([]);
    }
  };

  const handleSelectConversation = (id: string) => {
    if (currentUser) {
      setActiveConversationId(id);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (currentUser) {
      await ChatSyncService.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    }
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    setConversations([]);
    setGuestMessages([]);
    setActiveConversationId(null);
  };

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    // If guest had an active chat, migrate it to the new account!
    if (guestMessages.length > 0) {
      const firstUserMsg = guestMessages.find(m => m.role === 'user');
      const title = firstUserMsg ? firstUserMsg.content.slice(0, 36) : 'Nexora Study Session';
      const newConv: Conversation = {
        id: `conv-${Date.now()}`,
        userId: user.id,
        title,
        updatedAt: 'Just now',
        category: 'Today',
        messages: guestMessages,
      };
      await ChatSyncService.saveConversation(newConv);
      setConversations([newConv]);
      setActiveConversationId(newConv.id);
      setGuestMessages([]);
    } else {
      const cloudChats = await ChatSyncService.getConversations();
      setConversations(cloudChats);
    }
  };

  // Dispatch message to AI (with optional image)
  const handleSendMessage = async (
    text: string,
    attachments?: MessageAttachment[],
    imageDataUrl?: string
  ) => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isPersian = /[\u0600-\u06FF]/.test(text);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      attachments,
      imageDataUrl,
      language: isPersian ? 'fa' : 'en',
      timestamp: now,
    };

    // 1. Update UI with user message immediately
    if (currentUser) {
      if (activeConversationId) {
        setConversations(prev =>
          prev.map(c => {
            if (c.id === activeConversationId) {
              return {
                ...c,
                updatedAt: 'Just now',
                messages: [...c.messages, userMessage],
              };
            }
            return c;
          })
        );
      } else {
        const newId = `conv-${Date.now()}`;
        const newConversation: Conversation = {
          id: newId,
          userId: currentUser.id,
          title: text.slice(0, 36) + (text.length > 36 ? '...' : ''),
          updatedAt: 'Just now',
          category: 'Today',
          messages: [userMessage],
        };
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newId);
      }
    } else {
      // Guest mode: update single temporary in-memory list (NOT saved in localStorage or DB!)
      setGuestMessages(prev => [...prev, userMessage]);
    }

    // 2. Call AI Reasoning & Multimodal Vision with selected Cloudflare model & context history
    setIsLoading(true);
    try {
      const historyPayload = currentMessages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const aiResponse = await ChatSyncService.sendToAI(
        text,
        imageDataUrl,
        settings.curriculum,
        settings.selectedModelId,
        historyPayload
      );
      const activeModelMeta = getAiModelById(settings.selectedModelId);
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: aiResponse.content || 'No response received from AI engine.',
        mathFormula: aiResponse.mathFormula,
        studyTip: aiResponse.studyTip,
        followUps: aiResponse.followUps,
        citations: aiResponse.citations,
        modelId: aiResponse.modelId || settings.selectedModelId,
        modelName: aiResponse.modelName || activeModelMeta.name,
        language: isPersian ? 'fa' : 'en',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (currentUser) {
        setConversations(prev =>
          prev.map(c => {
            const isMatch = activeConversationId ? c.id === activeConversationId : c.messages.some(m => m.id === userMessage.id);
            if (isMatch) {
              const updated = {
                ...c,
                updatedAt: 'Just now',
                messages: [...c.messages, assistantMessage],
              };
              ChatSyncService.saveConversation(updated);
              return updated;
            }
            return c;
          })
        );
      } else {
        // Guest mode: append response to guest in-memory chat
        setGuestMessages(prev => [...prev, assistantMessage]);
      }
    } catch (err: any) {
      console.error('AI error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Prompt clicked from Suggested Topics
  const handleSelectPrompt = (prompt: string, subject: SubjectId) => {
    handleSendMessage(prompt, undefined, undefined);
    if (currentUser && !activeConversationId) {
      // set subject
      setConversations(prev =>
        prev.map((c, idx) => (idx === 0 ? { ...c, subject } : c))
      );
    }
  };

  // Closing Voice Mode: inject voice turns into active conversation
  const handleCloseVoiceMode = (newVoiceMessages?: ChatMessage[]) => {
    setIsVoiceModeOpen(false);

    if (newVoiceMessages && newVoiceMessages.length > 0) {
      if (currentUser) {
        if (activeConversationId) {
          setConversations(prev =>
            prev.map(c => {
              if (c.id === activeConversationId) {
                const updated = {
                  ...c,
                  updatedAt: 'Just now',
                  messages: [...c.messages, ...newVoiceMessages],
                };
                ChatSyncService.saveConversation(updated);
                return updated;
              }
              return c;
            })
          );
        } else {
          const newId = `conv-${Date.now()}`;
          const newConversation: Conversation = {
            id: newId,
            userId: currentUser.id,
            title: 'Oral Voice Session',
            subject: 'physics',
            updatedAt: 'Just now',
            category: 'Today',
            messages: newVoiceMessages,
          };
          ChatSyncService.saveConversation(newConversation);
          setConversations(prev => [newConversation, ...prev]);
          setActiveConversationId(newId);
        }
      } else {
        // Guest mode: append to guest messages
        setGuestMessages(prev => [...prev, ...newVoiceMessages]);
      }
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 dark:bg-[#07080d] text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Chat Layout Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
          onLaunchVoiceMode={() => setIsVoiceModeOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          selectedModelId={settings.selectedModelId}
          onOpenModelSelector={() => setIsModelSelectorOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          conversationTitle={activeConversation?.title || (guestMessages.length > 0 ? 'Guest Session' : undefined)}
          currentSubject={activeConversation?.subject}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
        />

        {/* Content Body: Welcoming Screen or Chat Stream */}
        <main className="flex-1 flex flex-col overflow-y-auto">
          {currentMessages.length === 0 ? (
            <SuggestedTopics
              onSelectPrompt={handleSelectPrompt}
              onLaunchVoiceMode={() => setIsVoiceModeOpen(true)}
            />
          ) : (
            <ChatInterface
              messages={currentMessages}
              isLoading={isLoading}
              onFollowUpClick={prompt => handleSendMessage(prompt)}
              onLaunchVoiceMode={() => setIsVoiceModeOpen(true)}
              onRegenerate={() => {
                const lastUser = [...currentMessages].reverse().find(m => m.role === 'user');
                if (lastUser) {
                  handleSendMessage(lastUser.content, lastUser.attachments, lastUser.imageDataUrl);
                }
              }}
            />
          )}
        </main>

        {/* Bottom Message Input Bar with Direct Image Reading */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onLaunchVoiceMode={() => setIsVoiceModeOpen(true)}
          isLoading={isLoading}
        />
      </div>

      {/* Full-Screen Voice Mode Interface */}
      <VoiceOverlay
        isOpen={isVoiceModeOpen}
        onClose={handleCloseVoiceMode}
        activePersona={settings.persona}
        onSelectPersona={persona => setSettings(prev => ({ ...prev, persona }))}
        initialTopicTitle={activeConversation?.title || 'Voice Study Session'}
        selectedModelId={settings.selectedModelId}
        conversationHistory={currentMessages}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={partial => setSettings(prev => ({ ...prev, ...partial }))}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Cloudflare AI Multilingual Models Selector Modal */}
      <ModelSelectorModal
        isOpen={isModelSelectorOpen}
        onClose={() => setIsModelSelectorOpen(false)}
        selectedModelId={settings.selectedModelId}
        onSelectModel={id => setSettings(prev => ({ ...prev, selectedModelId: id }))}
      />

      {/* Global Auth Modal (Unique Email, First & Last Name) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default App;
