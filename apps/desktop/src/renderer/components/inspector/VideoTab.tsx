import React, { useState } from 'react';
import { Clip, ClipTransform } from '@kuro/project-format';
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  Minimize2,
  Link,
  Unlink,
  Rotate3D,
  Move,
  Layers,
  Sparkles,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';

interface VideoTabProps {
  clip: Clip;
  onUpdateTransform: (transform: Partial<ClipTransform>) => void;
}

export const VideoTab: React.FC<VideoTabProps> = ({ clip, onUpdateTransform }) => {
  const [uniformScale, setUniformScale] = useState(true);

  const defaultTransform: ClipTransform = {
    x: 0,
    y: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    rotation: 0,
    opacity: 1.0,
    flipH: false,
    flipV: false,
    blendMode: 'normal',
    fit: 'contain',
  };

  const transform: ClipTransform = {
    ...defaultTransform,
    ...(clip.transform || {}),
  };

  const scalePercent = Math.round((transform.scaleX ?? 1.0) * 100);
  const scaleYPercent = Math.round((transform.scaleY ?? 1.0) * 100);
  const opacityPercent = Math.round((transform.opacity ?? 1.0) * 100);
  const rotationDeg = Math.round(transform.rotation || 0);

  const handleScaleChange = (valPercent: number) => {
    const s = Math.max(0.05, Math.min(5.0, valPercent / 100));
    if (uniformScale) {
      onUpdateTransform({ scaleX: s, scaleY: s });
    } else {
      onUpdateTransform({ scaleX: s });
    }
  };

  const handleScaleYChange = (valPercent: number) => {
    const s = Math.max(0.05, Math.min(5.0, valPercent / 100));
    onUpdateTransform({ scaleY: s });
  };

  const resetAllTransform = () => {
    onUpdateTransform({
      x: 0,
      y: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      rotation: 0,
      opacity: 1.0,
      flipH: false,
      flipV: false,
      blendMode: 'normal',
      fit: 'contain',
    });
  };

  const hasModifications =
    (transform.x || 0) !== 0 ||
    (transform.y || 0) !== 0 ||
    Math.abs((transform.scaleX ?? 1.0) - 1.0) > 0.001 ||
    Math.abs((transform.scaleY ?? 1.0) - 1.0) > 0.001 ||
    (transform.rotation || 0) !== 0 ||
    Math.abs((transform.opacity ?? 1.0) - 1.0) > 0.001 ||
    !!transform.flipH ||
    !!transform.flipV ||
    (transform.blendMode && transform.blendMode !== 'normal') ||
    (transform.fit && transform.fit !== 'contain');

  return (
    <div className="space-y-3.5 text-xs select-none pb-6">
      {/* ── Master Status & Reset ── */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasModifications ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24]' : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'}`} />
          <span className="font-semibold text-white tracking-wide text-[11px]">
            {hasModifications ? 'Custom Geometry' : 'Default Transform'}
          </span>
        </div>
        <button
          onClick={resetAllTransform}
          disabled={!hasModifications}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider font-semibold transition cursor-pointer ${
            hasModifications
              ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
              : 'opacity-30 cursor-not-allowed bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)] border border-transparent'
          }`}
          title="Reset all transform parameters"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Reset All
        </button>
      </div>

      {/* ── 1. Scale & Position ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-blue-400" />
            Position & Scale
          </span>
          <button
            onClick={() => onUpdateTransform({ x: 0, y: 0, scaleX: 1.0, scaleY: 1.0 })}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white transition flex items-center gap-1 cursor-pointer"
            title="Reset position and scale"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        </div>

        {/* Scale Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] font-medium">Scale (Zoom)</span>
            <div className="flex items-center gap-1.5">
              <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
                {scalePercent}%
              </span>
              <button
                onClick={() => setUniformScale(!uniformScale)}
                title={uniformScale ? 'Uniform Scale Locked' : 'Independent Scale Unlocked'}
                className="p-1 rounded hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-muted)] hover:text-white transition cursor-pointer"
              >
                {uniformScale ? <Link className="w-3 h-3 text-emerald-400" /> : <Unlink className="w-3 h-3 text-amber-400" />}
              </button>
            </div>
          </div>
          <input
            type="range"
            min="10"
            max="300"
            value={scalePercent}
            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />

          {/* Quick Scale Presets */}
          <div className="grid grid-cols-5 gap-1 pt-1">
            {[50, 75, 100, 150, 200].map((preset) => (
              <button
                key={preset}
                onClick={() => handleScaleChange(preset)}
                className={`py-1 rounded text-[10px] font-mono transition cursor-pointer text-center ${
                  scalePercent === preset
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)] hover:text-white border border-[var(--kuro-border-subtle)]'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        {/* Independent Scale Y if unlinked */}
        {!uniformScale && (
          <div className="space-y-1.5 pt-2 border-t border-[var(--kuro-border-subtle)]">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[var(--kuro-text-secondary)] font-medium">Scale Y (Vertical)</span>
              <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
                {scaleYPercent}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="300"
              value={scaleYPercent}
              onChange={(e) => handleScaleYChange(parseFloat(e.target.value))}
              className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
            />
          </div>
        )}

        {/* Position X and Y */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[var(--kuro-border-subtle)]">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[var(--kuro-text-secondary)] font-mono font-bold uppercase">POS X</span>
              <span className="font-mono text-white text-[10px]">{transform.x || 0} px</span>
            </div>
            <input
              type="range"
              min="-1000"
              max="1000"
              step="5"
              value={transform.x || 0}
              onChange={(e) => onUpdateTransform({ x: parseFloat(e.target.value) })}
              onDoubleClick={() => onUpdateTransform({ x: 0 })}
              className="w-full accent-blue-400 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[var(--kuro-text-secondary)] font-mono font-bold uppercase">POS Y</span>
              <span className="font-mono text-white text-[10px]">{transform.y || 0} px</span>
            </div>
            <input
              type="range"
              min="-600"
              max="600"
              step="5"
              value={transform.y || 0}
              onChange={(e) => onUpdateTransform({ y: parseFloat(e.target.value) })}
              onDoubleClick={() => onUpdateTransform({ y: 0 })}
              className="w-full accent-blue-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Center Screen Button */}
        <button
          onClick={() => onUpdateTransform({ x: 0, y: 0 })}
          className="w-full py-1 rounded bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] border border-[var(--kuro-border-subtle)] text-[10px] text-white font-medium transition cursor-pointer text-center"
        >
          Center on Screen (0, 0)
        </button>
      </div>

      {/* ── 2. Rotation & Flips ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
            Rotation & Flip
          </span>
          <button
            onClick={() => onUpdateTransform({ rotation: 0, flipH: false, flipV: false })}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white transition flex items-center gap-1 cursor-pointer"
            title="Reset rotation and flip"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        </div>

        {/* Rotation Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] font-medium">Angle</span>
            <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
              {rotationDeg}°
            </span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={rotationDeg}
            onChange={(e) => onUpdateTransform({ rotation: parseFloat(e.target.value) })}
            onDoubleClick={() => onUpdateTransform({ rotation: 0 })}
            className="w-full accent-emerald-400 cursor-pointer"
          />

          {/* Quick Rotation Buttons */}
          <div className="grid grid-cols-4 gap-1 pt-1">
            {[0, 90, 180, -90].map((deg) => (
              <button
                key={deg}
                onClick={() => onUpdateTransform({ rotation: deg })}
                className={`py-1 rounded text-[10px] font-mono transition cursor-pointer text-center ${
                  rotationDeg === deg
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)] hover:text-white border border-[var(--kuro-border-subtle)]'
                }`}
              >
                {deg > 0 ? `+${deg}°` : `${deg}°`}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal & Vertical Flip */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--kuro-border-subtle)]">
          <button
            onClick={() => onUpdateTransform({ flipH: !transform.flipH })}
            className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1.5 text-[10px] font-semibold transition cursor-pointer ${
              transform.flipH
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-subtle)] hover:text-white hover:bg-[var(--kuro-bg-hover)]'
            }`}
          >
            <FlipHorizontal className="w-3 h-3" />
            <span>Flip H</span>
          </button>

          <button
            onClick={() => onUpdateTransform({ flipV: !transform.flipV })}
            className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1.5 text-[10px] font-semibold transition cursor-pointer ${
              transform.flipV
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-subtle)] hover:text-white hover:bg-[var(--kuro-bg-hover)]'
            }`}
          >
            <FlipVertical className="w-3 h-3" />
            <span>Flip V</span>
          </button>
        </div>
      </div>

      {/* ── 3. Opacity & Compositing ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            Compositing & Opacity
          </span>
          <button
            onClick={() => onUpdateTransform({ opacity: 1.0, blendMode: 'normal' })}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white transition flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        </div>

        {/* Opacity Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] font-medium">Opacity</span>
            <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
              {opacityPercent}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={opacityPercent}
            onChange={(e) => onUpdateTransform({ opacity: parseFloat(e.target.value) / 100 })}
            className="w-full accent-purple-400 cursor-pointer"
          />
        </div>

        {/* Blend Mode Dropdown */}
        <div className="space-y-1 pt-1 border-t border-[var(--kuro-border-subtle)]">
          <div className="text-[10px] text-[var(--kuro-text-muted)] font-mono uppercase">Blend Mode</div>
          <select
            value={transform.blendMode || 'normal'}
            onChange={(e) => onUpdateTransform({ blendMode: e.target.value })}
            className="w-full bg-[var(--kuro-bg-panel)] text-white border border-[var(--kuro-border-subtle)] rounded px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer"
          >
            <option value="normal">Normal</option>
            <option value="screen">Screen (Lighten)</option>
            <option value="multiply">Multiply (Darken)</option>
            <option value="overlay">Overlay (Contrast)</option>
            <option value="soft-light">Soft Light</option>
            <option value="hard-light">Hard Light</option>
            <option value="color-dodge">Color Dodge</option>
            <option value="color-burn">Color Burn</option>
            <option value="difference">Difference</option>
          </select>
        </div>
      </div>
    </div>
  );
};
