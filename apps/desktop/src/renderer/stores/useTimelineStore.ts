import { DEFAULT_TICKS_PER_SECOND, TimelineTicks } from '@kuro/shared';

type Listener = () => void;

export type TimelineTool = 'select' | 'razor';

class TimelineStore {
  private playheadTicks: TimelineTicks = 0;
  private isPlaying = false;
  private zoom = 1.0; // 0.1 to 5.0
  private isSnappingEnabled = true;
  private selectedClipIds: string[] = [];
  private selectedTrackId: string | null = null;
  private activeTool: TimelineTool = 'select';
  private defaultTrackHeight = 72; // Default height in px for tracks (extended Y)
  private trackHeights: Record<string, number> = {};
  private listeners = new Set<Listener>();

  // rAF-based global playback clock (advances playhead every frame when playing)
  private _rafId: number | null = null;
  private _lastRafTime: number | null = null;
  private _timebase: number = DEFAULT_TICKS_PER_SECOND;
  private _durationTicks: number = 0; // total timeline duration – 0 means unlimited

  /** Call this once from the app to wire up the global clock with the current project timebase */
  public initClock(timebase: number, durationTicks = 0): void {
    this._timebase = timebase;
    this._durationTicks = durationTicks;
  }

  /** Update the total duration so the clock can auto-stop at the right point */
  public setDurationTicks(durationTicks: number): void {
    this._durationTicks = Math.max(0, durationTicks);
  }

  /** Must be called whenever isPlaying changes so the rAF loop starts/stops */
  private _syncRaf(): void {
    if (this.isPlaying) {
      if (this._rafId === null) {
        this._lastRafTime = null;
        const tick = (now: number) => {
          if (!this.isPlaying) {
            this._rafId = null;
            return;
          }
          if (this._lastRafTime !== null) {
            const deltaMs = now - this._lastRafTime;
            const deltaTicks = Math.round((deltaMs / 1000) * this._timebase);
            let next = this.playheadTicks + deltaTicks;
            // Loop or stop at end if duration is set
            if (this._durationTicks > 0 && next >= this._durationTicks) {
              next = this._durationTicks;
              this.playheadTicks = next;
              this.isPlaying = false;
              this._rafId = null;
              this._lastRafTime = null;
              this.notify();
              return;
            }
            this.playheadTicks = Math.max(0, next);
          }
          this._lastRafTime = now;
          this.notify();
          this._rafId = requestAnimationFrame(tick);
        };
        this._rafId = requestAnimationFrame(tick);
      }
    } else {
      if (this._rafId !== null) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
        this._lastRafTime = null;
      }
    }
  }

  public getActiveTool(): TimelineTool {
    return this.activeTool;
  }

  public setActiveTool(tool: TimelineTool): void {
    this.activeTool = tool;
    this.notify();
  }

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
    if (playing && this._durationTicks > 0 && this.playheadTicks >= this._durationTicks) {
      this.playheadTicks = 0;
    }
    this.isPlaying = playing;
    this._syncRaf();
    this.notify();
  }

  public togglePlayback(): void {
    if (!this.isPlaying && this._durationTicks > 0 && this.playheadTicks >= this._durationTicks) {
      this.playheadTicks = 0;
    }
    this.isPlaying = !this.isPlaying;
    this._syncRaf();
    this.notify();
  }

  public getZoom(): number {
    return this.zoom;
  }

  public setZoom(zoom: number): void {
    this.zoom = Math.max(0.02, Math.min(6.0, zoom));
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

  public getDefaultTrackHeight(): number {
    return this.defaultTrackHeight;
  }

  public setDefaultTrackHeight(height: number): void {
    this.defaultTrackHeight = Math.max(48, Math.min(240, height));
    this.notify();
  }

  public getTrackHeight(trackId: string): number {
    return this.trackHeights[trackId] ?? this.defaultTrackHeight;
  }

  public setTrackHeight(trackId: string, height: number): void {
    this.trackHeights[trackId] = Math.max(48, Math.min(240, height));
    this.notify();
  }

  public resetTrackHeights(): void {
    this.trackHeights = {};
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
