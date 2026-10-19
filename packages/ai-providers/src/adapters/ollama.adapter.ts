import { AIProviderError } from '@kuro/shared';
import {
  AIProviderAdapter,
  ModelInfo,
  ModelProviderType,
  ProviderCompletionRequest,
  ProviderCompletionResponse,
  ToolCall,
} from '@kuro/ai-core';

export interface OllamaConfig {
  baseUrl?: string;
}

export class OllamaAdapter implements AIProviderAdapter {
  public readonly providerType: ModelProviderType = 'ollama';
  private baseUrl: string;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl ?? 'http://127.0.0.1:11434';
  }

  public async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (res.ok) {
        return { success: true, message: 'Ollama local server reachable.' };
      }
      return { success: false, message: `Ollama returned status ${res.status}.` };
    } catch (err) {
      return {
        success: false,
        message: `Ollama is not running at ${this.baseUrl}. Please ensure Ollama is installed and active.`,
      };
    }
  }

  public async listModels(): Promise<ModelInfo[]> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`);
      if (!res.ok) return [];

      const data = await res.json();
      const models = data.models || [];

      return models.map((m: any) => ({
        id: m.name,
        name: `${m.name} (Local)`,
        provider: 'ollama',
        isHealthy: true,
        consecutiveFailures: 0,
        capabilities: {
          supportsToolCalling: true,
          supportsStructuredOutput: true,
          supportsStreaming: false,
          supportsVision: false,
          maxContextTokens: 8192,
          isLocal: true,
        },
      }));
    } catch {
      return [];
    }
  }

  public async complete(request: ProviderCompletionRequest): Promise<ProviderCompletionResponse> {
    const formattedTools = request.tools?.map((t) => ({
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
      stream: false,
    };

    if (formattedTools && formattedTools.length > 0) {
      body['tools'] = formattedTools;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new AIProviderError('ollama', `Ollama error [${res.status}]: ${text}`, true);
      }

      const data = await res.json();
      const message = data.message;

      const toolCalls: ToolCall[] = (message?.tool_calls ?? []).map((tc: any, idx: number) => ({
        id: `ollama_call_${idx}`,
        name: tc.function?.name,
        arguments: tc.function?.arguments || {},
      }));

      return {
        message: {
          role: 'assistant',
          content: message?.content ?? '',
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop',
      };
    } catch (err) {
      if (err instanceof AIProviderError) throw err;
      throw new AIProviderError('ollama', `Ollama connection failed: ${String(err)}`, true);
    }
  }
}
