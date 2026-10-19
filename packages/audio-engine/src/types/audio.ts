export type FadeCurveType = 'linear' | 'exponential' | 's-curve';

export interface AudioLevels {
  left: number; // 0.0 - 1.0 (peak level)
  right: number; // 0.0 - 1.0 (peak level)
}

/**
 * Converts a linear amplitude gain (0.0 to 2.0) to decibels (dB).
 * 1.0 -> 0 dB
 * 0.5 -> ~ -6 dB
 * 2.0 -> ~ +6 dB
 */
export function gainToDecibels(gain: number): number {
  if (gain <= 0.0001) return -100; // Digital silence floor
  return 20 * Math.log10(gain);
}

/**
 * Converts decibels (dB) to linear amplitude gain.
 */
export function decibelsToGain(db: number): number {
  if (db <= -100) return 0;
  return Math.pow(10, db / 20);
}

/**
 * Calculates stereo pan multiplier using constant-power panning law.
 * Pan ranges from -1.0 (full left) to +1.0 (full right).
 */
export function calculateConstantPowerPan(pan: number): { leftGain: number; rightGain: number } {
  // Normalize pan from [-1, 1] to [0, 1]
  const clampedPan = Math.max(-1, Math.min(1, pan));
  const angle = ((clampedPan + 1) * Math.PI) / 4; // 0 to PI/2
  return {
    leftGain: Math.cos(angle),
    rightGain: Math.sin(angle),
  };
}
