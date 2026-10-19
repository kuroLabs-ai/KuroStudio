import { ticksToSeconds } from '@kuro/shared';
import { Clip, Project } from '@kuro/project-format';

export interface FFmpegCommandPlan {
  inputs: string[];
  filterComplex: string;
  outputArgs: string[];
}

export class FilterGraphBuilder {
  /**
   * Constructs deterministic FFmpeg CLI parameters and complex filter graph
   * from the project timeline and export settings.
   */
  public buildProjectExportPlan(project: Project, outputPath: string): FFmpegCommandPlan {
    const timebase = project.timelineTimebase;
    const { width, height, fpsNumerator, fpsDenominator, videoBitrateKbps, audioBitrateKbps } =
      project.exportDefaults;
    const targetFps = fpsNumerator / fpsDenominator;

    // 1. Collect all clips across video & audio tracks
    const allClipsWithAsset: { clip: Clip; assetPath: string; trackKind: string }[] = [];
    const inputPathToIndex = new Map<string, number>();
    const inputArgs: string[] = [];

    for (const track of project.tracks) {
      if (track.muted || track.hidden) continue;

      for (const clip of track.clips) {
        const asset = project.assets.find((a) => a.id === clip.assetId);
        if (!asset) continue;

        let inputIdx = inputPathToIndex.get(asset.filePath);
        if (inputIdx === undefined) {
          inputIdx = inputArgs.length / 2;
          inputPathToIndex.set(asset.filePath, inputIdx);
          inputArgs.push('-i', asset.filePath);
        }

        allClipsWithAsset.push({ clip, assetPath: asset.filePath, trackKind: track.kind });
      }
    }

    // 2. Build Video Filter Graph
    const videoFilterChains: string[] = [];
    const videoOutLabels: string[] = [];

    const videoClips = allClipsWithAsset.filter((c) => c.trackKind === 'video' || c.trackKind === 'overlay');

    videoClips.forEach(({ clip, assetPath }, idx) => {
      const inputIdx = inputPathToIndex.get(assetPath)!;
      const inSec = ticksToSeconds(clip.sourceInTicks, timebase);
      const outSec = ticksToSeconds(clip.sourceOutTicks, timebase);
      const timelineStartSec = ticksToSeconds(clip.timelineStartTicks, timebase);

      const label = `v_clip_${idx}`;
      let chain = `[${inputIdx}:v]trim=start=${inSec.toFixed(3)}:end=${outSec.toFixed(3)},setpts=PTS-STARTPTS`;

      // Visual adjustments (brightness, contrast, saturation)
      const eqEffects = clip.effects.filter(
        (e) => e.enabled && ['brightness', 'contrast', 'saturation'].includes(e.effectType)
      );
      if (eqEffects.length > 0) {
        const brightness = Number(eqEffects.find((e) => e.effectType === 'brightness')?.parameters['value'] ?? 0);
        const contrast = Number(eqEffects.find((e) => e.effectType === 'contrast')?.parameters['value'] ?? 1);
        const saturation = Number(eqEffects.find((e) => e.effectType === 'saturation')?.parameters['value'] ?? 1);
        chain += `,eq=brightness=${brightness.toFixed(2)}:contrast=${contrast.toFixed(2)}:saturation=${saturation.toFixed(2)}`;
      }

      // Scale & letterbox to project canvas
      chain += `,scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=${targetFps}`;

      // Delay to timeline start
      if (timelineStartSec > 0) {
        chain += `,tpad=start_duration=${timelineStartSec.toFixed(3)}`;
      }

      chain += `[${label}]`;
      videoFilterChains.push(chain);
      videoOutLabels.push(`[${label}]`);
    });

    // Composite video clips via overlay
    let finalVideoLabel = '';
    if (videoOutLabels.length === 0) {
      // Empty timeline video generator
      videoFilterChains.push(`color=c=black:s=${width}x${height}:r=${targetFps}:d=1[vout]`);
      finalVideoLabel = '[vout]';
    } else if (videoOutLabels.length === 1) {
      finalVideoLabel = videoOutLabels[0]!;
    } else {
      let currentBase = videoOutLabels[0]!;
      for (let i = 1; i < videoOutLabels.length; i++) {
        const nextOverlay = videoOutLabels[i]!;
        const combinedLabel = `[v_comp_${i}]`;
        videoFilterChains.push(`${currentBase}${nextOverlay}overlay=eof_action=pass${combinedLabel}`);
        currentBase = combinedLabel;
      }
      finalVideoLabel = currentBase;
    }

    // 3. Build Audio Filter Graph
    const audioFilterChains: string[] = [];
    const audioOutLabels: string[] = [];

    const audioClips = allClipsWithAsset.filter((c) => c.trackKind === 'audio' || c.trackKind === 'video');

    audioClips.forEach(({ clip, assetPath }, idx) => {
      const inputIdx = inputPathToIndex.get(assetPath)!;
      const inSec = ticksToSeconds(clip.sourceInTicks, timebase);
      const outSec = ticksToSeconds(clip.sourceOutTicks, timebase);
      const timelineStartMs = Math.round(ticksToSeconds(clip.timelineStartTicks, timebase) * 1000);
      const volume = clip.audio?.volume ?? 1.0;

      const label = `a_clip_${idx}`;
      let chain = `[${inputIdx}:a]atrim=start=${inSec.toFixed(3)}:end=${outSec.toFixed(3)},asetpts=PTS-STARTPTS`;

      if (volume !== 1.0) {
        chain += `,volume=${volume.toFixed(2)}`;
      }

      // Audio fades
      if (clip.audio?.fadeInTicks && clip.audio.fadeInTicks > 0) {
        const fadeInSec = ticksToSeconds(clip.audio.fadeInTicks, timebase);
        chain += `,afade=t=in:st=0:d=${fadeInSec.toFixed(3)}`;
      }
      if (clip.audio?.fadeOutTicks && clip.audio.fadeOutTicks > 0) {
        const fadeOutSec = ticksToSeconds(clip.audio.fadeOutTicks, timebase);
        const durationSec = outSec - inSec;
        const fadeOutStartSec = durationSec - fadeOutSec;
        chain += `,afade=t=out:st=${fadeOutStartSec.toFixed(3)}:d=${fadeOutSec.toFixed(3)}`;
      }

      if (timelineStartMs > 0) {
        chain += `,adelay=${timelineStartMs}|${timelineStartMs}`;
      }

      chain += `[${label}]`;
      audioFilterChains.push(chain);
      audioOutLabels.push(`[${label}]`);
    });

    let finalAudioLabel = '';
    if (audioOutLabels.length === 0) {
      audioFilterChains.push(`anullsrc=r=48000:cl=stereo:d=1[aout]`);
      finalAudioLabel = '[aout]';
    } else if (audioOutLabels.length === 1) {
      finalAudioLabel = audioOutLabels[0]!;
    } else {
      audioFilterChains.push(
        `${audioOutLabels.join('')}amix=inputs=${audioOutLabels.length}:normalize=0[aout]`
      );
      finalAudioLabel = '[aout]';
    }

    const filterComplex = [...videoFilterChains, ...audioFilterChains].join(';');

    const outputArgs = [
      '-filter_complex',
      filterComplex,
      '-map',
      finalVideoLabel,
      '-map',
      finalAudioLabel,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-b:v',
      `${videoBitrateKbps}k`,
      '-c:a',
      'aac',
      '-b:a',
      `${audioBitrateKbps}k`,
      '-pix_fmt',
      'yuv420p',
      '-y',
      outputPath,
    ];

    return {
      inputs: inputArgs,
      filterComplex,
      outputArgs,
    };
  }
}
