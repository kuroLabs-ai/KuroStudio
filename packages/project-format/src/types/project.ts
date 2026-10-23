import { TimelineTicks } from '@kuro/shared';

export const CURRENT_PROJECT_SCHEMA_VERSION = 1;

export type TrackKind = 'video' | 'audio' | 'overlay';

export type AssetType = 'video' | 'audio' | 'image' | 'remotion-scene';

export interface AssetReference {
  id: string;
  name: string;
  type: AssetType;
  /**
   * 'linked': file stays in user's original filesystem location.
   * 'managed': file was copied into <ProjectName>.assets/media/.
   */
  storageMode: 'linked' | 'managed';
  filePath: string;
  relativePath?: string;
  fileSizeBytes: number;
  sha256?: string;
  durationTicks?: TimelineTicks;
  width?: number;
  height?: number;
  fpsNumerator?: number;
  fpsDenominator?: number;
  audioChannels?: number;
  sampleRate?: number;
  codec?: string;
  thumbnailPath?: string;
  waveformPath?: string;
  proxyPath?: string;
  metadata?: Record<string, unknown>;
}

export interface ClipTransform {
  x: number; // Pixels offset from center
  y: number;
  scaleX: number; // Default 1.0
  scaleY: number; // Default 1.0
  rotation: number; // Degrees (-180 to +180)
  opacity: number; // 0.0 - 1.0
  flipH?: boolean;
  flipV?: boolean;
  blendMode?: string;
  fit?: 'contain' | 'cover' | 'fill';
}

export interface ClipAudio {
  volume: number; // 0.0 - 2.0 (1.0 = unity gain)
  muted?: boolean;
  pan?: number; // -1.0 (left) to 1.0 (right)
  fadeInTicks?: TimelineTicks;
  fadeOutTicks?: TimelineTicks;
  denoise?: boolean;
  denoiseAmount?: number; // 0 - 100
  pitchSemitones?: number; // -12 to 12
  preservePitch?: boolean;
}

export interface EffectInstance {
  id: string;
  effectType: 'brightness' | 'contrast' | 'saturation' | 'opacity' | 'blur' | 'lut' | 'temperature' | 'tint' | 'vignette' | 'sharpen' | 'exposure' | 'highlights' | 'shadows' | 'hue' | 'sepia' | 'invert';
  enabled: boolean;
  parameters: Record<string, number | string | boolean>;
}

export interface TransitionInstance {
  id: string;
  transitionType: 'cross-dissolve' | 'fade-to-black' | 'hard-cut';
  durationTicks: TimelineTicks;
  outgoingClipId: string;
  incomingClipId: string;
}

export interface GeneratedSceneRef {
  templateId: string;
  sourceFilePath: string;
  props: Record<string, unknown>;
  renderedMediaPath?: string;
  lastRenderedAt?: string;
}

export interface Clip {
  id: string;
  assetId: string;
  trackId: string;
  timelineStartTicks: TimelineTicks;
  durationTicks: TimelineTicks;
  sourceInTicks: TimelineTicks;
  sourceOutTicks: TimelineTicks;
  speedNumerator?: number;
  speedDenominator?: number;
  transform?: ClipTransform;
  audio?: ClipAudio;
  effects: EffectInstance[];
  transitionRefs?: string[];
  generatedSceneRef?: GeneratedSceneRef;
}

export interface Track {
  id: string;
  name: string;
  kind: TrackKind;
  order: number;
  muted?: boolean;
  locked?: boolean;
  hidden?: boolean;
  clips: Clip[];
}

export interface ExportSettings {
  width: number;
  height: number;
  fpsNumerator: number;
  fpsDenominator: number;
  videoCodec: 'h264' | 'hevc' | 'prores';
  audioCodec: 'aac' | 'pcm';
  videoBitrateKbps: number;
  audioBitrateKbps: number;
  format: 'mp4';
}

export interface Project {
  id: string;
  schemaVersion: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  width: number;
  height: number;
  fpsNumerator: number;
  fpsDenominator: number;
  timelineTimebase: number; // ticks per second (default 120,000)
  tracks: Track[];
  assets: AssetReference[];
  transitions: TransitionInstance[];
  exportDefaults: ExportSettings;
  metadata?: Record<string, unknown>;
}
