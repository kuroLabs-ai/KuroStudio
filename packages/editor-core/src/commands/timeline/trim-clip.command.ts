import { generateId, TimelineTicks } from '@kuro/shared';
import { Clip, Project } from '@kuro/project-format';
import { CommandContext, CommandResult, CommandRiskLevel, ICommand } from '../command.interface';

export type TrimEdge = 'start' | 'end';

export class TrimClipCommand implements ICommand<Clip> {
  public readonly id: string;
  public readonly name = 'TrimClip';
  public readonly description: string;
  public readonly riskLevel: CommandRiskLevel = 'medium';

  private targetClipId: string;
  private edge: TrimEdge;
  private deltaTicks: TimelineTicks; // Positive = expand, negative = shrink
  private previousProjectState?: Project;

  constructor(targetClipId: string, edge: TrimEdge, deltaTicks: TimelineTicks) {
    this.id = generateId('cmd_trim_clip');
    this.targetClipId = targetClipId;
    this.edge = edge;
    this.deltaTicks = deltaTicks;
    this.description = `Trim ${edge} of clip "${targetClipId}" by ${deltaTicks} ticks`;
  }

  public canExecute(context: CommandContext): boolean {
    const project = context.getProject();
    for (const track of project.tracks) {
      const clipIndex = track.clips.findIndex((c) => c.id === this.targetClipId);
      if (clipIndex !== -1) {
        const clip = track.clips[clipIndex]!;
        if (this.edge === 'start') {
          const newStart = clip.timelineStartTicks + this.deltaTicks;
          const newDuration = clip.durationTicks - this.deltaTicks;
          const origIn = Number.isFinite(clip.sourceInTicks) ? clip.sourceInTicks : 0;
          const newSourceIn = origIn + this.deltaTicks;
          if (newStart < 0 || newDuration <= 0 || newSourceIn < 0) return false;

          // Check collision with previous clip if expanding backwards
          if (this.deltaTicks < 0 && clipIndex > 0) {
            const prev = track.clips[clipIndex - 1]!;
            if (newStart < prev.timelineStartTicks + prev.durationTicks) return false;
          }
        } else {
          // edge === 'end'
          const newDuration = clip.durationTicks + this.deltaTicks;
          if (newDuration <= 0) return false;

          // Check collision with next clip if expanding forwards
          if (this.deltaTicks > 0 && clipIndex < track.clips.length - 1) {
            const next = track.clips[clipIndex + 1]!;
            if (clip.timelineStartTicks + newDuration > next.timelineStartTicks) return false;
          }
        }
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
      const originalSourceIn = Number.isFinite(original.sourceInTicks) ? original.sourceInTicks : 0;
      const originalSourceOut = Number.isFinite(original.sourceOutTicks)
        ? original.sourceOutTicks
        : originalSourceIn + original.durationTicks;

      if (this.edge === 'start') {
        updatedClip = {
          ...original,
          timelineStartTicks: original.timelineStartTicks + this.deltaTicks,
          durationTicks: original.durationTicks - this.deltaTicks,
          sourceInTicks: originalSourceIn + this.deltaTicks,
          sourceOutTicks: originalSourceOut,
        };
      } else {
        updatedClip = {
          ...original,
          durationTicks: original.durationTicks + this.deltaTicks,
          sourceInTicks: originalSourceIn,
          sourceOutTicks: originalSourceOut + this.deltaTicks,
        };
      }

      const newClips = [...track.clips];
      newClips[clipIndex] = updatedClip;
      newClips.sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);

      return {
        ...track,
        clips: newClips,
      };
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
