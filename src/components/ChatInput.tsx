import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Paperclip,
  Mic,
  X,
  Image as ImageIcon,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { MessageAttachment } from '../types';
import { ChatSyncService } from '../services/api';

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
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const receivedTextFromWebSpeech = useRef<boolean>(false);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Clean up recording & recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startVoiceRecording = async () => {
    receivedTextFromWebSpeech.current = false;
    audioChunksRef.current = [];

    // 1. Start browser Web Speech API for instant interim preview if supported
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
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
          if (transcript.trim()) {
            receivedTextFromWebSpeech.current = true;
            setText(prev => {
              const base = prev.trim();
              return base ? base + ' ' + transcript.trim() : transcript.trim();
            });
          }
        };

        rec.onerror = () => {
          // Silent fallback to Cloudflare Whisper
        };

        rec.start();
        recognitionRef.current = rec;
      } catch {}
    }

    // 2. Start hardware MediaRecorder for Cloudflare Workers AI Whisper fallback
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecordingAudio(false);

        // Stop all microphone stream tracks
        stream.getTracks().forEach(t => t.stop());

        // If Web Speech API already transcribed text, we don't need Whisper
        if (receivedTextFromWebSpeech.current) {
          setIsTranscribing(false);
          return;
        }

        // Send audio to Cloudflare Whisper
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        });

        if (audioBlob.size > 800) {
          setIsTranscribing(true);
          try {
            const res = await ChatSyncService.transcribeAudio(audioBlob);
            if (res.success && res.text) {
              setText(prev => {
                const base = prev.trim();
                return base ? base + ' ' + res.text!.trim() : res.text!.trim();
              });
            }
          } catch (err) {
            console.error('Whisper transcribe error:', err);
          } finally {
            setIsTranscribing(false);
          }
        }
      };

      recorder.start(200);
      setIsRecordingAudio(true);

      // Auto-stop after 15s to ensure microphone never stays open inadvertently
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = setTimeout(() => {
        stopVoiceRecording();
      }, 15000);
    } catch (err) {
      console.warn('Microphone permission or hardware error:', err);
      setIsRecordingAudio(false);
    }
  };

  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopVoiceRecording = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    } else {
      setIsRecordingAudio(false);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const toggleDictation = () => {
    if (isRecordingAudio) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const handleSend = () => {
    // Immediately terminate any active microphone stream
    if (isRecordingAudio) {
      stopVoiceRecording();
    }

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

  // High-fidelity image optimization (compresses large camera photos to crisp 1600px JPEG to prevent upload bugs)
  const optimizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          resolve('');
          return;
        }
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.90);
          resolve(compressed);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        const optimized = await optimizeImage(file);
        if (optimized) {
          setAttachedImages(prev => [...prev, optimized]);
        }
      } else {
        const sizeKb = Math.round(file.size / 1024);
        const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
        setAttachments(prev => [
          ...prev,
          { name: file.name, size: sizeStr, type: file.name.endsWith('.pdf') ? 'pdf' : 'doc' },
        ]);
      }
    }

    if (e.target) e.target.value = '';
  };

  // Support clipboard paste of screenshots / images
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const optimized = await optimizeImage(file);
            if (optimized) {
              setAttachedImages(prev => [...prev, optimized]);
            }
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

      {/* Real-time Transcription Status Banner */}
      {isTranscribing && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-700 dark:text-violet-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
          <span>در حال تبدیل صدای شما به متن با هوش مصنوعی Whisper نکسورا...</span>
        </div>
      )}

      {isRecordingAudio && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>در حال ضبط صدا... لطفاً صحبت کنید</span>
          </div>
          <button
            type="button"
            onClick={stopVoiceRecording}
            className="text-[11px] underline hover:text-rose-600 transition-colors cursor-pointer"
          >
            اتمام و تبدیل به متن
          </button>
        </div>
      )}

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
            className="p-2 sm:p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors mb-1 cursor-pointer"
            title="Attach one or multiple images (Ctrl+V supported)"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 sm:p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors mb-1 hidden sm:flex cursor-pointer"
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
            {/* Live Voice Dictation Button (Cloudflare Whisper STT + Web Speech) */}
            <button
              type="button"
              onClick={toggleDictation}
              disabled={isTranscribing}
              className={`p-2 sm:p-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                isRecordingAudio
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : isTranscribing
                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
              title={
                isRecordingAudio
                  ? 'در حال ضبط صدا... کلیک کنید تا متوقف و به متن تبدیل شود'
                  : isTranscribing
                  ? 'در حال تبدیل گفتار به متن با Whisper هوش مصنوعی...'
                  : 'تایپ صوتی فارسی (Speech to Text با Whisper هوش مصنوعی)'
              }
            >
              {isTranscribing ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              ) : (
                <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>

            {/* Fullscreen Voice Mode Button */}
            <button
              type="button"
              onClick={onLaunchVoiceMode}
              className="p-2 sm:p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200/60 dark:border-violet-800/50 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
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
              className={`p-2.5 sm:p-3 rounded-xl transition-all duration-200 flex items-center justify-center active:scale-95 cursor-pointer ${
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
