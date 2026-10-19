import { AIProviderError } from '@kuro/shared';
import {
  AIProviderAdapter,
  ModelInfo,
  ModelProviderType,
  ProviderCompletionRequest,
  ProviderCompletionResponse,
  ToolCall,
  ToolDefinition,
} from '@kuro/ai-core';

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
}

export class OpenAIAdapter implements AIProviderAdapter {
  public readonly providerType: ModelProviderType;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: OpenAIConfig, providerType: ModelProviderType = 'openai') {
    this.providerType = providerType;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
  }

  public async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (res.ok) {
        return { success: true, message: 'Connected successfully.' };
      }
      return { success: false, message: `Status ${res.status}: ${res.statusText}` };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : String(err) };
    }
  }

  public async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o (Omni)',
        provider: this.providerType,
        isHealthy: true,
        consecutiveFailures: 0,
        capabilities: {
          supportsToolCalling: true,
          supportsStructuredOutput: true,
          supportsStreaming: true,
          supportsVision: true,
          maxContextTokens: 128000,
          isLocal: false,
        },
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: this.providerType,
        isHealthy: true,
        consecutiveFailures: 0,
        capabilities: {
          supportsToolCalling: true,
          supportsStructuredOutput: true,
          supportsStreaming: true,
          supportsVision: true,
          maxContextTokens: 128000,
          isLocal: false,
        },
      },
    ];
  }

  public async complete(request: ProviderCompletionRequest): Promise<ProviderCompletionResponse> {
    const formattedTools = request.tools?.map((t: ToolDefinition) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.2,
    };

    if (formattedTools && formattedTools.length > 0) {
      body['tools'] = formattedTools;
    }

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        const isRetryable = res.status === 429 || res.status >= 500;
        throw new AIProviderError(
          this.providerType,
          `OpenAI API error [${res.status}]: ${errorText}`,
          isRetryable,
          { status: res.status }
        );
      }

      const data = await res.json();
      const choice = data.choices?.[0];
      const message = choice?.message;

      const parsedToolCalls: ToolCall[] = (message?.tool_calls ?? []).map((tc: any) => ({
        id: tc.id,
        name: tc.function?.name,
        arguments: JSON.parse(tc.function?.arguments || '{}'),
      }));

      return {
        message: {
          role: 'assistant',
          content: message?.content ?? '',
          toolCalls: parsedToolCalls.length > 0 ? parsedToolCalls : undefined,
        },
        finishReason: choice?.finish_reason === 'tool_calls' ? 'tool_calls' : 'stop',
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError(this.providerType, String(err), true);
    }
  }
}
