export interface PageMetadata {
  title: string;
  url: string;
  domain: string;
  lang?: string;
  description?: string;
  favicon?: string;
}

export interface PageSnapshot {
  metadata: PageMetadata;
  fullText: string;
  selectionText: string;
  headings: string[];
  candidateTarget: string; // e.g. 'article', 'main', '.markdown-body', 'body'
  characterCount: number;
  wordCount: number;
  extractedAt: number;
  isExtractedSuccessfully: boolean;
}
