import React from 'react';
import { AssetReference, Clip } from '@kuro/project-format';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Palette,
  Layers,
} from 'lucide-react';

interface TextTabProps {
  clip: Clip;
  asset?: AssetReference;
  onUpdateMetadata: (metadata: Record<string, unknown>) => void;
}

export const TextTab: React.FC<TextTabProps> = ({ asset, onUpdateMetadata }) => {
  const metadata = (asset?.metadata as Record<string, unknown> | undefined) || {};

  const textContent = (metadata['text'] as string) || asset?.name || 'TITLE TEXT';
  const fontSize = Number(metadata['fontSize'] || 32);
  const fontFamily = (metadata['fontFamily'] as string) || 'Inter';
  const textAlign = (metadata['textAlign'] as string) || 'center';
  const isBold = metadata['isBold'] !== false;
  const textColor = (metadata['textColor'] as string) || '#ffffff';
  const showBackground = metadata['showBackground'] !== false;

  return (
    <div className="space-y-4 text-xs select-none">
      {/* ─── 1. Text Content Editor ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-2">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Type className="w-3 h-3" />
          Text Content
        </span>
        <textarea
          rows={3}
          value={textContent}
          onChange={(e) => onUpdateMetadata({ text: e.target.value })}
          placeholder="Enter text..."
          className="w-full bg-[var(--kuro-bg-panel)] text-white p-2 rounded border border-[var(--kuro-border-subtle)] text-xs font-medium focus:outline-none focus:border-white transition resize-none"
        />
      </div>

      {/* ─── 2. Typography ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Type className="w-3 h-3" />
          Typography
        </span>

        {/* Font Family */}
        <div className="space-y-1">
          <div className="text-[10px] text-[var(--kuro-text-muted)] font-mono">FONT FAMILY</div>
          <select
            value={fontFamily}
            onChange={(e) => onUpdateMetadata({ fontFamily: e.target.value })}
            className="w-full bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] rounded px-2 py-1 text-xs focus:outline-none cursor-pointer"
          >
            <option value="Inter">Inter (Clean Modern)</option>
            <option value="Impact">Impact (Bold Headline)</option>
            <option value="Montserrat">Montserrat (Geometric)</option>
            <option value="Roboto">Roboto</option>
            <option value="Courier New">Courier (Monospace)</option>
            <option value="Georgia">Georgia (Serif)</option>
          </select>
        </div>

        {/* Font Size */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Font Size</span>
            <span className="font-mono text-white font-medium">{fontSize}px</span>
          </div>
          <input
            type="range"
            min="14"
            max="80"
            value={fontSize}
            onChange={(e) => onUpdateMetadata({ fontSize: parseInt(e.target.value, 10) })}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>

        {/* Style & Alignment Row */}
        <div className="flex items-center justify-between pt-1 border-t border-[var(--kuro-border-subtle)]">
          {/* Bold Toggle */}
          <button
            onClick={() => onUpdateMetadata({ isBold: !isBold })}
            className={`p-1.5 px-3 rounded border border-[var(--kuro-border-subtle)] flex items-center gap-1 font-bold text-xs transition cursor-pointer ${
              isBold ? 'bg-white text-black' : 'bg-[var(--kuro-bg-panel)] text-white hover:bg-[var(--kuro-bg-hover)]'
            }`}
            title="Toggle Bold"
          >
            <Bold className="w-3 h-3" />
            <span>Bold</span>
          </button>

          {/* Alignment Buttons */}
          <div className="flex items-center gap-1 bg-[var(--kuro-bg-panel)] p-0.5 rounded border border-[var(--kuro-border-subtle)]">
            <button
              onClick={() => onUpdateMetadata({ textAlign: 'left' })}
              className={`p-1 rounded transition cursor-pointer ${
                textAlign === 'left' ? 'bg-white text-black' : 'text-[var(--kuro-text-muted)] hover:text-white'
              }`}
              title="Align Left"
            >
              <AlignLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => onUpdateMetadata({ textAlign: 'center' })}
              className={`p-1 rounded transition cursor-pointer ${
                textAlign === 'center' ? 'bg-white text-black' : 'text-[var(--kuro-text-muted)] hover:text-white'
              }`}
              title="Align Center"
            >
              <AlignCenter className="w-3 h-3" />
            </button>
            <button
              onClick={() => onUpdateMetadata({ textAlign: 'right' })}
              className={`p-1 rounded transition cursor-pointer ${
                textAlign === 'right' ? 'bg-white text-black' : 'text-[var(--kuro-text-muted)] hover:text-white'
              }`}
              title="Align Right"
            >
              <AlignRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 3. Color & Styling ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Palette className="w-3 h-3" />
          Color & Appearance
        </span>

        {/* Text Color Swatches */}
        <div className="space-y-1.5">
          <div className="text-[10px] text-[var(--kuro-text-muted)] font-mono">TEXT COLOR</div>
          <div className="flex items-center gap-2">
            {['#ffffff', '#facc15', '#ef4444', '#3b82f6', '#10b981', '#000000'].map((color) => (
              <button
                key={color}
                onClick={() => onUpdateMetadata({ textColor: color })}
                style={{ backgroundColor: color }}
                className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${
                  textColor === color ? 'scale-125 border-white ring-2 ring-white/60' : 'border-white/30 hover:scale-110'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Pill Background Toggle */}
        <div className="flex justify-between items-center pt-2 border-t border-[var(--kuro-border-subtle)]">
          <span className="text-[11px] text-[var(--kuro-text-primary)]">Background Pill</span>
          <button
            onClick={() => onUpdateMetadata({ showBackground: !showBackground })}
            className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
              showBackground ? 'bg-white' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-black absolute top-0.5 transition-transform ${
                showBackground ? 'left-4.5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
