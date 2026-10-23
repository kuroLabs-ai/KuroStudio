import React from 'react';
import { Clip } from '@kuro/project-format';
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

  const currentDurationSec = (clip.durationTicks / timelineTimebase).toFixed(2);
  const preservePitch = clip.audio?.preservePitch ?? true;

  const presets = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0];

  return (
    <div className="space-y-3.5 text-xs select-none pb-6">
      {/* ── 1. Speed Multiplier Slider & Presets ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            Playback Rate (Speed)
          </span>
          <button
            onClick={() => onUpdateSpeed(1.0, preservePitch)}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white transition flex items-center gap-1 cursor-pointer"
            title="Reset Speed to 1.0x (Normal)"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset (1.0x)
          </button>
        </div>

        {/* Speed HUD Banner */}
        <div className="flex items-center justify-between bg-[var(--kuro-bg-panel)] p-2.5 rounded-lg border border-[var(--kuro-border-subtle)]">
          <div className="flex items-center gap-2">
            <FastForward className="w-4 h-4 text-amber-400" />
            <span className="text-white font-mono font-bold text-base tracking-wide">
              {currentSpeed.toFixed(2)}x
            </span>
          </div>
          <span
            className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold border ${
              currentSpeed > 1.0
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : currentSpeed < 1.0
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            }`}
          >
            {currentSpeed > 1.0 ? 'FAST MOTION' : currentSpeed < 1.0 ? 'SLOW MOTION' : 'NORMAL (100%)'}
          </span>
        </div>

        {/* Slider */}
        <div className="space-y-1.5">
          <input
            type="range"
            min="0.1"
            max="6.0"
            step="0.05"
            value={currentSpeed}
            onChange={(e) => onUpdateSpeed(parseFloat(e.target.value), preservePitch)}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex justify-between text-[8px] text-[var(--kuro-text-muted)] font-mono">
            <span>0.1x (Slow)</span>
            <span>1.0x (Normal)</span>
            <span>6.0x (Fast)</span>
          </div>
        </div>

        {/* Quick Presets Grid */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {presets.map((s) => (
            <button
              key={s}
              onClick={() => onUpdateSpeed(s, preservePitch)}
              className={`py-1 text-center text-[10px] font-mono rounded border transition cursor-pointer ${
                Math.abs(currentSpeed - s) < 0.02
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-subtle)] hover:text-white hover:bg-[var(--kuro-bg-hover)]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. Duration & Audio Pitch Options ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          Timeline Duration Impact
        </span>

        <div className="flex justify-between items-center text-[11px] p-2 rounded bg-[var(--kuro-bg-panel)] border border-[var(--kuro-border-subtle)]">
          <span className="text-[var(--kuro-text-secondary)]">New Clip Length</span>
          <span className="font-mono text-white font-bold">{currentDurationSec} seconds</span>
        </div>

        {/* Pitch Lock Toggle */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--kuro-text-secondary)]">
            <Music className="w-3.5 h-3.5 text-purple-400" />
            <span>Preserve Audio Pitch</span>
          </div>
          <button
            onClick={() => onUpdateSpeed(currentSpeed, !preservePitch)}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer border ${
              preservePitch
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)] border-[var(--kuro-border-subtle)]'
            }`}
          >
            {preservePitch ? 'Active' : 'Off'}
          </button>
        </div>
      </div>
    </div>
  );
};
