/**
 * KuroStudio Time System
 *
 * Implements strict integer tick-based timeline mathematics.
 * Uses a default timebase of 120,000 ticks per second, which is evenly divisible
 * by common production frame rates (24, 25, 30, 48, 50, 60, 100, 120 fps).
 */

export const DEFAULT_TICKS_PER_SECOND = 120_000;

export type TimelineTicks = number; // Integer representation of timeline time

export interface TimecodeOptions {
  timebase?: number;
  fpsNumerator: number;
  fpsDenominator: number;
}

/**
 * Converts fractional seconds to integer timeline ticks.
 */
export function secondsToTicks(seconds: number, timebase: number = DEFAULT_TICKS_PER_SECOND): TimelineTicks {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError(`Invalid seconds value: ${seconds}. Must be a non-negative finite number.`);
  }
  return Math.round(seconds * timebase);
}

/**
 * Converts integer timeline ticks to fractional seconds.
 */
export function ticksToSeconds(ticks: TimelineTicks, timebase: number = DEFAULT_TICKS_PER_SECOND): number {
  if (!Number.isInteger(ticks) || ticks < 0) {
    throw new RangeError(`Invalid ticks value: ${ticks}. Must be a non-negative integer.`);
  }
  return ticks / timebase;
}

/**
 * Converts timeline ticks to exact frame number at the specified frame rate.
 */
export function ticksToFrames(ticks: TimelineTicks, options: TimecodeOptions): number {
  const timebase = options.timebase ?? DEFAULT_TICKS_PER_SECOND;
  const fps = options.fpsNumerator / options.fpsDenominator;
  const ticksPerFrame = timebase / fps;
  return Math.floor(ticks / ticksPerFrame);
}

/**
 * Converts frame number to exact start timeline ticks at the specified frame rate.
 */
export function framesToTicks(frames: number, options: TimecodeOptions): TimelineTicks {
  if (!Number.isInteger(frames) || frames < 0) {
    throw new RangeError(`Invalid frames value: ${frames}. Must be a non-negative integer.`);
  }
  const timebase = options.timebase ?? DEFAULT_TICKS_PER_SECOND;
  const fps = options.fpsNumerator / options.fpsDenominator;
  const ticksPerFrame = timebase / fps;
  return Math.round(frames * ticksPerFrame);
}

/**
 * Formats timeline ticks into a standard SMPTE timecode string: HH:MM:SS:FF
 */
export function formatTimecode(ticks: TimelineTicks, options: TimecodeOptions): string {
  const fps = Math.round(options.fpsNumerator / options.fpsDenominator);
  const totalFrames = ticksToFrames(ticks, options);

  const ff = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const ss = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const mm = totalMinutes % 60;
  const hh = Math.floor(totalMinutes / 60);

  const pad = (val: number, len = 2) => String(val).padStart(len, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}:${pad(ff)}`;
}

/**
 * Parses an SMPTE timecode string (HH:MM:SS:FF) into integer timeline ticks.
 */
export function parseTimecode(timecode: string, options: TimecodeOptions): TimelineTicks {
  const parts = timecode.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0)) {
    throw new Error(`Malformed timecode string: "${timecode}". Expected format HH:MM:SS:FF.`);
  }

  const [hh, mm, ss, ff] = parts as [number, number, number, number];
  const fps = Math.round(options.fpsNumerator / options.fpsDenominator);

  if (ff >= fps) {
    throw new RangeError(`Frame component ${ff} exceeds project frame rate of ${fps} fps.`);
  }

  const totalFrames = ((hh * 60 + mm) * 60 + ss) * fps + ff;
  return framesToTicks(totalFrames, options);
}
