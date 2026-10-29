import React, { useState } from 'react';
import {
  Sparkles,
  User,
  Copy,
  Check,
  Volume2,
  Lightbulb,
  FileText,
  RotateCcw,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  Cpu,
  Brain,
} from 'lucide-react';
import type { ChatMessage } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onFollowUpClick: (text: string) => void;
  onLaunchVoiceMode: () => void;
  onRegenerate?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  onFollowUpClick,
  onLaunchVoiceMode,
  onRegenerate,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-6 overflow-y-auto">
      {messages.map((message) => {
        const isAssistant = message.role === 'assistant';
        const isPersian = /[\u0600-\u06FF]/.test(message.content);

        return (
          <div
            key={message.id}
            className={`flex gap-3 sm:gap-4 transition-all duration-300 animate-in fade-in ${
              isAssistant ? 'justify-start' : 'justify-end'
            }`}
          >
            {/* Assistant Avatar */}
            {isAssistant && (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20 text-white mt-1">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Message Bubble Container */}
            <div
              dir={isPersian ? 'rtl' : 'ltr'}
              className={`max-w-[88%] sm:max-w-[80%] rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all ${
                isAssistant
                  ? 'bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-sm text-neutral-800 dark:text-neutral-100'
                  : 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 ml-auto shadow-md'
              }`}
            >
              {/* Image Preview if user uploaded an image */}
              {message.imageDataUrl && (
                <div className="mb-3 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 max-h-60 bg-neutral-950 flex items-center justify-center">
                  <img
                    src={message.imageDataUrl}
                    alt="Uploaded question"
                    className="max-h-60 w-auto object-contain"
                  />
                </div>
              )}

              {/* Attachments if any */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {message.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 dark:bg-neutral-200 border border-white/20 dark:border-neutral-300 text-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-violet-400 dark:text-violet-600" />
                      <span className="font-medium">{att.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Assistant Model Badge */}
              {isAssistant && message.modelName && (
                <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1 rounded-xl w-fit">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>{message.modelName}</span>
                </div>
              )}

              {/* Message Content & DeepSeek Thinking Block */}
              {(() => {
                const hasThink = message.content.includes('<think>');
                let thinkingContent = '';
                let finalContent = message.content;

                if (hasThink) {
                  const parts = message.content.split('</think>');
                  if (parts.length > 1) {
                    thinkingContent = parts[0].replace('<think>', '').trim();
                    finalContent = parts.slice(1).join('</think>').trim();
                  } else {
                    thinkingContent = message.content.replace('<think>', '').trim();
                    finalContent = '';
                  }
                }

                return (
                  <div className="space-y-3">
                    {thinkingContent && (
                      <details className="rounded-2xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 p-3 text-xs group transition-all">
                        <summary className="font-semibold text-neutral-600 dark:text-neutral-300 cursor-pointer flex items-center justify-between select-none">
                          <span className="flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-violet-500" />
                            <span>Thinking Process & Reasoning Steps</span>
                          </span>
                          <span className="text-[10px] text-neutral-400 group-open:hidden">Show steps ▾</span>
                        </summary>
                        <div className="mt-2 text-neutral-500 dark:text-neutral-400 leading-relaxed font-mono whitespace-pre-line border-t border-neutral-200/50 dark:border-neutral-700/50 pt-2 text-[11px]">
                          {thinkingContent}
                        </div>
                      </details>
                    )}
                    {finalContent && (
                      <div className="text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal">
                        {finalContent}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Image Scan Result Card (OCR + Step-by-Step + Citations) */}
              {message.imageScanResult && (
                <div className="mt-4 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-violet-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-violet-600 dark:text-violet-400">
                      <BookOpen className="w-4 h-4" />
                      <span>{message.imageScanResult.curriculum}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      OCR Confidence: {message.imageScanResult.accuracyScore}%
                    </span>
                  </div>

                  <div className="space-y-2 text-xs leading-relaxed">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Step-by-Step Solution:
                    </div>
                    {message.imageScanResult.stepByStep.map((step, idx) => (
                      <div key={idx} className="border-l-2 border-violet-500 pl-2.5 text-neutral-700 dark:text-neutral-300">
                        {step}
                      </div>
                    ))}
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>Final Answer: {message.imageScanResult.finalAnswer}</span>
                  </div>

                  {/* Citation Links at the end */}
                  {message.imageScanResult.citations && message.imageScanResult.citations.length > 0 && (
                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                      <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <ExternalLink className="w-3 h-3 text-cyan-500" />
                        <span>Academic References & Citations:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {message.imageScanResult.citations.map((cite, cIdx) => (
                          <a
                            key={cIdx}
                            href={cite.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-violet-500 text-[11px] block transition-colors group"
                          >
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate">
                              {cite.title}
                            </div>
                            <div className="text-[10px] text-neutral-400 flex items-center justify-between mt-0.5">
                              <span>{cite.source}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Math Formula Callout if present */}
              {message.mathFormula && (
                <div className="my-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 overflow-x-auto text-center font-mono text-sm sm:text-base text-violet-700 dark:text-violet-300 shadow-inner">
                  {message.mathFormula}
                </div>
              )}

              {/* Code Snippet if present */}
              {message.codeSnippet && (
                <div className="my-3 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-950 text-neutral-200 text-xs sm:text-sm font-mono">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900 text-[11px] text-neutral-400 border-b border-neutral-800">
                    <span>{message.codeSnippet.language}</span>
                    <button
                      onClick={() => handleCopy(message.id + '-code', message.codeSnippet!.code)}
                      className="hover:text-white flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <pre className="p-3 overflow-x-auto">
                    <code>{message.codeSnippet.code}</code>
                  </pre>
                </div>
              )}

              {/* Study Tip Box */}
              {message.studyTip && (
                <div className="mt-3.5 p-3 rounded-xl bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-800/50 flex items-start gap-2.5 text-xs text-violet-900 dark:text-violet-200">
                  <Lightbulb className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold mr-1">Study Tip:</span>
                    <span>{message.studyTip}</span>
                  </div>
                </div>
              )}

              {/* Follow-up Prompts */}
              {message.followUps && message.followUps.length > 0 && (
                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
                  <div className="text-[11px] uppercase font-semibold text-neutral-400 mb-2 tracking-wider">
                    Related Follow-up Questions
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {message.followUps.map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => onFollowUpClick(prompt)}
                        className="text-left text-xs px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors border border-neutral-200/50 dark:border-neutral-700/50 active:scale-95"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Action Bar (Copy, Read Aloud in Voice Mode, Timestamp) */}
              <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-100 dark:border-neutral-800/40">
                <span className="text-[10px] font-mono">{message.timestamp}</span>

                {isAssistant && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(message.id, message.content)}
                      className="hover:text-neutral-600 dark:hover:text-neutral-200 flex items-center gap-1 transition-colors"
                      title="Copy text"
                    >
                      {copiedId === message.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={onLaunchVoiceMode}
                      className="hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1 transition-colors"
                      title="Listen and talk in Voice Mode"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Voice</span>
                    </button>

                    {onRegenerate && (
                      <button
                        onClick={onRegenerate}
                        className="hover:text-neutral-600 dark:hover:text-neutral-200 flex items-center gap-1 transition-colors"
                        title="Regenerate response"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* User Avatar */}
            {!isAssistant && (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-700 dark:text-neutral-300 mt-1 border border-neutral-300 dark:border-neutral-700">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        );
      })}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-start gap-3 sm:gap-4 animate-in fade-in duration-300">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center shrink-0 shadow-md shadow-violet-500/20 text-white mt-1">
            <Sparkles className="w-4 h-4 text-white animate-spin" />
          </div>
          <div className="p-4 rounded-2xl sm:rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-cyan-600 animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="text-xs text-neutral-400 font-medium ml-1">
              Nexora is reasoning and formulating response...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
