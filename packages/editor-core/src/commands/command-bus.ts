import { CommandError, InvariantViolationError } from '@kuro/shared';
import { assertProjectValid } from '@kuro/project-format';
import { EditorState } from '../state/editor-state';
import { HistoryStack } from '../history/history-stack';
import { CommandContext, CommandResult, ICommand } from './command.interface';

export class CommandBus {
  private editorState: EditorState;
  private historyStack: HistoryStack;

  constructor(editorState: EditorState, historyStack = new HistoryStack()) {
    this.editorState = editorState;
    this.historyStack = historyStack;
  }

  public getHistoryStack(): HistoryStack {
    return this.historyStack;
  }

  public async executeCommand<T>(command: ICommand<T>): Promise<CommandResult<T>> {
    const context = this.editorState.createContext();

    if (!command.canExecute(context)) {
      throw new CommandError(`Command "${command.name}" cannot be executed in the current editor state.`, {
        commandId: command.id,
      });
    }

    try {
      const result = await command.execute(context);
      if (!result.success) {
        return result;
      }

      // Assert project invariants immediately
      try {
        assertProjectValid(this.editorState.getProject());
      } catch (validationErr) {
        // Rollback this specific command to protect project integrity
        await command.undo(context);
        throw new InvariantViolationError(
          `Command "${command.name}" violated project invariants and was automatically rolled back: ${
            validationErr instanceof Error ? validationErr.message : String(validationErr)
          }`
        );
      }

      this.historyStack.recordCommand(command);
      return result;
    } catch (err) {
      if (err instanceof InvariantViolationError || err instanceof CommandError) {
        throw err;
      }
      throw new CommandError(`Unexpected error while executing "${command.name}": ${String(err)}`, {
        commandId: command.id,
      });
    }
  }

  public async executeTransaction<T>(
    transactionId: string,
    description: string,
    actions: (bus: CommandBus) => Promise<T>
  ): Promise<T> {
    const context = this.editorState.createContext();
    this.historyStack.beginTransaction(transactionId, description);

    try {
      const result = await actions(this);
      this.historyStack.commitTransaction();
      return result;
    } catch (err) {
      await this.historyStack.rollbackTransaction(context);
      throw new CommandError(`Transaction "${description}" failed and was rolled back: ${String(err)}`, {
        transactionId,
      });
    }
  }

  public async undo(): Promise<boolean> {
    const context = this.editorState.createContext();
    return this.historyStack.undo(context);
  }

  public async redo(): Promise<boolean> {
    const context = this.editorState.createContext();
    return this.historyStack.redo(context);
  }
}
