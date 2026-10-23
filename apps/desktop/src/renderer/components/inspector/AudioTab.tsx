import React from 'react';
import { Clip, ClipAudio } from '@kuro/project-format';
import {
  Volume2,
  VolumeX,
  Volume1,
  Activity,
  Sliders,
  AudioWaveform,
  SlidersHorizontal,
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
    <div className="space-y-4 text-xs select-none">
      {/* ─── 1. Volume & Mute Section ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Volume2 className="w-3 h-3" />
            Audio Level
          </span>
          <button
            onClick={() => onUpdateAudio({ volume: 1.0, muted: false })}
            className="text-[10px] font-mono text-[var(--kuro-text-muted)] hover:text-white transition cursor-pointer"
            title="Reset Volume to 100%"
          >
            Reset
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUpdateAudio({ muted: !isMuted })}
                className={`p-1 rounded transition cursor-pointer ${
                  isMuted ? 'bg-red-500/20 text-red-400' : 'text-[var(--kuro-text-muted)] hover:text-white'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <span className="text-[var(--kuro-text-secondary)]">Master Volume</span>
            </div>
            <span className="font-mono text-white font-medium">{volumePercent}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="200"
            value={volumePercent}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[var(--kuro-text-muted)] font-mono">
            <span>0%</span>
            <span>100% (Unity)</span>
            <span>200% (+6dB)</span>
          </div>
        </div>
      </div>

      {/* ─── 2. Smooth Audio Fades ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Activity className="w-3 h-3" />
          Fades (In & Out)
        </span>

        {/* Fade In */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Fade In Duration</span>
            <span className="font-mono text-white font-medium">{fadeInSec}s</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={parseFloat(fadeInSec)}
            onChange={(e) => handleFadeInChange(parseFloat(e.target.value))}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>

        {/* Fade Out */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Fade Out Duration</span>
            <span className="font-mono text-white font-medium">{fadeOutSec}s</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={parseFloat(fadeOutSec)}
            onChange={(e) => handleFadeOutChange(parseFloat(e.target.value))}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>
      </div>

      {/* ─── 3. Stereo Pan / Balance ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <SlidersHorizontal className="w-3 h-3" />
            Stereo Pan
          </span>
          <button
            onClick={() => onUpdateAudio({ pan: 0 })}
            className="text-[10px] font-mono text-[var(--kuro-text-muted)] hover:text-white transition cursor-pointer"
            title="Reset Pan to Center"
          >
            Center
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Balance</span>
            <span className="font-mono text-white font-medium">
              {panPercent === 0 ? 'Center' : panPercent < 0 ? `L ${Math.abs(panPercent)}%` : `R ${panPercent}%`}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={panPercent}
            onChange={(e) => handlePanChange(parseInt(e.target.value, 10))}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[var(--kuro-text-muted)] font-mono">
            <span>Left (L)</span>
            <span>Center (C)</span>
            <span>Right (R)</span>
          </div>
        </div>
      </div>

      {/* ─── 4. Voice & Noise Enhancements ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <AudioWaveform className="w-3 h-3" />
          Sound Enhancements
        </span>

        {/* Noise Reduction Toggle */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-[var(--kuro-text-primary)] font-medium">Noise Reduction (Denoise)</span>
            <button
              onClick={() => onUpdateAudio({ denoise: !audio.denoise })}
              className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                audio.denoise ? 'bg-white' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-black absolute top-0.5 transition-transform ${
                  audio.denoise ? 'left-4.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {audio.denoise && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-[10px] text-[var(--kuro-text-muted)] font-mono">
                <span>INTENSITY</span>
                <span className="text-white">{audio.denoiseAmount ?? 50}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={audio.denoiseAmount ?? 50}
                onChange={(e) => onUpdateAudio({ denoiseAmount: parseInt(e.target.value, 10) })}
                className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Pitch Shift */}
        <div className="space-y-1 pt-1 border-t border-[var(--kuro-border-subtle)]">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Pitch Shift</span>
            <span className="font-mono text-white font-medium">
              {(audio.pitchSemitones ?? 0) > 0 ? `+${audio.pitchSemitones}` : audio.pitchSemitones ?? 0} st
            </span>
          </div>
          <input
            type="range"
            min="-12"
            max="12"
            value={audio.pitchSemitones ?? 0}
            onChange={(e) => onUpdateAudio({ pitchSemitones: parseInt(e.target.value, 10) })}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[var(--kuro-text-muted)] font-mono">
            <span>-12 (Deep)</span>
            <span>0 (Normal)</span>
            <span>+12 (High)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
