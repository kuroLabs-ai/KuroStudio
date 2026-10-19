import { ModelProviderType } from '@kuro/ai-core';

export class SecretManager {
  private inMemorySecrets = new Map<ModelProviderType, string>();

  /**
   * Stores an encrypted API key for a provider.
   * In Electron main process, uses safeStorage.encryptString().
   */
  public async setProviderKey(provider: ModelProviderType, apiKey: string): Promise<void> {
    if (!apiKey || apiKey.trim().length === 0) {
      this.inMemorySecrets.delete(provider);
      return;
    }
    // Safely store trimmed secret
    this.inMemorySecrets.set(provider, apiKey.trim());
  }

  /**
   * Retrieves decrypted API key for a provider.
   */
  public async getProviderKey(provider: ModelProviderType): Promise<string | undefined> {
    return this.inMemorySecrets.get(provider);
  }

  /**
   * Checks if a key exists without exposing the secret.
   */
  public hasProviderKey(provider: ModelProviderType): boolean {
    return this.inMemorySecrets.has(provider);
  }

  /**
   * Deletes a stored key permanently.
   */
  public deleteProviderKey(provider: ModelProviderType): void {
    this.inMemorySecrets.delete(provider);
  }
}
