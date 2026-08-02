import { PageSnapshot } from '../page-capture/types';
import { ContextOptions, ContextFrame } from './types';

const DEFAULT_MAX_CHARS = 12000; // Safe default for context window

export function buildContextFrame(snapshot: PageSnapshot, options: ContextOptions = {}): ContextFrame {
  const maxChars = options.maxCharacters || DEFAULT_MAX_CHARS;
  let sourceText = snapshot.fullText;
  
  if (options.includeSelectionOnly && snapshot.selectionText) {
    sourceText = snapshot.selectionText;
  }

  const isTruncated = sourceText.length > maxChars;
  const truncatedText = sourceText.slice(0, maxChars);

  const headingsText = (options.includeHeadings !== false && snapshot.headings.length > 0)
    ? `\nKey Headings:\n${snapshot.headings.map(h => `- ${h}`).join('\n')}`
    : '';

  const systemGroundingPrompt = `You are PageFirst AI, a privacy-first web assistant.
You are directly analyzing the active web page that the user is currently viewing.

=== ACTIVE PAGE CONTEXT ===
Title: ${snapshot.metadata.title}
URL: ${snapshot.metadata.url}
Domain: ${snapshot.metadata.domain}${headingsText}

${snapshot.selectionText ? `Highlighted User Selection:\n"""\n${snapshot.selectionText}\n"""\n` : ''}
Extracted Document Content (Grounding Source):
"""
${truncatedText}${isTruncated ? '\n...[Content truncated for length]' : ''}
"""
=== END ACTIVE PAGE CONTEXT ===

Instructions:
1. Ground your answers primarily in the provided Active Page Context.
2. If the user asks a question about this page, reference facts from the page text.
3. Be concise, direct, and clear.`;

  const pageSummarySnippet = `${snapshot.metadata.title} (${snapshot.wordCount} words)`;

  return {
    systemGroundingPrompt,
    pageSummarySnippet,
    truncatedText,
    wordCount: snapshot.wordCount,
    characterCount: truncatedText.length,
    isTruncated
  };
}
