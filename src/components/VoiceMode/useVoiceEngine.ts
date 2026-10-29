import { useState, useEffect, useRef, useCallback } from 'react';
import type { VoiceState, VoicePersona } from '../../types';

interface VoiceTurn {
  userText: string;
  assistantText: string;
  lang: 'fa' | 'en';
}

const SAMPLE_DIALOGUES: VoiceTurn[] = [
  // Persian dialogues (فارسی روان و بدون غلط)
  {
    lang: 'fa',
    userText: 'مفهوم برهم‌نهی کوانتومی و آزمایش دو شکاف را به زبان ساده توضیح بده.',
    assistantText: 'در فیزیک کوانتومی، تا زمانی که ذره‌ای را مشاهده نکنیم، می‌تواند همزمان در حالت‌های متفاوتی وجود داشته باشد. در آزمایش دو شکاف، الکترون مانند موجی از احتمالات از هر دو شکاف عبور کرده و الگوی تداخل ایجاد می‌کند.',
  },
  {
    lang: 'fa',
    userText: 'چرا طبق نظریه نسبیت خاص زمان در سرعت‌های بالا کند می‌شود؟',
    assistantText: 'زیرا سرعت نور برای تمام ناظران ثابت و تغییرناپذیر است. برای اینکه نور همواره با سرعتی دقیقاً یکسان حرکت کند، زمان برای جسمی که با سرعت بالا حرکت می‌کند اتساع می‌یابد و کندتر سپری می‌شود.',
  },
  {
    lang: 'fa',
    userText: 'تفاوت واکنش‌های جانشینی هسته‌دوستی SN1 و SN2 در شیمی آلی چیست؟',
    assistantText: 'واکنش اس‌ان۲ تک‌مرحله‌ای با حمله از پشت و وارونگی کامل ساختار رخ می‌دهد؛ اما واکنش اس‌ان۱ در دو مرحله و با تشکیل کربوکاتیون واسطه صورت گرفته و منجر به راسمیک شدن محصول نهایی می‌شود.',
  },
  {
    lang: 'fa',
    userText: 'آنزیم کریسپر Cas9 چگونه توالی‌های خاص ژنتیکی را شناسایی و برش می‌دهد؟',
    assistantText: 'کریسپر Cas9 از یک آران‌ای راهنمای بیست نوکلئوتیدی برای ردیابی توالی مکمل دی‌ان‌ای هدف استفاده می‌کند و پس از تطابق دقیق، یک برش دو رشته‌ای بدون نقص ایجاد می‌نماید.',
  },
  // English dialogues
  {
    lang: 'en',
    userText: "Can you explain how quantum superposition works in the double-slit experiment?",
    assistantText: "Certainly! In the double-slit experiment, when particles aren't observed, each particle travels as a wave of probability through both slits simultaneously, generating an interference pattern.",
  },
  {
    lang: 'en',
    userText: "Why does time dilate near the speed of light in Special Relativity?",
    assistantText: "Because the speed of light is strictly constant for all reference frames. For light speed to remain invariant, time itself must dilate for the moving observer.",
  },
];

