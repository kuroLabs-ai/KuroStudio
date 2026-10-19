import { generateId } from '@kuro/shared';
import { Clip, Project } from '@kuro/project-format';
import { CommandContext, CommandResult, CommandRiskLevel, ICommand } from '../command.interface';

export class DeleteClipCommand implements ICommand<Clip> {
  public readonly id: string;
  public readonly name = 'DeleteClip';
  public readonly description: string;
  public readonly riskLevel: CommandRiskLevel = 'medium';

  private targetClipId: string;
  private previousProjectState?: Project;
  private deletedClip?: Clip;

  constructor(targetClipId: string) {
    this.id = generateId('cmd_delete_clip');
    this.targetClipId = targetClipId;
    this.description = `Delete clip "${targetClipId}"`;
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

    let affectedTrackId = '';

    const updatedTracks = project.tracks.map((track) => {
      const found = track.clips.find((c) => c.id === this.targetClipId);
      if (found) {
        this.deletedClip = found;
        affectedTrackId = track.id;
        return {
          ...track,
          clips: track.clips.filter((c) => c.id !== this.targetClipId),
        };
      }
      return track;
    });

    if (!this.deletedClip) {
      return { success: false, error: `Clip "${this.targetClipId}" not found.` };
    }

    context.setProject({
      ...project,
      tracks: updatedTracks,
    });

    // Remove from selection if deleted clip was selected
    const selected = context.getSelectedClipIds().filter((id) => id !== this.targetClipId);
    context.setSelectedClipIds(selected);

    return {
      success: true,
      data: this.deletedClip,
      affectedClipIds: [this.targetClipId],
      affectedTrackIds: [affectedTrackId],
    };
  }

  public undo(context: CommandContext): void {
    if (this.previousProjectState) {
      context.setProject(this.previousProjectState);
    }
  }
}
