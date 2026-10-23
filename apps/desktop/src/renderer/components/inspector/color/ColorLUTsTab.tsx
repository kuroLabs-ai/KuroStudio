import React, { useState } from 'react';
import { Film, Sliders, Check } from 'lucide-react';

export interface ColorPreset {
  id: string;
  name: string;
  category: 'Cinematic' | 'Mood' | 'Vintage' | 'Creative';
  desc: string;
  previewBg: string;
  effects: Partial<Record<string, number>>;
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'teal-orange',
    name: 'Teal & Orange',
    category: 'Cinematic',
    desc: 'Blockbuster Hollywood contrast with punchy warm skin tones',
    previewBg: 'linear-gradient(135deg, #0f766e 0%, #ea580c 100%)',
    effects: { temperature: 25, tint: -10, contrast: 1.2, saturation: 1.15, vignette: 20 },
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    category: 'Cinematic',
    desc: 'Deep blues and vivid fuchsias for night / sci-fi scenes',
    previewBg: 'linear-gradient(135deg, #06b6d4 0%, #ec4899 100%)',
    effects: { temperature: -40, tint: 35, contrast: 1.35, saturation: 1.4, vignette: 30 },
  },
  {
    id: 'warm-golden',
    name: 'Golden Hour',
    category: 'Mood',
    desc: 'Sunset warm glow with soft highlights',
    previewBg: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
    effects: { temperature: 45, tint: 5, contrast: 1.1, saturation: 1.2, brightness: 1.05 },
  },
  {
    id: 'nordic-cold',
    name: 'Nordic Noir',
    category: 'Mood',
    desc: 'Desaturated, cold, moody atmosphere for drama',
    previewBg: 'linear-gradient(135deg, #334155 0%, #0284c7 100%)',
    effects: { temperature: -45, tint: -5, contrast: 1.25, saturation: 0.65, vignette: 25 },
  },
  {
    id: 'super-8',
    name: 'Super 8 Film',
    category: 'Vintage',
    desc: 'Warm analog 70s look with warm shadows & vignette',
    previewBg: 'linear-gradient(135deg, #78350f 0%, #ca8a04 100%)',
    effects: { temperature: 30, saturation: 0.85, contrast: 1.2, sepia: 25, vignette: 40 },
  },
  {
    id: 'bnw-noir',
    name: 'Silver Screen B&W',
    category: 'Vintage',
    desc: 'High contrast monochrome cinema grade',
    previewBg: 'linear-gradient(135deg, #18181b 0%, #71717a 100%)',
    effects: { saturation: 0.0, contrast: 1.45, brightness: 1.02, vignette: 30 },
  },
  {
    id: 'punchy-pop',
    name: 'Vibrant Commercial',
    category: 'Creative',
    desc: 'Saturated, bright, social-media ready commercial look',
    previewBg: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
    effects: { saturation: 1.35, contrast: 1.18, brightness: 1.08, temperature: 5 },
  },
  {
    id: 'matte-fade',
    name: 'Indie Faded Film',
    category: 'Creative',
    desc: 'Lifted shadows and soft pastel tones for indie cinema',
    previewBg: 'linear-gradient(135deg, #475569 0%, #cbd5e1 100%)',
    effects: { contrast: 0.85, brightness: 1.1, saturation: 0.9, tint: 5, temperature: 10 },
  },
];

interface ColorLUTsTabProps {
  onApplyPreset: (preset: ColorPreset, intensity: number) => void;
  activePresetId?: string;
}

export const ColorLUTsTab: React.FC<ColorLUTsTabProps> = ({
  onApplyPreset,
  activePresetId,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [lutIntensity, setLutIntensity] = useState<number>(100);

  const categories = ['All', 'Cinematic', 'Mood', 'Vintage', 'Creative'];
  const filteredPresets =
    activeCategory === 'All'
      ? COLOR_PRESETS
      : COLOR_PRESETS.filter((p) => p.category === activeCategory);

  return (
    <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3 select-none text-xs">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-amber-400" />
          Cinema 3D LUT Presets
        </span>
      </div>

      {/* LUT Intensity Master Slider */}
      <div className="bg-[var(--kuro-bg-panel)] p-2.5 rounded border border-[var(--kuro-border-subtle)] space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[var(--kuro-text-secondary)] flex items-center gap-1">
            <Sliders className="w-3 h-3 text-amber-400" />
            LUT Blend Intensity
          </span>
          <span className="font-mono text-white text-[10px] font-semibold">{lutIntensity}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={lutIntensity}
          onChange={(e) => setLutIntensity(parseInt(e.target.value, 10))}
          className="w-full accent-amber-400 cursor-pointer h-1.5"
        />
        <div className="flex justify-between text-[8px] text-[var(--kuro-text-muted)] font-mono">
          <span>Subtle (10%)</span>
          <span>50%</span>
          <span>Full Strength (100%)</span>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition cursor-pointer shrink-0 ${
              activeCategory === cat
                ? 'bg-white text-black font-semibold'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)] hover:text-white border border-[var(--kuro-border-subtle)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Preset Cards Grid */}
      <div className="grid grid-cols-2 gap-2">
        {filteredPresets.map((preset) => {
          const isSelected = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onApplyPreset(preset, lutIntensity)}
              className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-2 overflow-hidden relative ${
                isSelected
                  ? 'bg-[var(--kuro-bg-hover)] border-white shadow-md'
                  : 'bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] border-[var(--kuro-border-subtle)] hover:border-white/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded shadow-sm shrink-0 border border-white/20"
                    style={{ background: preset.previewBg }}
                  />
                  <span className="font-semibold text-white text-[11px] truncate">{preset.name}</span>
                </div>
                {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
              </div>
              <p className="text-[9px] text-[var(--kuro-text-muted)] line-clamp-2 leading-tight">
                {preset.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
