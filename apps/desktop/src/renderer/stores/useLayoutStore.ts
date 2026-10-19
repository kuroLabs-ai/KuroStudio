export type ToolTab = 'media' | 'transitions' | 'effects' | 'titles' | 'audio';

type Listener = () => void;

interface LayoutState {
  upperHeightRatio: number; // 0.25 to 0.85 (fraction of available height)
  leftPanelWidth: number; // in pixels (200 to 600)
  inspectorWidth: number; // in pixels (200 to 500)
  isLeftPanelVisible: boolean;
  isInspectorVisible: boolean;
  isTimelineVisible: boolean;
  activeToolTab: ToolTab;
}

const STORAGE_KEY = 'kuro_layout_prefs_v1';

const DEFAULT_STATE: LayoutState = {
  upperHeightRatio: 0.58, // 58% upper, 42% timeline
  leftPanelWidth: 320,
  inspectorWidth: 290,
  isLeftPanelVisible: true,
  isInspectorVisible: true,
  isTimelineVisible: true,
  activeToolTab: 'media',
};

class LayoutStore {
  private state: LayoutState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): LayoutState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_STATE, ...JSON.parse(saved) };
      }
    } catch {
      // fallback to default
    }
    return { ...DEFAULT_STATE };
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore
    }
    this.notify();
  }

  public getState(): LayoutState {
    return { ...this.state };
  }

  public getUpperHeightRatio(): number {
    return this.state.upperHeightRatio;
  }

  public setUpperHeightRatio(ratio: number): void {
    this.state.upperHeightRatio = Math.max(0.2, Math.min(0.85, ratio));
    this.persist();
  }

  public getLeftPanelWidth(): number {
    return this.state.leftPanelWidth;
  }

  public setLeftPanelWidth(width: number): void {
    this.state.leftPanelWidth = Math.max(200, Math.min(650, width));
    this.persist();
  }

  public getInspectorWidth(): number {
    return this.state.inspectorWidth;
  }

  public setInspectorWidth(width: number): void {
    this.state.inspectorWidth = Math.max(200, Math.min(550, width));
    this.persist();
  }

  public isLeftPanelVisible(): boolean {
    return this.state.isLeftPanelVisible;
  }

  public toggleLeftPanel(): void {
    this.state.isLeftPanelVisible = !this.state.isLeftPanelVisible;
    this.persist();
  }

  public isInspectorVisible(): boolean {
    return this.state.isInspectorVisible;
  }

  public toggleInspector(): void {
    this.state.isInspectorVisible = !this.state.isInspectorVisible;
    this.persist();
  }

  public isTimelineVisible(): boolean {
    return this.state.isTimelineVisible;
  }

  public toggleTimeline(): void {
    this.state.isTimelineVisible = !this.state.isTimelineVisible;
    this.persist();
  }

  public getActiveToolTab(): ToolTab {
    return this.state.activeToolTab;
  }

  public setActiveToolTab(tab: ToolTab): void {
    this.state.activeToolTab = tab;
    if (!this.state.isLeftPanelVisible) {
      this.state.isLeftPanelVisible = true;
    }
    this.persist();
  }

  public resetLayout(): void {
    this.state = { ...DEFAULT_STATE };
    this.persist();
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

export const layoutStore = new LayoutStore();
