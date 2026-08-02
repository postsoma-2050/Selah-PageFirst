import { IProviderAdapter, ProviderConfig, GenerationOptions, ProviderType } from './types';

export class OllamaAdapter implements IProviderAdapter {
  readonly type: ProviderType = 'ollama';
  private baseUrl: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.baseUrl = (config.baseUrl || 'http://localhost:11434').trim().replace(/\/$/, '');
    this.model = (config.model || 'llama3.2').trim();
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map((m: any) => m.name);
    } catch {
      return [];
    }
  }

  async generateStream(options: GenerationOptions): Promise<string> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: options.signal,
        body: JSON.stringify({
          model: this.model,
          messages: options.messages,
          stream: true,
          options: {
            temperature: options.temperature ?? 0.7,
          }
        })
      });
    } catch (err: any) {
      throw new Error(
        `[无法连接 Ollama] 本地 Ollama 服务未启动或地址不可达 (${this.baseUrl})\n` +
        `建议: 1. 检查 'ollama serve' 是否正在运行\n` +
        `2. 确保在 Chrome 插件中被允许访问 http://localhost:11434`
      );
    }

    if (!response.ok) {
      let errDetail = '';
      try {
        errDetail = await response.text();
      } catch {
        errDetail = response.statusText;
      }
      throw new Error(`[Ollama API 错误 ${response.status}] ${errDetail || response.statusText}\n请检查模型 '${this.model}' 是否已安装 (ollama pull ${this.model})`);
    }

    if (!response.body) {
      throw new Error('[Ollama API 异常] 响应 Body 为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value, { stream: true });
      const lines = chunkStr.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          const content = json.message?.content || '';
          if (content) {
            fullText += content;
            if (options.onChunk) options.onChunk(content);
          }
        } catch {
          // ignore
        }
      }
    }

    return fullText;
  }
}
