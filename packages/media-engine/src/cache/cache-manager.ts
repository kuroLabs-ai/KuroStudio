import { generateId } from '@kuro/shared';

export interface ThumbnailJobOptions {
  assetId: string;
  sourceFilePath: string;
  targetDir: string;
  timestampSeconds?: number;
  width?: number;
}

export interface WaveformJobOptions {
  assetId: string;
  sourceFilePath: string;
  targetDir: string;
  samplePoints?: number;
}

export interface ProxyJobOptions {
  assetId: string;
  sourceFilePath: string;
  targetDir: string;
  targetHeight?: number; // e.g. 720
}

export class MediaCacheManager {
  private thumbnailCache = new Map<string, string>(); // assetId -> cached thumbnail path
  private waveformCache = new Map<string, string>(); // assetId -> cached waveform JSON path
  private proxyCache = new Map<string, string>(); // assetId -> cached proxy video path

  public buildThumbnailCommand(options: ThumbnailJobOptions): { outputPath: string; args: string[] } {
    const outputPath = `${options.targetDir}/thumb_${options.assetId}.jpg`;
    const sec = options.timestampSeconds ?? 1.0;
    const w = options.width ?? 320;
    const args = [
      '-ss',
      sec.toFixed(2),
      '-i',
      options.sourceFilePath,
      '-vframes',
      '1',
      '-vf',
      `scale=${w}:-1`,
      '-q:v',
      '3',
      '-y',
      outputPath,
    ];
    return { outputPath, args };
  }

  public buildWaveformCommand(options: WaveformJobOptions): { outputPath: string; args: string[] } {
    const outputPath = `${options.targetDir}/waveform_${options.assetId}.dat`;
    // Generates raw 16-bit mono 100Hz audio samples for waveform rendering
    const args = [
      '-i',
      options.sourceFilePath,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '100',
      '-f',
      's16le',
      '-y',
      outputPath,
    ];
    return { outputPath, args };
  }

  public buildProxyCommand(options: ProxyJobOptions): { outputPath: string; args: string[] } {
    const outputPath = `${options.targetDir}/proxy_${options.assetId}.mp4`;
    const h = options.targetHeight ?? 720;
    const args = [
      '-i',
      options.sourceFilePath,
      '-vf',
      `scale=-2:${h}`,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '26',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-y',
      outputPath,
    ];
    return { outputPath, args };
  }

  public recordThumbnail(assetId: string, path: string): void {
    this.thumbnailCache.set(assetId, path);
  }

  public getThumbnail(assetId: string): string | undefined {
    return this.thumbnailCache.get(assetId);
  }

  public recordWaveform(assetId: string, path: string): void {
    this.waveformCache.set(assetId, path);
  }

  public getWaveform(assetId: string): string | undefined {
    return this.waveformCache.get(assetId);
  }

  public recordProxy(assetId: string, path: string): void {
    this.proxyCache.set(assetId, path);
  }

  public getProxy(assetId: string): string | undefined {
    return this.proxyCache.get(assetId);
  }
}
