import { PageSnapshot } from '../modules/page-capture/types';
import { ProviderConfig } from '../modules/provider-adapter/types';

export type ExtensionMessageType =
  | 'GET_ACTIVE_PAGE_CONTEXT'
  | 'OPEN_OPTIONS_PAGE';

export interface ExtensionMessage<T = any> {
  type: ExtensionMessageType;
  payload?: T;
}

export interface ExtensionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export function sendRuntimeMessage<T = any>(message: ExtensionMessage): Promise<ExtensionResponse<T>> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      resolve({ success: false, error: 'Extension runtime unavailable' });
      return;
    }
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: true });
      }
    });
  });
}
