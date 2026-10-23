import React, { useState, useMemo } from 'react';
import { Clip, EffectInstance } from '@kuro/project-format';
import { generateId } from '@kuro/shared';
import {
  Sliders,
  TrendingUp,
  Sun,
  Film,
  Layers,
  Activity,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  ClipboardPaste,
  RotateCcw,
  Check
} from 'lucide-react';

import { ColorWheels, WheelValue } from './color/ColorWheels';
import { ColorCurves, CurvesState } from './color/ColorCurves';
import { NodeGraphTree, NodeItem } from './color/NodeGraphTree';
import { VideoScopes } from './color/VideoScopes';
import { ColorBasicTab } from './color/ColorBasicTab';
import { ColorLUTsTab, ColorPreset } from './color/ColorLUTsTab';
import { ColorFilmFXTab } from './color/ColorFilmFXTab';

interface ColorTabProps {
  clip: Clip;
  onUpdateEffects: (effects: EffectInstance[]) => void;
}

type ColorSubTab = 'wheels' | 'curves' | 'basic' | 'luts' | 'nodes' | 'scopes' | 'fx';

// Global clipboard for copying/pasting color grades across clips
declare global {
  interface Window {
    __kuroColorClipboard?: EffectInstance[];
  }
}

export const ColorTab: React.FC<ColorTabProps> = ({ clip, onUpdateEffects }) => {
  const [activeSubTab, setActiveSubTab] = useState<ColorSubTab>('wheels');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-01');
  const [isBypassed, setIsBypassed] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);
  const [pastedNotification, setPastedNotification] = useState<boolean>(false);

  // Helper to read single effect value
  const getParam = (effectType: string, defaultValue: number): number => {
    const found = clip.effects.find((e) => e.effectType === effectType);
    if (!found || found.parameters.value === undefined) return defaultValue;
    return Number(found.parameters.value);
  };

  // Helper to set single effect value
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

  // ─── Color Wheels State ───
  const getWheelValue = (wheelType: 'lift' | 'gamma' | 'gain' | 'offset'): WheelValue => {
    const found = clip.effects.find((e) => e.effectType === wheelType);
    if (!found) return { x: 0, y: 0, hue: 0, sat: 0, luma: 0 };
    return {
      x: Number(found.parameters.x ?? 0),
      y: Number(found.parameters.y ?? 0),
      hue: Number(found.parameters.hue ?? 0),
      sat: Number(found.parameters.sat ?? 0),
      luma: Number(found.parameters.luma ?? 0),
    };
  };

  const updateWheelValue = (wheelType: 'lift' | 'gamma' | 'gain' | 'offset', val: WheelValue) => {
    let updated = [...clip.effects];
    const idx = updated.findIndex((e) => e.effectType === wheelType);
    const isZero =
      Math.abs(val.x) < 0.001 &&
      Math.abs(val.y) < 0.001 &&
      Math.abs(val.luma) < 0.001;

    if (isZero) {
      if (idx !== -1) updated.splice(idx, 1);
    } else {
      if (idx !== -1) {
        updated[idx] = {
          ...updated[idx]!,
          enabled: true,
          parameters: {
            x: val.x,
            y: val.y,
            hue: val.hue,
            sat: val.sat,
            luma: val.luma,
          },
        };
      } else {
        updated.push({
          id: generateId(`eff_${wheelType}`),
          effectType: wheelType,
          enabled: true,
          parameters: {
            x: val.x,
            y: val.y,
            hue: val.hue,
            sat: val.sat,
            luma: val.luma,
          },
        });
      }
    }
    onUpdateEffects(updated);
  };

  const liftWheel = getWheelValue('lift');
  const gammaWheel = getWheelValue('gamma');
  const gainWheel = getWheelValue('gain');
  const offsetWheel = getWheelValue('offset');

  // ─── Curves State ───
  const curvesEffect = clip.effects.find((e) => e.effectType === 'curves');
  const curvesState: CurvesState = useMemo(() => {
    if (!curvesEffect || !curvesEffect.parameters.data) {
      return {
        master: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        red: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        blue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      };
    }
    try {
      return JSON.parse(curvesEffect.parameters.data as string);
    } catch {
      return {
        master: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        red: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
        blue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      };
    }
  }, [curvesEffect]);

  const updateCurves = (newCurves: CurvesState) => {
    let updated = [...clip.effects];
    const idx = updated.findIndex((e) => e.effectType === 'curves');
    const jsonStr = JSON.stringify(newCurves);

    if (idx !== -1) {
      updated[idx] = {
        ...updated[idx]!,
        enabled: true,
        parameters: { data: jsonStr },
      };
    } else {
      updated.push({
        id: generateId('eff_curves'),
        effectType: 'curves',
        enabled: true,
        parameters: { data: jsonStr },
      });
    }
    onUpdateEffects(updated);
  };

  // ─── Node Graph State ───
  const nodeGraphEffect = clip.effects.find((e) => e.effectType === 'nodeGraph');
  const bypassedNodeIds: string[] = useMemo(() => {
    if (!nodeGraphEffect || !nodeGraphEffect.parameters.bypassed) return [];
    try {
      return JSON.parse(nodeGraphEffect.parameters.bypassed as string);
    } catch {
      return [];
    }
  }, [nodeGraphEffect]);

  const nodes: NodeItem[] = [
    {
      id: 'node-01',
      number: '01',
      name: 'Primary Wheels',
      category: 'primaries',
      enabled: !bypassedNodeIds.includes('node-01'),
      active: activeSubTab === 'wheels',
    },
    {
      id: 'node-02',
      number: '02',
      name: 'RGB Curves',
      category: 'curves',
      enabled: !bypassedNodeIds.includes('node-02'),
      active: activeSubTab === 'curves',
    },
    {
      id: 'node-03',
      number: '03',
      name: 'Cinema Look',
      category: 'lut',
      enabled: !bypassedNodeIds.includes('node-03'),
      active: activeSubTab === 'luts',
    },
    {
      id: 'node-04',
      number: '04',
      name: 'Film Stylize',
      category: 'fx',
      enabled: !bypassedNodeIds.includes('node-04'),
      active: activeSubTab === 'fx',
    },
  ];

  const toggleNodeBypass = (nodeId: string) => {
    let updatedBypassed = [...bypassedNodeIds];
    if (updatedBypassed.includes(nodeId)) {
      updatedBypassed = updatedBypassed.filter((id) => id !== nodeId);
    } else {
      updatedBypassed.push(nodeId);
    }

    let updatedEffects = [...clip.effects];
    const idx = updatedEffects.findIndex((e) => e.effectType === 'nodeGraph');
    if (idx !== -1) {
      updatedEffects[idx] = {
        ...updatedEffects[idx]!,
        parameters: { bypassed: JSON.stringify(updatedBypassed) },
      };
    } else {
      updatedEffects.push({
        id: generateId('eff_nodegraph'),
        effectType: 'nodeGraph',
        enabled: true,
        parameters: { bypassed: JSON.stringify(updatedBypassed) },
      });
    }
    onUpdateEffects(updatedEffects);
  };

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    if (nodeId === 'node-01') setActiveSubTab('wheels');
    else if (nodeId === 'node-02') setActiveSubTab('curves');
    else if (nodeId === 'node-03') setActiveSubTab('luts');
    else if (nodeId === 'node-04') setActiveSubTab('fx');
  };

  // ─── Basic Tone & Color Parameters ───
  const temperature = getParam('temperature', 0);
  const tint = getParam('tint', 0);
  const exposure = getParam('exposure', 0);
  const contrast = getParam('contrast', 1.0);
  const highlights = getParam('highlights', 0);
  const shadows = getParam('shadows', 0);
  const whites = getParam('whites', 0);
  const blacks = getParam('blacks', 0);
  const saturation = getParam('saturation', 1.0);
  const vibrance = getParam('vibrance', 0);

  // ─── Film FX Parameters ───
  const vignette = getParam('vignette', 0);
  const grain = getParam('grain', 0);
  const blur = getParam('blur', 0);
  const sepia = getParam('sepia', 0);
  const invert = getParam('invert', 0);

  // ─── Preset Application with Intensity ───
  const handleApplyPreset = (preset: ColorPreset, intensity: number) => {
    const ratio = intensity / 100.0;
    const newEffects: EffectInstance[] = [];

    // Retain existing wheels or curves
    for (const eff of clip.effects) {
      if (['lift', 'gamma', 'gain', 'offset', 'curves', 'nodeGraph'].includes(eff.effectType)) {
        newEffects.push(eff);
      }
    }

    // Blend preset parameters with ratio
    Object.entries(preset.effects).forEach(([effType, val]) => {
      let finalVal = val!;
      if (effType === 'contrast' || effType === 'saturation' || effType === 'brightness') {
        finalVal = 1.0 + (val! - 1.0) * ratio;
      } else {
        finalVal = val! * ratio;
      }

      newEffects.push({
        id: generateId('eff'),
        effectType: effType as any,
        enabled: true,
        parameters: { value: finalVal },
      });
    });

    onUpdateEffects(newEffects);
  };

  // ─── Before / After Bypass Toggle ───
  const handleToggleBypass = () => {
    if (!isBypassed) {
      // Temporarily disable all effects
      setIsBypassed(true);
      const disabled = clip.effects.map((e) => ({ ...e, enabled: false }));
      onUpdateEffects(disabled);
    } else {
      // Re-enable all effects
      setIsBypassed(false);
      const enabled = clip.effects.map((e) => ({ ...e, enabled: true }));
      onUpdateEffects(enabled);
    }
  };

  // ─── Copy & Paste Color Grade ───
  const handleCopyGrade = () => {
    window.__kuroColorClipboard = JSON.parse(JSON.stringify(clip.effects));
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2000);
  };

  const handlePasteGrade = () => {
    if (!window.__kuroColorClipboard) return;
    const pasted = JSON.parse(JSON.stringify(window.__kuroColorClipboard));
    onUpdateEffects(pasted);
    setPastedNotification(true);
    setTimeout(() => setPastedNotification(false), 2000);
  };

  const hasModifications = clip.effects.length > 0;

  return (
    <div className="space-y-3.5 text-xs select-none pb-6">
      {/* ── Top Bar: DaVinci Resolve Master Control Strip ── */}
      <div className="p-2.5 rounded-lg bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span className="font-bold text-white tracking-wider text-[11px] uppercase">
              Resolve Color Suite
            </span>
            <span className="text-[9px] bg-white/10 text-white font-mono px-1.5 py-0.2 rounded font-semibold">
              {clip.effects.length} {clip.effects.length === 1 ? 'GRADE' : 'GRADES'}
            </span>
          </div>

          {/* Quick Actions Strip */}
          <div className="flex items-center gap-1.5">
            {/* Compare / Bypass Toggle */}
            <button
              onClick={handleToggleBypass}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition cursor-pointer ${
                isBypassed
                  ? 'bg-amber-500 text-black shadow'
                  : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-secondary)] hover:text-white border border-[var(--kuro-border-subtle)]'
              }`}
              title="Bypass Color Grade (Before / After Compare)"
            >
              {isBypassed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {isBypassed ? 'Bypassed' : 'Compare'}
            </button>

            {/* Copy Grade */}
            <button
              onClick={handleCopyGrade}
              className="p-1 rounded bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-secondary)] hover:text-white border border-[var(--kuro-border-subtle)] transition cursor-pointer"
              title="Copy Color Grade"
            >
              {copiedNotification ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>

            {/* Paste Grade */}
            <button
              onClick={handlePasteGrade}
              disabled={!window.__kuroColorClipboard}
              className={`p-1 rounded border transition cursor-pointer ${
                window.__kuroColorClipboard
                  ? 'bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-secondary)] hover:text-white border-[var(--kuro-border-subtle)]'
                  : 'opacity-20 cursor-not-allowed bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)] border-transparent'
              }`}
              title="Paste Color Grade"
            >
              {pastedNotification ? <Check className="w-3 h-3 text-emerald-400" /> : <ClipboardPaste className="w-3 h-3" />}
            </button>

            {/* Master Reset All */}
            <button
              onClick={() => onUpdateEffects([])}
              disabled={!hasModifications}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition cursor-pointer ${
                hasModifications
                  ? 'bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30'
                  : 'opacity-20 cursor-not-allowed bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-muted)] border-transparent'
              }`}
              title="Reset all color parameters to default"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reset All
            </button>
          </div>
        </div>

        {/* ── Sub-Panel Tabs Bar (Resolve Multi-Panel) ── */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar border-t border-[var(--kuro-border-subtle)] pt-1.5">
          {[
            { id: 'wheels', label: 'Wheels', icon: Sliders },
            { id: 'curves', label: 'Curves', icon: TrendingUp },
            { id: 'basic', label: 'Basic Tone', icon: Sun },
            { id: 'luts', label: 'LUTs', icon: Film },
            { id: 'nodes', label: 'Node Tree', icon: Layers },
            { id: 'scopes', label: 'Scopes', icon: Activity },
            { id: 'fx', label: 'Film FX', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as ColorSubTab)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-secondary)] hover:text-white border border-[var(--kuro-border-subtle)]'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sub-Panel Active Content ── */}
      {activeSubTab === 'wheels' && (
        <ColorWheels
          lift={liftWheel}
          gamma={gammaWheel}
          gain={gainWheel}
          offset={offsetWheel}
          onChangeLift={(val) => updateWheelValue('lift', val)}
          onChangeGamma={(val) => updateWheelValue('gamma', val)}
          onChangeGain={(val) => updateWheelValue('gain', val)}
          onChangeOffset={(val) => updateWheelValue('offset', val)}
          onResetAllWheels={() => {
            updateWheelValue('lift', { x: 0, y: 0, hue: 0, sat: 0, luma: 0 });
            updateWheelValue('gamma', { x: 0, y: 0, hue: 0, sat: 0, luma: 0 });
            updateWheelValue('gain', { x: 0, y: 0, hue: 0, sat: 0, luma: 0 });
            updateWheelValue('offset', { x: 0, y: 0, hue: 0, sat: 0, luma: 0 });
          }}
        />
      )}

      {activeSubTab === 'curves' && (
        <ColorCurves
          curves={curvesState}
          onChangeCurves={updateCurves}
          onResetCurves={() =>
            updateCurves({
              master: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
              red: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
              green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
              blue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
            })
          }
        />
      )}

      {activeSubTab === 'basic' && (
        <ColorBasicTab
          temperature={temperature}
          tint={tint}
          exposure={exposure}
          contrast={contrast}
          highlights={highlights}
          shadows={shadows}
          whites={whites}
          blacks={blacks}
          saturation={saturation}
          vibrance={vibrance}
          onUpdateParam={setEffectValue}
          onResetBasic={() => {
            setEffectValue('temperature', 0, 0);
            setEffectValue('tint', 0, 0);
            setEffectValue('exposure', 0, 0);
            setEffectValue('contrast', 1.0, 1.0);
            setEffectValue('highlights', 0, 0);
            setEffectValue('shadows', 0, 0);
            setEffectValue('whites', 0, 0);
            setEffectValue('blacks', 0, 0);
            setEffectValue('saturation', 1.0, 1.0);
            setEffectValue('vibrance', 0, 0);
          }}
        />
      )}

      {activeSubTab === 'luts' && (
        <ColorLUTsTab onApplyPreset={handleApplyPreset} />
      )}

      {activeSubTab === 'nodes' && (
        <NodeGraphTree
          nodes={nodes}
          selectedNodeId={selectedNodeId}
          onSelectNode={handleSelectNode}
          onToggleNodeBypass={toggleNodeBypass}
          onResetNode={(nodeId) => {
            if (nodeId === 'node-01') {
              updateWheelValue('lift', { x: 0, y: 0, hue: 0, sat: 0, luma: 0 });
              updateWheelValue('gamma', { x: 0, y: 0, hue: 0, sat: 0, luma: 0 });
              updateWheelValue('gain', { x: 0, y: 0, hue: 0, sat: 0, luma: 0 });
              updateWheelValue('offset', { x: 0, y: 0, hue: 0, sat: 0, luma: 0 });
            } else if (nodeId === 'node-02') {
              updateCurves({
                master: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
                red: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
                green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
                blue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
              });
            } else if (nodeId === 'node-04') {
              setEffectValue('vignette', 0, 0);
              setEffectValue('grain', 0, 0);
              setEffectValue('blur', 0, 0);
              setEffectValue('sepia', 0, 0);
              setEffectValue('invert', 0, 0);
            }
          }}
          onAddNode={() => {
            // Adds custom node
            setActiveSubTab('fx');
          }}
        />
      )}

      {activeSubTab === 'scopes' && (
        <VideoScopes
          exposure={exposure}
          contrast={contrast}
          temperature={temperature}
          tint={tint}
          saturation={saturation}
          liftLuma={liftWheel.luma}
          gainLuma={gainWheel.luma}
        />
      )}

      {activeSubTab === 'fx' && (
        <ColorFilmFXTab
          vignette={vignette}
          grain={grain}
          blur={blur}
          sepia={sepia}
          invert={invert}
          onUpdateParam={setEffectValue}
          onResetFX={() => {
            setEffectValue('vignette', 0, 0);
            setEffectValue('grain', 0, 0);
            setEffectValue('blur', 0, 0);
            setEffectValue('sepia', 0, 0);
            setEffectValue('invert', 0, 0);
          }}
        />
      )}
    </div>
  );
};
