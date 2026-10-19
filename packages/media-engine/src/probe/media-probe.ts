import { TimelineTicks } from '@kuro/shared';

export interface MediaStreamInfo {
  index: number;
  codecType: 'video' | 'audio' | 'subtitle';
  codecName: string;
  width?: number;
  height?: number;
  fpsNumerator?: number;
  fpsDenominator?: number;
  channels?: number;
  sampleRate?: number;
  bitrate?: number;
}

export interface MediaProbeResult {
  filePath: string;
  formatName: string;
  durationSeconds: number;
  durationTicks: TimelineTicks;
  fileSizeBytes: number;
  videoStream?: MediaStreamInfo;
  audioStream?: MediaStreamInfo;
  allStreams: MediaStreamInfo[];
}
