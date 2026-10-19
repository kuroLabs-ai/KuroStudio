import React, { useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { ApplyEffectCommand } from '@kuro/editor-core';
import {
  Wand2,
  Search,
  Sparkles,
  Check,
  Sliders,
  Eye,
  SlidersHorizontal
} from 'lucide-react';

interface EffectDef {
  id: string;
  name: string;
  category: 'color' | 'blur' | 'stylize' | 'film';
  effectType: 'brightness' | 'contrast' | 'saturation' | 'blur';
  defaultValue: number;
  description: string;
}

const EFFECTS_CATALOG: EffectDef[] = [
  {
    id: 'fx_bw_mono',
    name: 'B&W Monochrome',
    category: 'color',
    effectType: 'saturation',
    defaultValue: 0.0,
    description: 'Classic high-contrast black & white noir look',
  },
  {
    id: 'fx_gaussian_blur',
    name: 'Gaussian Blur',
    category: 'blur',
    effectType: 'blur',
    defaultValue: 1.5,
    description: 'Smooth atmospheric gaussian defocus blur',
  },
  {
    id: 'fx_high_contrast',
    name: 'High Contrast',
    category: 'color',
    effectType: 'contrast',
    defaultValue: 1.6,
    description: 'Deep punchy shadows and crisp highlights',
  },
  {
    id: 'fx_brightness_boost',
    name: 'Exposure Lift',
    category: 'color',
    effectType: 'brightness',
    defaultValue: 0.35,
    description: 'Boost overall scene exposure and midtone levels',
  },
  {
    id: 'fx_film_grain',
    name: 'Film Grain 35mm',
    category: 'film',
    effectType: 'contrast',
    defaultValue: 1.25,
    description: 'Subtle analog silver halide grain texture',
  },
  {
    id: 'fx_vignette',
    name: 'Vignette Dark',
    category: 'stylize',
    effectType: 'contrast',
    defaultValue: 1.3,
    description: 'Gradual optical light falloff towards frame borders',
  },
  {
    id: 'fx_chromatic',
    name: 'Chromatic Glitch',
    category: 'stylize',
    effectType: 'saturation',
    defaultValue: 1.4,
    description: 'Color channel split simulating anamorphic lens fringing',
  },
  {
    id: 'fx_soft_glow',
    name: 'Diffusion Glow',
    category: 'blur',
    effectType: 'blur',
    defaultValue: 0.6,
    description: 'Dreamy halation bloom on bright light sources',
  },
];

export const EffectsPanel: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedId, setAppliedId] = useState<string | null>(null);

  const selectedClipIds = timelineStore.getSelectedClipIds();
  const activeClipId = selectedClipIds[0];

  const filteredEffects = EFFECTS_CATALOG.filter((fx) => {
    const matchesCat = selectedCategory === 'all' || fx.category === selectedCategory;
    const matchesSearch =
      fx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fx.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleApplyEffect = async (fx: EffectDef) => {
    if (!activeClipId) return;

    await editorStore.executeCommand(
      new ApplyEffectCommand(activeClipId, {
        effectType: fx.effectType,
        enabled: true,
        parameters: { value: fx.defaultValue },
      })
    );

    setAppliedId(fx.id);
    setTimeout(() => setAppliedId(null), 1800);
  };

  return (
    <div
      className="h-full flex flex-col select-none overflow-hidden text-xs"
      style={{
        background: 'var(--kuro-bg-surface)',
        color: 'var(--kuro-text-primary)',
      }}
    >
      {/* Search & Categories */}
      <div className="p-3 border-b space-y-2.5 shrink-0" style={{ borderColor: 'var(--kuro-border-subtle)' }}>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2" style={{ color: 'var(--kuro-text-muted)' }} />
          <input
            type="text"
            placeholder="Search visual effects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none transition"
            style={{
              background: 'var(--kuro-bg-elevated)',
              border: '1px solid var(--kuro-border-subtle)',
              color: 'var(--kuro-text-primary)',
            }}
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {['all', 'color', 'blur', 'stylize', 'film'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-2.5 py-1 rounded-md text-[11px] capitalize whitespace-nowrap font-medium transition"
              style={{
                background: selectedCategory === cat ? 'var(--kuro-text-primary)' : 'var(--kuro-bg-elevated)',
                color: selectedCategory === cat ? 'var(--kuro-bg-canvas)' : 'var(--kuro-text-muted)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Clip Notice */}
      {!activeClipId && (
        <div
          className="mx-3 my-2 p-2 rounded-lg border text-[11px] flex items-center gap-2 shrink-0"
          style={{
            background: 'var(--kuro-bg-elevated)',
            borderColor: 'var(--kuro-border-subtle)',
            color: 'var(--kuro-text-secondary)',
          }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--kuro-text-muted)' }} />
          <span>Click a clip on the timeline to enable 1-click effects application</span>
        </div>
      )}

      {/* Effects Grid */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredEffects.map((fx) => {
          const isApplied = appliedId === fx.id;

          return (
            <div
              key={fx.id}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/kuro-effect', JSON.stringify(fx));
                e.dataTransfer.setData('text/plain', JSON.stringify({ kuroType: 'effect', data: fx }));
                e.dataTransfer.effectAllowed = 'copyMove';
              }}
              className="group p-2.5 rounded-lg border flex items-center justify-between gap-3 transition hover:shadow-sm cursor-grab active:cursor-grabbing"
              title="Drag onto any clip on timeline, or click Apply"
              style={{
                background: 'var(--kuro-bg-elevated)',
                borderColor: 'var(--kuro-border-subtle)',
              }}
            >
              <div
                className="w-10 h-10 rounded-md border flex items-center justify-center shrink-0 transition group-hover:scale-105"
                style={{
                  background: 'var(--kuro-bg-surface)',
                  borderColor: 'var(--kuro-border-default)',
                }}
              >
                <Wand2 className="w-4 h-4" style={{ color: 'var(--kuro-text-secondary)' }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs truncate" style={{ color: 'var(--kuro-text-primary)' }}>
                    {fx.name}
                  </span>
                  <span
                    className="text-[9px] uppercase px-1 rounded font-mono"
                    style={{
                      background: 'var(--kuro-bg-surface)',
                      color: 'var(--kuro-text-muted)',
                    }}
                  >
                    {fx.category}
                  </span>
                </div>
                <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'var(--kuro-text-muted)' }}>
                  {fx.description}
                </p>
              </div>

              <button
                onClick={() => handleApplyEffect(fx)}
                disabled={!activeClipId}
                className={`studio-btn text-[11px] px-2.5 py-1 font-medium shrink-0 flex items-center gap-1 transition ${
                  !activeClipId ? 'opacity-30 cursor-not-allowed' : ''
                }`}
                style={{
                  background: isApplied ? 'var(--kuro-text-primary)' : 'var(--kuro-bg-surface)',
                  color: isApplied ? 'var(--kuro-bg-canvas)' : 'var(--kuro-text-primary)',
                  border: '1px solid var(--kuro-border-default)',
                }}
                title={activeClipId ? 'Apply effect to active clip' : 'Select a clip first'}
              >
                {isApplied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Applied</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Apply</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div
        className="p-2 border-t text-[10px] flex items-center justify-between"
        style={{
          borderColor: 'var(--kuro-border-subtle)',
          background: 'var(--kuro-bg-elevated)',
          color: 'var(--kuro-text-muted)',
        }}
      >
        <span>Parameters editable in Inspector panel</span>
        <span className="font-mono">{filteredEffects.length} FX</span>
      </div>
    </div>
  );
};
