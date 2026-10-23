import React from 'react';
import { Sun, Thermometer, Droplets, RotateCcw } from 'lucide-react';

interface ColorBasicTabProps {
  temperature: number;
  tint: number;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  saturation: number;
  vibrance: number;
  onUpdateParam: (key: string, value: number, defaultValue: number) => void;
  onResetBasic: () => void;
}

export const ColorBasicTab: React.FC<ColorBasicTabProps> = ({
  temperature,
  tint,
  exposure,
  contrast,
  highlights,
  shadows,
  whites,
  blacks,
  saturation,
  vibrance,
  onUpdateParam,
  onResetBasic,
}) => {
  return (
    <div className="space-y-3.5 select-none text-xs">
      {/* ── 1. White Balance ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-orange-400" />
            White Balance
          </span>
          <button
            onClick={() => {
              onUpdateParam('temperature', 0, 0);
              onUpdateParam('tint', 0, 0);
            }}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white flex items-center gap-1 transition"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        </div>

        {/* Temperature */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Temperature (K)</span>
            <span className="font-mono text-white text-[10px]">
              {temperature > 0 ? `+${temperature}` : temperature}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={temperature}
            onChange={(e) => onUpdateParam('temperature', parseFloat(e.target.value), 0)}
            onDoubleClick={() => onUpdateParam('temperature', 0, 0)}
            className="w-full accent-amber-400 cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[8px] text-[var(--kuro-text-muted)] font-mono">
            <span>Cool (Blue)</span>
            <span>Neutral</span>
            <span>Warm (Amber)</span>
          </div>
        </div>

        {/* Tint */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Tint</span>
            <span className="font-mono text-white text-[10px]">
              {tint > 0 ? `+${tint}` : tint}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={tint}
            onChange={(e) => onUpdateParam('tint', parseFloat(e.target.value), 0)}
            onDoubleClick={() => onUpdateParam('tint', 0, 0)}
            className="w-full accent-pink-400 cursor-pointer h-1.5"
          />
          <div className="flex justify-between text-[8px] text-[var(--kuro-text-muted)] font-mono">
            <span>Green (-100)</span>
            <span>0</span>
            <span>Magenta (+100)</span>
          </div>
        </div>
      </div>

      {/* ── 2. Tone & Exposure ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-yellow-400" />
            Tone & Dynamic Range
          </span>
          <button
            onClick={() => {
              onUpdateParam('exposure', 0, 0);
              onUpdateParam('contrast', 1.0, 1.0);
              onUpdateParam('highlights', 0, 0);
              onUpdateParam('shadows', 0, 0);
              onUpdateParam('whites', 0, 0);
              onUpdateParam('blacks', 0, 0);
            }}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white flex items-center gap-1 transition"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        </div>

        {/* Exposure */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Exposure (EV Stops)</span>
            <span className="font-mono text-white text-[10px]">
              {exposure > 0 ? `+${exposure.toFixed(2)} EV` : `${exposure.toFixed(2)} EV`}
            </span>
          </div>
          <input
            type="range"
            min="-3.0"
            max="3.0"
            step="0.05"
            value={exposure}
            onChange={(e) => onUpdateParam('exposure', parseFloat(e.target.value), 0)}
            onDoubleClick={() => onUpdateParam('exposure', 0, 0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer h-1.5"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Contrast</span>
            <span className="font-mono text-white text-[10px]">{contrast.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.02"
            value={contrast}
            onChange={(e) => onUpdateParam('contrast', parseFloat(e.target.value), 1.0)}
            onDoubleClick={() => onUpdateParam('contrast', 1.0, 1.0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer h-1.5"
          />
        </div>

        {/* Highlights & Shadows 2-col */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[var(--kuro-border-subtle)]">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--kuro-text-secondary)]">Highlights</span>
              <span className="font-mono text-white">{highlights > 0 ? `+${highlights}` : highlights}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={highlights}
              onChange={(e) => onUpdateParam('highlights', parseFloat(e.target.value), 0)}
              onDoubleClick={() => onUpdateParam('highlights', 0, 0)}
              className="w-full accent-[var(--kuro-text-primary)] cursor-pointer h-1.5"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--kuro-text-secondary)]">Shadows</span>
              <span className="font-mono text-white">{shadows > 0 ? `+${shadows}` : shadows}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={shadows}
              onChange={(e) => onUpdateParam('shadows', parseFloat(e.target.value), 0)}
              onDoubleClick={() => onUpdateParam('shadows', 0, 0)}
              className="w-full accent-[var(--kuro-text-primary)] cursor-pointer h-1.5"
            />
          </div>
        </div>

        {/* Whites & Blacks 2-col */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--kuro-text-secondary)]">Whites</span>
              <span className="font-mono text-white">{whites > 0 ? `+${whites}` : whites}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={whites}
              onChange={(e) => onUpdateParam('whites', parseFloat(e.target.value), 0)}
              onDoubleClick={() => onUpdateParam('whites', 0, 0)}
              className="w-full accent-[var(--kuro-text-primary)] cursor-pointer h-1.5"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[var(--kuro-text-secondary)]">Blacks</span>
              <span className="font-mono text-white">{blacks > 0 ? `+${blacks}` : blacks}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={blacks}
              onChange={(e) => onUpdateParam('blacks', parseFloat(e.target.value), 0)}
              onDoubleClick={() => onUpdateParam('blacks', 0, 0)}
              className="w-full accent-[var(--kuro-text-primary)] cursor-pointer h-1.5"
            />
          </div>
        </div>
      </div>

      {/* ── 3. Saturation & Vibrance ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-cyan-400" />
            Saturation & Vibrance
          </span>
          <button
            onClick={() => {
              onUpdateParam('saturation', 1.0, 1.0);
              onUpdateParam('vibrance', 0, 0);
            }}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white flex items-center gap-1 transition"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        </div>

        {/* Saturation */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Saturation</span>
            <span className="font-mono text-white text-[10px]">{(saturation * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="2.0"
            step="0.02"
            value={saturation}
            onChange={(e) => onUpdateParam('saturation', parseFloat(e.target.value), 1.0)}
            onDoubleClick={() => onUpdateParam('saturation', 1.0, 1.0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer h-1.5"
          />
        </div>

        {/* Vibrance */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Vibrance (Skin Protection)</span>
            <span className="font-mono text-white text-[10px]">{vibrance > 0 ? `+${vibrance}` : vibrance}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={vibrance}
            onChange={(e) => onUpdateParam('vibrance', parseFloat(e.target.value), 0)}
            onDoubleClick={() => onUpdateParam('vibrance', 0, 0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer h-1.5"
          />
        </div>
      </div>
    </div>
  );
};
