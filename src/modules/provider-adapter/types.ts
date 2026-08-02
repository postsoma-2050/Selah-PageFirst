export type ProviderType = 'ollama' | 'chrome-ai' | 'openai-compatible';

export interface ProviderConfig {
  type: ProviderType;
  baseUrl?: string;
  apiKey?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessagePayload {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerationOptions {
  messages: ChatMessagePayload[];
  temperature?: number;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
}

export interface IProviderAdapter {
  readonly type: ProviderType;
  isAvailable(): Promise<boolean>;
  listModels(): Promise<string[]>;
  generateStream(options: GenerationOptions): Promise<string>;
}
