import {
  AddClipCommand,
  CommandBus,
  DeleteClipCommand,
  EditorState,
  MoveClipCommand,
  SplitClipCommand,
  TrimClipCommand,
} from '@kuro/editor-core';
import { TimelineTicks } from '@kuro/shared';
import { ToolCall, ToolDefinition } from '../types/provider.interface';

export interface ToolExecutionResult {
  toolCallId: string;
  name: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export class ToolRegistry {
  private editorState: EditorState;
  private commandBus: CommandBus;

  constructor(editorState: EditorState, commandBus: CommandBus) {
    this.editorState = editorState;
    this.commandBus = commandBus;
  }

  public getDefinitions(): ToolDefinition[] {
    return [
      {
        name: 'get_project_summary',
        description: 'Returns high-level project summary: name, dimensions, FPS, tracks, and total clip count.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'get_timeline_state',
        description: 'Returns the full list of tracks and all clips currently on the timeline.',
        parameters: { type: 'object', properties: {} },
      },
      {
        name: 'split_clip',
        description: 'Splits a clip on the timeline into two separate clips at the specified tick position.',
        parameters: {
          type: 'object',
          properties: {
            clipId: { type: 'string', description: 'ID of the clip to split' },
            splitTick: { type: 'number', description: 'Integer tick position at which to split the clip' },
          },
          required: ['clipId', 'splitTick'],
        },
      },
      {
        name: 'trim_clip',
        description: 'Trims either the start or end boundary of a clip by a delta number of ticks.',
        parameters: {
          type: 'object',
          properties: {
            clipId: { type: 'string', description: 'ID of the clip to trim' },
            edge: { type: 'string', enum: ['start', 'end'], description: 'Edge to trim' },
            deltaTicks: { type: 'number', description: 'Delta ticks to adjust (positive or negative)' },
          },
          required: ['clipId', 'edge', 'deltaTicks'],
        },
      },
      {
        name: 'move_clip',
        description: 'Moves a clip to a new start tick position and optionally to a different track.',
        parameters: {
          type: 'object',
          properties: {
            clipId: { type: 'string', description: 'ID of the clip to move' },
            newStartTicks: { type: 'number', description: 'New timeline start tick position' },
            newTrackId: { type: 'string', description: 'Optional target track ID' },
          },
          required: ['clipId', 'newStartTicks'],
        },
      },
      {
        name: 'delete_clip',
        description: 'Deletes a clip from its track on the timeline.',
        parameters: {
          type: 'object',
          properties: {
            clipId: { type: 'string', description: 'ID of the clip to delete' },
          },
          required: ['clipId'],
        },
      },
      {
        name: 'undo_last_operation',
        description: 'Reverses the most recent editing command.',
        parameters: { type: 'object', properties: {} },
      },
    ];
  }

  public async executeTool(toolCall: ToolCall): Promise<ToolExecutionResult> {
    const { id, name, arguments: args } = toolCall;

    try {
      switch (name) {
        case 'get_project_summary': {
          const proj = this.editorState.getProject();
          const totalClips = proj.tracks.reduce((acc, t) => acc + t.clips.length, 0);
          return {
            toolCallId: id,
            name,
            success: true,
            result: {
              name: proj.name,
              width: proj.width,
              height: proj.height,
              fps: proj.fpsNumerator / proj.fpsDenominator,
              timebase: proj.timelineTimebase,
              trackCount: proj.tracks.length,
              totalClips,
            },
          };
        }

        case 'get_timeline_state': {
          const proj = this.editorState.getProject();
          return {
            toolCallId: id,
            name,
            success: true,
            result: {
              tracks: proj.tracks.map((t) => ({
                id: t.id,
                name: t.name,
                kind: t.kind,
                clips: t.clips.map((c) => ({
                  id: c.id,
                  assetId: c.assetId,
                  startTicks: c.timelineStartTicks,
                  durationTicks: c.durationTicks,
                  sourceInTicks: c.sourceInTicks,
                  sourceOutTicks: c.sourceOutTicks,
                })),
              })),
            },
          };
        }

        case 'split_clip': {
          const clipId = String(args['clipId']);
          const splitTick = Number(args['splitTick']);
          const command = new SplitClipCommand(clipId, splitTick as TimelineTicks);
          const result = await this.commandBus.executeCommand(command);
          return { toolCallId: id, name, success: result.success, result: result.data, error: result.error };
        }

        case 'trim_clip': {
          const clipId = String(args['clipId']);
          const edge = args['edge'] === 'start' ? 'start' : 'end';
          const deltaTicks = Number(args['deltaTicks']);
          const command = new TrimClipCommand(clipId, edge, deltaTicks as TimelineTicks);
          const result = await this.commandBus.executeCommand(command);
          return { toolCallId: id, name, success: result.success, result: result.data, error: result.error };
        }

        case 'move_clip': {
          const clipId = String(args['clipId']);
          const newStartTicks = Number(args['newStartTicks']);
          const newTrackId = args['newTrackId'] ? String(args['newTrackId']) : undefined;
          const command = new MoveClipCommand(clipId, newStartTicks as TimelineTicks, newTrackId);
          const result = await this.commandBus.executeCommand(command);
          return { toolCallId: id, name, success: result.success, result: result.data, error: result.error };
        }

        case 'delete_clip': {
          const clipId = String(args['clipId']);
          const command = new DeleteClipCommand(clipId);
          const result = await this.commandBus.executeCommand(command);
          return { toolCallId: id, name, success: result.success, result: result.data, error: result.error };
        }

        case 'undo_last_operation': {
          const undone = await this.commandBus.undo();
          return { toolCallId: id, name, success: undone, result: { undone } };
        }

        default:
          return {
            toolCallId: id,
            name,
            success: false,
            error: `Tool "${name}" is not implemented or supported.`,
          };
      }
    } catch (err) {
      return {
        toolCallId: id,
        name,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
