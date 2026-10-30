import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Paperclip,
  Mic,
  X,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import type { MessageAttachment } from '../types';

interface ChatInputProps {
  onSendMessage: (
    text: string,
    attachments?: MessageAttachment[],
    imageDataUrl?: string,
    imageDataUrls?: string[]
  ) => void;
  onLaunchVoiceMode: () => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onLaunchVoiceMode,
  isLoading,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isDictating, setIsDictating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const toggleDictation = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      onLaunchVoiceMode();
      return;
    }

    if (isDictating) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsDictating(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'fa-IR';

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setText(prev => (prev ? prev + ' ' : '') + transcript);
        }
      };

      rec.onend = () => setIsDictating(false);
      rec.onerror = () => setIsDictating(false);

      rec.start();
      recognitionRef.current = rec;
      setIsDictating(true);
    } catch {
      setIsDictating(false);
    }
  };

  const handleSend = () => {
    const hasImages = attachedImages.length > 0;
    const isFa = !text.trim() || /[\u0600-\u06FF]/.test(text);

    let defaultPrompt = '';
    if (hasImages) {
      if (attachedImages.length > 1) {
        defaultPrompt = isFa
          ? 'لطفاً تمامی سوالات و مسائل موجود در این تصاویر را به صورت دونه‌به‌دونه، گام‌به‌گام و با محاسبات دقیق و فرمول‌ها به زبان فارسی حل کن و در انتهای هر سوال، گزینه صحیح یا پاسخ نهایی را به صورت برجسته مشخص نما.'
          : 'Please transcribe and solve all problems in these images step-by-step with formulas, answering each question one-by-one with clearly stated final answers.';
      } else {
        defaultPrompt = isFa
          ? 'لطفاً مسئله و سوال موجود در این تصویر را به طور کامل، گام‌به‌گام و با ذکر محاسبات دقیق به زبان فارسی حل کن و در پایان پاسخ نهایی یا گزینه صحیح را صریحاً مشخص نما.'
          : 'Please transcribe and solve the academic problem shown in this image step-by-step with formulas and state the final answer clearly.';
      }
    }

    onSendMessage(
      text.trim() || defaultPrompt,
      attachments.length > 0 ? attachments : undefined,
      attachedImages[0] || undefined,
      hasImages ? attachedImages : undefined
    );

    setText('');
    setAttachments([]);
    setAttachedImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            setAttachedImages(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const sizeKb = Math.round(file.size / 1024);
        const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
        setAttachments(prev => [
          ...prev,
          { name: file.name, size: sizeStr, type: file.name.endsWith('.pdf') ? 'pdf' : 'doc' },
        ]);
      }
    });

    if (e.target) e.target.value = '';
  };

  // Support clipboard paste of screenshots / images
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              if (reader.result) {
                setAttachedImages(prev => [...prev, reader.result as string]);
              }
            };
            reader.readAsDataURL(file);
            e.preventDefault();
            break;
          }
        }
      }
    }
  };

  const removeImage = (index: number) => {
    setAttachedImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const isPersian = /[\u0600-\u06FF]/.test(text);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 sm:pb-6 pt-1">
      {/* Hidden file input for images & documents (supports multiple files) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="relative rounded-2xl sm:rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 shadow-lg dark:shadow-neutral-950/40 backdrop-blur-xl transition-all duration-200 focus-within:border-violet-500/80 dark:focus-within:border-violet-400/80 focus-within:ring-2 focus-within:ring-violet-500/20">
        {/* Attached Images Gallery Preview */}
        {attachedImages.length > 0 && (
          <div className="p-3 pb-1 border-b border-neutral-100 dark:border-neutral-800/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
                {attachedImages.length === 1
                  ? 'تصویر پیوست شد (حل کامل سوالات با ویژن نکسورا)'
                  : `${attachedImages.length} تصویر پیوست شد (حل دونه‌به‌دونه تمامی سوالات)`}
              </span>
              <button
                type="button"
                onClick={() => setAttachedImages([])}
                className="text-[11px] text-neutral-400 hover:text-rose-500 transition-colors"
              >
                حذف همه
              </button>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {attachedImages.map((img, idx) => (
                <div
                  key={idx}
                  className="relative group inline-block rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-950 shadow-xs"
                >
                  <img
                    src={img}
                    alt={`Attached ${idx + 1}`}
                    className="h-16 w-auto max-w-[120px] object-cover"
                  />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[10px] text-white font-mono">
                    #{idx + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/75 hover:bg-rose-600 text-white transition-colors"
                    title="Remove this image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attached Documents Preview Chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 pb-0">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300"
              >
                <span className="truncate max-w-[150px]">{att.name}</span>
                <span className="text-[10px] text-neutral-400">({att.size})</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="p-0.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-end px-3 py-2 sm:px-4 sm:py-3 gap-2">
          {/* Direct Image Picker button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors mb-1"
            title="Attach one or multiple images (Ctrl+V supported)"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors mb-1 hidden sm:flex"
            title="Attach document (PDF)"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            dir={isPersian ? 'rtl' : 'ltr'}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              attachedImages.length > 0
                ? 'دستور یا سوال مشخص برای این تصویرها بنویسید، یا اینتر بزنید...'
                : 'هر سوال درسی دارید بپرسید یا عکس مسئله را بفرستید (Ctrl+V)...'
            }
            rows={1}
            className="w-full bg-transparent text-sm sm:text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none resize-none max-h-[180px] py-2 px-1 leading-relaxed"
          />

          {/* Right action buttons: Dictation Mic, Voice Mode, and Send */}
          <div className="flex items-center gap-1 sm:gap-1.5 mb-1">
            {/* Live Voice Dictation Button (Transcribes voice into text bar on demand) */}
            <button
              type="button"
              onClick={toggleDictation}
              className={`p-2 sm:p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center ${
                isDictating
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
              title={isDictating ? 'در حال شنیدن صدای شما... برای توقف کلیک کنید' : 'تایپ صوتی فارسی (Speech to Text)'}
            >
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Fullscreen Voice Mode Button */}
            <button
              type="button"
              onClick={onLaunchVoiceMode}
              className="p-2 sm:p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200/60 dark:border-violet-800/50 transition-all active:scale-95 flex items-center gap-1.5"
              title="ورود به حالت گفتگوی صوتی زنده"
            >
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="hidden sm:inline text-xs font-semibold">Voice Mode</span>
            </button>

            {/* Send button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={(!text.trim() && attachedImages.length === 0 && attachments.length === 0) || isLoading}
              className={`p-2.5 sm:p-3 rounded-xl transition-all duration-200 flex items-center justify-center active:scale-95 ${
                text.trim() || attachedImages.length > 0 || attachments.length > 0
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 shadow-md'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
              }`}
              title="Send Message (Enter)"
            >
              <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.4]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
