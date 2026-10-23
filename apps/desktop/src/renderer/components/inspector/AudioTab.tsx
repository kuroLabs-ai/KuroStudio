import React from 'react';
import { Clip, ClipAudio } from '@kuro/project-format';
import {
  Volume2,
  VolumeX,
  Volume1,
  Activity,
  Sliders,
  AudioWaveform,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface AudioTabProps {
  clip: Clip;
  timelineTimebase: number;
  onUpdateAudio: (audio: Partial<ClipAudio>) => void;
}

export const AudioTab: React.FC<AudioTabProps> = ({ clip, timelineTimebase, onUpdateAudio }) => {
  const audio: ClipAudio = clip.audio || {
    volume: 1.0,
    muted: false,
    pan: 0,
    fadeInTicks: 0,
    fadeOutTicks: 0,
    denoise: false,
    denoiseAmount: 50,
    pitchSemitones: 0,
  };

  const volumePercent = Math.round((audio.volume ?? 1.0) * 100);
  const isMuted = !!audio.muted;
  const panPercent = Math.round((audio.pan ?? 0) * 100);
  const fadeInSec = ((audio.fadeInTicks ?? 0) / timelineTimebase).toFixed(1);
  const fadeOutSec = ((audio.fadeOutTicks ?? 0) / timelineTimebase).toFixed(1);

  const handleVolumeChange = (volPercent: number) => {
    onUpdateAudio({ volume: Math.max(0, Math.min(2.0, volPercent / 100)) });
  };

  const handleFadeInChange = (sec: number) => {
    onUpdateAudio({ fadeInTicks: Math.round(sec * timelineTimebase) });
  };

  const handleFadeOutChange = (sec: number) => {
    onUpdateAudio({ fadeOutTicks: Math.round(sec * timelineTimebase) });
  };

  const handlePanChange = (panVal: number) => {
    onUpdateAudio({ pan: Math.max(-1.0, Math.min(1.0, panVal / 100)) });
  };

  return (
    <div className="space-y-3.5 text-xs select-none pb-6">
      {/* ── 1. Master Audio Level & Mute ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            Audio Gain & Level
          </span>
          <button
            onClick={() => onUpdateAudio({ volume: 1.0, muted: false })}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white transition flex items-center gap-1 cursor-pointer"
            title="Reset volume to 100%"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset (100%)
          </button>
        </div>

        {/* Master Volume Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateAudio({ muted: !isMuted })}
                className={`p-1 rounded transition cursor-pointer ${
                  isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-secondary)] hover:text-white border border-[var(--kuro-border-subtle)]'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <span className="text-[var(--kuro-text-secondary)] font-medium">Gain</span>
            </div>
            <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
              {isMuted ? 'MUTED' : `${volumePercent}%`}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="200"
            value={isMuted ? 0 : volumePercent}
            onChange={(e) => {
              handleVolumeChange(parseFloat(e.target.value));
              if (isMuted) onUpdateAudio({ muted: false });
            }}
            className="w-full accent-emerald-400 cursor-pointer"
          />

          {/* Quick Gain Presets */}
          <div className="grid grid-cols-5 gap-1 pt-1">
            {[0, 50, 100, 150, 200].map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  handleVolumeChange(preset);
                  if (preset === 0) onUpdateAudio({ muted: true });
                  else if (isMuted) onUpdateAudio({ muted: false });
                }}
                className={`py-1 rounded text-[10px] font-mono transition cursor-pointer text-center ${
                  !isMuted && volumePercent === preset
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)] hover:text-white border border-[var(--kuro-border-subtle)]'
                }`}
              >
                {preset === 0 ? 'Mute' : `${preset}%`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. Stereo Pan (Balance) ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            Stereo Pan (Balance)
          </span>
          <button
            onClick={() => onUpdateAudio({ pan: 0 })}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white transition flex items-center gap-1 cursor-pointer"
            title="Center Pan"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Center
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] font-medium">L/R Balance</span>
            <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
              {panPercent === 0 ? 'Center (0)' : panPercent < 0 ? `L ${Math.abs(panPercent)}%` : `R ${panPercent}%`}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={panPercent}
            onChange={(e) => handlePanChange(parseFloat(e.target.value))}
            onDoubleClick={() => onUpdateAudio({ pan: 0 })}
            className="w-full accent-blue-400 cursor-pointer"
          />
          <div className="flex justify-between text-[8px] text-[var(--kuro-text-muted)] font-mono">
            <span>Left (-100)</span>
            <span>Center</span>
            <span>Right (+100)</span>
          </div>
        </div>
      </div>

      {/* ── 3. Fades (Fade In / Fade Out) ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <AudioWaveform className="w-3.5 h-3.5 text-cyan-400" />
            Audio Envelope Fades
          </span>
          <button
            onClick={() => onUpdateAudio({ fadeInTicks: 0, fadeOutTicks: 0 })}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        </div>

        {/* Fade In */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] font-medium">Fade In Duration</span>
            <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
              {fadeInSec} s
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={parseFloat(fadeInSec)}
            onChange={(e) => handleFadeInChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Fade Out */}
        <div className="space-y-1 pt-1 border-t border-[var(--kuro-border-subtle)]">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] font-medium">Fade Out Duration</span>
            <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
              {fadeOutSec} s
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={parseFloat(fadeOutSec)}
            onChange={(e) => handleFadeOutChange(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
