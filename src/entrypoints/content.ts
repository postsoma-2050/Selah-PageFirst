import { defineContentScript } from 'wxt/sandbox';
import { extractPageContentFromDOM } from '../modules/page-capture';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    console.log('[PageFirst Content Script] Injected and ready for page capture.');

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'GET_ACTIVE_PAGE_CONTEXT') {
        const snapshot = extractPageContentFromDOM(document);
        sendResponse({ success: true, data: snapshot });
        return false;
      }
    });
  }
});
