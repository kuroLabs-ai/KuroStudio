import React from 'react';
import { Clip } from '@kuro/project-format';
import { formatHumanDuration } from '../timeline/timelineUtils';
import {
  Gauge,
  FastForward,
  RotateCcw,
  Clock,
  Music,
} from 'lucide-react';

interface SpeedTabProps {
  clip: Clip;
  timelineTimebase: number;
  onUpdateSpeed: (speedMultiplier: number, preservePitch?: boolean) => void;
}

export const SpeedTab: React.FC<SpeedTabProps> = ({ clip, timelineTimebase, onUpdateSpeed }) => {
  const currentSpeed =
    clip.speedNumerator && clip.speedDenominator
      ? clip.speedNumerator / clip.speedDenominator
      : 1.0;

  const currentDurationSec = clip.durationTicks / timelineTimebase;
  const preservePitch = clip.audio?.preservePitch ?? true;

  const presets = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0, 8.0];

  return (
    <div className="space-y-4 text-xs select-none">
      {/* ─── 1. Speed Multiplier Slider & Presets ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Gauge className="w-3 h-3" />
            Playback Speed
          </span>
          <button
            onClick={() => onUpdateSpeed(1.0, preservePitch)}
            className="text-[10px] font-mono text-[var(--kuro-text-muted)] hover:text-white transition cursor-pointer"
            title="Reset Speed to 1.0x (Normal)"
          >
            Reset (1x)
          </button>
        </div>

        {/* Speed Value Display */}
        <div className="flex items-center justify-between bg-[var(--kuro-bg-panel)] p-2 rounded border border-[var(--kuro-border-subtle)]">
          <div className="flex items-center gap-1.5 text-white font-mono font-bold text-base">
            <FastForward className="w-4 h-4 text-white/80" />
            <span>{currentSpeed.toFixed(2)}x</span>
          </div>
          <span className="text-[10px] text-[var(--kuro-text-muted)] font-mono">
            {currentSpeed > 1.0 ? 'FAST MOTION' : currentSpeed < 1.0 ? 'SLOW MOTION' : 'NORMAL'}
          </span>
        </div>

        {/* Slider */}
        <div className="space-y-1">
          <input
            type="range"
            min="0.1"
            max="6.0"
            step="0.05"
            value={currentSpeed}
            onChange={(e) => onUpdateSpeed(parseFloat(e.target.value), preservePitch)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[var(--kuro-text-muted)] font-mono">
            <span>0.1x (Slow)</span>
            <span>1.0x</span>
            <span>6.0x (Fast)</span>
          </div>
        </div>

        {/* Quick Presets Grid */}
        <div className="grid grid-cols-3 gap-1 pt-1">
          {presets.map((s) => (
            <button
              key={s}
              onClick={() => onUpdateSpeed(s, preservePitch)}
              className={`py-1 text-center text-[11px] font-mono rounded border transition cursor-pointer ${
                Math.abs(currentSpeed - s) < 0.02
                  ? 'bg-white text-black font-bold border-white'
                  : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-primary)] border-[var(--kuro-border-subtle)] hover:bg-[var(--kuro-bg-hover)]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* ─── 2. Resulting Duration ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-2">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          Clip Duration
        </span>
        <div className="flex justify-between items-center text-[11px] pt-1">
          <span className="text-[var(--kuro-text-secondary)]">Timeline Duration</span>
          <span className="font-mono text-white font-bold bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded border border-[var(--kuro-border-subtle)]">
            {formatHumanDuration(currentDurationSec)} ({currentDurationSec.toFixed(2)}s)
          </span>
        </div>
      </div>

      {/* ─── 3. Audio Pitch Preservation ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <Music className="w-3 h-3 text-[var(--kuro-text-muted)]" />
            <span className="text-[11px] text-[var(--kuro-text-primary)] font-medium">Preserve Voice Pitch</span>
          </div>
          <button
            onClick={() => onUpdateSpeed(currentSpeed, !preservePitch)}
            className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
              preservePitch ? 'bg-white' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-black absolute top-0.5 transition-transform ${
                preservePitch ? 'left-4.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
        <p className="text-[10px] text-[var(--kuro-text-muted)]">
          Prevents voice from sounding like a chipmunk when sped up or deep when slowed down.
        </p>
      </div>
    </div>
  );
};
