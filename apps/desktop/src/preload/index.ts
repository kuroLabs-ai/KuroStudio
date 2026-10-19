import { contextBridge } from 'electron';
import { createNewProject, Project, ExportSettings } from '@kuro/project-format';
import { AgentExecutionResult, AgentPlan } from '@kuro/ai-core';
import { MediaProbeResult, RenderProgress } from '@kuro/media-engine';
import { StorePackManifest, OFFICIAL_KURO_STORE_CATALOG } from '@kuro/store';

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

const bridgeImplementation: KuroBridge = {
  async newProject(name: string): Promise<Project> {
    return createNewProject(name);
  },
  async openProject() {
    return null;
  },
  async saveProject(project: Project, filePath: string) {
    return { success: true, filePath };
  },
  async probeMedia(filePath: string): Promise<MediaProbeResult> {
    return {
      filePath,
      formatName: 'mp4',
      durationSeconds: 10,
      durationTicks: 300000,
      fileSizeBytes: 1048576,
      allStreams: [],
    };
  },
  async planAITask(prompt: string): Promise<AgentPlan> {
    return {
      id: 'plan_' + Date.now(),
      userPrompt: prompt,
      summary: `Automated plan for: ${prompt}`,
      requiresUserApproval: false,
      operations: [],
    };
  },
  async executeAITask(plan: AgentPlan): Promise<AgentExecutionResult> {
    return {
      planId: plan.id,
      executedOperations: [],
      success: true,
      summary: 'Plan executed successfully',
    };
  },
  async startExport() {
    return { jobId: 'job_' + Date.now() };
  },
  async cancelExport() {
    return true;
  },
  onExportProgress() {
    return () => {};
  },
  async getStoreCatalog(): Promise<StorePackManifest[]> {
    return OFFICIAL_KURO_STORE_CATALOG;
  },
  async installStorePack() {
    return true;
  },
  getAppVersion() {
    return '0.1.0';
  },
  isWindows10() {
    return true;
  },
};

// Safe check if running inside Electron contextBridge
try {
  if (typeof contextBridge !== 'undefined') {
    contextBridge.exposeInMainWorld('kuroBridge', bridgeImplementation);
  }
} catch {
  // Fallback when executed outside Electron preload
}