export function useVoiceEngine(persona: VoicePersona = 'aura') {
  const [state, setState] = useState<VoiceState>('listening');
  const [audioLevel, setAudioLevel] = useState<number>(0.1);
  const [frequencyData, setFrequencyData] = useState<number[]>(new Array(16).fill(10));
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [speaker, setSpeaker] = useState<'user' | 'assistant'>('user');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [dialogueIndex, setDialogueIndex] = useState<number>(0);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [useRealMic, setUseRealMic] = useState<boolean>(false);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; text: string; time: string }[]>([]);

  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const synthUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);

  // Session duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cleanup Web Audio and Speech on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Toggle real microphone input + Speech Recognition
  const toggleRealMic = async () => {
    if (useRealMic) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setUseRealMic(false);
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        // Try initializing SpeechRecognition for live Persian and English transcription
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'fa-IR'; // Default to Persian with auto recognition
          rec.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((r: any) => r[0].transcript)
              .join(' ');
            if (transcript) {
              setCurrentTranscript(transcript);
              setSpeaker('user');
            }
          };
          rec.onerror = () => {};
          try {
            rec.start();
            recognitionRef.current = rec;
          } catch {}
        }

        setUseRealMic(true);
      }
    } catch {
      console.warn('Microphone access was denied or unavailable. Continuing with procedural audio.');
      setUseRealMic(false);
    }
  };

  // Audio animation and frequency analysis loop
  useEffect(() => {
    let phase = 0;

    const tick = () => {
      phase += 0.05;

      if (isMuted) {
        setAudioLevel(0.04);
        setFrequencyData(new Array(16).fill(5));
      } else if (useRealMic && analyserRef.current && state === 'listening') {
        // Real microphone data
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        const slicedFreq: number[] = [];
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i] || 0;
          sum += val;
          slicedFreq.push(val);
        }
        const avg = sum / (16 * 255);
        setAudioLevel(Math.min(1.0, avg * 2.2));
        setFrequencyData(slicedFreq);
      } else {
        // Procedural audio generation
        if (state === 'speaking') {
          const syllable = Math.sin(phase * 4) * Math.cos(phase * 2);
          const vocalMod = (Math.sin(phase * 8) + 1) * 0.25;
          const energy = Math.max(0.12, Math.min(0.95, (syllable + 1) * 0.4 + vocalMod));
          setAudioLevel(energy);

          const freqs = Array.from({ length: 16 }, (_, i) => {
            const harmonic = Math.sin(phase * 3 + i * 0.4) * 0.5 + 0.5;
            return Math.floor(harmonic * energy * 255);
          });
          setFrequencyData(freqs);
        } else if (state === 'listening') {
          const ambientWave = Math.sin(phase * 1.5) * 0.08 + 0.12;
          setAudioLevel(ambientWave);
          const freqs = Array.from({ length: 16 }, (_, i) => {
            return Math.floor((Math.sin(phase + i * 0.5) * 0.3 + 0.4) * 60);
          });
          setFrequencyData(freqs);
        } else {
          // thinking / muted
          const gentleBreathing = Math.sin(phase * 1.2) * 0.05 + 0.08;
          setAudioLevel(gentleBreathing);
          setFrequencyData(new Array(16).fill(15));
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, isMuted, useRealMic]);

  // Handle SpeechSynthesis audio playback in Persian or English
  const playAssistantSpeech = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    synthUtteranceRef.current = utterance;

    const isPersian = /[\u0600-\u06FF]/.test(text);
    utterance.lang = isPersian ? 'fa-IR' : 'en-US';

    // Configure persona voice characteristics
    if (persona === 'aura') {
      utterance.pitch = isPersian ? 1.05 : 1.1;
      utterance.rate = 1.0;
    } else if (persona === 'orion') {
      utterance.pitch = 0.85;
      utterance.rate = 0.95;
    } else if (persona === 'nova') {
      utterance.pitch = 1.2;
      utterance.rate = 1.08;
    } else {
      utterance.pitch = 1.0;
      utterance.rate = 0.9;
    }

    // Try finding matching voice (Persian or English)
    const voices = window.speechSynthesis.getVoices();
    if (isPersian) {
      const faVoice = voices.find(v => v.lang.startsWith('fa') || v.name.toLowerCase().includes('persian') || v.name.includes('فارسی'));
      if (faVoice) utterance.voice = faVoice;
    } else {
      const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel')));
      if (enVoice) utterance.voice = enVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, [persona]);

  // Transition to Thinking then Speaking
  const triggerExchange = useCallback((customUserQuestion?: string) => {
    if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    const currentPair = SAMPLE_DIALOGUES[dialogueIndex % SAMPLE_DIALOGUES.length];
    const userText = customUserQuestion || currentPair.userText;
    const isFa = /[\u0600-\u06FF]/.test(userText);
    const assistantText = customUserQuestion
      ? isFa
        ? 'پاسخ علمی نکسورا: این مفهوم در نظام آموزشی با فرمول‌های بنیادین اثبات می‌شود و کاربرد مستقیم در امتحانات و حل مسائل دارد.'
        : 'Nexora Core Insight: This fundamental theorem applies directly across your academic curriculum with rigorous mathematical proofs.'
      : currentPair.assistantText;

    // 1. User asks question
    setSpeaker('user');
    setCurrentTranscript(userText);
    setState('listening');

    // 2. Transition to Thinking
    stateTimeoutRef.current = setTimeout(() => {
      setState('thinking');
      setCurrentTranscript(
        isFa ? 'در حال تحلیل مفهومی و بررسی مراجع درسی...' : 'Analyzing query & formulating study synthesis...'
      );

      // 3. Transition to Speaking
      stateTimeoutRef.current = setTimeout(() => {
        setState('speaking');
        setSpeaker('assistant');
        setCurrentTranscript(assistantText);
        playAssistantSpeech(assistantText);

        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setHistory(prev => [
          ...prev,
          { role: 'user', text: userText, time: now },
          { role: 'assistant', text: assistantText, time: now },
        ]);

        setDialogueIndex(prev => (prev + 1) % SAMPLE_DIALOGUES.length);

        const wordCount = assistantText.split(' ').length;
        const durationMs = Math.max(4500, (wordCount / 3) * 1000);

        stateTimeoutRef.current = setTimeout(() => {
          setState('listening');
          setSpeaker('user');
          setCurrentTranscript(
            isFa ? 'در حال شنیدن صدای شما... صحبت کنید یا سوالی را انتخاب نمایید.' : 'Listening... Speak now or tap a sample question.'
          );
        }, durationMs);
      }, 1600);
    }, 1800);
  }, [dialogueIndex, playAssistantSpeech]);

  // Interrupt assistant immediately
  const interrupt = useCallback(() => {
    if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState('listening');
    setSpeaker('user');
    setCurrentTranscript('صحبت متوقف شد. در حال شنیدن صدای شما...');
  }, []);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (next) {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        setState('muted');
        setCurrentTranscript('میکروفون غیرفعال شد. جهت صحبت روی دکمه میکروفون بزنید.');
      } else {
        setState('listening');
        setCurrentTranscript('میکروفون فعال است. لطفاً صحبت کنید...');
      }
      return next;
    });
  }, []);

  // Cycle states manually for testing / presentation
  const cycleState = useCallback(() => {
    if (state === 'listening') {
      setState('thinking');
      setCurrentTranscript('در حال تفکر و پردازش پاسخ علمی نکسورا...');
    } else if (state === 'thinking') {
      setState('speaking');
      setSpeaker('assistant');
      const text = SAMPLE_DIALOGUES[dialogueIndex % SAMPLE_DIALOGUES.length].assistantText;
      setCurrentTranscript(text);
      playAssistantSpeech(text);
    } else {
      interrupt();
    }
  }, [state, dialogueIndex, interrupt, playAssistantSpeech]);

  return {
    state,
    setState,
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
  };
}
