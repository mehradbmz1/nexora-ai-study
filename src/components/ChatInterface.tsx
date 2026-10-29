import React, { useState } from 'react';
import {
  Sparkles,
  User,
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  XCircle,
  Cpu,
  Brain,
  Maximize2,
  X,
  HelpCircle,
  ArrowRight,
  FileText,
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
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<string, number>>({});

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleSpeak = (msgId: string, text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingMsgId(msgId);

    const cleanText = text
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/[*_#`~[\]()]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const isPersian = /[\u0600-\u06FF]/.test(cleanText);
    utterance.lang = isPersian ? 'fa-IR' : 'en-US';

    const voices = window.speechSynthesis.getVoices();
    if (isPersian) {
      const faVoice = voices.find(v => v.lang.startsWith('fa') || v.name.includes('Persian') || v.name.includes('فارسی'));
      if (faVoice) utterance.voice = faVoice;
    } else {
      const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel')));
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    window.speechSynthesis.speak(utterance);
  };

  // Generate fallback quiz for assistant message if not explicitly provided
  const getMessageQuiz = (msg: ChatMessage) => {
    if (msg.quiz) return msg.quiz;

    const isFa = /[\u0600-\u06FF]/.test(msg.content);
    if (isFa) {
      return {
        question: 'تست یادگیری: بر اساس توضیحات بالا، کدام گزاره درباره این مفهوم علمی صحیح است؟',
        options: [
          'الف) بر پایه اصول پایستگی و استدلال استنتاجی بنا شده است',
          'ب) صرفاً در شرایط غیرایزوله و بدون برهم‌کنش رخ می‌دهد',
          'ج) مستقل از متغیرهای حالت و شرایط مرزی است',
          'د) نقض‌کننده قوانین اول و دوم فیزیک است',
        ],
        answerIndex: 0,
        explanation: 'گزینه (الف) صحیح است؛ چرا که طبق اصول علمی مطرح‌شده در درس، این مبحث کاملاً متکی بر روابط پایسته و استدلال اثبات‌پذیر است.',
      };
    }

    return {
      question: 'Concept Check: Which of the following best reflects the core principle discussed above?',
      options: [
        'A) Operates in accordance with conservation principles and boundary conditions',
        'B) Occurs strictly in non-isolated random frameworks',
        'C) Is invariant regardless of reference frames',
        'D) Contradicts the first law of thermodynamics',
      ],
      answerIndex: 0,
      explanation: 'Option A is correct: the concept is grounded in rigorous mathematical conservation and defined physical boundaries.',
    };
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-6 overflow-y-auto">
      {messages.map((message) => {
        const isAssistant = message.role === 'assistant';
        const isPersian = /[\u0600-\u06FF]/.test(message.content);
        const quiz = isAssistant ? getMessageQuiz(message) : null;
        const selectedQuizOption = selectedQuizAnswers[message.id];

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
              className={`max-w-[92%] sm:max-w-[85%] rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition-all ${
                isAssistant
                  ? 'bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-sm text-neutral-800 dark:text-neutral-100'
                  : 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 ml-auto shadow-md'
              }`}
            >
              {/* Image Preview with Click-to-Zoom */}
              {message.imageDataUrl && (
                <div className="mb-4">
                  <div
                    onClick={() => setZoomImage(message.imageDataUrl!)}
                    className="relative group cursor-pointer overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 max-h-72 bg-neutral-950 flex items-center justify-center shadow-xs transition-all hover:ring-2 hover:ring-violet-500"
                  >
                    <img
                      src={message.imageDataUrl}
                      alt="Uploaded problem sheet"
                      className="max-h-72 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold backdrop-blur-xs">
                      <Maximize2 className="w-4 h-4" />
                      <span>Click to view full image & zoom</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-neutral-400 mt-1 block">
                    (Click on photo to open fullscreen preview)
                  </span>
                </div>
              )}

              {/* Attachments if any */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {message.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium"
                    >
                      <FileText className="w-3.5 h-3.5 text-violet-500" />
                      <span>{att.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Assistant Model Badge */}
              {isAssistant && message.modelName && (
                <div className="flex items-center gap-1.5 mb-3 text-[11px] font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1 rounded-xl w-fit border border-violet-200/50 dark:border-violet-800/40">
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
                      <details className="rounded-2xl bg-neutral-100/90 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700 p-3.5 text-xs group transition-all">
                        <summary className="font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer flex items-center justify-between select-none">
                          <span className="flex items-center gap-1.5">
                            <Brain className="w-4 h-4 text-violet-500" />
                            <span>Step-by-Step Chain of Thought</span>
                          </span>
                          <span className="text-[10px] text-neutral-400 group-open:hidden">Show steps ▾</span>
                        </summary>
                        <div className="mt-2 text-neutral-600 dark:text-neutral-300 leading-relaxed font-mono whitespace-pre-line border-t border-neutral-200 dark:border-neutral-700 pt-2 text-[11px]">
                          {thinkingContent}
                        </div>
                      </details>
                    )}

                    {finalContent && (
                      <div className="text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal space-y-2">
                        {finalContent}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Citations / Links if present */}
              {message.citations && message.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                  <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-violet-500" />
                    <span>Academic References & Textbooks:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {message.citations.map((cite, cIdx) => (
                      <a
                        key={cIdx}
                        href={cite.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/80 hover:border-violet-500 text-xs block transition-colors group"
                      >
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate">
                          {cite.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 flex items-center justify-between mt-1">
                          <span>{cite.source}</span>
                          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Study & Concept Check Box (تست و سوالات برای ادامه کار) */}
              {isAssistant && quiz && (
                <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-neutral-50/90 dark:bg-neutral-950/60 border border-violet-500/25 space-y-4">
                  {/* Quiz Header */}
                  <div className="flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800 pb-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-violet-700 dark:text-violet-400">
                      <HelpCircle className="w-4 h-4" />
                      <span>{isPersian ? 'آزمون سنجش یادگیری (تست مفهومی)' : 'Concept Check & Knowledge Quiz'}</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-semibold">
                      Interactive Quiz
                    </span>
                  </div>

                  {/* Question Prompt */}
                  <p className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {quiz.question}
                  </p>

                  {/* 4 Interactive Options */}
                  <div className="grid grid-cols-1 gap-2">
                    {quiz.options.map((option, optIdx) => {
                      const isSelected = selectedQuizOption === optIdx;
                      const isCorrect = optIdx === quiz.answerIndex;
                      const hasAnswered = selectedQuizOption !== undefined;

                      let btnStyle = 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-violet-400 text-neutral-800 dark:text-neutral-200';
                      if (hasAnswered) {
                        if (isCorrect) {
                          btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold ring-1 ring-emerald-500';
                        } else if (isSelected && !isCorrect) {
                          btnStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 font-semibold ring-1 ring-rose-500';
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={hasAnswered}
                          onClick={() =>
                            setSelectedQuizAnswers(prev => ({ ...prev, [message.id]: optIdx }))
                          }
                          className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between ${btnStyle}`}
                        >
                          <span>{option}</span>
                          {hasAnswered && isCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                          )}
                          {hasAnswered && isSelected && !isCorrect && (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback Explanation */}
                  {selectedQuizOption !== undefined && (
                    <div
                      className={`p-3 rounded-xl text-xs leading-relaxed border animate-in fade-in ${
                        selectedQuizOption === quiz.answerIndex
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                      }`}
                    >
                      <div className="font-bold mb-1">
                        {selectedQuizOption === quiz.answerIndex
                          ? (isPersian ? '✅ آفرین! پاسخ شما صحیح است.' : '✅ Correct! Great reasoning.')
                          : (isPersian ? '❌ پاسخ نادرست بود. تحلیل پاسخ صحیح:' : '❌ Not quite. Key takeaway:')}
                      </div>
                      <p>{quiz.explanation}</p>
                    </div>
                  )}

                  {/* Follow-up Exploration Buttons (ادامه کار) */}
                  {message.followUps && message.followUps.length > 0 && (
                    <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
                      <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <span>{isPersian ? 'پیشنهاد برای ادامه مبحث:' : 'Continue this study topic:'}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {message.followUps.map((prompt, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => onFollowUpClick(prompt)}
                            className="text-left text-xs px-3 py-1.5 rounded-full bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 text-neutral-800 dark:text-neutral-200 transition-all hover:border-violet-500 active:scale-95 flex items-center gap-1.5 shadow-xs"
                          >
                            <span>{prompt}</span>
                            <ArrowRight className="w-3 h-3 text-neutral-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Message Action Bar (Copy, Read Aloud, Regenerate, Timestamp) */}
              <div className="mt-4 flex items-center justify-between text-[11px] text-neutral-400 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/50">
                <span className="text-[10px] font-mono">{message.timestamp}</span>

                {isAssistant && (
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Speak / Read Aloud Button */}
                    <button
                      onClick={() => handleToggleSpeak(message.id, message.content)}
                      className={`flex items-center gap-1 transition-colors ${
                        speakingMsgId === message.id
                          ? 'text-violet-600 dark:text-violet-400 font-bold'
                          : 'hover:text-neutral-700 dark:hover:text-neutral-200'
                      }`}
                      title={speakingMsgId === message.id ? 'Stop audio' : 'Listen to response'}
                    >
                      {speakingMsgId === message.id ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Speak</span>
                        </>
                      )}
                    </button>

                    {/* Copy text */}
                    <button
                      onClick={() => handleCopy(message.id, message.content)}
                      className="hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-1 transition-colors"
                      title="Copy message"
                    >
                      {copiedId === message.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {/* Fullscreen Voice Mode shortcut */}
                    <button
                      onClick={onLaunchVoiceMode}
                      className="hover:text-violet-600 dark:hover:text-violet-400 flex items-center gap-1 transition-colors"
                      title="Open Voice Mode"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Voice Mode</span>
                    </button>

                    {/* Regenerate */}
                    {onRegenerate && (
                      <button
                        onClick={onRegenerate}
                        className="hover:text-neutral-700 dark:hover:text-neutral-200 flex items-center gap-1 transition-colors"
                        title="Regenerate answer"
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
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium ml-1">
              Nexora is reasoning and formulating response...
            </span>
          </div>
        </div>
      )}

      {/* Fullscreen Image Zoom / Lightbox Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in select-none"
          onClick={() => setZoomImage(null)}
        >
          <button
            onClick={() => setZoomImage(null)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10 cursor-pointer"
            title="Close preview"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="relative max-w-5xl max-h-[90vh] overflow-hidden flex flex-col items-center justify-center"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={zoomImage}
              alt="Problem Sheet High Resolution"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            <div className="mt-3 text-center text-xs text-neutral-300">
              Uploaded Problem Image (Processed by Cloudflare Vision OCR)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
