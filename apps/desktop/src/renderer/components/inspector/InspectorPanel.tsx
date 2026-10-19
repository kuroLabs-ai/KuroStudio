import React, { useEffect, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { layoutStore } from '../../stores/useLayoutStore';
import { SetAudioVolumeCommand, ApplyEffectCommand, RemoveEffectCommand } from '@kuro/editor-core';
import {
  Sliders,
  Clock,
  Volume2,
  Sparkles,
  X,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export const InspectorPanel: React.FC = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubEditor = editorStore.subscribe(() => setTick((t) => t + 1));
    const unsubTimeline = timelineStore.subscribe(() => setTick((t) => t + 1));
    return () => {
      unsubEditor();
      unsubTimeline();
    };
  }, []);

  const project = editorStore.getProject();
  const selectedClipIds = timelineStore.getSelectedClipIds();
  const activeClipId = selectedClipIds[0];

  let selectedClip = undefined;
  for (const track of project.tracks) {
    const found = track.clips.find((c) => c.id === activeClipId);
    if (found) {
      selectedClip = found;
      break;
    }
  }

  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedClip) return;
    const vol = parseFloat(e.target.value);
    await editorStore.executeCommand(new SetAudioVolumeCommand(selectedClip.id, vol));
  };

  const handleAddEffect = async (effectType: 'brightness' | 'contrast' | 'saturation' | 'blur') => {
    if (!selectedClip) return;
    await editorStore.executeCommand(
      new ApplyEffectCommand(selectedClip.id, {
        effectType,
        enabled: true,
        parameters: { value: effectType === 'brightness' ? 0.2 : 1.2 },
      })
    );
  };

  const handleRemoveEffect = async (effectId: string) => {
    if (!selectedClip) return;
    await editorStore.executeCommand(new RemoveEffectCommand(selectedClip.id, effectId));
  };

  if (!selectedClip) {
    return (
      <div className="h-full bg-[var(--kuro-bg-panel)] border-l border-[var(--kuro-border-subtle)] select-none flex flex-col text-xs transition-colors">
        {/* Header */}
        <div className="h-8 px-3 border-b border-[var(--kuro-border-subtle)] flex items-center justify-between bg-[var(--kuro-bg-panel)] shrink-0">
          <div className="flex items-center gap-1.5 font-bold text-[var(--kuro-text-primary)] uppercase tracking-wider text-xs">
            <Sliders className="w-3.5 h-3.5 text-[var(--kuro-text-secondary)]" />
            <span>Inspector</span>
          </div>
          <button
            onClick={() => layoutStore.toggleInspector()}
            className="p-1 rounded hover:bg-[var(--kuro-bg-hover)] transition text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)]"
            title="Collapse Inspector"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Empty placeholder */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-[var(--kuro-text-muted)]">
          <div className="w-10 h-10 rounded-full bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)] flex items-center justify-center mb-2 text-[var(--kuro-text-muted)]">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <p className="font-semibold text-[var(--kuro-text-primary)] text-xs">No Clip Selected</p>
          <p className="text-[11px] text-[var(--kuro-text-muted)] mt-1 max-w-[170px]">
            Select any clip on the timeline to tweak volume, timing & visual effects
          </p>
        </div>
      </div>
    );
  }

  const asset = project.assets.find((a) => a.id === selectedClip?.assetId);
  const volume = selectedClip.audio?.volume ?? 1.0;
  const startSec = (selectedClip.timelineStartTicks / project.timelineTimebase).toFixed(2);
  const durationSec = (selectedClip.durationTicks / project.timelineTimebase).toFixed(2);

  return (
    <div className="h-full bg-[var(--kuro-bg-panel)] border-l border-[var(--kuro-border-subtle)] select-none overflow-y-auto text-xs flex flex-col transition-colors">
      {/* Header */}
      <div className="h-8 px-3 border-b border-[var(--kuro-border-subtle)] flex items-center justify-between bg-[var(--kuro-bg-panel)] shrink-0">
        <div className="flex items-center gap-1.5 font-bold text-[var(--kuro-text-primary)] uppercase tracking-wider text-xs">
          <Sliders className="w-3.5 h-3.5 text-[var(--kuro-text-secondary)]" />
          <span>Inspector</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--kuro-text-secondary)] bg-[var(--kuro-bg-surface)] px-2 py-0.5 rounded border border-[var(--kuro-border-subtle)] font-mono font-medium truncate max-w-[110px]">
            {asset?.name ?? selectedClip.id}
          </span>
          <button
            onClick={() => layoutStore.toggleInspector()}
            className="p-1 rounded hover:bg-[var(--kuro-bg-hover)] transition text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)]"
            title="Collapse Inspector"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3.5 flex-1 overflow-y-auto">
        {/* Clip Timing Summary */}
        <div className="bg-[var(--kuro-bg-surface)] p-2.5 rounded-lg border border-[var(--kuro-border-subtle)] space-y-1.5 shadow-sm">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--kuro-text-primary)] text-xs">
            <Clock className="w-3 h-3 text-[var(--kuro-text-secondary)]" />
            <span>Clip Timing</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[var(--kuro-text-muted)] text-[11px]">
            <div>Start: <span className="text-[var(--kuro-text-primary)] font-mono font-medium">{startSec}s</span></div>
            <div>Duration: <span className="text-[var(--kuro-text-primary)] font-mono font-medium">{durationSec}s</span></div>
          </div>
        </div>

        {/* Audio Volume Fader */}
        <div className="space-y-1.5 bg-[var(--kuro-bg-surface)] p-2.5 rounded-lg border border-[var(--kuro-border-subtle)] shadow-sm">
          <div className="flex justify-between items-center text-[var(--kuro-text-primary)]">
            <span className="font-semibold flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 text-[var(--kuro-text-secondary)]" />
              <span>Audio Level</span>
            </span>
            <span className="font-mono text-[var(--kuro-text-primary)] font-semibold text-[11px]">{(volume * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
          />
        </div>

        {/* Visual Effects Stack */}
        <div className="space-y-2 pt-1 border-t border-[var(--kuro-border-subtle)]">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-[var(--kuro-text-primary)] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[var(--kuro-text-secondary)]" />
              <span>Effects ({selectedClip.effects.length})</span>
            </span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddEffect(e.target.value as 'brightness' | 'contrast' | 'saturation' | 'blur');
                  e.target.value = '';
                }
              }}
              className="bg-[var(--kuro-bg-surface)] text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] text-[11px] rounded px-2 py-0.5 focus:outline-none cursor-pointer"
            >
              <option value="">+ Add Effect</option>
              <option value="brightness">Brightness</option>
              <option value="contrast">Contrast</option>
              <option value="saturation">Saturation</option>
              <option value="blur">Blur</option>
            </select>
          </div>

          {selectedClip.effects.length === 0 ? (
            <p className="text-[11px] text-[var(--kuro-text-muted)] italic py-1">No color or visual filters applied.</p>
          ) : (
            <div className="space-y-1.5">
              {selectedClip.effects.map((effect) => (
                <div
                  key={effect.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)] shadow-sm"
                >
                  <span className="capitalize text-[var(--kuro-text-primary)] font-medium text-xs">{effect.effectType}</span>
                  <button
                    onClick={() => handleRemoveEffect(effect.id)}
                    className="p-1 text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)] rounded transition"
                    title="Remove Effect"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
