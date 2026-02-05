
export interface StickerStyle {
  id: string;
  name: string;
  prompt: string;
}

export interface PromptVersion {
  id: string;
  name: string;
  prompt: string;
  timestamp: number;
}

export interface Sticker {
  id: string;
  emotion: string; // Acts as "Action" description in Sprite Sheet mode
  emoji: string;
  imageUrl?: string;
  finalPrompt?: string; // The actual prompt used to generate this specific image
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
  seed?: number;
  model?: string;
  imageSize?: string;
}

export interface SceneHistoryItem {
  id: string;
  prompt: string;
  imageUrl: string;
  timestamp: number;
  imageSize?: '1K' | '2K' | '4K';
  seed?: number;
  model?: string;
}

export interface GenerationConfig {
  temperature: number;
  topP: number;
  topK: number;
  seed: number | undefined; // undefined means random
  imageSize: '1K' | '2K' | '4K'; // Gemini specific
  model: string;
}

export type GenerationMode = 'pack' | 'sheet' | 'scene' | 'widget'; // Added 'widget'
export type SheetMode = 'idle' | 'emote' | 'action' | 'ui';
export type ConsistencyMode = 'reference' | 'first_result';

export interface SheetActionItem {
  label: string;      // e.g., "Idle_Neutral"
  description: string; // e.g., "idle animation, stationary pose..."
  sequencePrompt?: string; // Optional detailed frame-by-frame description
  enabled?: boolean; // Toggle for generation
}

export interface SheetGridConfig {
  rows: number;
  cols: number;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface GeneratedPack {
  sourceImage: string;
  stickers: Sticker[];
}
