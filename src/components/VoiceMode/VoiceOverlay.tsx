import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ChevronDown,
  Volume2,
} from 'lucide-react';
import { VisualizerOrb } from './VisualizerOrb';
import { VoiceCaptions } from './VoiceCaptions';
import { VoiceControls } from './VoiceControls';
import { useVoiceEngine } from './useVoiceEngine';
import type { VoicePersona, ChatMessage } from '../../types';
import { VOICE_PERSONAS } from '../../data/mockData';

interface VoiceOverlayProps {
  isOpen: boolean;
  onClose: (newMessages?: ChatMessage[]) => void;
  activePersona: VoicePersona;
  onSelectPersona: (p: VoicePersona) => void;
  initialTopicTitle?: string;
}

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({
  isOpen,
  onClose,
  activePersona,
  onSelectPersona,
  initialTopicTitle = 'Interactive Oral Study Session',
}) => {
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [showPersonaMenu, setShowPersonaMenu] = useState<boolean>(false);

  const {
    state,
    audioLevel,
    frequencyData,
    currentTranscript,
    speaker,
    isMuted,
    sessionDuration,
    useRealMic,
    history,
    toggleRealMic,
    toggleMute,
    interrupt,
    triggerExchange,
    cycleState,
  } = useVoiceEngine(activePersona);

  if (!isOpen) return null;

  // Format MM:SS for session timer
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentPersonaInfo =
    VOICE_PERSONAS.find(p => p.id === activePersona) || VOICE_PERSONAS[0];

  const handleEndSession = () => {
    // Convert voice turns to ChatMessages if any occurred
    const generatedMessages: ChatMessage[] = history.map((turn, idx) => ({
      id: `voice-msg-${Date.now()}-${idx}`,
      role: turn.role,
      content: turn.text,
      timestamp: turn.time,
    }));

    onClose(generatedMessages.length > 0 ? generatedMessages : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-gradient-to-b from-[#090a12] via-[#0d0f1a] to-[#080910] text-white transition-opacity duration-500 animate-in fade-in select-none">
      {/* Dynamic Ambient Background Illumination */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px] opacity-30 transition-all duration-1000 ${
            state === 'listening'
              ? 'bg-cyan-500'
              : state === 'thinking'
              ? 'bg-violet-600'
              : state === 'speaking'
              ? 'bg-fuchsia-600'
              : 'bg-amber-600'
          }`}
        />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-20 bg-indigo-900 transition-all duration-1000" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        {/* Left: Session badge & Topic */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono tracking-wider text-neutral-300">
              {formatTimer(sessionDuration)}
            </span>
          </div>

          <div className="hidden sm:block">
            <h2 className="text-sm font-semibold text-neutral-200 tracking-tight">
              {initialTopicTitle}
            </h2>
            <p className="text-[11px] text-neutral-400">Oral Dialogue & Socratic Inquiry</p>
          </div>
        </div>

        {/* Center: Persona Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowPersonaMenu(prev => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all active:scale-95 text-xs font-medium text-neutral-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>Voice: {currentPersonaInfo.name}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {showPersonaMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/80 shadow-2xl p-2 z-30">
              <div className="px-3 py-2 text-[10px] uppercase font-semibold text-neutral-400 tracking-wider">
                Select Study Voice
              </div>
              {VOICE_PERSONAS.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectPersona(p.id);
                    setShowPersonaMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${
                    p.id === activePersona
                      ? 'bg-violet-600/30 text-violet-200 border border-violet-500/30'
                      : 'hover:bg-white/5 text-neutral-300'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-[10px] text-neutral-400">{p.tagline}</div>
                  </div>
                  {p.id === activePersona && (
                    <Volume2 className="w-3.5 h-3.5 text-violet-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Close button */}
        <button
          onClick={handleEndSession}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white transition-all active:scale-95 border border-white/10"
          title="Exit Voice Mode"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Centerpiece: The Animated Visualizer Orb */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 -mt-4">
        <VisualizerOrb
          state={state}
          audioLevel={audioLevel}
          frequencyData={frequencyData}
          size={360}
        />

        {/* Real-time speech transcript & captions */}
        <VoiceCaptions
          state={state}
          speaker={speaker}
          transcript={currentTranscript}
          visible={showCaptions}
        />
      </main>

      {/* Bottom Floating Control Deck */}
      <footer className="relative z-20 pb-8 sm:pb-10 pt-2">
        <VoiceControls
          state={state}
          isMuted={isMuted}
          showCaptions={showCaptions}
          useRealMic={useRealMic}
          onToggleMute={toggleMute}
          onInterrupt={interrupt}
          onToggleCaptions={() => setShowCaptions(prev => !prev)}
          onToggleRealMic={toggleRealMic}
          onCycleState={cycleState}
          onSimulateQuestion={triggerExchange}
          onEndSession={handleEndSession}
        />
      </footer>
    </div>
  );
};
