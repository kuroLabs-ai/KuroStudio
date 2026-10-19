import { generateId } from '@kuro/shared';
import { Clip, Project } from '@kuro/project-format';
import { CommandContext, CommandResult, CommandRiskLevel, ICommand } from '../command.interface';

export class SetAudioVolumeCommand implements ICommand<Clip> {
  public readonly id: string;
  public readonly name = 'SetAudioVolume';
  public readonly description: string;
  public readonly riskLevel: CommandRiskLevel = 'medium';

  private targetClipId: string;
  private volume: number;
  private previousProjectState?: Project;

  constructor(targetClipId: string, volume: number) {
    this.id = generateId('cmd_audio_vol');
    this.targetClipId = targetClipId;
    this.volume = Math.max(0, Math.min(2.0, volume));
    this.description = `Set volume of clip "${targetClipId}" to ${(this.volume * 100).toFixed(0)}%`;
  }

  public canExecute(context: CommandContext): boolean {
    const project = context.getProject();
    for (const track of project.tracks) {
      if (track.clips.some((c) => c.id === this.targetClipId)) {
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
        audio: {
          ...original.audio,
          volume: this.volume,
        },
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
