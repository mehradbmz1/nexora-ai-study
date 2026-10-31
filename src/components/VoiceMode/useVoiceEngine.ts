import { useState, useEffect, useRef, useCallback } from 'react';
import type { VoiceState, VoicePersona, ChatMessage } from '../../types';
import { ChatSyncService } from '../../services/api';

export function useVoiceEngine(
  persona: VoicePersona = 'aura',
  selectedModelId?: string,
  initialHistory?: ChatMessage[]
) {
  const [state, setState] = useState<VoiceState>('listening');
  const [audioLevel, setAudioLevel] = useState<number>(0.1);
  const [frequencyData, setFrequencyData] = useState<number[]>(new Array(16).fill(10));
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [speaker, setSpeaker] = useState<'user' | 'assistant'>('user');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sessionDuration, setSessionDuration] = useState<number>(0);
  const [useRealMic, setUseRealMic] = useState<boolean>(true);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; text: string; time: string }[]>(() => {
    if (initialHistory && initialHistory.length > 0) {
      return initialHistory.map(m => ({
        role: m.role,
        text: m.content,
        time: m.timestamp || 'Voice',
      }));
    }
    return [];
  });

  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const synthUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const hasSpokenInThisTurn = useRef<boolean>(false);
  const latestTranscriptRef = useRef<string>('');

  // Session duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cleanup Web Audio, MediaRecorder, and Speech on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
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

  // Speak assistant text using browser SpeechSynthesis with strict echo cancellation
  const playAssistantSpeech = useCallback((text: string, onFinish?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onFinish) onFinish();
      return;
    }

    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;
    setState('speaking');
    setSpeaker('assistant');

    // MUTE MICROPHONE HARDWARE INPUT TRACKS TO PREVENT ECHO LOOP
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach(t => { t.enabled = false; });
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    audioChunksRef.current = [];
    hasSpokenInThisTurn.current = false;
    latestTranscriptRef.current = '';
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Clean text of markdown characters for cleaner speech
    const cleanText = text
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/[*_#`~[\]()]/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText || text);
    synthUtteranceRef.current = utterance;

    const isPersian = /[\u0600-\u06FF]/.test(cleanText);
    utterance.lang = isPersian ? 'fa-IR' : 'en-US';

    // Persona voice tuning
    if (persona === 'aura') {
      utterance.pitch = isPersian ? 1.05 : 1.1;
      utterance.rate = 1.0;
    } else if (persona === 'orion') {
      utterance.pitch = 0.85;
      utterance.rate = 0.95;
    } else if (persona === 'nova') {
      utterance.pitch = 1.2;
      utterance.rate = 1.05;
    } else {
      utterance.pitch = 1.0;
      utterance.rate = 0.95;
    }

    const voices = window.speechSynthesis.getVoices();
    if (isPersian) {
      const faVoice = voices.find(v => v.lang.startsWith('fa') || v.name.toLowerCase().includes('persian') || v.name.includes('فارسی'));
      if (faVoice) utterance.voice = faVoice;
    } else {
      const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Daniel')));
      if (enVoice) utterance.voice = enVoice;
    }

    const finishHandler = () => {
      // 800ms cooldown delay to let room echo and speaker tail dissipate completely
      setTimeout(() => {
        isSpeakingRef.current = false;
        audioChunksRef.current = [];
        hasSpokenInThisTurn.current = false;
        latestTranscriptRef.current = '';

        // Re-enable microphone track only AFTER room is completely silent
        if (micStreamRef.current) {
          micStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true; });
        }

        if (onFinish) onFinish();
      }, 800);
    };

    utterance.onend = finishHandler;
    utterance.onerror = finishHandler;

    window.speechSynthesis.speak(utterance);
  }, [persona]);

  // Submit speech text to AI backend
  const submitSpeechToAI = useCallback(async (userPrompt: string) => {
    if (!userPrompt.trim()) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);

    // Pause speech recognition and clear audio chunks while AI is thinking/speaking
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    audioChunksRef.current = [];
    hasSpokenInThisTurn.current = false;

    const isFa = /[\u0600-\u06FF]/.test(userPrompt);
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Show user message
    setSpeaker('user');
    setCurrentTranscript(userPrompt);
    setState('thinking');

    // 2. Add user message to history
    setHistory(prev => [...prev, { role: 'user', text: userPrompt, time: now }]);

    try {
      // 3. Call Cloudflare AI backend with isVoiceMode = true for direct, conversational answers
      const historyPayload = history.map(h => ({ role: h.role, content: h.text }));
      historyPayload.push({ role: 'user', content: userPrompt });

      const aiResponse = await ChatSyncService.sendToAI(
        userPrompt,
        undefined,
        'iran',
        selectedModelId,
        historyPayload,
        undefined,
        undefined,
        true // isVoiceMode = true!
      );

      const replyText = aiResponse.content || (isFa ? 'پاسخ هوش مصنوعی دریافت شد.' : 'AI response received.');

      // 4. Set state to speaking
      setState('speaking');
      setSpeaker('assistant');
      setCurrentTranscript(replyText);

      setHistory(prev => [...prev, { role: 'assistant', text: replyText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);

      // 5. Play audio via TTS
      playAssistantSpeech(replyText, () => {
        // When speech finishes:
        setState('listening');
        setSpeaker('user');
        setCurrentTranscript(isFa ? 'در حال شنیدن صدای شما... می‌توانید صحبت کنید.' : 'Listening... Speak now or tap a topic.');
        startSpeechRecognition();
      });
    } catch {
      setState('listening');
      setSpeaker('user');
      setCurrentTranscript(isFa ? 'خطا در ارتباط با هوش مصنوعی. لطفاً دوباره تلاش کنید.' : 'Connection error. Please try again.');
      startSpeechRecognition();
    }
  }, [history, selectedModelId, playAssistantSpeech]);

  // Transcribe recorded audio with Cloudflare Workers AI Whisper as fallback
  const processRecordedAudioWithWhisper = useCallback(async () => {
    if (audioChunksRef.current.length === 0 || isSpeakingRef.current || isMuted) return;

    const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const blob = new Blob(audioChunksRef.current, { type: mime });
    audioChunksRef.current = [];
    hasSpokenInThisTurn.current = false;

    // Filter out tiny audio artifacts / clicks (< 3500 bytes)
    if (blob.size < 3500) return;

    setState('thinking');
    setCurrentTranscript('در حال تبدیل گفتار شما با Whisper هوش مصنوعی...');

    try {
      const res = await ChatSyncService.transcribeAudio(blob);
      if (res.success && res.text && res.text.trim()) {
        submitSpeechToAI(res.text.trim());
      } else {
        setState('listening');
        setCurrentTranscript('متن گفتار تشخیص داده نشد. لطفاً مجدداً صحبت کنید.');
      }
    } catch {
      setState('listening');
    }
  }, [isMuted, submitSpeechToAI]);

  // Start real browser Speech Recognition
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined' || isMuted || isSpeakingRef.current) return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'fa-IR';

      rec.onresult = (event: any) => {
        if (isSpeakingRef.current) return;

        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const text = (final || interim).trim();
        if (text) {
          latestTranscriptRef.current = text;
          setCurrentTranscript(text);
          setSpeaker('user');

          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (latestTranscriptRef.current && !isSpeakingRef.current) {
              const toSubmit = latestTranscriptRef.current;
              latestTranscriptRef.current = '';
              submitSpeechToAI(toSubmit);
            }
          }, 1400);
        }
      };

      rec.onerror = () => {
        // Browser Speech API failed or blocked -> Whisper audio fallback handles it automatically
      };

      rec.onend = () => {
        if (!isSpeakingRef.current && !isMuted) {
          setTimeout(() => {
            try { rec.start(); } catch {}
          }, 500);
        }
      };

      rec.start();
      recognitionRef.current = rec;
    } catch {}
  }, [isMuted, submitSpeechToAI]);

  // Initialize Microphone with Full Hardware Noise Suppression, Echo Cancellation, and Dual-Filter Audio Processing
  const initAudioStream = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000,
          }
        });
        micStreamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;

        // Software DSP Filter Pipeline:
        // 1. Highpass filter to eliminate low-frequency rumbles (fan, AC, handling noise) < 95Hz
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 95;

        // 2. Lowpass filter to cut out high-frequency hiss / static > 7000Hz
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 7000;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.85;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(analyser);

        // Start MediaRecorder for hardware audio capture
        try {
          const mimeType = MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';
          const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0 && !isSpeakingRef.current && !isMuted) {
              audioChunksRef.current.push(e.data);
            }
          };

          recorder.start(250);
        } catch (e) {
          console.warn('MediaRecorder init error:', e);
        }

        setUseRealMic(true);
        startSpeechRecognition();
      }
    } catch {
      console.warn('Microphone permission not granted. Procedural visualizer active.');
      setUseRealMic(false);
    }
  }, [isMuted, startSpeechRecognition]);

  // Run on mount
  useEffect(() => {
    initAudioStream();
  }, [initAudioStream]);

  // Audio animation, frequency analysis loop, and voice activity detection
  useEffect(() => {
    let phase = 0;

    const tick = () => {
      phase += 0.05;

      if (isMuted) {
        setAudioLevel(0.04);
        setFrequencyData(new Array(16).fill(5));
      } else if (useRealMic && analyserRef.current && state === 'listening') {
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
        const level = Math.min(1.0, avg * 2.2);
        setAudioLevel(level);
        setFrequencyData(slicedFreq);

        // Dynamic Voice Activity Detection:
        // Prioritizes closer, louder speech (level >= 0.22) and rejects background room hum (< 0.10)
        const SPEECH_ACTIVE_THRESHOLD = 0.22;
        const SILENCE_THRESHOLD = 0.10;

        if (level >= SPEECH_ACTIVE_THRESHOLD && !isSpeakingRef.current) {
          hasSpokenInThisTurn.current = true;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        } else if (hasSpokenInThisTurn.current && level < SILENCE_THRESHOLD && !isSpeakingRef.current) {
          // User paused speaking; wait 1.5s then submit to ensure sentence completion
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null;
              if (latestTranscriptRef.current && latestTranscriptRef.current.trim().length > 1) {
                const toSubmit = latestTranscriptRef.current;
                latestTranscriptRef.current = '';
                submitSpeechToAI(toSubmit);
              } else {
                // If Web Speech didn't catch it, fallback to Cloudflare Whisper!
                processRecordedAudioWithWhisper();
              }
            }, 1500);
          }
        }
      } else {
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
  }, [state, isMuted, useRealMic, processRecordedAudioWithWhisper, submitSpeechToAI]);

  // Interrupt assistant immediately
  const interrupt = useCallback(() => {
    if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    audioChunksRef.current = [];
    hasSpokenInThisTurn.current = false;
    latestTranscriptRef.current = '';

    // Re-enable hardware mic tracks
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach(t => { t.enabled = true; });
    }

    setState('listening');
    setSpeaker('user');
    setCurrentTranscript('صحبت متوقف شد. در حال شنیدن صدای شما...');
    startSpeechRecognition();
  }, [startSpeechRecognition]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (next) {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
        }
        audioChunksRef.current = [];
        setState('muted');
        setCurrentTranscript('میکروفون غیرفعال شد.');
      } else {
        setState('listening');
        setCurrentTranscript('میکروفون فعال است. لطفاً صحبت کنید...');
        startSpeechRecognition();
      }
      return next;
    });
  }, [startSpeechRecognition]);

  const toggleRealMic = useCallback(async () => {
    if (useRealMic) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
        micStreamRef.current = null;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setUseRealMic(false);
    } else {
      await initAudioStream();
    }
  }, [useRealMic, initAudioStream]);

  // Trigger spoken exchange manually or via starter button
  const triggerExchange = useCallback((promptText: string) => {
    submitSpeechToAI(promptText);
  }, [submitSpeechToAI]);

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
    cycleState: interrupt,
  };
}
