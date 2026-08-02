import { ProviderConfig, IProviderAdapter } from './types';
import { OllamaAdapter } from './ollama';
import { ChromeAIAdapter } from './chrome-ai';
import { OpenAICompatibleAdapter } from './openai-compatible';

export * from './types';
export * from './ollama';
export * from './chrome-ai';
export * from './openai-compatible';

export const PROVIDER_STORAGE_KEY = 'pagefirst_provider_config';

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  type: 'openai-compatible',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini'
};

export async function loadSavedProviderConfig(): Promise<ProviderConfig> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const data = await chrome.storage.local.get(PROVIDER_STORAGE_KEY);
    if (data && data[PROVIDER_STORAGE_KEY]) {
      return data[PROVIDER_STORAGE_KEY];
    }
  }
  return DEFAULT_PROVIDER_CONFIG;
}

export async function saveProviderConfig(config: ProviderConfig): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [PROVIDER_STORAGE_KEY]: config });
  }
}

export function createProviderAdapter(config: ProviderConfig): IProviderAdapter {
  if (!config) {
    throw new Error('未配置 AI Provider，请先在设置中填写 Provider 参数与 API Key');
  }
  switch (config.type) {
    case 'ollama':
      return new OllamaAdapter(config);
    case 'chrome-ai':
      return new ChromeAIAdapter(config);
    case 'openai-compatible':
      return new OpenAICompatibleAdapter(config);
    default:
      throw new Error(`不支持的 Provider 类型: ${(config as any)?.type}`);
  }
}
