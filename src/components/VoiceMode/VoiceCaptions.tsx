import React from 'react';
import { Sparkles, User } from 'lucide-react';
import type { VoiceState } from '../../types';

interface VoiceCaptionsProps {
  state: VoiceState;
  speaker: 'user' | 'assistant';
  transcript: string;
  visible: boolean;
}

export const VoiceCaptions: React.FC<VoiceCaptionsProps> = ({
  state,
  speaker,
  transcript,
  visible,
}) => {
  if (!visible) return null;

  const isPersian = /[\u0600-\u06FF]/.test(transcript);

  return (
    <div className="w-full max-w-2xl px-6 py-4 mx-auto text-center transition-all duration-300">
      <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full text-xs font-medium tracking-wide uppercase backdrop-blur-md border shadow-sm transition-colors duration-300 bg-neutral-900/60 dark:bg-neutral-800/80 border-neutral-700 text-neutral-300">
        {speaker === 'assistant' ? (
          <>
            <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
            <span className="text-fuchsia-300">Nexora Speaking</span>
          </>
        ) : state === 'thinking' ? (
          <>
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
            <span className="text-violet-300">Formulating Response...</span>
          </>
        ) : state === 'muted' ? (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-amber-300">Microphone Muted</span>
          </>
        ) : (
          <>
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-300">Listening to You...</span>
          </>
        )}
      </div>

      <div className="min-h-[4rem] flex items-center justify-center">
        <p
          dir={isPersian ? 'rtl' : 'ltr'}
          className="text-lg md:text-xl font-medium tracking-tight text-neutral-100 leading-relaxed max-w-xl mx-auto drop-shadow-sm select-text"
        >
          {transcript || (
            <span className="text-neutral-500 italic">
              Speak or ask any study question...
            </span>
          )}
        </p>
      </div>
    </div>
  );
};
