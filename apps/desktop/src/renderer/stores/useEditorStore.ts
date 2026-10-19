import { createNewProject, Project } from '@kuro/project-format';
import { CommandBus, EditorState, ICommand } from '@kuro/editor-core';

type Listener = () => void;

class EditorStore {
  private project: Project;
  private editorState: EditorState;
  private commandBus: CommandBus;
  private isDirty = false;
  private listeners = new Set<Listener>();

  constructor() {
    this.project = createNewProject('Demo Project');
    this.editorState = new EditorState(this.project);
    this.commandBus = new CommandBus(this.editorState);

    this.editorState.subscribeProject((updated) => {
      this.project = updated;
      this.isDirty = true;
      this.notify();
    });
  }

  public getProject(): Project {
    return this.project;
  }

  public getCommandBus(): CommandBus {
    return this.commandBus;
  }

  public getEditorState(): EditorState {
    return this.editorState;
  }

  public getIsDirty(): boolean {
    return this.isDirty;
  }

  public setIsDirty(dirty: boolean): void {
    this.isDirty = dirty;
    this.notify();
  }

  public async executeCommand<T>(command: ICommand<T>): Promise<boolean> {
    const res = await this.commandBus.executeCommand(command);
    return res.success;
  }

  public async undo(): Promise<boolean> {
    return this.commandBus.undo();
  }

  public async redo(): Promise<boolean> {
    return this.commandBus.redo();
  }

  public canUndo(): boolean {
    return this.commandBus.getHistoryStack().canUndo();
  }

  public canRedo(): boolean {
    return this.commandBus.getHistoryStack().canRedo();
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

export const editorStore = new EditorStore();
