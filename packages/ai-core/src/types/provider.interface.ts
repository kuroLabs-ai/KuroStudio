export type ModelProviderType = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'openai-compatible';

export type TaskCategory = 'planning' | 'tool_calling' | 'remotion_code' | 'creative_text' | 'vision';

export interface ModelCapability {
  supportsToolCalling: boolean;
  supportsStructuredOutput: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  maxContextTokens?: number;
  isLocal: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ModelProviderType;
  capabilities: ModelCapability;
  isHealthy: boolean;
  lastFailureTime?: number;
  consecutiveFailures: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ProviderCompletionRequest {
  model: string;
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  temperature?: number;
  stream?: boolean;
}

export interface ProviderCompletionResponse {
  message: ChatMessage;
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProviderAdapter {
  readonly providerType: ModelProviderType;

  /**
   * Tests connection with configured credentials.
   */
  testConnection(): Promise<{ success: boolean; message?: string }>;

  /**
   * Lists available models from the provider.
   */
  listModels(): Promise<ModelInfo[]>;

  /**
   * Completes a chat prompt with optional tool definitions.
   */
  complete(request: ProviderCompletionRequest): Promise<ProviderCompletionResponse>;
}
