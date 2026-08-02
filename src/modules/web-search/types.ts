export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  query: string;
  results: SearchResultItem[];
  retrievedAt: number;
}
