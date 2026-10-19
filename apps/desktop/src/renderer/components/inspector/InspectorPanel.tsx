import React, { useEffect, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { SetAudioVolumeCommand, ApplyEffectCommand, RemoveEffectCommand } from '@kuro/editor-core';
import {
  Sliders,
  Clock,
  Volume2,
  Sparkles,
  X,
  Layers,
  SlidersHorizontal
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
      <div className="h-full bg-slate-900 border-l border-slate-800 p-4 select-none flex flex-col items-center justify-center text-center text-slate-500 text-xs">
        <SlidersHorizontal className="w-8 h-8 text-slate-600 mb-2" />
        <p className="font-semibold text-slate-300">Inspector</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[160px]">
          Select any clip on the timeline to edit properties & effects
        </p>
      </div>
    );
  }

  const volume = selectedClip.audio?.volume ?? 1.0;
  const startSec = (selectedClip.timelineStartTicks / project.timelineTimebase).toFixed(2);
  const durationSec = (selectedClip.durationTicks / project.timelineTimebase).toFixed(2);

  return (
    <div className="h-full bg-slate-900 border-l border-slate-800 select-none overflow-y-auto text-xs flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-slate-200 uppercase tracking-wider text-xs">
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <span>Inspector</span>
        </div>
        <span className="text-[10px] text-sky-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono font-medium">
          {selectedClip.id}
        </span>
      </div>

      <div className="p-3 space-y-4">
        {/* Clip Timing Summary */}
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300 text-xs">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>Timing</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px]">
            <div>Start: <span className="text-slate-200 font-mono font-medium">{startSec}s</span></div>
            <div>Duration: <span className="text-slate-200 font-mono font-medium">{durationSec}s</span></div>
          </div>
        </div>

        {/* Audio Volume Fader */}
        <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 text-emerald-400" />
              <span>Audio Volume</span>
            </span>
            <span className="font-mono text-emerald-400 font-semibold">{(volume * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full accent-emerald-500 cursor-pointer"
          />
        </div>

        {/* Visual Effects Stack */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Effects ({selectedClip.effects.length})</span>
            </span>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleAddEffect(e.target.value as 'brightness' | 'contrast' | 'saturation' | 'blur');
                  e.target.value = '';
                }
              }}
              className="bg-slate-800 text-sky-400 border border-slate-700 text-[11px] rounded px-2 py-0.5 focus:outline-none cursor-pointer"
            >
              <option value="">+ Add Effect</option>
              <option value="brightness">Brightness</option>
              <option value="contrast">Contrast</option>
              <option value="saturation">Saturation</option>
              <option value="blur">Blur</option>
            </select>
          </div>

          {selectedClip.effects.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic py-1">No visual effects applied.</p>
          ) : (
            <div className="space-y-1.5">
              {selectedClip.effects.map((effect) => (
                <div
                  key={effect.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 shadow-sm"
                >
                  <span className="capitalize text-slate-200 font-medium">{effect.effectType}</span>
                  <button
                    onClick={() => handleRemoveEffect(effect.id)}
                    className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition"
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
