import React from 'react';
import {
  Menu,
  Mic,
  Sun,
  Moon,
  Settings,
  Sparkles,
  LogIn,
  ChevronDown,
  Cpu,
} from 'lucide-react';
import type { SubjectId, User } from '../types';
import { getAiModelById } from '../data/aiModels';

interface NavbarProps {
  onToggleSidebar: () => void;
  onLaunchVoiceMode: () => void;
  onOpenSettings: () => void;
  selectedModelId: string;
  onOpenModelSelector: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currentSubject?: SubjectId;
  conversationTitle?: string;
  currentUser: User | null;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onLaunchVoiceMode,
  onOpenSettings,
  selectedModelId,
  onOpenModelSelector,
  theme,
  onToggleTheme,
  conversationTitle,
  currentUser,
  onOpenAuth,
}) => {
  const currentModel = getAiModelById(selectedModelId);
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 py-3 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-[#0c0d14]/80 backdrop-blur-xl">
      {/* Left: Sidebar toggle, Title, and Model Selector */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="hidden xs:flex items-center gap-1.5 truncate max-w-[120px] sm:max-w-xs">
            <span className="font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-50 truncate">
              {conversationTitle || 'Nexora'}
            </span>
            {!currentUser && (
              <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                Guest
              </span>
            )}
          </div>
        </div>

        {/* Cloudflare AI Model Selector Pill */}
        <button
          onClick={onOpenModelSelector}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/90 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/80 border border-neutral-200/80 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-all shadow-xs cursor-pointer group"
          title="Select Cloudflare AI Engine (Llama 3.3, Qwen, DeepSeek R1...)"
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: currentModel.accentColor }}
          />
          <Cpu className="w-3.5 h-3.5 text-violet-500" />
          <span className="truncate max-w-[90px] sm:max-w-[140px]">
            {currentModel.name.replace('Meta ', '').replace(' Instruct', '')}
          </span>
          <ChevronDown className="w-3 h-3 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition-transform" />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Voice Mode Quick Button */}
        <button
          onClick={onLaunchVoiceMode}
          className="group relative flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/20 transition-all duration-200 active:scale-95 text-xs font-semibold"
          title="Start Live Voice Conversation"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute -inset-1 rounded-full bg-violet-400 animate-ping opacity-40" />
            <Mic className="w-3.5 h-3.5" />
          </div>
          <span>Voice Mode</span>
        </button>

        {/* User Account / Login button */}
        {currentUser ? (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{currentUser.firstName}</span>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-xs font-semibold transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
