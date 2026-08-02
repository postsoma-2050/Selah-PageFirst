import { PageSnapshot } from '../page-capture/types';
import { ProviderConfig } from '../provider-adapter/types';

export type ActionType = 'summarize' | 'analyze-insights' | 'extract-facts' | 'ask-document' | 'custom-query' | 'web-search';
export type AnalysisMode = 'fast-scan' | 'critical-analysis';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  actionType?: ActionType;
  groundedInPage?: boolean;
  usedWebSearch?: boolean;
}

export interface ChatSession {
  sessionId: string;
  pageSnapshot: PageSnapshot;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface OrchestrationRequest {
  actionType: ActionType;
  analysisMode?: AnalysisMode;
  responseLanguage?: 'auto' | 'zh-TW' | 'zh-CN' | 'en';
  customQuery?: string;
  enableWebSearch?: boolean;
  historyMessages?: ChatMessage[];
  snapshot: PageSnapshot;
  providerConfig: ProviderConfig;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
}
