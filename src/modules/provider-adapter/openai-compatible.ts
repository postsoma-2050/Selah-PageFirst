import { IProviderAdapter, ProviderConfig, GenerationOptions, ProviderType } from './types';

function sanitizeSecretError(errMsg: string, apiKey?: string): string {
  if (!errMsg) return '';
  let cleaned = errMsg.replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer ••••••••');
  if (apiKey && apiKey.length > 4) {
    cleaned = cleaned.replaceAll(apiKey, '••••••••');
  }
  return cleaned;
}

export class OpenAICompatibleAdapter implements IProviderAdapter {
  readonly type: ProviderType = 'openai-compatible';
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.baseUrl = (config.baseUrl || 'https://api.openai.com/v1').trim().replace(/\/$/, '');
    this.apiKey = (config.apiKey || '').trim();
    this.model = (config.model || 'gpt-4o-mini').trim();
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.baseUrl && (this.apiKey || this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1')));
  }

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}
      });
      if (!res.ok) return [this.model];
      const data = await res.json();
      return (data.data || []).map((m: any) => m.id);
    } catch {
      return [this.model];
    }
  }

  async generateStream(options: GenerationOptions): Promise<string> {
    if (!this.baseUrl) {
      throw new Error('[未配置 Provider Endpoint] 请在设置中填写 OpenAI 兼容 Endpoint 地址。');
    }
    if (!this.apiKey && !this.baseUrl.includes('localhost') && !this.baseUrl.includes('127.0.0.1')) {
      throw new Error('[未配置 API Key] 该 Provider 需要 API Key，请在 Settings 中输入后再试。');
    }

    const sanitizedMessages = options.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const requestUrl = `${this.baseUrl}/chat/completions`;
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
    };
    const requestBody = {
      model: this.model,
      messages: sanitizedMessages,
      temperature: options.temperature ?? 0.7,
      stream: true
    };

    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method: 'POST',
        headers: requestHeaders,
        signal: options.signal,
        body: JSON.stringify(requestBody)
      });
    } catch (err: any) {
      const sanitizedMsg = sanitizeSecretError(err?.message || '网络错误 / CORS / Endpoint 不可用', this.apiKey);
      throw new Error(
        `[网络无法连接] 无法连接至 API Endpoint (${this.baseUrl})\n` +
        `原因: ${sanitizedMsg}\n` +
        `建议: 请检查网络状况或 Endpoint 地址是否拼写正确。`
      );
    }

    if (!response.ok) {
      let errDetail = '';
      try {
        errDetail = await response.text();
      } catch {
        errDetail = response.statusText;
      }
      errDetail = sanitizeSecretError(errDetail, this.apiKey);

      if (response.status === 401 || response.status === 403) {
        throw new Error(`[鉴权失败 (${response.status})] API Key 无效或权限不足。\n服务端返回: ${errDetail}`);
      }
      if (response.status === 404) {
        throw new Error(`[接口 404] 无法找到 API 地址 (${this.baseUrl}/chat/completions) 或模型 (${this.model}) 不存在。`);
      }
      throw new Error(`[API 响应错误 (${response.status})] ${errDetail || response.statusText}`);
    }

    if (!response.body) {
      throw new Error('[API 异常] 响应 Body 为空，未返回有效数据流。');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let rawBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkText = decoder.decode(value, { stream: true });
      rawBuffer += chunkText;

      const lines = rawBuffer.split('\n');
      rawBuffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content =
              json.choices?.[0]?.delta?.content ||
              json.choices?.[0]?.delta?.reasoning_content ||
              json.choices?.[0]?.message?.content ||
              json.choices?.[0]?.text ||
              '';
            if (content) {
              fullText += content;
              if (options.onChunk) options.onChunk(content);
            }
          } catch {
            // ignore partial SSE json line
          }
        }
      }
    }

    // Fallback: If streaming didn't output chunks (non-standard stream response)
    if (!fullText.trim() && rawBuffer.trim()) {
      try {
        const json = JSON.parse(rawBuffer.trim());
        const content =
          json.choices?.[0]?.message?.content ||
          json.choices?.[0]?.delta?.content ||
          json.choices?.[0]?.text ||
          '';
        if (content) {
          fullText = content;
          if (options.onChunk) options.onChunk(content);
        }
      } catch {
        // ignore
      }
    }

    if (!fullText.trim()) {
      throw new Error(
        `[模型无有效回复] API 成功响应但未包含有效文本内容 (模型: ${this.model})。\n` +
        `请检查在 Settings ⚙️ 中配置的模型名称是否支持文本生成。`
      );
    }

    return fullText;
  }
}
