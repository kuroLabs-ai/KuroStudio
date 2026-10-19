import { DEFAULT_TICKS_PER_SECOND, generateId } from '@kuro/shared';
import { CURRENT_PROJECT_SCHEMA_VERSION, ExportSettings, Project, Track } from './project';

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  width: 1920,
  height: 1080,
  fpsNumerator: 30,
  fpsDenominator: 1,
  videoCodec: 'h264',
  audioCodec: 'aac',
  videoBitrateKbps: 8000,
  audioBitrateKbps: 192,
  format: 'mp4',
};

export function createDefaultTracks(): Track[] {
  return [
    {
      id: generateId('trk_v1'),
      name: 'Video 1',
      kind: 'video',
      order: 0,
      muted: false,
      locked: false,
      hidden: false,
      clips: [],
    },
    {
      id: generateId('trk_a1'),
      name: 'Audio 1',
      kind: 'audio',
      order: 1,
      muted: false,
      locked: false,
      hidden: false,
      clips: [],
    },
  ];
}

export function createNewProject(name = 'Untitled Project', width = 1920, height = 1080, fps = 30): Project {
  const now = new Date().toISOString();
  return {
    id: generateId('proj'),
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    name,
    createdAt: now,
    updatedAt: now,
    width,
    height,
    fpsNumerator: fps,
    fpsDenominator: 1,
    timelineTimebase: DEFAULT_TICKS_PER_SECOND,
    tracks: createDefaultTracks(),
    assets: [],
    transitions: [],
    exportDefaults: {
      ...DEFAULT_EXPORT_SETTINGS,
      width,
      height,
      fpsNumerator: fps,
    },
    metadata: {},
  };
}
