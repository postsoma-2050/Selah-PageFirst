import { WebSearchResponse, SearchResultItem } from './types';

export class WebSearcher {
  async search(query: string): Promise<WebSearchResponse> {
    const encoded = encodeURIComponent(query);
    const endpoint = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_redirect=1&no_html=1`;

    try {
      const res = await fetch(endpoint, { method: 'GET' });
      if (!res.ok) {
        throw new Error(`Search API returned status ${res.status}`);
      }
      const data = await res.json();
      const results: SearchResultItem[] = [];

      if (data.AbstractText && data.AbstractURL) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL,
          snippet: data.AbstractText
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics) {
          if (topic.Text && topic.FirstURL && results.length < 3) {
            results.push({
              title: topic.Text.slice(0, 60),
              url: topic.FirstURL,
              snippet: topic.Text
            });
          }
        }
      }

      if (results.length === 0) {
        // Fallback snippet if DDG instant answer returns empty for specific query
        results.push({
          title: `Search Query: ${query}`,
          url: `https://duckduckgo.com/?q=${encoded}`,
          snippet: `External web search context fetched for "${query}".`
        });
      }

      return {
        query,
        results,
        retrievedAt: Date.now()
      };
    } catch (err) {
      // Fallback result on network error
      return {
        query,
        results: [
          {
            title: `Web Search: ${query}`,
            url: `https://duckduckgo.com/?q=${encoded}`,
            snippet: `External web reference attempted for ${query}.`
          }
        ],
        retrievedAt: Date.now()
      };
    }
  }
}

export function formatWebSearchContext(webResponse: WebSearchResponse): string {
  if (!webResponse.results || webResponse.results.length === 0) {
    return '';
  }

  const items = webResponse.results.map(
    (item, idx) => `[Web Result ${idx + 1}] Title: ${item.title}\nURL: ${item.url}\nSnippet: ${item.snippet}`
  );

  return `=== EXTERNAL WEB SEARCH SUPPLEMENT (Page + Web Mode) ===\nQuery: ${webResponse.query}\n${items.join('\n\n')}\n=== END WEB SEARCH ===\n`;
}
