import React from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Subtitles,
  HandMetal,
  Play,
  Radio,
} from 'lucide-react';
import type { VoiceState } from '../../types';

interface VoiceControlsProps {
  state: VoiceState;
  isMuted: boolean;
  showCaptions: boolean;
  useRealMic: boolean;
  onToggleMute: () => void;
  onInterrupt: () => void;
  onToggleCaptions: () => void;
  onToggleRealMic: () => void;
  onCycleState: () => void;
  onSimulateQuestion: (prompt: string) => void;
  onEndSession: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  state,
  isMuted,
  showCaptions,
  useRealMic,
  onToggleMute,
  onInterrupt,
  onToggleCaptions,
  onToggleRealMic,
  onCycleState,
  onSimulateQuestion,
  onEndSession,
}) => {
  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xl mx-auto px-4 z-20">
      {/* Quick Prompts to speak in voice mode (Multilingual) */}
      <div className="flex items-center justify-center gap-2 flex-wrap max-w-lg mb-2">
        <button
          onClick={() => onSimulateQuestion('مفهوم برهم‌نهی کوانتومی و آزمایش دو شکاف را توضیح بده')}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 text-neutral-200 backdrop-blur-md border border-white/15 transition-all active:scale-95 flex items-center gap-1.5"
          title="Physics: Quantum Superposition"
        >
          <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />
          <span>Quantum Superposition</span>
        </button>
        <button
          onClick={() => onSimulateQuestion('تفاوت واکنش‌های جانشینی هسته‌دوستی SN1 و SN2 در شیمی آلی چیست؟')}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 text-neutral-200 backdrop-blur-md border border-white/15 transition-all active:scale-95 flex items-center gap-1.5"
          title="Chemistry: SN1 vs SN2"
        >
          <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />
          <span>SN1 vs SN2 Mechanisms</span>
        </button>
        <button
          onClick={() => onSimulateQuestion('آنزیم کریسپر Cas9 چگونه ژن‌ها را ویرایش می‌کند؟')}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 text-neutral-200 backdrop-blur-md border border-white/15 transition-all active:scale-95 flex items-center gap-1.5"
          title="Biology: CRISPR-Cas9"
        >
          <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />
          <span>CRISPR-Cas9 Editing</span>
        </button>
        <button
          onClick={() => onSimulateQuestion("Can you explain how quantum superposition works in English?")}
          className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 hover:bg-white/20 text-neutral-200 backdrop-blur-md border border-white/15 transition-all active:scale-95 flex items-center gap-1.5"
          title="Ask in English"
        >
          <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />
          <span>Ask in English</span>
        </button>
      </div>

      {/* Main floating action controls */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-full bg-neutral-900/80 backdrop-blur-xl border border-neutral-700/60 shadow-2xl">
        {/* Toggle Real Mic / Simulated Mode */}
        <button
          onClick={onToggleRealMic}
          className={`p-3 sm:p-3.5 rounded-full transition-all duration-200 flex items-center justify-center ${
            useRealMic
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
              : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 border border-neutral-700'
          }`}
          title={useRealMic ? 'Hardware microphone audio enabled' : 'Switch to hardware microphone'}
        >
          <Radio className="w-5 h-5" />
        </button>

        {/* Captions Toggle */}
        <button
          onClick={onToggleCaptions}
          className={`p-3 sm:p-3.5 rounded-full transition-all duration-200 flex items-center justify-center ${
            showCaptions
              ? 'bg-neutral-700 text-white border border-neutral-600'
              : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700 border border-neutral-700'
          }`}
          title={showCaptions ? 'Hide live captions' : 'Show live captions'}
        >
          <Subtitles className="w-5 h-5" />
        </button>

        {/* Primary Mic / Mute Button */}
        <button
          onClick={onToggleMute}
          className={`p-4 sm:p-5 rounded-full transition-all duration-200 shadow-lg flex items-center justify-center active:scale-95 ${
            isMuted
              ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400 shadow-amber-500/25 ring-4 ring-amber-500/20'
              : 'bg-white text-neutral-900 hover:bg-neutral-100 shadow-white/20 ring-4 ring-white/10'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 stroke-[2.2]" />
          ) : (
            <Mic className="w-6 h-6 stroke-[2.2]" />
          )}
        </button>

        {/* Interrupt / Stop Speaking Button */}
        <button
          onClick={state === 'speaking' ? onInterrupt : onCycleState}
          className={`p-3 sm:p-3.5 rounded-full transition-all duration-200 flex items-center justify-center ${
            state === 'speaking'
              ? 'bg-violet-600 text-white hover:bg-violet-500 animate-pulse border border-violet-400/50'
              : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 border border-neutral-700'
          }`}
          title={state === 'speaking' ? 'Interrupt Nexora speech' : 'Cycle to next state'}
        >
          {state === 'speaking' ? (
            <HandMetal className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </button>

        {/* End Call Button */}
        <button
          onClick={onEndSession}
          className="p-3 sm:p-3.5 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all duration-200 shadow-lg shadow-red-600/30 active:scale-95 flex items-center justify-center"
          title="End voice session and save to chat"
        >
          <PhoneOff className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>

      {/* Status & Noise Cancelling Indicator */}
      <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap justify-center">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'listening'
                ? 'bg-cyan-400 animate-pulse'
                : state === 'thinking'
                ? 'bg-violet-400 animate-bounce'
                : state === 'speaking'
                ? 'bg-fuchsia-400'
                : 'bg-amber-400'
            }`}
          />
          وضعیت: <strong className="text-neutral-200">
            {state === 'listening' ? 'در حال شنیدن...' : state === 'thinking' ? 'در حال فکر و تبدیل...' : state === 'speaking' ? 'در حال صحبت' : 'میکروفون بسته'}
          </strong>
        </span>
        <span>•</span>
        <span className="flex items-center gap-1 text-emerald-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>نویز کنسلینگ هوشمند فعال (تحدید صدای نزدیک)</span>
        </span>
        <span>•</span>
        <span>پشتیبانی چندزبانه</span>
      </div>
    </div>
  );
};
