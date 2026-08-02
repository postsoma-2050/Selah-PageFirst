import { PageSnapshot } from '../page-capture/types';

export interface ContextOptions {
  maxCharacters?: number;
  includeSelectionOnly?: boolean;
  includeHeadings?: boolean;
}

export interface ContextFrame {
  systemGroundingPrompt: string;
  pageSummarySnippet: string;
  truncatedText: string;
  wordCount: number;
  characterCount: number;
  isTruncated: boolean;
}
