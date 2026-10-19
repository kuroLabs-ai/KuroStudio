import { generateId } from '@kuro/shared';
import { Project, Track } from '@kuro/project-format';
import { CommandContext, CommandResult, CommandRiskLevel, ICommand } from '../command.interface';

export class MuteTrackCommand implements ICommand<Track> {
  public readonly id: string;
  public readonly name = 'MuteTrack';
  public readonly description: string;
  public readonly riskLevel: CommandRiskLevel = 'low';

  private targetTrackId: string;
  private muted?: boolean;
  private previousProjectState?: Project;

  constructor(targetTrackId: string, muted?: boolean) {
    this.id = generateId('cmd_mute_track');
    this.targetTrackId = targetTrackId;
    this.muted = muted;
    this.description = `Toggle or set mute on track "${targetTrackId}"`;
  }

  public canExecute(context: CommandContext): boolean {
    const project = context.getProject();
    return project.tracks.some((t) => t.id === this.targetTrackId);
  }

  public execute(context: CommandContext): CommandResult<Track> {
    const project = context.getProject();
    this.previousProjectState = JSON.parse(JSON.stringify(project));

    let updatedTrack: Track | undefined;

    const updatedTracks = project.tracks.map((track) => {
      if (track.id !== this.targetTrackId) return track;
      const newMuted = this.muted !== undefined ? this.muted : !track.muted;
      updatedTrack = { ...track, muted: newMuted };
      return updatedTrack;
    });

    if (!updatedTrack) {
      return { success: false, error: `Track "${this.targetTrackId}" not found.` };
    }

    context.setProject({
      ...project,
      tracks: updatedTracks,
    });

    return {
      success: true,
      data: updatedTrack,
      affectedTrackIds: [this.targetTrackId],
    };
  }

  public undo(context: CommandContext): void {
    if (this.previousProjectState) {
      context.setProject(this.previousProjectState);
    }
  }
}
