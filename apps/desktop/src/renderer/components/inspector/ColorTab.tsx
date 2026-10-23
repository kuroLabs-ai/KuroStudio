import React, { useState } from 'react';
import { Clip, EffectInstance } from '@kuro/project-format';
import { generateId } from '@kuro/shared';
import {
  Sun,
  Contrast,
  Palette,
  Thermometer,
  Sparkles,
  RotateCcw,
  Eye,
  Sliders,
  Flame,
  Droplets,
  Layers,
  Wand2,
  Film,
  Camera,
  Compass,
} from 'lucide-react';

interface ColorTabProps {
  clip: Clip;
  onUpdateEffects: (effects: EffectInstance[]) => void;
}

interface ColorPreset {
  id: string;
  name: string;
  category: 'Cinematic' | 'Mood' | 'Vintage' | 'Creative';
  desc: string;
  previewBg: string;
  effects: Partial<Record<string, number>>;
}

const COLOR_PRESETS: ColorPreset[] = [
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
    name: 'Vibrant Pop',
    category: 'Creative',
    desc: 'Saturated, bright, social-media ready commercial look',
    previewBg: 'linear-gradient(135deg, #10b981 0%, #6366f1 100%)',
    effects: { saturation: 1.35, contrast: 1.18, brightness: 1.08, temperature: 5 },
  },
  {
    id: 'matte-fade',
    name: 'Faded Film',
    category: 'Creative',
    desc: 'Lifted shadows and soft pastel tones for indie cinema',
    previewBg: 'linear-gradient(135deg, #475569 0%, #cbd5e1 100%)',
    effects: { contrast: 0.85, brightness: 1.1, saturation: 0.9, tint: 5, temperature: 10 },
  },
];

