import { AIProviderError } from '@kuro/shared';
import {
  AIProviderAdapter,
  ChatMessage,
  ModelInfo,
  ModelProviderType,
  ProviderCompletionRequest,
  ProviderCompletionResponse,
  ToolCall,
} from '@kuro/ai-core';

export interface GeminiConfig {
  apiKey: string;
  baseUrl?: string;
}

export class GeminiAdapter implements AIProviderAdapter {
  public readonly providerType: ModelProviderType = 'gemini';
  private apiKey: string;
  private baseUrl: string;

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta';
  }

  public async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);
      if (res.ok) {
        return { success: true, message: 'Google Gemini connected successfully.' };
      }
      return { success: false, message: `Status ${res.status}: ${res.statusText}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  public async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'gemini',
        isHealthy: true,
        consecutiveFailures: 0,
        capabilities: {
          supportsToolCalling: true,
          supportsStructuredOutput: true,
          supportsStreaming: true,
          supportsVision: true,
          maxContextTokens: 2000000,
          isLocal: false,
        },
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'gemini',
        isHealthy: true,
        consecutiveFailures: 0,
        capabilities: {
          supportsToolCalling: true,
          supportsStructuredOutput: true,
          supportsStreaming: true,
          supportsVision: true,
          maxContextTokens: 1000000,
          isLocal: false,
        },
      },
    ];
  }

  public async complete(request: ProviderCompletionRequest): Promise<ProviderCompletionResponse> {
    const contents = request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const functionDeclarations = request.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.2,
      },
    };

    if (functionDeclarations && functionDeclarations.length > 0) {
      body['tools'] = [{ functionDeclarations }];
    }

    try {
      const url = `${this.baseUrl}/models/${request.model}:generateContent?key=${this.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        const isRetryable = res.status === 429 || res.status >= 500;
        throw new AIProviderError('gemini', `Gemini API error [${res.status}]: ${errorText}`, isRetryable);
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];

      let textContent = '';
      const toolCalls: ToolCall[] = [];

      for (const part of parts) {
        if (part.text) {
          textContent += part.text;
        }
        if (part.functionCall) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: part.functionCall.name,
            arguments: part.functionCall.args || {},
          });
        }
      }

      return {
        message: {
          role: 'assistant',
          content: textContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
        usage: data.usageMetadata
          ? {
              promptTokens: data.usageMetadata.promptTokenCount ?? 0,
              completionTokens: data.usageMetadata.candidatesTokenCount ?? 0,
              totalTokens: data.usageMetadata.totalTokenCount ?? 0,
            }
          : undefined,
      };
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError('gemini', String(err), true);
    }
  }
}
