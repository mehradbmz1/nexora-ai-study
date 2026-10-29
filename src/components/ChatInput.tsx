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
  onSendMessage: (text: string, attachments?: MessageAttachment[], imageDataUrl?: string) => void;
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
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if ((!text.trim() && !attachedImage && attachments.length === 0) || isLoading) return;
    onSendMessage(
      text.trim() || (attachedImage ? 'Analyze and solve the problem shown in this image step-by-step with formulas and reasoning.' : ''),
      attachments.length > 0 ? attachments : undefined,
      attachedImage || undefined
    );
    setText('');
    setAttachments([]);
    setAttachedImage(null);
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
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachedImage(reader.result as string);
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
    }
    // reset input
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
              setAttachedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
            e.preventDefault();
            break;
          }
        }
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const isPersian = /[\u0600-\u06FF]/.test(text);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 sm:pb-6 pt-2">
      {/* Hidden file input for images & documents */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="relative rounded-2xl sm:rounded-3xl border border-neutral-200 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 shadow-xl dark:shadow-neutral-950/50 backdrop-blur-xl transition-all duration-200 focus-within:border-violet-500/80 dark:focus-within:border-violet-400/80 focus-within:ring-2 focus-within:ring-violet-500/20">
        {/* Attached Image Thumbnail Preview */}
        {attachedImage && (
          <div className="p-3 pb-0 flex items-center gap-3">
            <div className="relative inline-block rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-950 shadow-sm group">
              <img
                src={attachedImage}
                alt="Attached preview"
                className="h-16 w-auto max-w-[140px] object-cover"
              />
              <button
                onClick={() => setAttachedImage(null)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
                title="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              <span className="font-semibold text-violet-600 dark:text-violet-400 block">
                Problem Image Attached & Ready
              </span>
              <span>Nexora Vision OCR will extract equations, diagrams, and text directly.</span>
            </div>
          </div>
        )}

        {/* Attached Files Preview Chips */}
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
          {/* Direct Image / Attachment Picker button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors mb-1"
            title="Attach image or problem sheet (Ctrl+V supported)"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <button
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
              attachedImage
                ? 'Add specific instructions or questions for this image, or press Enter...'
                : 'Ask Nexora any study question, or paste an image (Ctrl+V)...'
            }
            rows={1}
            className="w-full bg-transparent text-sm sm:text-base text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none resize-none max-h-[180px] py-2 px-1 leading-relaxed"
          />

          {/* Right action buttons: Microphone and Send */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
            {/* Voice Mode Button */}
            <button
              onClick={onLaunchVoiceMode}
              className="p-2 sm:p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200/60 dark:border-violet-800/50 transition-all active:scale-95 flex items-center gap-1.5"
              title="Launch Fullscreen Voice Mode"
            >
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline text-xs font-semibold">Voice</span>
            </button>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={(!text.trim() && !attachedImage && attachments.length === 0) || isLoading}
              className={`p-2.5 sm:p-3 rounded-xl transition-all duration-200 flex items-center justify-center active:scale-95 ${
                text.trim() || attachedImage || attachments.length > 0
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 shadow-md'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
              }`}
              title="Send Message (Enter)"
            >
              <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.4]" />
            </button>
          </div>
        </div>

        {/* Bottom subtle bar with model badge & keyboard hint */}
        <div className="flex items-center justify-between px-4 pb-2.5 pt-0 text-[11px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800/40">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400 font-semibold">
              <Sparkles className="w-3 h-3" />
              Nexora AI Vision & Reasoning
            </span>
            <span className="hidden sm:inline text-neutral-300 dark:text-neutral-700">•</span>
            <span className="hidden sm:inline">Multimodal OCR, clipboard paste & step-by-step solving</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span>Press <kbd className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono text-[10px]">Enter</kbd> to send</span>
          </div>
        </div>
      </div>
    </div>
  );
};
