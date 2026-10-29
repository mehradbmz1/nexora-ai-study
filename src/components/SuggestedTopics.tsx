import React from 'react';
import {
  Sigma,
  Atom,
  FlaskConical,
  Dna,
  Mic,
  ArrowRight,
  Sparkles,
  Database,
} from 'lucide-react';
import { STUDY_SUBJECTS } from '../data/mockData';
import type { SubjectId } from '../types';

interface SuggestedTopicsProps {
  onSelectPrompt: (prompt: string, subject: SubjectId) => void;
  onLaunchVoiceMode: () => void;
}

export const SuggestedTopics: React.FC<SuggestedTopicsProps> = ({
  onSelectPrompt,
  onLaunchVoiceMode,
}) => {
  const getSubjectIcon = (id: SubjectId) => {
    switch (id) {
      case 'mathematics':
        return <Sigma className="w-5 h-5 text-blue-500 dark:text-blue-400" />;
      case 'physics':
        return <Atom className="w-5 h-5 text-violet-500 dark:text-violet-400" />;
      case 'chemistry':
        return <FlaskConical className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />;
      case 'biology':
        return <Dna className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto px-4 py-8 w-full animate-in fade-in duration-500">
      {/* Welcoming Headline */}
      <div className="text-center mb-8 sm:mb-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-300 mb-4 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
          <span>Nexora AI • Intelligent Study Assistant & Problem Solver</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-3 leading-tight">
          What would you like to learn today?
        </h1>
        <p className="text-base sm:text-lg font-medium text-violet-600 dark:text-violet-400 mb-2">
          Select a subject or explore a topic below for step-by-step solutions
        </p>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto">
          Powered by Cloudflare Workers AI (Llama 3.3, Qwen 2.5, DeepSeek R1, Vision 11B). Supports image problem reading, voice conversation, and multilingual queries.
        </p>

        {/* Voice Mode Priority Banner */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onLaunchVoiceMode}
            className="group relative inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 active:scale-95"
          >
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
              <Mic className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div className="text-left">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-200">
                Live Voice Mode
              </div>
              <div className="text-xs sm:text-sm font-semibold">Start Spoken Voice Conversation</div>
            </div>
            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* 4 Core Suggested Study Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {STUDY_SUBJECTS.map(subject => (
          <div
            key={subject.id}
            className="group rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md p-5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200 hover:shadow-lg dark:hover:shadow-neutral-950/40 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-700/60">
                    {getSubjectIcon(subject.id)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 text-base flex items-center gap-2">
                      <span>{subject.name}</span>
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {subject.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sample Prompts inside subject */}
              <div className="space-y-2 mt-4">
                {subject.sampleQuestions.map(q => (
                  <button
                    key={q.id}
                    onClick={() => onSelectPrompt(q.prompt, subject.id)}
                    className="w-full text-left p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/50 dark:border-neutral-700/40 transition-colors flex items-center justify-between group/btn text-xs text-neutral-700 dark:text-neutral-300"
                  >
                    <span className="truncate pr-2 font-medium">{q.title}</span>
                    <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-200/70 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300">
                      {q.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom quick trigger */}
            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-500" />
                <span>Ready to solve</span>
              </span>
              <button
                onClick={() => onSelectPrompt(subject.sampleQuestions[0].prompt, subject.id)}
                className="font-medium text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
              >
                <span>Start first question</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
