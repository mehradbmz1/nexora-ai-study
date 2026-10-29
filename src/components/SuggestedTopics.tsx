import React from 'react';
import {
  Sigma,
  Atom,
  FlaskConical,
  Dna,
  Mic,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import type { SubjectId } from '../types';

interface SuggestedTopicsProps {
  onSelectPrompt: (prompt: string, subject: SubjectId) => void;
  onLaunchVoiceMode: () => void;
}

const TOPICS: {
  id: SubjectId;
  name: string;
  question: string;
  prompt: string;
  icon: any;
  color: string;
}[] = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    question: 'Calculus & Linear Algebra',
    prompt: 'Explain eigenvalues, eigenvectors, and their intuitive geometric meaning in linear transformations with examples.',
    icon: Sigma,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  {
    id: 'physics',
    name: 'Physics',
    question: 'Quantum Physics & Relativity',
    prompt: 'Explain quantum superposition and the double-slit experiment step-by-step with formulas and wave functions.',
    icon: Atom,
    color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    question: 'Organic Mechanisms & Kinetics',
    prompt: 'Compare SN1 and SN2 reaction mechanisms with energy diagrams, solvent effects, and stereochemistry.',
    icon: FlaskConical,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
  },
  {
    id: 'biology',
    name: 'Biology',
    question: 'Genetics & Molecular Biology',
    prompt: 'How does CRISPR-Cas9 locate and edit DNA sequences with guide RNA? Explain the molecular mechanism.',
    icon: Dna,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
];

export const SuggestedTopics: React.FC<SuggestedTopicsProps> = ({
  onSelectPrompt,
  onLaunchVoiceMode,
}) => {
  return (
    <div className="flex-1 flex flex-col justify-center items-center max-w-3xl mx-auto px-4 py-8 sm:py-12 w-full animate-in fade-in duration-300">
      {/* Welcoming Clean Header */}
      <div className="text-center mb-8 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/50 text-violet-700 dark:text-violet-300 mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Nexora AI Study Assistant</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 mb-3">
          What would you like to learn today?
        </h1>
        <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">
          Ask any STEM question, attach a problem image, or pick a starter topic below.
        </p>

        {/* Minimal Voice Mode Button */}
        <div className="mt-5 flex justify-center">
          <button
            onClick={onLaunchVoiceMode}
            className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 transition-all duration-200 text-xs sm:text-sm font-semibold shadow-md active:scale-95"
          >
            <Mic className="w-4 h-4 text-violet-400 dark:text-violet-600 animate-pulse" />
            <span>Launch Live Voice Conversation</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>
      </div>

      {/* 4 Clean Minimal Starter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
        {TOPICS.map(topic => {
          const IconComponent = topic.icon;
          return (
            <button
              key={topic.id}
              onClick={() => onSelectPrompt(topic.prompt, topic.id)}
              className="text-left p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md transition-all duration-200 group flex items-start gap-3.5"
            >
              <div className={`p-2.5 rounded-xl border shrink-0 ${topic.color}`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {topic.name}
                  </h3>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-normal truncate">
                  {topic.question}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
