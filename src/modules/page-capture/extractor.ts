import { PageSnapshot, PageMetadata } from './types';

/**
 * Robustly extracts clean textual content, headings, and metadata from the document object.
 */
export function extractPageContentFromDOM(doc: Document = document): PageSnapshot {
  const title = doc.title || 'Untitled Page';
  const url = doc.location?.href || '';
  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = '';
  }

  const metaDesc = (doc.querySelector('meta[name="description"]') as HTMLMetaElement)?.content || '';
  const selectionText = window.getSelection()?.toString().trim() || '';

  // Extract page headings (H1 - H3)
  const headingElements = Array.from(doc.querySelectorAll('h1, h2, h3'));
  const headings = headingElements
    .map(h => (h.textContent || '').trim())
    .filter(h => h.length > 0 && h.length < 150)
    .slice(0, 15);

  // Candidate elements in priority order
  const candidateSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.markdown-body', // GitHub READMEs & docs
    '.entry-content',
    '.post-content',
    '.article-content',
    '#content',
    '.content',
    'body'
  ];

  let candidateTarget = 'body';
  let targetElement: Element | null = null;

  for (const selector of candidateSelectors) {
    const found = doc.querySelector(selector);
    if (found && (found.textContent || '').trim().length > 100) {
      candidateTarget = selector;
      targetElement = found;
      break;
    }
  }

  if (!targetElement) {
    targetElement = doc.body;
  }

  // Clone element to safely remove non-content nodes
  const container = targetElement ? targetElement.cloneNode(true) as Element : doc.body.cloneNode(true) as Element;
  
  // Remove non-textual or noisy elements
  const noiseSelectors = 'script, style, noscript, svg, iframe, nav, footer, header, form, button, input, select, textarea, [aria-hidden="true"], .nav, .footer, .sidebar, .comments';
  container.querySelectorAll(noiseSelectors).forEach(el => el.remove());

  // Extract text from block-level paragraphs & headings to preserve readable formatting
  const blockElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, pre, blockquote, td');
  let extractedLines: string[] = [];

  if (blockElements.length > 0) {
    blockElements.forEach(el => {
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (text.length > 0) {
        extractedLines.push(text);
      }
    });
  }

  let fullText = '';
  if (extractedLines.length > 0) {
    fullText = extractedLines.join('\n\n');
  }

  // Robust fallback: if block element extraction returned less than 30 characters,
  // extract visible text directly from document body using innerText / textContent
  if (!fullText || fullText.trim().length < 30) {
    const rawBodyText = (doc.body?.innerText || container.textContent || '').replace(/\s+/g, ' ').trim();
    if (rawBodyText.length > fullText.length) {
      fullText = rawBodyText;
    }
  }

  // Final trim and character count
  fullText = fullText.trim();
  const characterCount = fullText.length;
  const wordCount = fullText ? fullText.split(/\s+/).filter(Boolean).length : 0;
  const isExtractedSuccessfully = characterCount >= 30;

  const metadata: PageMetadata = {
    title,
    url,
    domain,
    description: metaDesc,
    favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  };

  return {
    metadata,
    fullText,
    selectionText,
    headings,
    candidateTarget,
    characterCount,
    wordCount,
    extractedAt: Date.now(),
    isExtractedSuccessfully
  };
}
