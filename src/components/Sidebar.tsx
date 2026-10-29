import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Settings,
  Sun,
  Moon,
  Trash2,
  Search,
  Sigma,
  Atom,
  FlaskConical,
  Dna,
  BookOpen,
  LogIn,
  LogOut,
  Database,
  Lock,
} from 'lucide-react';
import type { Conversation, SubjectId, User } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onOpenSettings,
  theme,
  onToggleTheme,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const getSubjectIcon = (subject?: SubjectId) => {
    switch (subject) {
      case 'mathematics':
        return <Sigma className="w-3.5 h-3.5 text-blue-500" />;
      case 'physics':
        return <Atom className="w-3.5 h-3.5 text-violet-500" />;
      case 'chemistry':
        return <FlaskConical className="w-3.5 h-3.5 text-cyan-500" />;
      case 'biology':
        return <Dna className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = ['Today', 'Yesterday', 'Previous 7 Days'] as const;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-72 sm:w-80 flex flex-col bg-neutral-50/95 dark:bg-[#0c0d14]/95 border-r border-neutral-200/80 dark:border-neutral-800/80 backdrop-blur-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand & New Chat */}
        <div className="p-4 border-b border-neutral-200/70 dark:border-neutral-800/70">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm tracking-tight flex items-center gap-1.5">
                  <span>Nexora</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-violet-500/20 text-violet-600 dark:text-violet-400 font-mono">Study</span>
                </h1>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-500" />
                  <span>Cloudflare D1</span>
                </p>
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm transition-all duration-200 active:scale-95 text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-white/20 dark:bg-neutral-200 text-[10px] font-mono">
              Ctrl+K
            </kbd>
          </button>

          {/* Search Bar (Only shown for registered users with chats) */}
          {currentUser && (
            <div className="relative mt-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          )}
        </div>

        {/* Chat History List OR Guest Banner */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {currentUser ? (
            // Registered Users: Show Cloudflare Synced Conversations
            <>
              {categories.map(category => {
                const list = filteredConversations.filter(c => c.category === category);
                if (list.length === 0) return null;

                return (
                  <div key={category} className="space-y-1">
                    <div className="px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-neutral-400 dark:text-neutral-500">
                      {category}
                    </div>
                    {list.map(conv => {
                      const isActive = conv.id === activeConversationId;
                      return (
                        <div
                          key={conv.id}
                          className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all duration-150 ${
                            isActive
                              ? 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium shadow-sm'
                              : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900/60 hover:text-neutral-900 dark:hover:text-neutral-200'
                          }`}
                          onClick={() => {
                            onSelectConversation(conv.id);
                            if (window.innerWidth < 1024) onClose();
                          }}
                        >
                          <div className="flex items-center gap-2.5 truncate pr-2">
                            {getSubjectIcon(conv.subject)}
                            <span className="truncate">{conv.title}</span>
                          </div>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onDeleteConversation(conv.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-neutral-300/60 dark:hover:bg-neutral-700 text-neutral-400 hover:text-red-500 transition-opacity"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {filteredConversations.length === 0 && (
                <div className="text-center py-8 text-xs text-neutral-400">
                  No conversations saved yet.
                </div>
              )}
            </>
          ) : (
            // Guest Mode: Prominent banner explaining non-persistence on refresh
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-center space-y-3 my-4">
              <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-xs text-neutral-800 dark:text-neutral-200">
                  Guest Mode (Temporary Chat)
                </h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                  Your chats are stored in temporary memory only and will vanish upon page refresh. Sign in or register to sync your study history across all devices.
                </p>
              </div>
              <button
                onClick={onOpenAuth}
                className="w-full py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-sm transition-all"
              >
                Sign In to Save History
              </button>
            </div>
          )}
        </div>

        {/* Footer with User Account / Login & Settings */}
        <div className="p-3 border-t border-neutral-200/70 dark:border-neutral-800/70 flex items-center justify-between bg-neutral-100/50 dark:bg-neutral-900/40">
          {currentUser ? (
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center text-white font-semibold text-xs shadow-sm shrink-0">
                {currentUser.firstName.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-tight truncate">
                  {currentUser.firstName} {currentUser.lastName}
                </div>
                <div className="text-[10px] text-neutral-400 truncate">{currentUser.email}</div>
              </div>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            {currentUser && (
              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Sign out of account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onOpenSettings}
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
