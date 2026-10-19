import { assertProjectValid, Project } from '@kuro/project-format';
import { TimelineTicks } from '@kuro/shared';
import { CommandContext } from '../commands/command.interface';

export type StateChangeListener = (project: Project) => void;
export type SelectionChangeListener = (selectedClipIds: string[]) => void;
export type PlayheadChangeListener = (ticks: TimelineTicks) => void;

export class EditorState {
  private project: Project;
  private playheadTicks: TimelineTicks = 0;
  private selectedClipIds: string[] = [];
  private selectedTrackId: string | null = null;

  private projectListeners = new Set<StateChangeListener>();
  private selectionListeners = new Set<SelectionChangeListener>();
  private playheadListeners = new Set<PlayheadChangeListener>();

  constructor(initialProject: Project) {
    assertProjectValid(initialProject);
    this.project = initialProject;
  }

  public getProject(): Project {
    return this.project;
  }

  public setProject(newProject: Project): void {
    assertProjectValid(newProject);
    this.project = newProject;
    this.notifyProjectListeners();
  }

  public getPlayheadTicks(): TimelineTicks {
    return this.playheadTicks;
  }

  public setPlayheadTicks(ticks: TimelineTicks): void {
    if (ticks < 0) ticks = 0;
    this.playheadTicks = ticks;
    for (const listener of this.playheadListeners) {
      listener(this.playheadTicks);
    }
  }

  public getSelectedClipIds(): string[] {
    return [...this.selectedClipIds];
  }

  public setSelectedClipIds(ids: string[]): void {
    this.selectedClipIds = [...ids];
    for (const listener of this.selectionListeners) {
      listener(this.selectedClipIds);
    }
  }

  public getSelectedTrackId(): string | null {
    return this.selectedTrackId;
  }

  public setSelectedTrackId(id: string | null): void {
    this.selectedTrackId = id;
  }

  public subscribeProject(listener: StateChangeListener): () => void {
    this.projectListeners.add(listener);
    return () => this.projectListeners.delete(listener);
  }

  public subscribeSelection(listener: SelectionChangeListener): () => void {
    this.selectionListeners.add(listener);
    return () => this.selectionListeners.delete(listener);
  }

  public subscribePlayhead(listener: PlayheadChangeListener): () => void {
    this.playheadListeners.add(listener);
    return () => this.playheadListeners.delete(listener);
  }

  public createContext(): CommandContext {
    return {
      getProject: () => this.getProject(),
      setProject: (p) => this.setProject(p),
      getPlayheadTicks: () => this.getPlayheadTicks(),
      setPlayheadTicks: (t) => this.setPlayheadTicks(t),
      getSelectedClipIds: () => this.getSelectedClipIds(),
      setSelectedClipIds: (ids) => this.setSelectedClipIds(ids),
    };
  }

  private notifyProjectListeners(): void {
    for (const listener of this.projectListeners) {
      listener(this.project);
    }
  }
}
