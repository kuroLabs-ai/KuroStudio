import { generateId, TimelineTicks } from '@kuro/shared';
import { Clip, Project } from '@kuro/project-format';
import { CommandContext, CommandResult, CommandRiskLevel, ICommand } from '../command.interface';

export class SetAudioFadeCommand implements ICommand<Clip> {
  public readonly id: string;
  public readonly name = 'SetAudioFade';
  public readonly description: string;
  public readonly riskLevel: CommandRiskLevel = 'medium';

  private targetClipId: string;
  private fadeInTicks: TimelineTicks;
  private fadeOutTicks: TimelineTicks;
  private previousProjectState?: Project;

  constructor(targetClipId: string, fadeInTicks: TimelineTicks, fadeOutTicks: TimelineTicks) {
    this.id = generateId('cmd_audio_fade');
    this.targetClipId = targetClipId;
    this.fadeInTicks = Math.max(0, fadeInTicks);
    this.fadeOutTicks = Math.max(0, fadeOutTicks);
    this.description = `Set audio fades for clip "${targetClipId}": in=${this.fadeInTicks} ticks, out=${this.fadeOutTicks} ticks`;
  }

  public canExecute(context: CommandContext): boolean {
    const project = context.getProject();
    for (const track of project.tracks) {
      const clip = track.clips.find((c) => c.id === this.targetClipId);
      if (clip) {
        return this.fadeInTicks + this.fadeOutTicks <= clip.durationTicks;
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
          volume: original.audio?.volume ?? 1.0,
          ...original.audio,
          fadeInTicks: this.fadeInTicks,
          fadeOutTicks: this.fadeOutTicks,
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
