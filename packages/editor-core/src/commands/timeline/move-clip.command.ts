import { generateId, TimelineTicks } from '@kuro/shared';
import { Clip, Project } from '@kuro/project-format';
import { CommandContext, CommandResult, CommandRiskLevel, ICommand } from '../command.interface';

export class MoveClipCommand implements ICommand<Clip> {
  public readonly id: string;
  public readonly name = 'MoveClip';
  public readonly description: string;
  public readonly riskLevel: CommandRiskLevel = 'medium';

  private targetClipId: string;
  private newStartTicks: TimelineTicks;
  private newTrackId?: string;
  private previousProjectState?: Project;

  constructor(targetClipId: string, newStartTicks: TimelineTicks, newTrackId?: string) {
    this.id = generateId('cmd_move_clip');
    this.targetClipId = targetClipId;
    this.newStartTicks = newStartTicks;
    this.newTrackId = newTrackId;
    this.description = `Move clip "${targetClipId}" to tick ${newStartTicks}${
      newTrackId ? ` on track "${newTrackId}"` : ''
    }`;
  }

  public canExecute(context: CommandContext): boolean {
    if (this.newStartTicks < 0) return false;
    const project = context.getProject();

    let clip: Clip | undefined;
    let sourceTrackId = '';

    for (const track of project.tracks) {
      const found = track.clips.find((c) => c.id === this.targetClipId);
      if (found) {
        clip = found;
        sourceTrackId = track.id;
        break;
      }
    }
    if (!clip) return false;

    const destinationTrackId = this.newTrackId ?? sourceTrackId;
    const destTrack = project.tracks.find((t) => t.id === destinationTrackId);
    if (!destTrack) return false;

    // Check collision on destination track
    const newEnd = this.newStartTicks + clip.durationTicks;
    for (const other of destTrack.clips) {
      if (other.id === this.targetClipId) continue;
      const otherEnd = other.timelineStartTicks + other.durationTicks;
      if (this.newStartTicks < otherEnd && newEnd > other.timelineStartTicks) {
        return false; // Collision
      }
    }

    return true;
  }

  public execute(context: CommandContext): CommandResult<Clip> {
    const project = context.getProject();
    this.previousProjectState = JSON.parse(JSON.stringify(project));

    let clipToMove: Clip | undefined;
    let originalTrackId = '';

    for (const track of project.tracks) {
      const found = track.clips.find((c) => c.id === this.targetClipId);
      if (found) {
        clipToMove = found;
        originalTrackId = track.id;
        break;
      }
    }

    if (!clipToMove) {
      return { success: false, error: `Clip "${this.targetClipId}" not found.` };
    }

    const destinationTrackId = this.newTrackId ?? originalTrackId;
    const movedClip: Clip = {
      ...clipToMove,
      trackId: destinationTrackId,
      timelineStartTicks: this.newStartTicks,
    };

    const updatedTracks = project.tracks.map((track) => {
      if (track.id === originalTrackId && track.id === destinationTrackId) {
        // Move within same track
        const newClips = track.clips
          .map((c) => (c.id === this.targetClipId ? movedClip : c))
          .sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);
        return { ...track, clips: newClips };
      }

      if (track.id === originalTrackId) {
        // Remove from source track
        return {
          ...track,
          clips: track.clips.filter((c) => c.id !== this.targetClipId),
        };
      }

      if (track.id === destinationTrackId) {
        // Add to destination track
        const newClips = [...track.clips, movedClip].sort(
          (a, b) => a.timelineStartTicks - b.timelineStartTicks
        );
        return { ...track, clips: newClips };
      }

      return track;
    });

    context.setProject({
      ...project,
      tracks: updatedTracks,
    });

    return {
      success: true,
      data: movedClip,
      affectedClipIds: [movedClip.id],
      affectedTrackIds: [originalTrackId, destinationTrackId],
    };
  }

  public undo(context: CommandContext): void {
    if (this.previousProjectState) {
      context.setProject(this.previousProjectState);
    }
  }
}
