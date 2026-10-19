import { TimelineTicks } from '@kuro/shared';
import { FadeCurveType } from '../types/audio';

export interface ClipFadeProfile {
  clipDurationTicks: TimelineTicks;
  fadeInTicks?: TimelineTicks;
  fadeOutTicks?: TimelineTicks;
  curveType?: FadeCurveType;
}

/**
 * Calculates instantaneous normalized gain multiplier (0.0 to 1.0)
 * at a given offset within a clip, applying fade-in and fade-out curves.
 */
export function getFadeMultiplier(offsetTicks: TimelineTicks, profile: ClipFadeProfile): number {
  const { clipDurationTicks, fadeInTicks = 0, fadeOutTicks = 0, curveType = 'linear' } = profile;

  if (offsetTicks < 0 || offsetTicks > clipDurationTicks) {
    return 0;
  }

  let inGain = 1.0;
  if (fadeInTicks > 0 && offsetTicks < fadeInTicks) {
    const progress = offsetTicks / fadeInTicks;
    inGain = applyCurve(progress, curveType);
  }

  let outGain = 1.0;
  const fadeOutStart = clipDurationTicks - fadeOutTicks;
  if (fadeOutTicks > 0 && offsetTicks > fadeOutStart) {
    const progress = (clipDurationTicks - offsetTicks) / fadeOutTicks;
    outGain = applyCurve(progress, curveType);
  }

  return Math.min(inGain, outGain);
}

function applyCurve(progress: number, curve: FadeCurveType): number {
  const p = Math.max(0, Math.min(1, progress));
  switch (curve) {
    case 'linear':
      return p;
    case 'exponential':
      return Math.pow(p, 2);
    case 's-curve':
      // Smooth sinusoidal s-curve
      return 0.5 * (1 - Math.cos(Math.PI * p));
  }
}
