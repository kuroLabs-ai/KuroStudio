import React, { useState } from 'react';
import { AssetReference, Clip } from '@kuro/project-format';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Palette,
  Layers,
  Sparkles,
  CaseSensitive,
  Sliders,
  Move,
  CornerDownRight,
  Sun,
  Eye,
  Type as FontIcon,
} from 'lucide-react';

interface TextTabProps {
  clip: Clip;
  asset?: AssetReference;
  onUpdateMetadata: (metadata: Record<string, unknown>) => void;
}

const PRESET_FONTS = [
  { name: 'Inter (Clean Modern UI)', value: 'Inter' },
  { name: 'Impact (Cinematic Headline)', value: 'Impact' },
  { name: 'Montserrat (Geometric Display)', value: 'Montserrat' },
  { name: 'Roboto (Neutral Sans)', value: 'Roboto' },
  { name: 'Georgia (Editorial Serif)', value: 'Georgia' },
  { name: 'Playfair Display (Luxury Serif)', value: 'Playfair Display' },
  { name: 'Courier New (Retro Monospace)', value: 'Courier New' },
  { name: 'Cinzel (Epic / Movie Trailer)', value: 'Cinzel' },
];

const PRESET_STYLES = [
  {
    name: 'Cinematic Gold',
    textColor: '#f59e0b',
    fontFamily: 'Georgia',
    isBold: true,
    isItalic: false,
    fontSize: 44,
    letterSpacing: 4,
    showBackground: false,
    textTransform: 'uppercase',
    shadowBlur: 14,
    shadowColor: 'rgba(0,0,0,0.9)',
    strokeWidth: 0,
    strokeColor: '#000000',
  },
  {
    name: 'Neon Cyber',
    textColor: '#38bdf8',
    fontFamily: 'Montserrat',
    isBold: true,
    isItalic: false,
    fontSize: 48,
    letterSpacing: 2,
    showBackground: false,
    textTransform: 'uppercase',
    shadowBlur: 20,
    shadowColor: '#0284c7',
    strokeWidth: 1,
    strokeColor: '#e0f2fe',
  },
  {
    name: 'Clean Subtitle',
    textColor: '#ffffff',
    fontFamily: 'Inter',
    isBold: true,
    isItalic: false,
    fontSize: 26,
    letterSpacing: 0,
    showBackground: true,
    backgroundColor: 'rgba(0,0,0,0.75)',
    textTransform: 'none',
    shadowBlur: 4,
    shadowColor: 'rgba(0,0,0,0.8)',
    strokeWidth: 0,
    strokeColor: '#000000',
  },
  {
    name: 'Bold Punch',
    textColor: '#facc15',
    fontFamily: 'Impact',
    isBold: true,
    isItalic: false,
    fontSize: 54,
    letterSpacing: 1,
    showBackground: false,
    textTransform: 'uppercase',
    shadowBlur: 0,
    shadowColor: '#000000',
    strokeWidth: 2,
    strokeColor: '#000000',
  },
];

