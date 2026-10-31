import React, { useState } from 'react';
import {
  X,
  Volume2,
  Sliders,
  Moon,
  Sun,
  Sparkles,
  Radio,
  BookOpen,
  Globe,
  Database,
  Check,
  Cpu,
  GraduationCap,
} from 'lucide-react';
import type { AppSettings, VoicePersona, EducationalCurriculum } from '../types';
import { VOICE_PERSONAS } from '../data/mockData';
import { CLOUDFLARE_FREE_AI_MODELS } from '../data/aiModels';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  theme,
  onToggleTheme,
}) => {
  const [cfEmail, setCfEmail] = useState('');
  const [cfAccountId, setCfAccountId] = useState('');
  const [cfSaved, setCfSaved] = useState(false);

  if (!isOpen) return null;

  const handleSaveCloudflareAI = async () => {
    try {
      await fetch('/api/config/cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cfEmail.trim(),
          accountId: cfAccountId.trim(),
        }),
      });
      setCfSaved(true);
      setTimeout(() => setCfSaved(false), 2500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#11121d] border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800/80 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Settings & Preferences
              </h2>
              <p className="text-xs text-neutral-500">Configure AI model, educational curriculum, and voice persona</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Cloudflare Workers AI Connection Card */}
          <div className="p-4 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-800/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span className="text-xs font-bold text-violet-900 dark:text-violet-200">
                  Cloudflare Workers AI Connection
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-200/60 dark:bg-violet-800/60 text-violet-800 dark:text-violet-200 font-semibold">
                Llama 3.3 & Vision 11B
              </span>
            </div>

            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Your Cloudflare Workers AI edge token is connected. You can update your Cloudflare account email and Account ID below:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Cloudflare Account Email
                </label>
                <input
                  type="email"
                  value={cfEmail}
                  onChange={e => setCfEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                  Account ID (Optional)
                </label>
                <input
                  type="text"
                  value={cfAccountId}
                  onChange={e => setCfAccountId(e.target.value)}
                  placeholder="32 hex characters"
                  className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-neutral-500">
                Nexora edge connection is active and ready.
              </span>
              <button
                type="button"
                onClick={handleSaveCloudflareAI}
                className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1 transition-all active:scale-95"
              >
                {cfSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Update Cloudflare</span>
                )}
              </button>
            </div>
          </div>

          {/* Setting Section: Active AI Model Selector */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-violet-500" />
                <span>Active Cloudflare AI Engine</span>
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full">
                100% Free
              </span>
            </label>

            <select
              value={settings.selectedModelId}
              onChange={e => onUpdateSettings({ selectedModelId: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 font-medium focus:outline-hidden focus:border-violet-500 transition-colors shadow-xs"
            >
              {CLOUDFLARE_FREE_AI_MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider}) — {m.badgeEn || m.badgeFa}
                </option>
              ))}
            </select>
          </div>

          {/* Setting Section: Educational Curriculum */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-violet-500" />
              <span>Educational Curriculum & Standards</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'iran', label: 'Iran (Konkur & High School)', flag: '🇮🇷' },
                { id: 'us', label: 'US (AP / College Board)', flag: '🇺🇸' },
                { id: 'uk', label: 'UK (A-Levels / GCSE)', flag: '🇬🇧' },
                { id: 'international', label: 'International (IB Diploma)', flag: '🌐' },
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => onUpdateSettings({ curriculum: c.id as EducationalCurriculum })}
                  className={`p-3 rounded-2xl border text-left text-xs transition-all flex items-center gap-2 ${
                    settings.curriculum === c.id
                      ? 'border-violet-500 bg-violet-500/10 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500 font-semibold'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <span className="text-base">{c.flag}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Setting Section: Educational Grade / Class Level */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-violet-500" />
              <span>پایه و مقطع تحصیلی (Class / Grade Level)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'دهم', label: 'پایه دهم (متوسطه دوم)' },
                { id: 'یازدهم', label: 'پایه یازدهم' },
                { id: 'دوازدهم / کنکور', label: 'دوازدهم / کنکور' },
                { id: 'نهم', label: 'پایه نهم (متوسطه اول)' },
                { id: 'هفتم و هشتم', label: 'پایه هفتم / هشتم' },
                { id: 'دانشگاهی', label: 'دانشجویی / دانشگاه' },
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => {
                    localStorage.setItem('nexora_grade_level', g.id);
                    onUpdateSettings({ gradeLevel: g.id });
                  }}
                  className={`p-2.5 rounded-2xl border text-xs text-center transition-all ${
                    (settings.gradeLevel || localStorage.getItem('nexora_grade_level') || 'دوازدهم / کنکور') === g.id
                      ? 'border-violet-500 bg-violet-500/10 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 ring-1 ring-violet-500 font-semibold'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Setting Section: Appearance */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 block">
              Appearance (Theme)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (theme !== 'light') onToggleTheme();
                }}
                className={`p-3 rounded-2xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  theme === 'light'
                    ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-900/30 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Mode</span>
              </button>
              <button
                onClick={() => {
                  if (theme !== 'dark') onToggleTheme();
                }}
                className={`p-3 rounded-2xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  theme === 'dark'
                    ? 'border-violet-500 bg-violet-950/40 text-violet-300 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Moon className="w-4 h-4 text-violet-400" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>

          {/* Setting Section: Voice Persona */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 block">
              AI Voice Persona
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {VOICE_PERSONAS.map(p => {
                const isSelected = settings.persona === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => onUpdateSettings({ persona: p.id as VoicePersona })}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-violet-500 bg-violet-500/10 dark:bg-violet-950/40 text-neutral-900 dark:text-white ring-1 ring-violet-500'
                        : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs">{p.name}</span>
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2">
                      {p.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Setting Section: Speech Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Speech Rate ({settings.speechRate}x)
              </label>
              <Volume2 className="w-4 h-4 text-neutral-400" />
            </div>
            <input
              type="range"
              min="0.8"
              max="1.4"
              step="0.1"
              value={settings.speechRate}
              onChange={e => onUpdateSettings({ speechRate: parseFloat(e.target.value) })}
              className="w-full accent-violet-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
              <span>0.8x (Deliberate)</span>
              <span>1.0x (Natural)</span>
              <span>1.4x (Fast)</span>
            </div>
          </div>

          {/* Setting Section: Study Method */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2 block">
              Study Pedagogy
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdateSettings({ studyMode: 'socratic' })}
                className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                  settings.studyMode === 'socratic'
                    ? 'border-violet-500 bg-violet-500/10 dark:bg-violet-950/40 text-neutral-900 dark:text-white'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <div className="font-semibold mb-0.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  <span>Socratic Guidance</span>
                </div>
                <div className="text-[10px] text-neutral-400">
                  Step-by-step questions and guidance to foster deep conceptual intuition.
                </div>
              </button>
              <button
                onClick={() => onUpdateSettings({ studyMode: 'comprehensive' })}
                className={`p-3 rounded-2xl border text-left text-xs transition-all ${
                  settings.studyMode === 'comprehensive'
                    ? 'border-violet-500 bg-violet-500/10 dark:bg-violet-950/40 text-neutral-900 dark:text-white'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                }`}
              >
                <div className="font-semibold mb-0.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Full Derivation</span>
                </div>
                <div className="text-[10px] text-neutral-400">
                  Complete mathematical proofs, formulas, and immediate step-by-step solutions.
                </div>
              </button>
            </div>
          </div>

          {/* Setting Section: Real mic vs Simulated */}
          <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-cyan-500" />
              <div>
                <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  Microphone Input Mode
                </div>
                <div className="text-[11px] text-neutral-400">
                  {settings.useRealMic ? 'Hardware microphone audio enabled' : 'Nexora simulated speech engine active'}
                </div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ useRealMic: !settings.useRealMic })}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                settings.useRealMic
                  ? 'bg-cyan-500 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
              }`}
            >
              {settings.useRealMic ? 'Hardware Mic' : 'Simulated'}
            </button>
          </div>
        </div>

        {/* Done Button */}
        <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
