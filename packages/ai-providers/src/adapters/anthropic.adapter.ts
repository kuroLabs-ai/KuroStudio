import { AIProviderError } from '@kuro/shared';
import {
  AIProviderAdapter,
  ModelInfo,
  ModelProviderType,
  ProviderCompletionRequest,
  ProviderCompletionResponse,
  ToolCall,
} from '@kuro/ai-core';

export interface AnthropicConfig {
  apiKey: string;
  baseUrl?: string;
}

export class AnthropicAdapter implements AIProviderAdapter {
  public readonly providerType: ModelProviderType = 'anthropic';
  private apiKey: string;
  private baseUrl: string;

  constructor(config: AnthropicConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.anthropic.com/v1';
  }

  public async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      // Test with minimal messages payload
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      if (res.ok || res.status === 200) {
        return { success: true, message: 'Anthropic Claude connected successfully.' };
      }
      return { success: false, message: `Status ${res.status}: ${res.statusText}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  public async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        isHealthy: true,
        consecutiveFailures: 0,
        capabilities: {
          supportsToolCalling: true,
          supportsStructuredOutput: true,
          supportsStreaming: true,
          supportsVision: true,
          maxContextTokens: 200000,
          isLocal: false,
        },
      },
      {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        isHealthy: true,
        consecutiveFailures: 0,
        capabilities: {
          supportsToolCalling: true,
          supportsStructuredOutput: true,
          supportsStreaming: true,
          supportsVision: true,
          maxContextTokens: 200000,
          isLocal: false,
        },
      },
    ];
  }

  public async complete(request: ProviderCompletionRequest): Promise<ProviderCompletionResponse> {
    const systemMessage = request.messages.find((m) => m.role === 'system')?.content;
    const conversationMessages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const tools = request.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }));

    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: 4096,
      messages: conversationMessages,
      temperature: request.temperature ?? 0.2,
    };

    if (systemMessage) {
      body['system'] = systemMessage;
    }
    if (tools && tools.length > 0) {
      body['tools'] = tools;
    }

    try {
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        const isRetryable = res.status === 429 || res.status >= 500;
        throw new AIProviderError('anthropic', `Anthropic API error [${res.status}]: ${errorText}`, isRetryable);
      }

      const data = await res.json();
      let textContent = '';
      const toolCalls: ToolCall[] = [];

      for (const block of data.content || []) {
        if (block.type === 'text') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: block.input || {},
          });
        }
      }

      return {
        message: {
          role: 'assistant',
          content: textContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        finishReason: data.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
        usage: data.usage
          ? {
              promptTokens: data.usage.input_tokens,
              completionTokens: data.usage.output_tokens,
              totalTokens: data.usage.input_tokens + data.usage.output_tokens,
            }
          : undefined,
      };
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError('anthropic', String(err), true);
    }
  }
}
