import React from 'react';
import { Sparkles, Camera, RotateCcw, Compass } from 'lucide-react';

interface ColorFilmFXTabProps {
  vignette: number;
  grain: number;
  blur: number;
  sepia: number;
  invert: number;
  onUpdateParam: (key: string, value: number, defaultValue: number) => void;
  onResetFX: () => void;
}

export const ColorFilmFXTab: React.FC<ColorFilmFXTabProps> = ({
  vignette,
  grain,
  blur,
  sepia,
  invert,
  onUpdateParam,
  onResetFX,
}) => {
  return (
    <div className="space-y-3.5 select-none text-xs">
      {/* ── 1. Cinematic Vignette ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-purple-400" />
            Vignette (Corner Falloff)
          </span>
          <button
            onClick={() => onUpdateParam('vignette', 0, 0)}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white flex items-center gap-1 transition"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Amount</span>
            <span className="font-mono text-white text-[10px]">{vignette}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={vignette}
            onChange={(e) => onUpdateParam('vignette', parseFloat(e.target.value), 0)}
            onDoubleClick={() => onUpdateParam('vignette', 0, 0)}
            className="w-full accent-purple-400 cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[8px] text-[var(--kuro-text-muted)] font-mono">
            <span>Off (0%)</span>
            <span>Subtle</span>
            <span>Heavy (100%)</span>
          </div>
        </div>
      </div>

      {/* ── 2. Analog Film Grain Simulation ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            Film Stock Grain
          </span>
          <button
            onClick={() => onUpdateParam('grain', 0, 0)}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white flex items-center gap-1 transition"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        </div>

        {/* Grain Intensity */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Grain Roughness</span>
            <span className="font-mono text-white text-[10px]">{grain}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={grain}
            onChange={(e) => onUpdateParam('grain', parseFloat(e.target.value), 0)}
            onDoubleClick={() => onUpdateParam('grain', 0, 0)}
            className="w-full accent-amber-400 cursor-pointer h-1.5"
          />
        </div>

        {/* Stock Format Presets */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {[
            { label: '35mm Fine', val: 20 },
            { label: '16mm Medium', val: 45 },
            { label: '8mm Heavy', val: 75 },
          ].map((stock) => (
            <button
              key={stock.label}
              onClick={() => onUpdateParam('grain', stock.val, 0)}
              className="py-1 rounded bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] border border-[var(--kuro-border-subtle)] text-[10px] text-white font-medium transition cursor-pointer text-center"
            >
              {stock.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. Creative Stylize Filters ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Creative Lens & Stylize
          </span>
          <button
            onClick={() => {
              onUpdateParam('blur', 0, 0);
              onUpdateParam('sepia', 0, 0);
              onUpdateParam('invert', 0, 0);
            }}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white flex items-center gap-1 transition"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        </div>

        {/* Blur */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Lens Defocus / Blur</span>
            <span className="font-mono text-white text-[10px]">{blur} px</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={blur}
            onChange={(e) => onUpdateParam('blur', parseFloat(e.target.value), 0)}
            onDoubleClick={() => onUpdateParam('blur', 0, 0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer h-1.5"
          />
        </div>

        {/* Sepia & Invert in 2 columns */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[var(--kuro-border-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--kuro-text-secondary)]">Vintage Sepia</span>
              <span className="font-mono text-white">{sepia}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={sepia}
              onChange={(e) => onUpdateParam('sepia', parseFloat(e.target.value), 0)}
              onDoubleClick={() => onUpdateParam('sepia', 0, 0)}
              className="w-full accent-amber-600 cursor-pointer h-1.5"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--kuro-text-secondary)]">Color Invert</span>
              <span className="font-mono text-white">{invert}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={invert}
              onChange={(e) => onUpdateParam('invert', parseFloat(e.target.value), 0)}
              onDoubleClick={() => onUpdateParam('invert', 0, 0)}
              className="w-full accent-emerald-500 cursor-pointer h-1.5"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
