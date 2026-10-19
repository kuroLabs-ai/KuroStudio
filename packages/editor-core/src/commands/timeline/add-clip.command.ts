import { generateId } from '@kuro/shared';
import { Clip, Project } from '@kuro/project-format';
import { CommandContext, CommandResult, CommandRiskLevel, ICommand } from '../command.interface';

export class AddClipCommand implements ICommand<Clip> {
  public readonly id: string;
  public readonly name = 'AddClip';
  public readonly description: string;
  public readonly riskLevel: CommandRiskLevel = 'medium';

  private clipToAdd: Clip;
  private targetTrackId: string;
  private previousProjectState?: Project;

  constructor(clip: Clip, targetTrackId: string) {
    this.id = generateId('cmd_add_clip');
    this.clipToAdd = { ...clip };
    this.targetTrackId = targetTrackId;
    this.description = `Add clip "${clip.id}" to track "${targetTrackId}" at tick ${clip.timelineStartTicks}`;
  }

  public canExecute(context: CommandContext): boolean {
    const project = context.getProject();
    const track = project.tracks.find((t) => t.id === this.targetTrackId);
    if (!track) return false;

    // Verify clip has valid positive duration
    if (this.clipToAdd.durationTicks <= 0) return false;

    // Check for collision on the same track
    const clipStart = this.clipToAdd.timelineStartTicks;
    const clipEnd = clipStart + this.clipToAdd.durationTicks;

    for (const existing of track.clips) {
      const existingEnd = existing.timelineStartTicks + existing.durationTicks;
      if (clipStart < existingEnd && clipEnd > existing.timelineStartTicks) {
        return false; // Collision
      }
    }
    return true;
  }

  public execute(context: CommandContext): CommandResult<Clip> {
    const project = context.getProject();
    this.previousProjectState = JSON.parse(JSON.stringify(project));

    const updatedTracks = project.tracks.map((track) => {
      if (track.id !== this.targetTrackId) return track;
      const newClips = [...track.clips, this.clipToAdd].sort(
        (a, b) => a.timelineStartTicks - b.timelineStartTicks
      );
      return { ...track, clips: newClips };
    });

    context.setProject({
      ...project,
      tracks: updatedTracks,
    });

    return {
      success: true,
      data: this.clipToAdd,
      affectedClipIds: [this.clipToAdd.id],
      affectedTrackIds: [this.targetTrackId],
    };
  }

  public undo(context: CommandContext): void {
    if (this.previousProjectState) {
      context.setProject(this.previousProjectState);
    }
  }
}
