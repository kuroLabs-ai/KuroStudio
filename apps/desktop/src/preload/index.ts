import { Project, ExportSettings } from '@kuro/project-format';
import { AgentExecutionResult, AgentPlan } from '@kuro/ai-core';
import { MediaProbeResult, RenderProgress } from '@kuro/media-engine';
import { StorePackManifest } from '@kuro/store';

export interface KuroBridge {
  // Project operations
  newProject(name: string): Promise<Project>;
  openProject(filePath?: string): Promise<{ project: Project; filePath: string } | null>;
  saveProject(project: Project, filePath: string): Promise<{ success: boolean; filePath: string }>;

  // Media inspection
  probeMedia(filePath: string): Promise<MediaProbeResult>;

  // AI Agent operations
  planAITask(prompt: string): Promise<AgentPlan>;
  executeAITask(plan: AgentPlan): Promise<AgentExecutionResult>;

  // Export / Render pipeline
  startExport(project: Project, outputPath: string, settings?: ExportSettings): Promise<{ jobId: string }>;
  cancelExport(jobId: string): Promise<boolean>;
  onExportProgress(callback: (progress: RenderProgress) => void): () => void;

  // Store
  getStoreCatalog(): Promise<StorePackManifest[]>;
  installStorePack(packId: string): Promise<boolean>;

  // System
  getAppVersion(): string;
  isWindows10(): boolean;
}

// In Electron runtime, contextBridge binds this object to window.kuroBridge
declare global {
  interface Window {
    kuroBridge: KuroBridge;
  }
}
