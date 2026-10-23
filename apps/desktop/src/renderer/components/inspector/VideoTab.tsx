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
} from 'lucide-react';

interface VideoTabProps {
  clip: Clip;
  onUpdateTransform: (transform: Partial<ClipTransform>) => void;
}

export const VideoTab: React.FC<VideoTabProps> = ({ clip, onUpdateTransform }) => {
  const [uniformScale, setUniformScale] = React.useState(true);

  const transform: ClipTransform = clip.transform || {
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

  const scalePercent = Math.round((transform.scaleX ?? 1.0) * 100);
  const scaleYPercent = Math.round((transform.scaleY ?? 1.0) * 100);
  const opacityPercent = Math.round((transform.opacity ?? 1.0) * 100);

  const handleScaleChange = (valPercent: number) => {
    const s = Math.max(0.1, Math.min(4.0, valPercent / 100));
    if (uniformScale) {
      onUpdateTransform({ scaleX: s, scaleY: s });
    } else {
      onUpdateTransform({ scaleX: s });
    }
  };

  const handleScaleYChange = (valPercent: number) => {
    const s = Math.max(0.1, Math.min(4.0, valPercent / 100));
    onUpdateTransform({ scaleY: s });
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* ─── 1. Transform Section ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Move className="w-3 h-3" />
            Transform
          </span>
          <button
            onClick={() =>
              onUpdateTransform({
                x: 0,
                y: 0,
                scaleX: 1.0,
                scaleY: 1.0,
                rotation: 0,
                flipH: false,
                flipV: false,
              })
            }
            className="text-[10px] font-mono text-[var(--kuro-text-muted)] hover:text-white transition cursor-pointer"
            title="Reset Transform to Default"
          >
            Reset
          </button>
        </div>

        {/* Scale (Zoom) */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] flex items-center gap-1">
              Scale {uniformScale ? '' : '(X)'}
              <button
                onClick={() => setUniformScale(!uniformScale)}
                className="p-0.5 rounded text-[var(--kuro-text-muted)] hover:text-white transition"
                title={uniformScale ? 'Unlock X/Y Scale' : 'Lock Uniform Scale'}
              >
                {uniformScale ? <Link className="w-2.5 h-2.5" /> : <Unlink className="w-2.5 h-2.5 text-white" />}
              </button>
            </span>
            <span className="font-mono text-white font-medium">{scalePercent}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="300"
            value={scalePercent}
            onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>

        {/* Independent Scale Y if unlocked */}
        {!uniformScale && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[var(--kuro-text-secondary)]">Scale (Y)</span>
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
              <span className="text-white font-semibold">{transform.x || 0}px</span>
            </div>
            <input
              type="range"
              min="-600"
              max="600"
              value={transform.x || 0}
              onChange={(e) => onUpdateTransform({ x: parseInt(e.target.value, 10) })}
              className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center text-[10px] text-[var(--kuro-text-muted)] font-mono">
              <span>POS Y</span>
              <span className="text-white font-semibold">{transform.y || 0}px</span>
            </div>
            <input
              type="range"
              min="-400"
              max="400"
              value={transform.y || 0}
              onChange={(e) => onUpdateTransform({ y: parseInt(e.target.value, 10) })}
              className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
            />
          </div>
        </div>

        {/* Rotation & Flip Controls */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] flex items-center gap-1">
              <Rotate3D className="w-3 h-3 text-[var(--kuro-text-muted)]" />
              Rotation
            </span>
            <span className="font-mono text-white font-medium">{transform.rotation || 0}°</span>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            value={transform.rotation || 0}
            onChange={(e) => onUpdateTransform({ rotation: parseInt(e.target.value, 10) })}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />

          <div className="flex items-center gap-1 pt-1">
            <button
              onClick={() => onUpdateTransform({ rotation: ((transform.rotation || 0) - 90 + 360) % 360 })}
              className="flex-1 py-1 rounded bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] flex items-center justify-center gap-1 text-[10px] font-mono transition cursor-pointer"
              title="Rotate 90° Counter-Clockwise"
            >
              <RotateCcw className="w-2.5 h-2.5" /> -90°
            </button>
            <button
              onClick={() => onUpdateTransform({ rotation: ((transform.rotation || 0) + 90) % 360 })}
              className="flex-1 py-1 rounded bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] flex items-center justify-center gap-1 text-[10px] font-mono transition cursor-pointer"
              title="Rotate 90° Clockwise"
            >
              <RotateCw className="w-2.5 h-2.5" /> +90°
            </button>
            <button
              onClick={() => onUpdateTransform({ flipH: !transform.flipH })}
              className={`p-1 px-2 rounded border border-[var(--kuro-border-subtle)] transition cursor-pointer ${
                transform.flipH ? 'bg-white text-black font-bold' : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)]'
              }`}
              title="Flip Horizontal (Mirror)"
            >
              <FlipHorizontal className="w-3 h-3" />
            </button>
            <button
              onClick={() => onUpdateTransform({ flipV: !transform.flipV })}
              className={`p-1 px-2 rounded border border-[var(--kuro-border-subtle)] transition cursor-pointer ${
                transform.flipV ? 'bg-white text-black font-bold' : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)]'
              }`}
              title="Flip Vertical"
            >
              <FlipVertical className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 2. Compositing & Opacity Section ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Layers className="w-3 h-3" />
          Compositing
        </span>

        {/* Opacity */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Opacity</span>
            <span className="font-mono text-white font-medium">{opacityPercent}%</span>
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
        <div className="space-y-1">
          <div className="text-[10px] text-[var(--kuro-text-muted)] font-mono">BLEND MODE</div>
          <select
            value={transform.blendMode || 'normal'}
            onChange={(e) => onUpdateTransform({ blendMode: e.target.value })}
            className="w-full bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] rounded px-2 py-1 text-xs focus:outline-none cursor-pointer"
          >
            <option value="normal">Normal</option>
            <option value="screen">Screen (Lighten)</option>
            <option value="multiply">Multiply (Darken)</option>
            <option value="overlay">Overlay</option>
            <option value="lighten">Lighten</option>
            <option value="darken">Darken</option>
            <option value="color-dodge">Color Dodge</option>
          </select>
        </div>
      </div>

      {/* ─── 3. Canvas Fitting Presets ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-2">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Maximize2 className="w-3 h-3" />
          Canvas Fitting
        </span>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => onUpdateTransform({ scaleX: 1.0, scaleY: 1.0, x: 0, y: 0, fit: 'contain' })}
            className={`py-1 text-center text-[11px] font-semibold rounded border transition cursor-pointer ${
              transform.fit === 'contain'
                ? 'bg-white text-black border-white'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-primary)] border-[var(--kuro-border-subtle)] hover:bg-[var(--kuro-bg-hover)]'
            }`}
          >
            Fit
          </button>
          <button
            onClick={() => onUpdateTransform({ scaleX: 1.35, scaleY: 1.35, x: 0, y: 0, fit: 'cover' })}
            className={`py-1 text-center text-[11px] font-semibold rounded border transition cursor-pointer ${
              transform.fit === 'cover'
                ? 'bg-white text-black border-white'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-primary)] border-[var(--kuro-border-subtle)] hover:bg-[var(--kuro-bg-hover)]'
            }`}
          >
            Fill
          </button>
          <button
            onClick={() => onUpdateTransform({ scaleX: 1.0, scaleY: 1.0, x: 0, y: 0, fit: 'fill' })}
            className={`py-1 text-center text-[11px] font-semibold rounded border transition cursor-pointer ${
              transform.fit === 'fill'
                ? 'bg-white text-black border-white'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-primary)] border-[var(--kuro-border-subtle)] hover:bg-[var(--kuro-bg-hover)]'
            }`}
          >
            Stretch
          </button>
        </div>
      </div>
    </div>
  );
};
