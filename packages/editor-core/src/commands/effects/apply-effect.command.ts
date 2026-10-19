import { generateId } from '@kuro/shared';
import { Clip, EffectInstance, Project } from '@kuro/project-format';
import { CommandContext, CommandResult, CommandRiskLevel, ICommand } from '../command.interface';

export class ApplyEffectCommand implements ICommand<Clip> {
  public readonly id: string;
  public readonly name = 'ApplyEffect';
  public readonly description: string;
  public readonly riskLevel: CommandRiskLevel = 'medium';

  private targetClipId: string;
  private effect: EffectInstance;
  private previousProjectState?: Project;

  constructor(targetClipId: string, effect: Omit<EffectInstance, 'id'>) {
    this.id = generateId('cmd_apply_effect');
    this.targetClipId = targetClipId;
    this.effect = {
      ...effect,
      id: generateId('fx'),
    };
    this.description = `Apply effect "${this.effect.effectType}" to clip "${targetClipId}"`;
  }

  public canExecute(context: CommandContext): boolean {
    const project = context.getProject();
    return project.tracks.some((t) => t.clips.some((c) => c.id === this.targetClipId));
  }

  public execute(context: CommandContext): CommandResult<Clip> {
    const project = context.getProject();
    this.previousProjectState = JSON.parse(JSON.stringify(project));

    let updatedClip: Clip | undefined;
    let affectedTrackId = '';

    const updatedTracks = project.tracks.map((track) => {
      const clipIndex = track.clips.findIndex((c) => c.id === this.targetClipId);
      if (clipIndex === -1) return track;

      affectedTrackId = track.id;
      const original = track.clips[clipIndex]!;
      updatedClip = {
        ...original,
        effects: [...original.effects, this.effect],
      };

      const newClips = [...track.clips];
      newClips[clipIndex] = updatedClip;
      return { ...track, clips: newClips };
    });

    if (!updatedClip) {
      return { success: false, error: `Clip "${this.targetClipId}" not found.` };
    }

    context.setProject({
      ...project,
      tracks: updatedTracks,
    });

    return {
      success: true,
      data: updatedClip,
      affectedClipIds: [updatedClip.id],
      affectedTrackIds: [affectedTrackId],
    };
  }

  public undo(context: CommandContext): void {
    if (this.previousProjectState) {
      context.setProject(this.previousProjectState);
    }
  }
}
