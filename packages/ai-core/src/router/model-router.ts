import { AIProviderError } from '@kuro/shared';
import {
  AIProviderAdapter,
  ModelCapability,
  ModelInfo,
  ModelProviderType,
  ProviderCompletionRequest,
  ProviderCompletionResponse,
  TaskCategory,
} from '../types/provider.interface';

export interface RouterConfig {
  taskChains: Record<TaskCategory, string[]>; // e.g., planning: ['claude-3-5-sonnet', 'gpt-4o', 'llama3']
  allowCrossPrivacyBoundary: boolean; // Cloud <-> Local fallback permitted
  circuitBreakerThreshold: number; // Max consecutive failures before cooldown
  circuitBreakerCooldownMs: number; // Cooldown duration (default 60s)
  maxRetriesPerModel: number; // Max transient retries
}

export class ModelRouter {
  private adapters = new Map<ModelProviderType, AIProviderAdapter>();
  private models = new Map<string, ModelInfo>();
  private config: RouterConfig;

  constructor(config: RouterConfig) {
    this.config = config;
  }

  public registerAdapter(adapter: AIProviderAdapter): void {
    this.adapters.set(adapter.providerType, adapter);
  }

  public registerModel(info: ModelInfo): void {
    this.models.set(info.id, info);
  }

  public getModel(id: string): ModelInfo | undefined {
    return this.models.get(id);
  }

  public async completeTaskWithFallback(
    category: TaskCategory,
    request: Omit<ProviderCompletionRequest, 'model'>,
    requiredCapability?: Partial<ModelCapability>
  ): Promise<{ response: ProviderCompletionResponse; modelUsed: string; fallbackOccurred: boolean }> {
    const chain = this.config.taskChains[category] ?? [];
    if (chain.length === 0) {
      throw new AIProviderError('router', `No model fallback chain configured for task category "${category}".`);
    }

    let fallbackOccurred = false;
    const errors: string[] = [];

    for (let i = 0; i < chain.length; i++) {
      const modelId = chain[i]!;
      const modelInfo = this.models.get(modelId);

      if (!modelInfo) {
        errors.push(`Model "${modelId}" is not registered in the capability registry.`);
        continue;
      }

      // Check Circuit Breaker
      if (!this.isModelAvailable(modelInfo)) {
        errors.push(`Model "${modelId}" is currently in cooldown due to recent failures.`);
        continue;
      }

      // Check Required Capabilities
      if (requiredCapability && !this.satisfiesCapabilities(modelInfo.capabilities, requiredCapability)) {
        errors.push(`Model "${modelId}" does not satisfy required capabilities.`);
        continue;
      }

      const adapter = this.adapters.get(modelInfo.provider);
      if (!adapter) {
        errors.push(`No adapter registered for provider "${modelInfo.provider}".`);
        continue;
      }

      // Attempt completion with bounded retries
      try {
        const response = await this.executeWithRetry(adapter, { ...request, model: modelId });
        // Reset failure counter on success
        modelInfo.consecutiveFailures = 0;
        modelInfo.isHealthy = true;

        return {
          response,
          modelUsed: modelId,
          fallbackOccurred: i > 0,
        };
      } catch (err) {
        fallbackOccurred = true;
        this.recordFailure(modelInfo);
        errors.push(`Model "${modelId}" failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    throw new AIProviderError(
      'router',
      `All models in fallback chain for "${category}" failed:\n${errors.join('\n')}`,
      false,
      { errors }
    );
  }

  private isModelAvailable(model: ModelInfo): boolean {
    if (model.consecutiveFailures < this.config.circuitBreakerThreshold) {
      return true;
    }
    const now = Date.now();
    if (model.lastFailureTime && now - model.lastFailureTime > this.config.circuitBreakerCooldownMs) {
      // Cooldown expired, permit retry
      model.consecutiveFailures = 0;
      return true;
    }
    return false;
  }

  private recordFailure(model: ModelInfo): void {
    model.consecutiveFailures += 1;
    model.lastFailureTime = Date.now();
    if (model.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      model.isHealthy = false;
    }
  }

  private satisfiesCapabilities(available: ModelCapability, required: Partial<ModelCapability>): boolean {
    for (const [key, reqVal] of Object.entries(required)) {
      if (reqVal === true && !(available as Record<string, unknown>)[key]) {
        return false;
      }
    }
    return true;
  }

  private async executeWithRetry(
    adapter: AIProviderAdapter,
    request: ProviderCompletionRequest
  ): Promise<ProviderCompletionResponse> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.config.maxRetriesPerModel; attempt++) {
      try {
        return await adapter.complete(request);
      } catch (err) {
        lastError = err;
        if (attempt < this.config.maxRetriesPerModel) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }
}
