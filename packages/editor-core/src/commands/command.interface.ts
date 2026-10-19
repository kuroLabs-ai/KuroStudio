import { Project } from '@kuro/project-format';

export type CommandRiskLevel = 'low' | 'medium' | 'high';

export interface CommandContext {
  getProject: () => Project;
  setProject: (project: Project) => void;
  getPlayheadTicks: () => number;
  setPlayheadTicks: (ticks: number) => void;
  getSelectedClipIds: () => string[];
  setSelectedClipIds: (ids: string[]) => void;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  affectedClipIds?: string[];
  affectedTrackIds?: string[];
}

export interface ICommand<TData = unknown> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly riskLevel: CommandRiskLevel;

  /**
   * Validates whether the command can run against current state before execution.
   */
  canExecute(context: CommandContext): boolean;

  /**
   * Executes the command mutation.
   */
  execute(context: CommandContext): Promise<CommandResult<TData>> | CommandResult<TData>;

  /**
   * Reverses the command mutation.
   */
  undo(context: CommandContext): Promise<void> | void;
}
