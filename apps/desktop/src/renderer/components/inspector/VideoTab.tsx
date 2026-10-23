import React from 'react';
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
  const [uniformScale, setUniformScale] = React.useState(true);

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

  // Reset entire transform to unity/neutral
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
    <div className="space-y-4 text-xs select-none pb-6">
      {/* ─── Master Reset Header ─── */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasModifications ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <span className="font-semibold text-white tracking-wide text-[11px]">
            {hasModifications ? 'Modified Geometry' : 'Default Transform'}
          </span>
        </div>
        <button
          onClick={resetAllTransform}
          disabled={!hasModifications}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider font-semibold transition cursor-pointer ${
            hasModifications
              ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
              : 'opacity-40 cursor-not-allowed bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)] border border-transparent'
          }`}
          title="Reset position, scale, rotation and blend mode"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Reset All
        </button>
      </div>

      {/* ─── 1. Position & Scale (Spatial Transform) ─── */}
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

        {/* Scale */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Scale</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-white font-medium">{scalePercent}%</span>
              <button
                onClick={() => setUniformScale(!uniformScale)}
                title={uniformScale ? 'Uniform Scale Locked' : 'Independent Scale Unlocked'}
                className="text-[var(--kuro-text-muted)] hover:text-white transition cursor-pointer"
              >
                {uniformScale ? <Link className="w-3 h-3 text-emerald-400" /> : <Unlink className="w-3 h-3" />}
              </button>
              {scalePercent !== 100 && (
                <button
                  onClick={() => onUpdateTransform({ scaleX: 1.0, scaleY: 1.0 })}
                  className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white"
                  title="Reset scale"
                >
                  ↺
                </button>
              )}
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
          <div className="flex items-center gap-1 pt-1">
            {[50, 75, 100, 150, 200].map((preset) => (
              <button
                key={preset}
                onClick={() => handleScaleChange(preset)}
                className={`flex-1 py-0.5 rounded text-[9px] font-mono font-medium transition cursor-pointer ${
                  scalePercent === preset
                    ? 'bg-white text-black font-bold'
                    : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)] hover:text-white border border-[var(--kuro-border-subtle)]'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>

        {/* Non-uniform Scale Y (if unlinked) */}
        {!uniformScale && (
          <div className="space-y-1 pt-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[var(--kuro-text-secondary)]">Scale Y</span>
              <span className="font-mono text-white font-medium">{scaleYPercent}%</span>
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
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] text-[var(--kuro-text-muted)] font-mono">
              <span>POS X</span>
              <div className="flex items-center gap-1">
                <span className="text-white font-semibold">{transform.x || 0}px</span>
                {(transform.x || 0) !== 0 && (
                  <button
                    onClick={() => onUpdateTransform({ x: 0 })}
                    className="hover:text-white text-[9px]"
                    title="Center X"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min="-800"
              max="800"
              value={transform.x || 0}
              onChange={(e) => onUpdateTransform({ x: parseInt(e.target.value, 10) })}
              className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] text-[var(--kuro-text-muted)] font-mono">
              <span>POS Y</span>
              <div className="flex items-center gap-1">
                <span className="text-white font-semibold">{transform.y || 0}px</span>
                {(transform.y || 0) !== 0 && (
                  <button
                    onClick={() => onUpdateTransform({ y: 0 })}
                    className="hover:text-white text-[9px]"
                    title="Center Y"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min="-600"
              max="600"
              value={transform.y || 0}
              onChange={(e) => onUpdateTransform({ y: parseInt(e.target.value, 10) })}
              className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
            />
          </div>
        </div>

        {/* Alignment Center Shortcut Buttons */}
        <div className="flex items-center gap-1.5 pt-1">
          <button
            onClick={() => onUpdateTransform({ x: 0, y: 0 })}
            className="flex-1 py-1 px-2 rounded bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)] transition cursor-pointer flex items-center justify-center gap-1"
          >
            Center in Frame
          </button>
          <button
            onClick={() => onUpdateTransform({ scaleX: 1.0, scaleY: 1.0, x: 0, y: 0, rotation: 0 })}
            className="flex-1 py-1 px-2 rounded bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)] transition cursor-pointer flex items-center justify-center gap-1"
          >
            Reset Geometry
          </button>
        </div>
      </div>

      {/* ─── 2. Rotation & Orientation ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Rotate3D className="w-3.5 h-3.5 text-purple-400" />
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

        {/* Rotation */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Angle</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-white font-medium">{transform.rotation || 0}°</span>
              {(transform.rotation || 0) !== 0 && (
                <button
                  onClick={() => onUpdateTransform({ rotation: 0 })}
                  className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white"
                  title="Reset angle"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={transform.rotation || 0}
            onChange={(e) => onUpdateTransform({ rotation: parseInt(e.target.value, 10) })}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />

          {/* Quick 90deg rotation & flips */}
          <div className="grid grid-cols-4 gap-1 pt-1">
            <button
              onClick={() => onUpdateTransform({ rotation: ((transform.rotation || 0) - 90) % 360 })}
              className="py-1 px-1.5 rounded bg-[var(--kuro-bg-panel)] hover:bg-white hover:text-black text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] flex items-center justify-center gap-1 transition cursor-pointer"
              title="Rotate -90°"
            >
              <RotateCcw className="w-3 h-3" />
              -90°
            </button>
            <button
              onClick={() => onUpdateTransform({ rotation: ((transform.rotation || 0) + 90) % 360 })}
              className="py-1 px-1.5 rounded bg-[var(--kuro-bg-panel)] hover:bg-white hover:text-black text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] flex items-center justify-center gap-1 transition cursor-pointer"
              title="Rotate +90°"
            >
              <RotateCw className="w-3 h-3" />
              +90°
            </button>
            <button
              onClick={() => onUpdateTransform({ flipH: !transform.flipH })}
              className={`py-1 px-1.5 rounded border transition cursor-pointer flex items-center justify-center gap-1 ${
                transform.flipH
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)] border-[var(--kuro-border-subtle)]'
              }`}
              title="Flip Horizontal (Mirror)"
            >
              <FlipHorizontal className="w-3 h-3" />
              Flip H
            </button>
            <button
              onClick={() => onUpdateTransform({ flipV: !transform.flipV })}
              className={`py-1 px-1.5 rounded border transition cursor-pointer flex items-center justify-center gap-1 ${
                transform.flipV
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)] border-[var(--kuro-border-subtle)]'
              }`}
              title="Flip Vertical"
            >
              <FlipVertical className="w-3 h-3" />
              Flip V
            </button>
          </div>
        </div>
      </div>

      {/* ─── 3. Compositing, Opacity & Blend Mode ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Compositing & Opacity
          </span>
          <button
            onClick={() => onUpdateTransform({ opacity: 1.0, blendMode: 'normal' })}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white transition flex items-center gap-1 cursor-pointer"
            title="Reset opacity and blend mode"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        </div>

        {/* Opacity */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Opacity</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-white font-medium">{opacityPercent}%</span>
              {opacityPercent !== 100 && (
                <button
                  onClick={() => onUpdateTransform({ opacity: 1.0 })}
                  className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white"
                  title="Reset opacity to 100%"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={opacityPercent}
            onChange={(e) => onUpdateTransform({ opacity: parseFloat(e.target.value) / 100 })}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>

        {/* Blend Mode */}
        <div className="space-y-1 pt-1">
          <span className="text-[var(--kuro-text-secondary)] text-[11px] block">Blend Mode</span>
          <select
            value={transform.blendMode || 'normal'}
            onChange={(e) => onUpdateTransform({ blendMode: e.target.value })}
            className="w-full bg-[var(--kuro-bg-panel)] border border-[var(--kuro-border-subtle)] rounded px-2.5 py-1.5 text-white text-[11px] cursor-pointer focus:outline-none focus:border-white/40"
          >
            <option value="normal">Normal</option>
            <option value="screen">Screen (Lighten / Remove Black)</option>
            <option value="multiply">Multiply (Darken / Remove White)</option>
            <option value="overlay">Overlay (High Contrast)</option>
            <option value="soft-light">Soft Light (Subtle Film Contrast)</option>
            <option value="hard-light">Hard Light</option>
            <option value="color-dodge">Color Dodge (Glow)</option>
            <option value="difference">Difference (Inversion Effect)</option>
            <option value="luminosity">Luminosity</option>
          </select>
        </div>

        {/* Fit mode */}
        <div className="space-y-1 pt-1">
          <span className="text-[var(--kuro-text-secondary)] text-[11px] block">Aspect Fit Mode</span>
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'contain', label: 'Contain (Fit)' },
              { id: 'cover', label: 'Cover (Fill Frame)' },
              { id: 'fill', label: 'Stretch' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => onUpdateTransform({ fit: m.id as any })}
                className={`py-1 px-1.5 rounded text-[10px] font-medium transition cursor-pointer ${
                  (transform.fit || 'contain') === m.id
                    ? 'bg-white text-black font-semibold'
                    : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)] hover:text-white border border-[var(--kuro-border-subtle)]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
