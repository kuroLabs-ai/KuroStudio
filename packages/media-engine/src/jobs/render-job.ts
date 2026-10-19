import { generateId } from '@kuro/shared';
import { ExportSettings } from '@kuro/project-format';

export type RenderJobState =
  | 'queued'
  | 'preparing'
  | 'rendering'
  | 'verifying'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'needs-user-action';

export interface RenderProgress {
  percent: number; // 0 - 100
  renderedFrames: number;
  totalFrames: number;
  currentFps: number;
  estimatedRemainingSeconds?: number;
}

export type JobStatusListener = (job: RenderJob) => void;

export class RenderJob {
  public readonly id: string;
  public readonly projectId: string;
  public readonly outputPath: string;
  public readonly settings: ExportSettings;

  public state: RenderJobState = 'queued';
  public progress: RenderProgress = {
    percent: 0,
    renderedFrames: 0,
    totalFrames: 0,
    currentFps: 0,
  };
  public error?: string;
  public startedAt?: string;
  public finishedAt?: string;

  private isCancelled = false;
  private listeners = new Set<JobStatusListener>();

  constructor(projectId: string, outputPath: string, settings: ExportSettings, totalFrames: number) {
    this.id = generateId('render_job');
    this.projectId = projectId;
    this.outputPath = outputPath;
    this.settings = settings;
    this.progress.totalFrames = totalFrames;
  }

  public subscribe(listener: JobStatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public updateState(newState: RenderJobState, error?: string): void {
    this.state = newState;
    if (error) this.error = error;
    if (newState === 'rendering' && !this.startedAt) {
      this.startedAt = new Date().toISOString();
    }
    if (newState === 'succeeded' || newState === 'failed' || newState === 'cancelled') {
      this.finishedAt = new Date().toISOString();
    }
    this.notify();
  }

  public updateProgress(progressUpdate: Partial<RenderProgress>): void {
    this.progress = { ...this.progress, ...progressUpdate };
    if (this.progress.totalFrames > 0) {
      this.progress.percent = Math.min(
        100,
        Math.max(0, Math.round((this.progress.renderedFrames / this.progress.totalFrames) * 100))
      );
    }
    this.notify();
  }

  public requestCancellation(): void {
    if (this.state === 'succeeded' || this.state === 'failed') return;
    this.isCancelled = true;
    this.updateState('cancelled');
  }

  public checkCancelled(): boolean {
    return this.isCancelled;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this);
    }
  }
}
