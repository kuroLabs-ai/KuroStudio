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
    <div className="space-y-3.5 text-xs select-none pb-6">
      {/* ── 1. Text Content Editor ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-2">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-blue-400" />
          Text String / Content
        </span>
        <textarea
          rows={3}
          value={textContent}
          onChange={(e) => onUpdateMetadata({ text: e.target.value })}
          placeholder="Enter title text..."
          className="w-full bg-[var(--kuro-bg-panel)] text-white p-2.5 rounded border border-[var(--kuro-border-subtle)] text-xs font-medium focus:outline-none focus:border-white transition resize-none leading-relaxed"
        />
      </div>

      {/* ── 2. Typography & Formatting ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-purple-400" />
          Typography & Layout
        </span>

        {/* Font Family Dropdown */}
        <div className="space-y-1">
          <div className="text-[10px] text-[var(--kuro-text-muted)] font-mono uppercase">Font Family</div>
          <select
            value={fontFamily}
            onChange={(e) => onUpdateMetadata({ fontFamily: e.target.value })}
            className="w-full bg-[var(--kuro-bg-panel)] text-white border border-[var(--kuro-border-subtle)] rounded px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer"
          >
            <option value="Inter">Inter (Clean Modern UI)</option>
            <option value="Impact">Impact (Cinematic Bold)</option>
            <option value="Montserrat">Montserrat (Geometric Title)</option>
            <option value="Roboto">Roboto (Neutral)</option>
            <option value="Courier New">Courier (Retro Monospace)</option>
            <option value="Georgia">Georgia (Classic Serif)</option>
          </select>
        </div>

        {/* Font Size Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] font-medium">Font Size</span>
            <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
              {fontSize} px
            </span>
          </div>
          <input
            type="range"
            min="14"
            max="120"
            value={fontSize}
            onChange={(e) => onUpdateMetadata({ fontSize: parseInt(e.target.value, 10) })}
            className="w-full accent-purple-400 cursor-pointer"
          />
        </div>

        {/* Style & Alignment Controls */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--kuro-border-subtle)]">
          {/* Bold Toggle */}
          <button
            onClick={() => onUpdateMetadata({ isBold: !isBold })}
            className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 text-[11px] font-bold transition cursor-pointer ${
              isBold
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-subtle)] hover:text-white hover:bg-[var(--kuro-bg-hover)]'
            }`}
          >
            <Bold className="w-3 h-3" />
            <span>Bold Weight</span>
          </button>

          {/* Background Box Toggle */}
          <button
            onClick={() => onUpdateMetadata({ showBackground: !showBackground })}
            className={`py-1.5 px-2 rounded border flex items-center justify-center gap-1 text-[11px] font-medium transition cursor-pointer ${
              showBackground
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-subtle)] hover:text-white hover:bg-[var(--kuro-bg-hover)]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Backdrop</span>
          </button>
        </div>

        {/* Text Alignment 3-Way Buttons */}
        <div className="flex items-center gap-1 bg-[var(--kuro-bg-panel)] p-1 rounded border border-[var(--kuro-border-subtle)]">
          {[
            { val: 'left', icon: AlignLeft, label: 'Left' },
            { val: 'center', icon: AlignCenter, label: 'Center' },
            { val: 'right', icon: AlignRight, label: 'Right' },
          ].map((align) => {
            const Icon = align.icon;
            const isSelected = textAlign === align.val;
            return (
              <button
                key={align.val}
                onClick={() => onUpdateMetadata({ textAlign: align.val })}
                className={`flex-1 py-1 rounded flex items-center justify-center gap-1 text-[10px] font-medium transition cursor-pointer ${
                  isSelected
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-[var(--kuro-text-muted)] hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{align.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
