import { CommandContext, ICommand } from '../commands/command.interface';

export interface HistoryEntry {
  id: string;
  description: string;
  timestamp: string;
  commands: ICommand[];
}

export class HistoryStack {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private activeTransaction: { id: string; description: string; commands: ICommand[] } | null = null;
  private maxHistorySize: number;

  constructor(maxHistorySize = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  public beginTransaction(id: string, description: string): void {
    if (this.activeTransaction) {
      throw new Error(`A transaction "${this.activeTransaction.description}" is already open.`);
    }
    this.activeTransaction = { id, description, commands: [] };
  }

  public recordCommand(command: ICommand): void {
    if (this.activeTransaction) {
      this.activeTransaction.commands.push(command);
    } else {
      this.pushEntry({
        id: command.id,
        description: command.description,
        timestamp: new Date().toISOString(),
        commands: [command],
      });
    }
  }

  public commitTransaction(): void {
    if (!this.activeTransaction) return;
    if (this.activeTransaction.commands.length > 0) {
      this.pushEntry({
        id: this.activeTransaction.id,
        description: this.activeTransaction.description,
        timestamp: new Date().toISOString(),
        commands: this.activeTransaction.commands,
      });
    }
    this.activeTransaction = null;
  }

  public async rollbackTransaction(context: CommandContext): Promise<void> {
    if (!this.activeTransaction) return;
    const commandsToRevert = [...this.activeTransaction.commands].reverse();
    for (const cmd of commandsToRevert) {
      await cmd.undo(context);
    }
    this.activeTransaction = null;
  }

  public async undo(context: CommandContext): Promise<boolean> {
    const entry = this.undoStack.pop();
    if (!entry) return false;

    // Undo commands in reverse order
    for (let i = entry.commands.length - 1; i >= 0; i--) {
      const command = entry.commands[i];
      if (command) {
        await command.undo(context);
      }
    }

    this.redoStack.push(entry);
    return true;
  }

  public async redo(context: CommandContext): Promise<boolean> {
    const entry = this.redoStack.pop();
    if (!entry) return false;

    // Redo commands in forward order
    for (const command of entry.commands) {
      await command.execute(context);
    }

    this.undoStack.push(entry);
    return true;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.activeTransaction = null;
  }

  private pushEntry(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
  }
}
