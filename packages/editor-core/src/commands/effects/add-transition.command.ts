import { generateId, TimelineTicks } from '@kuro/shared';
import { Project, TransitionInstance } from '@kuro/project-format';
import { CommandContext, CommandResult, CommandRiskLevel, ICommand } from '../command.interface';

export class AddTransitionCommand implements ICommand<TransitionInstance> {
  public readonly id: string;
  public readonly name = 'AddTransition';
  public readonly description: string;
  public readonly riskLevel: CommandRiskLevel = 'medium';

  private transition: TransitionInstance;
  private previousProjectState?: Project;

  constructor(
    transitionType: 'cross-dissolve' | 'fade-to-black' | 'hard-cut' | string,
    outgoingClipId: string,
    incomingClipId: string,
    durationTicks: TimelineTicks
  ) {
    this.id = generateId('cmd_add_transition');
    this.transition = {
      id: generateId('trans'),
      transitionType,
      durationTicks,
      outgoingClipId,
      incomingClipId,
    };
    this.description = `Add transition "${transitionType}" between "${outgoingClipId}" and "${incomingClipId}"`;
  }

  public canExecute(context: CommandContext): boolean {
    const project = context.getProject();
    let outgoingFound = false;
    let incomingFound = false;

    for (const track of project.tracks) {
      if (track.clips.some((c) => c.id === this.transition.outgoingClipId)) outgoingFound = true;
      if (track.clips.some((c) => c.id === this.transition.incomingClipId)) incomingFound = true;
    }
    return outgoingFound && incomingFound && this.transition.durationTicks > 0;
  }

  public execute(context: CommandContext): CommandResult<TransitionInstance> {
    const project = context.getProject();
    this.previousProjectState = JSON.parse(JSON.stringify(project));

    const updatedTransitions = [...project.transitions, this.transition];

    context.setProject({
      ...project,
      transitions: updatedTransitions,
    });

    return {
      success: true,
      data: this.transition,
      affectedClipIds: [this.transition.outgoingClipId, this.transition.incomingClipId],
    };
  }

  public undo(context: CommandContext): void {
    if (this.previousProjectState) {
      context.setProject(this.previousProjectState);
    }
  }
}
