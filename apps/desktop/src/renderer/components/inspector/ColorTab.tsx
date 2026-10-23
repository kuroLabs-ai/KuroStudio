import React from 'react';
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
} from 'lucide-react';

interface ColorTabProps {
  clip: Clip;
  onUpdateEffects: (effects: EffectInstance[]) => void;
}

export const ColorTab: React.FC<ColorTabProps> = ({ clip, onUpdateEffects }) => {
  const getParam = (effectType: string, defaultValue: number): number => {
    const found = clip.effects.find((e) => e.effectType === effectType);
    if (!found || found.parameters.value === undefined) return defaultValue;
    return Number(found.parameters.value);
  };

  const brightness = getParam('brightness', 1.0);
  const contrast = getParam('contrast', 1.0);
  const saturation = getParam('saturation', 1.0);
  const temperature = getParam('temperature', 0);
  const tint = getParam('tint', 0);
  const blur = getParam('blur', 0);
  const vignette = getParam('vignette', 0);

  const setEffectValue = (effectType: string, value: number, defaultValue: number) => {
    let updated = [...clip.effects];
    const idx = updated.findIndex((e) => e.effectType === effectType);

    if (value === defaultValue) {
      // Remove if reset to default
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

  const applyPreset = (presetName: string) => {
    if (presetName === 'reset') {
      onUpdateEffects([]);
      return;
    }

    const effects: EffectInstance[] = [];

    if (presetName === 'bw') {
      effects.push(
        { id: generateId('eff'), effectType: 'saturation', enabled: true, parameters: { value: 0.0 } },
        { id: generateId('eff'), effectType: 'contrast', enabled: true, parameters: { value: 1.25 } }
      );
    } else if (presetName === 'warm') {
      effects.push(
        { id: generateId('eff'), effectType: 'temperature', enabled: true, parameters: { value: 35 } },
        { id: generateId('eff'), effectType: 'saturation', enabled: true, parameters: { value: 1.15 } },
        { id: generateId('eff'), effectType: 'contrast', enabled: true, parameters: { value: 1.1 } }
      );
    } else if (presetName === 'cool') {
      effects.push(
        { id: generateId('eff'), effectType: 'temperature', enabled: true, parameters: { value: -30 } },
        { id: generateId('eff'), effectType: 'contrast', enabled: true, parameters: { value: 1.2 } },
        { id: generateId('eff'), effectType: 'tint', enabled: true, parameters: { value: 10 } }
      );
    } else if (presetName === 'vintage') {
      effects.push(
        { id: generateId('eff'), effectType: 'saturation', enabled: true, parameters: { value: 0.8 } },
        { id: generateId('eff'), effectType: 'contrast', enabled: true, parameters: { value: 1.15 } },
        { id: generateId('eff'), effectType: 'temperature', enabled: true, parameters: { value: 20 } },
        { id: generateId('eff'), effectType: 'vignette', enabled: true, parameters: { value: 35 } }
      );
    } else if (presetName === 'punchy') {
      effects.push(
        { id: generateId('eff'), effectType: 'contrast', enabled: true, parameters: { value: 1.3 } },
        { id: generateId('eff'), effectType: 'saturation', enabled: true, parameters: { value: 1.25 } },
        { id: generateId('eff'), effectType: 'brightness', enabled: true, parameters: { value: 1.05 } }
      );
    }

    onUpdateEffects(effects);
  };

  return (
    <div className="space-y-4 text-xs select-none">
      {/* ─── 1. One-Click Cinematic Presets ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Color Presets
          </span>
          <button
            onClick={() => applyPreset('reset')}
            className="text-[10px] font-mono text-[var(--kuro-text-muted)] hover:text-white transition cursor-pointer"
            title="Reset All Color Adjustments"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {[
            { id: 'reset', label: 'Original' },
            { id: 'bw', label: 'B&W' },
            { id: 'warm', label: 'Warm Sun' },
            { id: 'cool', label: 'Cinematic' },
            { id: 'vintage', label: 'Vintage' },
            { id: 'punchy', label: 'Punchy' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className="py-1 px-1.5 text-center text-[10px] font-semibold rounded bg-[var(--kuro-bg-panel)] hover:bg-white hover:text-black text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] transition cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 2. Basic Color Grading ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Palette className="w-3 h-3" />
          Color Adjustments
        </span>

        {/* Brightness */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] flex items-center gap-1">
              <Sun className="w-3 h-3 text-[var(--kuro-text-muted)]" />
              Brightness
            </span>
            <span className="font-mono text-white font-medium">{Math.round((brightness - 1.0) * 100)}%</span>
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
            <span className="text-[var(--kuro-text-secondary)] flex items-center gap-1">
              <Contrast className="w-3 h-3 text-[var(--kuro-text-muted)]" />
              Contrast
            </span>
            <span className="font-mono text-white font-medium">{Math.round((contrast - 1.0) * 100)}%</span>
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

        {/* Saturation */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)] flex items-center gap-1">
              <Palette className="w-3 h-3 text-[var(--kuro-text-muted)]" />
              Saturation
            </span>
            <span className="font-mono text-white font-medium">{Math.round(saturation * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="2.0"
            step="0.02"
            value={saturation}
            onChange={(e) => setEffectValue('saturation', parseFloat(e.target.value), 1.0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[var(--kuro-text-muted)] font-mono">
            <span>0% (B&W)</span>
            <span>100% (Normal)</span>
            <span>200%</span>
          </div>
        </div>
      </div>

      {/* ─── 3. Temperature & Tint ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Thermometer className="w-3 h-3" />
          White Balance
        </span>

        {/* Temperature (Cool <-> Warm) */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Temperature</span>
            <span className="font-mono text-white font-medium">
              {temperature === 0 ? '0' : temperature > 0 ? `+${temperature} (Warm)` : `${temperature} (Cool)`}
            </span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={temperature}
            onChange={(e) => setEffectValue('temperature', parseInt(e.target.value, 10), 0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[var(--kuro-text-muted)] font-mono">
            <span className="text-blue-400">Cool (Blue)</span>
            <span>0</span>
            <span className="text-amber-400">Warm (Amber)</span>
          </div>
        </div>

        {/* Tint (Green <-> Magenta) */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Tint</span>
            <span className="font-mono text-white font-medium">{tint > 0 ? `+${tint}` : tint}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            value={tint}
            onChange={(e) => setEffectValue('tint', parseInt(e.target.value, 10), 0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[var(--kuro-text-muted)] font-mono">
            <span className="text-emerald-400">Green</span>
            <span>0</span>
            <span className="text-fuchsia-400">Magenta</span>
          </div>
        </div>
      </div>

      {/* ─── 4. Blur & Vignette ─── */}
      <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3">
        <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
          <Eye className="w-3 h-3" />
          Lens & Focus
        </span>

        {/* Blur */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Blur Softness</span>
            <span className="font-mono text-white font-medium">{blur}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="24"
            value={blur}
            onChange={(e) => setEffectValue('blur', parseInt(e.target.value, 10), 0)}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>

        {/* Vignette */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--kuro-text-secondary)]">Vignette (Dark Edges)</span>
            <span className="font-mono text-white font-medium">{vignette}%</span>
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
      </div>
    </div>
  );
};
