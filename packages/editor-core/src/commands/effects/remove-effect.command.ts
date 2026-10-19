import { generateId } from '@kuro/shared';
import { Clip, Project } from '@kuro/project-format';
import { CommandContext, CommandResult, CommandRiskLevel, ICommand } from '../command.interface';

export class RemoveEffectCommand implements ICommand<Clip> {
  public readonly id: string;
  public readonly name = 'RemoveEffect';
  public readonly description: string;
  public readonly riskLevel: CommandRiskLevel = 'medium';

  private targetClipId: string;
  private effectId: string;
  private previousProjectState?: Project;

  constructor(targetClipId: string, effectId: string) {
    this.id = generateId('cmd_rm_effect');
    this.targetClipId = targetClipId;
    this.effectId = effectId;
    this.description = `Remove effect "${effectId}" from clip "${targetClipId}"`;
  }

  public canExecute(context: CommandContext): boolean {
    const project = context.getProject();
    for (const track of project.tracks) {
      const clip = track.clips.find((c) => c.id === this.targetClipId);
      if (clip && clip.effects.some((e) => e.id === this.effectId)) {
        return true;
      }
    }
    return false;
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
        effects: original.effects.filter((e) => e.id !== this.effectId),
      };

      const newClips = [...track.clips];
      newClips[clipIndex] = updatedClip;
      return { ...track, clips: newClips };
    });

    if (!updatedClip) {
      return { success: false, error: `Clip "${this.targetClipId}" or effect "${this.effectId}" not found.` };
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
