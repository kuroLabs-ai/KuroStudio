import { DEFAULT_TICKS_PER_SECOND, TimelineTicks } from '@kuro/shared';

type Listener = () => void;

class TimelineStore {
  private playheadTicks: TimelineTicks = 0;
  private isPlaying = false;
  private zoom = 1.0; // 0.1 to 5.0
  private isSnappingEnabled = true;
  private selectedClipIds: string[] = [];
  private selectedTrackId: string | null = null;
  private listeners = new Set<Listener>();

  public getPlayheadTicks(): TimelineTicks {
    return this.playheadTicks;
  }

  public setPlayheadTicks(ticks: TimelineTicks): void {
    this.playheadTicks = Math.max(0, ticks);
    this.notify();
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public setIsPlaying(playing: boolean): void {
    this.isPlaying = playing;
    this.notify();
  }

  public togglePlayback(): void {
    this.isPlaying = !this.isPlaying;
    this.notify();
  }

  public getZoom(): number {
    return this.zoom;
  }

  public setZoom(zoom: number): void {
    this.zoom = Math.max(0.2, Math.min(5.0, zoom));
    this.notify();
  }

  public getIsSnappingEnabled(): boolean {
    return this.isSnappingEnabled;
  }

  public toggleSnapping(): void {
    this.isSnappingEnabled = !this.isSnappingEnabled;
    this.notify();
  }

  public getSelectedClipIds(): string[] {
    return [...this.selectedClipIds];
  }

  public setSelectedClipIds(ids: string[]): void {
    this.selectedClipIds = [...ids];
    this.notify();
  }

  public selectClip(clipId: string, multiSelect = false): void {
    if (multiSelect) {
      if (this.selectedClipIds.includes(clipId)) {
        this.selectedClipIds = this.selectedClipIds.filter((id) => id !== clipId);
      } else {
        this.selectedClipIds.push(clipId);
      }
    } else {
      this.selectedClipIds = [clipId];
    }
    this.notify();
  }

  public clearSelection(): void {
    this.selectedClipIds = [];
    this.selectedTrackId = null;
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const timelineStore = new TimelineStore();
