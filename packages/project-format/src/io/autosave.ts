import { Project } from '../types/project';
import { serializeProject } from './serializer';

export interface AutosaveEntry {
  timestamp: string;
  filePath: string;
}

export class AutosaveEngine {
  private autosaveIntervalMs: number;
  private maxAutosaves: number;
  private timer: NodeJS.Timeout | null = null;
  private history: AutosaveEntry[] = [];

  constructor(autosaveIntervalMs = 60000, maxAutosaves = 5) {
    this.autosaveIntervalMs = autosaveIntervalMs;
    this.maxAutosaves = maxAutosaves;
  }

  public generateAutosaveFilename(project: Project): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `autosave_${project.id}_${timestamp}.kuro`;
  }

  public prepareAutosavePayload(project: Project): string {
    return serializeProject(project);
  }

  public recordAutosave(filePath: string): void {
    this.history.push({
      timestamp: new Date().toISOString(),
      filePath,
    });
    if (this.history.length > this.maxAutosaves) {
      this.history.shift();
    }
  }

  public getAutosaves(): AutosaveEntry[] {
    return [...this.history];
  }
}

/**
 * Detects assets in the project whose referenced file cannot be located.
 */
export function detectMissingAssets(
  project: Project,
  fileExistsFn: (path: string) => boolean
): { assetId: string; name: string; missingPath: string }[] {
  const missing: { assetId: string; name: string; missingPath: string }[] = [];
  for (const asset of project.assets) {
    if (!fileExistsFn(asset.filePath)) {
      missing.push({
        assetId: asset.id,
        name: asset.name,
        missingPath: asset.filePath,
      });
    }
  }
  return missing;
}

/**
 * Relinks a missing asset to a new valid location without breaking timeline clips.
 */
export function relinkProjectAsset(project: Project, assetId: string, newFilePath: string): Project {
  const updatedAssets = project.assets.map((asset) => {
    if (asset.id !== assetId) return asset;
    return {
      ...asset,
      filePath: newFilePath,
    };
  });

  return {
    ...project,
    assets: updatedAssets,
    updatedAt: new Date().toISOString(),
  };
}
