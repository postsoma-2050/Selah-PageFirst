import { IProviderAdapter, ProviderConfig, GenerationOptions, ProviderType } from './types';

declare global {
  interface Window {
    ai?: {
      languageModel?: {
        capabilities(): Promise<{ available: 'readily' | 'after-download' | 'no' }>;
        create(options?: any): Promise<any>;
      }
    }
  }
}

export class ChromeAIAdapter implements IProviderAdapter {
  readonly type: ProviderType = 'chrome-ai';

  constructor(_config?: ProviderConfig) {}

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.ai?.languageModel) {
      return false;
    }
    try {
      const caps = await window.ai.languageModel.capabilities();
      return caps.available !== 'no';
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    return ['chrome-ai (Gemini Nano)'];
  }

  async generateStream(options: GenerationOptions): Promise<string> {
    if (!window.ai?.languageModel) {
      throw new Error('Chrome AI (built-in Gemini Nano) is not supported in this environment.');
    }

    const session = await window.ai.languageModel.create({
      systemPrompt: options.messages.find(m => m.role === 'system')?.content || ''
    });

    const userPrompt = options.messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    let fullText = '';
    if (typeof session.promptStreaming === 'function') {
      const stream = session.promptStreaming(userPrompt);
      let previousLength = 0;
      for await (const chunk of stream) {
        const newDelta = chunk.slice(previousLength);
        previousLength = chunk.length;
        fullText += newDelta;
        if (options.onChunk) options.onChunk(newDelta);
      }
    } else {
      fullText = await session.prompt(userPrompt);
      if (options.onChunk) options.onChunk(fullText);
    }

    session.destroy?.();
    return fullText;
  }
}