export const TextTab: React.FC<TextTabProps> = ({ clip, asset, onUpdateMetadata }) => {
  const metadata = (asset?.metadata as Record<string, unknown> | undefined) || {};

  const textContent = (metadata['text'] as string) || asset?.name || 'TITLE TEXT';
  const fontSize = Number(metadata['fontSize'] || 36);
  const fontFamily = (metadata['fontFamily'] as string) || 'Inter';
  const textAlign = (metadata['textAlign'] as string) || 'center';
  const isBold = metadata['isBold'] !== false;
  const isItalic = !!metadata['isItalic'];
  const isUnderline = !!metadata['isUnderline'];
  const textTransform = (metadata['textTransform'] as string) || 'none';
  const textColor = (metadata['textColor'] as string) || '#ffffff';
  const letterSpacing = Number(metadata['letterSpacing'] || 0);
  const lineHeight = Number(metadata['lineHeight'] || 1.2);

  // Background box / Backdrop
  const showBackground = !!metadata['showBackground'];
  const backgroundColor = (metadata['backgroundColor'] as string) || 'rgba(0,0,0,0.75)';
  const bgPadding = Number(metadata['bgPadding'] || 12);
  const bgRadius = Number(metadata['bgRadius'] || 8);

  // Outline / Stroke
  const strokeWidth = Number(metadata['strokeWidth'] || 0);
  const strokeColor = (metadata['strokeColor'] as string) || '#000000';

  // Drop Shadow / Glow
  const shadowBlur = Number(metadata['shadowBlur'] || 8);
  const shadowColor = (metadata['shadowColor'] as string) || 'rgba(0,0,0,0.85)';
  const shadowOffsetX = Number(metadata['shadowOffsetX'] || 0);
  const shadowOffsetY = Number(metadata['shadowOffsetY'] || 3);

  // Preset quick apply
  const applyPreset = (preset: typeof PRESET_STYLES[0]) => {
    onUpdateMetadata({
      textColor: preset.textColor,
      fontFamily: preset.fontFamily,
      isBold: preset.isBold,
      isItalic: preset.isItalic,
      fontSize: preset.fontSize,
      letterSpacing: preset.letterSpacing,
      showBackground: preset.showBackground,
      backgroundColor: preset.backgroundColor || backgroundColor,
      textTransform: preset.textTransform,
      shadowBlur: preset.shadowBlur,
      shadowColor: preset.shadowColor,
      strokeWidth: preset.strokeWidth,
      strokeColor: preset.strokeColor,
    });
  };

  return (
    <div className="space-y-3.5 text-xs select-none pb-6">
      {/* ── Quick Style Presets ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Style Presets
          </span>
          <span className="text-[10px] text-[var(--kuro-text-muted)]">1-Click Look</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESET_STYLES.map((st) => (
            <button
              key={st.name}
              onClick={() => applyPreset(st)}
              className="px-2.5 py-1.5 rounded bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] border border-[var(--kuro-border-subtle)] text-[11px] font-medium text-[var(--kuro-text-secondary)] hover:text-white transition flex items-center justify-between cursor-pointer"
            >
              <span>{st.name}</span>
              <div
                className="w-3 h-3 rounded-full border border-white/20"
                style={{ backgroundColor: st.textColor }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* ── 1. Text Content Editor ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-blue-400" />
            Text Content
          </span>
          <span className="text-[10px] text-[var(--kuro-text-muted)] font-mono">
            {textContent.length} chars
          </span>
        </div>
        <textarea
          rows={3}
          value={textContent}
          onChange={(e) => onUpdateMetadata({ text: e.target.value })}
          placeholder="Enter title text..."
          className="w-full bg-[var(--kuro-bg-panel)] text-white p-2.5 rounded border border-[var(--kuro-border-subtle)] text-xs font-medium focus:outline-none focus:border-white transition resize-none leading-relaxed"
        />
      </div>

      {/* ── 2. Typography & Fonts ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <FontIcon className="w-3.5 h-3.5 text-purple-400" />
          Typography & Alignment
        </span>

        {/* Font Family Dropdown */}
        <div className="space-y-1">
          <div className="text-[10px] text-[var(--kuro-text-muted)] font-mono uppercase">Font Family</div>
          <select
            value={fontFamily}
            onChange={(e) => onUpdateMetadata({ fontFamily: e.target.value })}
            className="w-full bg-[var(--kuro-bg-panel)] text-white border border-[var(--kuro-border-subtle)] rounded px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer"
          >
            {PRESET_FONTS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.name}
              </option>
            ))}
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
            min="12"
            max="140"
            value={fontSize}
            onChange={(e) => onUpdateMetadata({ fontSize: parseInt(e.target.value, 10) })}
            className="w-full accent-purple-400 cursor-pointer"
          />
        </div>

        {/* Letter Spacing (Tracking) Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] font-medium">Letter Spacing (Tracking)</span>
            <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
              {letterSpacing} px
            </span>
          </div>
          <input
            type="range"
            min="-2"
            max="24"
            step="1"
            value={letterSpacing}
            onChange={(e) => onUpdateMetadata({ letterSpacing: parseInt(e.target.value, 10) })}
            className="w-full accent-purple-400 cursor-pointer"
          />
        </div>

        {/* Line Height Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] font-medium">Line Height</span>
            <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
              {lineHeight.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.8"
            max="2.5"
            step="0.05"
            value={lineHeight}
            onChange={(e) => onUpdateMetadata({ lineHeight: parseFloat(e.target.value) })}
            className="w-full accent-purple-400 cursor-pointer"
          />
        </div>

        {/* Style Toggles (Bold, Italic, Underline, Uppercase) */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-[var(--kuro-border-subtle)]">
          <button
            onClick={() => onUpdateMetadata({ isBold: !isBold })}
            className={`py-1.5 rounded border flex items-center justify-center gap-1 text-[11px] font-bold transition cursor-pointer ${
              isBold
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-subtle)] hover:text-white'
            }`}
            title="Toggle Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onUpdateMetadata({ isItalic: !isItalic })}
            className={`py-1.5 rounded border flex items-center justify-center gap-1 text-[11px] font-bold transition cursor-pointer ${
              isItalic
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-subtle)] hover:text-white'
            }`}
            title="Toggle Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onUpdateMetadata({ isUnderline: !isUnderline })}
            className={`py-1.5 rounded border flex items-center justify-center gap-1 text-[11px] font-bold transition cursor-pointer ${
              isUnderline
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-subtle)] hover:text-white'
            }`}
            title="Toggle Underline"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() =>
              onUpdateMetadata({
                textTransform: textTransform === 'uppercase' ? 'none' : 'uppercase',
              })
            }
            className={`py-1.5 rounded border flex items-center justify-center gap-1 text-[11px] font-bold transition cursor-pointer ${
              textTransform === 'uppercase'
                ? 'bg-white text-black border-white shadow-sm'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-subtle)] hover:text-white'
            }`}
            title="Toggle All Caps (Uppercase)"
          >
            <CaseSensitive className="w-4 h-4" />
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

      {/* ── 3. Fill Color & Opacity ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-emerald-400" />
          Color & Appearance
        </span>

        {/* Text Fill Color Picker */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--kuro-text-secondary)] font-medium">Text Color</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => onUpdateMetadata({ textColor: e.target.value })}
              className="w-7 h-7 rounded border border-[var(--kuro-border-subtle)] cursor-pointer bg-transparent"
            />
            <span className="font-mono text-[10px] text-[var(--kuro-text-secondary)] uppercase">
              {textColor}
            </span>
          </div>
        </div>

        {/* Quick Color Swatches */}
        <div className="flex items-center gap-1.5 pt-1">
          {['#ffffff', '#000000', '#facc15', '#f87171', '#38bdf8', '#4ade80', '#c084fc'].map((col) => (
            <button
              key={col}
              onClick={() => onUpdateMetadata({ textColor: col })}
              style={{ backgroundColor: col }}
              className={`w-5 h-5 rounded-full border transition cursor-pointer hover:scale-110 ${
                textColor.toLowerCase() === col ? 'ring-2 ring-white border-transparent' : 'border-white/20'
              }`}
              title={col}
            />
          ))}
        </div>
      </div>

      {/* ── 4. Outline / Stroke ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Outline / Stroke
          </span>
          <span className="text-[10px] font-mono text-[var(--kuro-text-muted)]">
            {strokeWidth > 0 ? `${strokeWidth}px` : 'Off'}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] font-medium">Stroke Width</span>
            <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
              {strokeWidth} px
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            step="1"
            value={strokeWidth}
            onChange={(e) => onUpdateMetadata({ strokeWidth: parseInt(e.target.value, 10) })}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {strokeWidth > 0 && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[var(--kuro-text-secondary)]">Stroke Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => onUpdateMetadata({ strokeColor: e.target.value })}
                className="w-6 h-6 rounded border border-[var(--kuro-border-subtle)] cursor-pointer bg-transparent"
              />
              <span className="font-mono text-[10px] text-[var(--kuro-text-secondary)] uppercase">
                {strokeColor}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Shadow & Glow ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-300" />
            Drop Shadow & Glow
          </span>
          <span className="text-[10px] font-mono text-[var(--kuro-text-muted)]">
            {shadowBlur > 0 ? `${shadowBlur}px` : 'Off'}
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] font-medium">Shadow Blur</span>
            <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
              {shadowBlur} px
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="32"
            step="1"
            value={shadowBlur}
            onChange={(e) => onUpdateMetadata({ shadowBlur: parseInt(e.target.value, 10) })}
            className="w-full accent-amber-300 cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] font-medium">Y Offset</span>
            <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
              {shadowOffsetY} px
            </span>
          </div>
          <input
            type="range"
            min="-10"
            max="20"
            step="1"
            value={shadowOffsetY}
            onChange={(e) => onUpdateMetadata({ shadowOffsetY: parseInt(e.target.value, 10) })}
            className="w-full accent-amber-300 cursor-pointer"
          />
        </div>
      </div>

      {/* ── 6. Backdrop Box ── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Backdrop Box
          </span>
          <button
            onClick={() => onUpdateMetadata({ showBackground: !showBackground })}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              showBackground ? 'bg-white text-black' : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)]'
            }`}
          >
            {showBackground ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {showBackground && (
          <div className="space-y-2.5 pt-1">
            {/* Box Padding */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[var(--kuro-text-secondary)] font-medium">Box Padding</span>
                <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
                  {bgPadding} px
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="36"
                step="2"
                value={bgPadding}
                onChange={(e) => onUpdateMetadata({ bgPadding: parseInt(e.target.value, 10) })}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            {/* Corner Radius */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[var(--kuro-text-secondary)] font-medium">Corner Radius</span>
                <span className="bg-[var(--kuro-bg-panel)] px-2 py-0.5 rounded font-mono text-white text-[10px] font-semibold border border-[var(--kuro-border-subtle)]">
                  {bgRadius} px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="1"
                value={bgRadius}
                onChange={(e) => onUpdateMetadata({ bgRadius: parseInt(e.target.value, 10) })}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
