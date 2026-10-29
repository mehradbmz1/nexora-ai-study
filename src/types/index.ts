export type VoiceState = 'listening' | 'thinking' | 'speaking' | 'muted';

export type VoicePersona = 'aura' | 'orion' | 'nova' | 'sol';

export interface VoicePersonaInfo {
  id: VoicePersona;
  name: string;
  tagline: string;
  description: string;
  color: string;
}

export type SubjectId = 'mathematics' | 'physics' | 'chemistry' | 'biology';

export interface SubjectPrompt {
  id: string;
  title: string;
  prompt: string;
  badge: string;
  lang?: 'en' | 'fa';
}

export interface SubjectTopic {
  id: SubjectId;
  name: string;
  nameFa: string;
  iconName: string;
  accentColor: string;
  gradient: string;
  description: string;
  descriptionFa: string;
  sampleQuestions: SubjectPrompt[];
}

export interface MessageAttachment {
  name: string;
  size: string;
  type: 'pdf' | 'image' | 'code' | 'doc';
  dataUrl?: string;
}

export interface CitationLink {
  title: string;
  url: string;
  source: string;
}

export type EducationalCurriculum = 'iran' | 'us' | 'uk' | 'international' | 'general';

export interface ImageScanResult {
  extractedQuestion: string;
  curriculum: string;
  stepByStep: string[];
  finalAnswer: string;
  citations: CitationLink[];
  accuracyScore: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: MessageAttachment[];
  imageDataUrl?: string;
  imageScanResult?: ImageScanResult;
  citations?: CitationLink[];
  studyTip?: string;
  mathFormula?: string;
  codeSnippet?: {
    language: string;
    code: string;
  };
  followUps?: string[];
  quiz?: QuizQuestion;
  language?: 'fa' | 'en' | 'multilingual';
  modelId?: string;
  modelName?: string;
}

export type CloudflareAiModelCategory =
  | 'all'
  | 'flagship'
  | 'vision'
  | 'multilingual'
  | 'reasoning'
  | 'math'
  | 'fast';

export interface CloudflareAiModel {
  id: string;
  name: string;
  provider: 'Meta' | 'Alibaba Qwen' | 'DeepSeek' | 'Google' | 'Mistral';
  category: 'flagship' | 'vision' | 'multilingual' | 'reasoning' | 'math' | 'fast';
  badgeFa: string;
  badgeEn: string;
  descriptionFa: string;
  descriptionEn: string;
  contextWindow: string;
  supportsVision: boolean;
  languages: string[];
  isFree: boolean;
  accentColor: string;
  recommendedFor?: string;
}

export interface Conversation {
  id: string;
  userId?: string;
  title: string;
  subject?: SubjectId;
  updatedAt: string;
  category: 'Today' | 'Yesterday' | 'Previous 7 Days';
  messages: ChatMessage[];
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  message?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  persona: VoicePersona;
  speechRate: number; // 0.8 to 1.5
  useRealMic: boolean;
  autoPlayVoice: boolean;
  studyMode: 'socratic' | 'comprehensive';
  curriculum: EducationalCurriculum;
  preferredLanguage: 'auto' | 'fa' | 'en';
  selectedModelId: string;
}
