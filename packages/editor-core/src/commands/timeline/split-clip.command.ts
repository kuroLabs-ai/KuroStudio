import { generateId, TimelineTicks } from '@kuro/shared';
import { Clip, Project } from '@kuro/project-format';
import { CommandContext, CommandResult, CommandRiskLevel, ICommand } from '../command.interface';

export interface SplitClipResult {
  leftClip: Clip;
  rightClip: Clip;
}

export class SplitClipCommand implements ICommand<SplitClipResult> {
  public readonly id: string;
  public readonly name = 'SplitClip';
  public readonly description: string;
  public readonly riskLevel: CommandRiskLevel = 'medium';

  public createdResult?: SplitClipResult;
  private targetClipId: string;
  private splitTick: TimelineTicks;
  private previousProjectState?: Project;

  constructor(targetClipId: string, splitTick: TimelineTicks) {
    this.id = generateId('cmd_split_clip');
    this.targetClipId = targetClipId;
    this.splitTick = splitTick;
    this.description = `Split clip "${targetClipId}" at tick ${splitTick}`;
  }

  public canExecute(context: CommandContext): boolean {
    const project = context.getProject();
    for (const track of project.tracks) {
      const clip = track.clips.find((c) => c.id === this.targetClipId);
      if (clip) {
        const clipStart = clip.timelineStartTicks;
        const clipEnd = clipStart + clip.durationTicks;
        // Split point must be strictly inside the clip boundaries
        return this.splitTick > clipStart && this.splitTick < clipEnd;
      }
    }
    return false;
  }

  public execute(context: CommandContext): CommandResult<SplitClipResult> {
    const project = context.getProject();
    this.previousProjectState = JSON.parse(JSON.stringify(project));

    let createdResult: SplitClipResult | undefined;
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

      const leftDuration = this.splitTick - original.timelineStartTicks;
      const rightDuration = original.durationTicks - leftDuration;

      const speedRatio =
        original.speedNumerator && original.speedDenominator
          ? original.speedNumerator / original.speedDenominator
          : 1;

      const leftSourceDuration = Math.round(leftDuration * speedRatio);
      const splitSourceTick = originalSourceIn + leftSourceDuration;

      const leftClip: Clip = {
        ...original,
        durationTicks: leftDuration,
        sourceInTicks: originalSourceIn,
        sourceOutTicks: splitSourceTick,
      };

      const rightClip: Clip = {
        ...original,
        id: generateId('clip'),
        timelineStartTicks: this.splitTick,
        durationTicks: rightDuration,
        sourceInTicks: splitSourceTick,
        sourceOutTicks: originalSourceOut,
      };

      createdResult = { leftClip, rightClip };
      this.createdResult = createdResult;

      const newClips = [...track.clips];
      newClips.splice(clipIndex, 1, leftClip, rightClip);
      newClips.sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);

      return {
        ...track,
        clips: newClips,
      };
    });

    if (!createdResult) {
      return { success: false, error: `Clip "${this.targetClipId}" not found.` };
    }

    context.setProject({
      ...project,
      tracks: updatedTracks,
    });

    return {
      success: true,
      data: createdResult,
      affectedClipIds: [createdResult.leftClip.id, createdResult.rightClip.id],
      affectedTrackIds: [affectedTrackId],
    };
  }

  public undo(context: CommandContext): void {
    if (this.previousProjectState) {
      context.setProject(this.previousProjectState);
    }
  }
}