export const ColorTab: React.FC<ColorTabProps> = ({ clip, onUpdateEffects }) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Read current effect parameter
  const getParam = (effectType: string, defaultValue: number): number => {
    const found = clip.effects.find((e) => e.effectType === effectType);
    if (!found || found.parameters.value === undefined) return defaultValue;
    return Number(found.parameters.value);
  };

  const brightness = getParam('brightness', 1.0);
  const contrast = getParam('contrast', 1.0);
  const saturation = getParam('saturation', 1.0);
  const exposure = getParam('exposure', 0);
  const temperature = getParam('temperature', 0);
  const tint = getParam('tint', 0);
  const hue = getParam('hue', 0);
  const blur = getParam('blur', 0);
  const vignette = getParam('vignette', 0);
  const sepia = getParam('sepia', 0);
  const invert = getParam('invert', 0);

  // Set single effect with precision
  const setEffectValue = (effectType: string, value: number, defaultValue: number) => {
    let updated = [...clip.effects];
    const idx = updated.findIndex((e) => e.effectType === effectType);

    if (Math.abs(value - defaultValue) < 0.001) {
      if (idx !== -1) updated.splice(idx, 1);
    } else {
      if (idx !== -1) {
        const existing = updated[idx]!;
        updated[idx] = {
          ...existing,
          enabled: true,
          parameters: { value },
        };
      } else {
        updated.push({
          id: generateId('eff'),
          effectType: effectType as any,
          enabled: true,
          parameters: { value },
        });
      }
    }
    onUpdateEffects(updated);
  };

  // Reset all color effects
  const resetAll = () => {
    onUpdateEffects([]);
  };

  // Apply a preset LUT/look
  const applyPreset = (preset: ColorPreset) => {
    const newEffects: EffectInstance[] = [];
    Object.entries(preset.effects).forEach(([effType, val]) => {
      newEffects.push({
        id: generateId('eff'),
        effectType: effType as any,
        enabled: true,
        parameters: { value: val! },
      });
    });
    onUpdateEffects(newEffects);
  };

  const categories = ['All', 'Cinematic', 'Mood', 'Vintage', 'Creative'];
  const filteredPresets = activeCategory === 'All' 
    ? COLOR_PRESETS 
    : COLOR_PRESETS.filter((p) => p.category === activeCategory);

  const hasModifications = clip.effects.length > 0;

  return (
    <div className="space-y-4 text-xs select-none pb-6">
      {/* ─── Top Master Reset & Summary Header ─── */}
      <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-semibold text-white tracking-wide text-[11px]">
            {clip.effects.length === 0 ? 'No Active Grades' : `${clip.effects.length} Active Adjustment${clip.effects.length > 1 ? 's' : ''}`}
          </span>
        </div>
        <button
          onClick={resetAll}
          disabled={!hasModifications}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider font-semibold transition cursor-pointer ${
            hasModifications
              ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
              : 'opacity-40 cursor-not-allowed bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)] border border-transparent'
          }`}
          title="Reset all color parameters to default"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Reset All
        </button>
      </div>

      {/* ─── 1. Cinematic Color Presets / LUTs ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-amber-400" />
            Cinema Color Presets (LUTs)
          </span>
        </div>

        {/* Category Pill Filters */}
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
          {filteredPresets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="group p-2 rounded-lg bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] border border-[var(--kuro-border-subtle)] hover:border-white/30 text-left transition cursor-pointer flex flex-col justify-between gap-2 overflow-hidden relative"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded-md shadow-sm shrink-0 border border-white/20 group-hover:scale-110 transition-transform"
                  style={{ background: preset.previewBg }}
                />
                <span className="font-semibold text-white text-[11px] truncate">{preset.name}</span>
              </div>
              <p className="text-[9px] text-[var(--kuro-text-muted)] line-clamp-2 leading-tight">
                {preset.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* ─── 2. Basic Tone & Exposure (Primary Wheels) ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-yellow-400" />
            Tone & Exposure
          </span>
          <button
            onClick={() => {
              setEffectValue('brightness', 1.0, 1.0);
              setEffectValue('contrast', 1.0, 1.0);
              setEffectValue('exposure', 0, 0);
            }}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white transition flex items-center gap-1 cursor-pointer"
            title="Reset Tone adjustments"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset Tone
          </button>
        </div>

        {/* Exposure */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Exposure (EV)</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-white font-medium">{exposure > 0 ? `+${exposure.toFixed(2)}` : exposure.toFixed(2)} EV</span>
              {exposure !== 0 && (
                <button
                  onClick={() => setEffectValue('exposure', 0, 0)}
                  className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white"
                  title="Reset exposure"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
          <input
            type="range"
            min="-1.5"
            max="1.5"
            step="0.05"
            value={exposure}
            onChange={(e) => setEffectValue('exposure', parseFloat(e.target.value), 0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>

        {/* Brightness */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Brightness</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-white font-medium">{Math.round((brightness - 1.0) * 100)}%</span>
              {Math.abs(brightness - 1.0) > 0.01 && (
                <button
                  onClick={() => setEffectValue('brightness', 1.0, 1.0)}
                  className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white"
                  title="Reset brightness"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.8"
            step="0.02"
            value={brightness}
            onChange={(e) => setEffectValue('brightness', parseFloat(e.target.value), 1.0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Contrast</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-white font-medium">{Math.round((contrast - 1.0) * 100)}%</span>
              {Math.abs(contrast - 1.0) > 0.01 && (
                <button
                  onClick={() => setEffectValue('contrast', 1.0, 1.0)}
                  className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white"
                  title="Reset contrast"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
          <input
            type="range"
            min="0.2"
            max="2.0"
            step="0.02"
            value={contrast}
            onChange={(e) => setEffectValue('contrast', parseFloat(e.target.value), 1.0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>
      </div>

      {/* ─── 3. Color Balance & Vibrance ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Thermometer className="w-3.5 h-3.5 text-blue-400" />
            White Balance & Color
          </span>
          <button
            onClick={() => {
              setEffectValue('temperature', 0, 0);
              setEffectValue('tint', 0, 0);
              setEffectValue('saturation', 1.0, 1.0);
              setEffectValue('hue', 0, 0);
            }}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white transition flex items-center gap-1 cursor-pointer"
            title="Reset color balance adjustments"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset Balance
          </button>
        </div>

        {/* Saturation */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] flex items-center gap-1">
              <Palette className="w-3 h-3 text-[var(--kuro-text-muted)]" />
              Saturation
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-white font-medium">{Math.round(saturation * 100)}%</span>
              {Math.abs(saturation - 1.0) > 0.01 && (
                <button
                  onClick={() => setEffectValue('saturation', 1.0, 1.0)}
                  className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white"
                  title="Reset saturation"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="2.5"
            step="0.02"
            value={saturation}
            onChange={(e) => setEffectValue('saturation', parseFloat(e.target.value), 1.0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[var(--kuro-text-muted)] font-mono">
            <span>0% (Monochrome)</span>
            <span>100% (Unity)</span>
            <span>250% (Punchy)</span>
          </div>
        </div>

        {/* Temperature (Cool <-> Warm) */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Temperature</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-white font-medium">
                {temperature === 0 ? '0' : temperature > 0 ? `+${temperature} (Warm)` : `${temperature} (Cool)`}
              </span>
              {temperature !== 0 && (
                <button
                  onClick={() => setEffectValue('temperature', 0, 0)}
                  className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white"
                  title="Reset temperature"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={temperature}
            onChange={(e) => setEffectValue('temperature', parseInt(e.target.value, 10), 0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono">
            <span className="text-sky-400">Cool / Blue</span>
            <span className="text-[var(--kuro-text-muted)]">Neutral</span>
            <span className="text-amber-400">Warm / Orange</span>
          </div>
        </div>

        {/* Tint (Green <-> Magenta) */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Tint</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-white font-medium">{tint > 0 ? `+${tint}` : tint}</span>
              {tint !== 0 && (
                <button
                  onClick={() => setEffectValue('tint', 0, 0)}
                  className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white"
                  title="Reset tint"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={tint}
            onChange={(e) => setEffectValue('tint', parseInt(e.target.value, 10), 0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono">
            <span className="text-emerald-400">Green</span>
            <span className="text-[var(--kuro-text-muted)]">0</span>
            <span className="text-fuchsia-400">Magenta</span>
          </div>
        </div>

        {/* Hue Rotation */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] flex items-center gap-1">
              <Compass className="w-3 h-3 text-[var(--kuro-text-muted)]" />
              Hue Shift
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-white font-medium">{hue}°</span>
              {hue !== 0 && (
                <button
                  onClick={() => setEffectValue('hue', 0, 0)}
                  className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white"
                  title="Reset hue shift"
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
            value={hue}
            onChange={(e) => setEffectValue('hue', parseInt(e.target.value, 10), 0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>
      </div>

      {/* ─── 4. Lens, Stylize & Vignette ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            Lens & Creative Effects
          </span>
          <button
            onClick={() => {
              setEffectValue('blur', 0, 0);
              setEffectValue('vignette', 0, 0);
              setEffectValue('sepia', 0, 0);
              setEffectValue('invert', 0, 0);
            }}
            className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white transition flex items-center gap-1 cursor-pointer"
            title="Reset Lens effects"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset Lens
          </button>
        </div>

        {/* Vignette */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Vignette (Dark Frame)</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-white font-medium">{vignette}%</span>
              {vignette !== 0 && (
                <button
                  onClick={() => setEffectValue('vignette', 0, 0)}
                  className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white"
                  title="Reset vignette"
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
            value={vignette}
            onChange={(e) => setEffectValue('vignette', parseInt(e.target.value, 10), 0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>

        {/* Blur */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Optical Blur</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-white font-medium">{blur}px</span>
              {blur !== 0 && (
                <button
                  onClick={() => setEffectValue('blur', 0, 0)}
                  className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white"
                  title="Reset blur"
                >
                  ↺
                </button>
              )}
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="25"
            value={blur}
            onChange={(e) => setEffectValue('blur', parseInt(e.target.value, 10), 0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>

        {/* Sepia */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Sepia Warmth</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-white font-medium">{sepia}%</span>
              {sepia !== 0 && (
                <button
                  onClick={() => setEffectValue('sepia', 0, 0)}
                  className="text-[10px] text-[var(--kuro-text-muted)] hover:text-white"
                  title="Reset sepia"
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
            value={sepia}
            onChange={(e) => setEffectValue('sepia', parseInt(e.target.value, 10), 0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>

        {/* Invert */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[var(--kuro-text-secondary)] text-[11px]">Invert Negative</span>
          <button
            onClick={() => setEffectValue('invert', invert > 0 ? 0 : 100, 0)}
            className={`px-3 py-1 rounded text-[10px] font-semibold transition cursor-pointer ${
              invert > 0
                ? 'bg-purple-500 text-white shadow-sm'
                : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)] hover:text-white border border-[var(--kuro-border-subtle)]'
            }`}
          >
            {invert > 0 ? 'Active' : 'Off'}
          </button>
        </div>
      </div>
    </div>
  );
};
