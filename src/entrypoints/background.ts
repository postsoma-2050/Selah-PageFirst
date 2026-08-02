import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
  console.log('[PageFirst Background SW] Initializing background service worker...');

  // 1. Enable Native SidePanel API on Action Click (Desktop Chrome)
  if (typeof chrome !== 'undefined' && chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('Could not set openPanelOnActionClick:', err);
    });
  }

  // 2. Create Context Menu Item for Mobile/Desktop fallback
  if (typeof chrome !== 'undefined' && chrome.contextMenus?.create) {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.contextMenus.create({
        id: 'open_pagefirst_sidepanel',
        title: '📖 Open Selah PageFirst Assistant',
        contexts: ['all']
      });
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'open_pagefirst_sidepanel') {
        openAssistantUI(tab);
      }
    });
  }

  // 3. Helper Function for Mobile / iPad / Unsupported SidePanel Browsers
  async function openAssistantUI(tab?: chrome.tabs.Tab) {
    if (typeof chrome === 'undefined') return;

    // Try SidePanel API first (Desktop Chrome)
    if (chrome.sidePanel?.open && tab?.id) {
      try {
        await chrome.sidePanel.open({ tabId: tab.id });
        return;
      } catch (e) {
        console.warn('SidePanel open failed, opening full-tab assistant:', e);
      }
    }

    // Fallback Tab (for iPad / Tablet / Mobile Kiwi / Orion / Lemur)
    if (chrome.tabs?.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('sidepanel.html') });
    }
  }

  // 4. Action Clicked Listener (Mobile / Tablet Fallback)
  if (typeof chrome !== 'undefined' && chrome.action?.onClicked) {
    chrome.action.onClicked.addListener((tab) => {
      openAssistantUI(tab);
    });
  }

  // 5. Message Listener
  if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'OPEN_OPTIONS_PAGE') {
        chrome.runtime.openOptionsPage();
        sendResponse({ success: true });
        return true;
      }
      return true;
    });
  }
});
