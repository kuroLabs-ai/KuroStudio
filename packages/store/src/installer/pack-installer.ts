import { ValidationError } from '@kuro/shared';
import { InstalledPackRecord, StorePackManifest } from '../types/pack.interface';

export class StorePackInstaller {
  private installedPacks = new Map<string, InstalledPackRecord>();
  private managedStoreDirectory: string;

  constructor(managedStoreDirectory: string) {
    this.managedStoreDirectory = managedStoreDirectory;
  }

  public getInstalledPacks(): InstalledPackRecord[] {
    return Array.from(this.installedPacks.values());
  }

  public isPackInstalled(packId: string): boolean {
    return this.installedPacks.has(packId);
  }

  /**
   * Validates manifest security constraints before download/installation.
   */
  public validatePackSecurity(manifest: StorePackManifest): void {
    // 1. Author verification
    if (manifest.author !== 'KuroLabs' && manifest.author !== 'Official Partner') {
      throw new ValidationError(`Untrusted pack author: "${manifest.author}". Beta accepts official content only.`, {
        packId: manifest.id,
      });
    }

    // 2. Path traversal protection on declared files
    for (const filePath of manifest.declaredFiles) {
      if (filePath.includes('..') || filePath.startsWith('/') || filePath.startsWith('\\') || filePath.includes(':')) {
        throw new ValidationError(`Illegal path detected in pack declared files: "${filePath}".`, {
          packId: manifest.id,
          filePath,
        });
      }

      // 3. Prohibit arbitrary executable extensions in beta Store packs
      const lower = filePath.toLowerCase();
      if (lower.endsWith('.exe') || lower.endsWith('.bat') || lower.endsWith('.cmd') || lower.endsWith('.sh') || lower.endsWith('.ps1')) {
        throw new ValidationError(`Executable files are prohibited in Store asset packs: "${filePath}".`, {
          packId: manifest.id,
        });
      }
    }
  }

  public recordInstallation(manifest: StorePackManifest): InstalledPackRecord {
    this.validatePackSecurity(manifest);

    const record: InstalledPackRecord = {
      id: manifest.id,
      version: manifest.version,
      installedAt: new Date().toISOString(),
      installPath: `${this.managedStoreDirectory}/${manifest.id}`,
    };

    this.installedPacks.set(manifest.id, record);
    return record;
  }

  public uninstallPack(packId: string): boolean {
    return this.installedPacks.delete(packId);
  }
}
