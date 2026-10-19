import {
  AddClipCommand,
  AddTransitionCommand,
  ApplyEffectCommand,
  CommandBus,
  DeleteClipCommand,
  EditorState,
  MoveClipCommand,
  MuteTrackCommand,
  RemoveEffectCommand,
  SetAudioFadeCommand,
  SetAudioVolumeCommand,
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
        name: 'set_audio_volume',
        description: 'Sets the volume level of an audio or video clip (e.g. 0.2 for 20%, 1.0 for 100%).',
        parameters: {
          type: 'object',
          properties: {
            clipId: { type: 'string', description: 'ID of the target clip' },
            volume: { type: 'number', description: 'Linear volume level between 0.0 and 2.0' },
          },
          required: ['clipId', 'volume'],
        },
      },
      {
        name: 'set_audio_fade',
        description: 'Sets fade-in and fade-out durations in ticks for a clip.',
        parameters: {
          type: 'object',
          properties: {
            clipId: { type: 'string', description: 'ID of the target clip' },
            fadeInTicks: { type: 'number', description: 'Fade in duration in integer ticks' },
            fadeOutTicks: { type: 'number', description: 'Fade out duration in integer ticks' },
          },
          required: ['clipId', 'fadeInTicks', 'fadeOutTicks'],
        },
      },
      {
        name: 'mute_track',
        description: 'Toggles or sets the mute state for a track.',
        parameters: {
          type: 'object',
          properties: {
            trackId: { type: 'string', description: 'ID of the track to mute or unmute' },
            muted: { type: 'boolean', description: 'Optional boolean explicit mute state' },
          },
          required: ['trackId'],
        },
      },
      {
        name: 'apply_effect',
        description: 'Applies a visual adjustment or effect to a clip (brightness, contrast, saturation, opacity).',
        parameters: {
          type: 'object',
          properties: {
            clipId: { type: 'string', description: 'ID of the clip' },
            effectType: {
              type: 'string',
              enum: ['brightness', 'contrast', 'saturation', 'opacity', 'blur'],
              description: 'Type of effect to apply',
            },
            parameters: { type: 'object', description: 'Key-value parameters for the effect' },
          },
          required: ['clipId', 'effectType'],
        },
      },
      {
        name: 'add_transition',
        description: 'Adds a transition (cross-dissolve, fade-to-black) between two clips.',
        parameters: {
          type: 'object',
          properties: {
            transitionType: { type: 'string', enum: ['cross-dissolve', 'fade-to-black', 'hard-cut'] },
            outgoingClipId: { type: 'string', description: 'ID of the first clip' },
            incomingClipId: { type: 'string', description: 'ID of the second clip' },
            durationTicks: { type: 'number', description: 'Duration of transition in integer ticks' },
          },
          required: ['transitionType', 'outgoingClipId', 'incomingClipId', 'durationTicks'],
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
                muted: t.muted,
                clips: t.clips.map((c) => ({
                  id: c.id,
                  assetId: c.assetId,
                  startTicks: c.timelineStartTicks,
                  durationTicks: c.durationTicks,
                  sourceInTicks: c.sourceInTicks,
                  sourceOutTicks: c.sourceOutTicks,
                  audio: c.audio,
                  effects: c.effects,
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

        case 'set_audio_volume': {
          const clipId = String(args['clipId']);
          const volume = Number(args['volume']);
          const command = new SetAudioVolumeCommand(clipId, volume);
          const result = await this.commandBus.executeCommand(command);
          return { toolCallId: id, name, success: result.success, result: result.data, error: result.error };
        }

        case 'set_audio_fade': {
          const clipId = String(args['clipId']);
          const inTicks = Number(args['fadeInTicks']);
          const outTicks = Number(args['fadeOutTicks']);
          const command = new SetAudioFadeCommand(clipId, inTicks as TimelineTicks, outTicks as TimelineTicks);
          const result = await this.commandBus.executeCommand(command);
          return { toolCallId: id, name, success: result.success, result: result.data, error: result.error };
        }

        case 'mute_track': {
          const trackId = String(args['trackId']);
          const muted = args['muted'] !== undefined ? Boolean(args['muted']) : undefined;
          const command = new MuteTrackCommand(trackId, muted);
          const result = await this.commandBus.executeCommand(command);
          return { toolCallId: id, name, success: result.success, result: result.data, error: result.error };
        }

        case 'apply_effect': {
          const clipId = String(args['clipId']);
          const effectType = args['effectType'] as 'brightness' | 'contrast' | 'saturation' | 'opacity' | 'blur';
          const params = (args['parameters'] as Record<string, number | string | boolean>) || {};
          const command = new ApplyEffectCommand(clipId, {
            effectType,
            enabled: true,
            parameters: params,
          });
          const result = await this.commandBus.executeCommand(command);
          return { toolCallId: id, name, success: result.success, result: result.data, error: result.error };
        }

        case 'add_transition': {
          const transitionType = args['transitionType'] as 'cross-dissolve' | 'fade-to-black' | 'hard-cut';
          const outgoingClipId = String(args['outgoingClipId']);
          const incomingClipId = String(args['incomingClipId']);
          const durationTicks = Number(args['durationTicks']);
          const command = new AddTransitionCommand(
            transitionType,
            outgoingClipId,
            incomingClipId,
            durationTicks as TimelineTicks
          );
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
