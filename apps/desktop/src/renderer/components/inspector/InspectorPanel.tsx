import React, { useEffect, useState, useMemo } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { layoutStore } from '../../stores/useLayoutStore';
import { Clip, ClipAudio, ClipTransform, EffectInstance } from '@kuro/project-format';
import {
  Sliders,
  Video,
  Music,
  Palette,
  Gauge,
  Type,
  ChevronRight,
  SlidersHorizontal,
  Clock,
  Sparkles,
} from 'lucide-react';
import { VideoTab } from './VideoTab';
import { AudioTab } from './AudioTab';
import { ColorTab } from './ColorTab';
import { SpeedTab } from './SpeedTab';
import { TextTab } from './TextTab';

type InspectorTabType = 'video' | 'audio' | 'color' | 'speed' | 'text';

export const InspectorPanel: React.FC = () => {
  const [, setTick] = useState(0);
  const [activeTab, setActiveTab] = useState<InspectorTabType>('video');

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

  let selectedClip: Clip | undefined = undefined;
  let selectedTrack: any = undefined;

  for (const track of project.tracks) {
    const found = track.clips.find((c) => c.id === activeClipId);
    if (found) {
      selectedClip = found;
      selectedTrack = track;
      break;
    }
  }

  const asset = selectedClip ? project.assets.find((a) => a.id === selectedClip!.assetId) : undefined;
  const isTitle = !!(asset?.metadata as Record<string, unknown> | undefined)?.['isTitle'];
  const isAudioTrack = selectedTrack?.kind === 'audio';

  // Automatically switch tab if audio-only or title is selected
  useEffect(() => {
    if (isTitle) {
      setActiveTab('text');
    } else if (isAudioTrack && activeTab === 'video') {
      setActiveTab('audio');
    } else if (!isAudioTrack && activeTab === 'text' && !isTitle) {
      setActiveTab('video');
    }
  }, [selectedClip?.id, isTitle, isAudioTrack]);

  // Update Clip Transform (Scale, Position, Rotation, Flip, Opacity, Blend)
  const handleUpdateTransform = (newTransform: Partial<ClipTransform>) => {
    if (!selectedClip) return;
    const currentProj = editorStore.getProject();
    const existing = selectedClip.transform || {
      x: 0,
      y: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      rotation: 0,
      opacity: 1.0,
      flipH: false,
      flipV: false,
      blendMode: 'normal',
      fit: 'contain',
    };

    const updatedClip: Clip = {
      ...selectedClip,
      transform: {
        ...existing,
        ...newTransform,
      },
    };

    const updatedTracks = currentProj.tracks.map((t) =>
      t.clips.some((c) => c.id === selectedClip!.id)
        ? { ...t, clips: t.clips.map((c) => (c.id === selectedClip!.id ? updatedClip : c)) }
        : t
    );

    editorStore.getEditorState().setProject({
      ...currentProj,
      tracks: updatedTracks,
    });
  };

  // Update Clip Audio (Volume, Fades, Pan, Denoise, Pitch)
  const handleUpdateAudio = (newAudio: Partial<ClipAudio>) => {
    if (!selectedClip) return;
    const currentProj = editorStore.getProject();
    const existing = selectedClip.audio || {
      volume: 1.0,
      muted: false,
      pan: 0,
      fadeInTicks: 0,
      fadeOutTicks: 0,
    };

    const updatedClip: Clip = {
      ...selectedClip,
      audio: {
        ...existing,
        ...newAudio,
      },
    };

    const updatedTracks = currentProj.tracks.map((t) =>
      t.clips.some((c) => c.id === selectedClip!.id)
        ? { ...t, clips: t.clips.map((c) => (c.id === selectedClip!.id ? updatedClip : c)) }
        : t
    );

    editorStore.getEditorState().setProject({
      ...currentProj,
      tracks: updatedTracks,
    });
  };

  // Update Clip Effects (Brightness, Contrast, Saturation, Temperature, Tint, etc.)
  const handleUpdateEffects = (newEffects: EffectInstance[]) => {
    if (!selectedClip) return;
    const currentProj = editorStore.getProject();

    const updatedClip: Clip = {
      ...selectedClip,
      effects: newEffects,
    };

    const updatedTracks = currentProj.tracks.map((t) =>
      t.clips.some((c) => c.id === selectedClip!.id)
        ? { ...t, clips: t.clips.map((c) => (c.id === selectedClip!.id ? updatedClip : c)) }
        : t
    );

    editorStore.getEditorState().setProject({
      ...currentProj,
      tracks: updatedTracks,
    });
  };

  // Update Clip Speed
  const handleUpdateSpeed = (speedMultiplier: number, preservePitch?: boolean) => {
    if (!selectedClip) return;
    const validSpeed = Math.max(0.1, Math.min(10.0, speedMultiplier));
    const currentProj = editorStore.getProject();

    const currentSpeed =
      selectedClip.speedNumerator && selectedClip.speedDenominator
        ? selectedClip.speedNumerator / selectedClip.speedDenominator
        : 1.0;

    const sourceDurationTicks = Math.round(selectedClip.durationTicks * currentSpeed);
    const newDurationTicks = Math.max(
      Math.round(currentProj.timelineTimebase * 0.1),
      Math.round(sourceDurationTicks / validSpeed)
    );

    const updatedClip: Clip = {
      ...selectedClip,
      durationTicks: newDurationTicks,
      speedNumerator: Math.round(validSpeed * 100),
      speedDenominator: 100,
      audio: {
        ...(selectedClip.audio || { volume: 1.0 }),
        preservePitch: preservePitch ?? selectedClip.audio?.preservePitch ?? true,
      },
    };

    const updatedTracks = currentProj.tracks.map((t) =>
      t.clips.some((c) => c.id === selectedClip!.id)
        ? { ...t, clips: t.clips.map((c) => (c.id === selectedClip!.id ? updatedClip : c)) }
        : t
    );

    editorStore.getEditorState().setProject({
      ...currentProj,
      tracks: updatedTracks,
    });
  };

  // Update Asset Metadata (e.g. Text Title properties)
  const handleUpdateMetadata = (newMeta: Record<string, unknown>) => {
    if (!asset) return;
    const currentProj = editorStore.getProject();
    const existingMeta = (asset.metadata as Record<string, unknown> | undefined) || {};

    const updatedAssets = currentProj.assets.map((a) =>
      a.id === asset.id
        ? {
            ...a,
            name: (newMeta['text'] as string) || a.name,
            metadata: {
              ...existingMeta,
              ...newMeta,
            },
          }
        : a
    );

    editorStore.getEditorState().setProject({
      ...currentProj,
      assets: updatedAssets,
    });
  };

  // ─── Empty Placeholder if No Clip Selected ───
  if (!selectedClip) {
    return (
      <div className="h-full bg-[var(--kuro-bg-panel)] border-l border-[var(--kuro-border-subtle)] select-none flex flex-col text-xs transition-colors">
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

        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-[var(--kuro-text-muted)]">
          <div className="w-10 h-10 rounded-full bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)] flex items-center justify-center mb-2 text-[var(--kuro-text-muted)]">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <p className="font-semibold text-[var(--kuro-text-primary)] text-xs">No Clip Selected</p>
          <p className="text-[11px] text-[var(--kuro-text-muted)] mt-1 max-w-[170px]">
            Select any clip on the timeline to tweak transform, audio, colors, speed & text
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[var(--kuro-bg-panel)] border-l border-[var(--kuro-border-subtle)] select-none text-xs flex flex-col transition-colors overflow-hidden">
      {/* ── Top Header ── */}
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

      {/* ── Inspector Category Tabs Bar (Video / Audio / Color / Speed / Text) ── */}
      <div className="flex items-center border-b border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-canvas)] px-2.5 py-1.5 gap-1 shrink-0 overflow-x-auto select-none no-scrollbar">
        {/* Video Tab (hide if pure audio track) */}
        {!isAudioTrack && (
          <button
            onClick={() => setActiveTab('video')}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeTab === 'video'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-[var(--kuro-text-muted)] hover:text-white hover:bg-[var(--kuro-bg-surface)]'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video</span>
          </button>
        )}

        {/* Audio Tab */}
        <button
          onClick={() => setActiveTab('audio')}
          className={`px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            activeTab === 'audio'
              ? 'bg-white text-black shadow-sm font-bold'
              : 'text-[var(--kuro-text-muted)] hover:text-white hover:bg-[var(--kuro-bg-surface)]'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Audio</span>
        </button>

        {/* Color Tab (hide if pure audio track) */}
        {!isAudioTrack && (
          <button
            onClick={() => setActiveTab('color')}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeTab === 'color'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-[var(--kuro-text-muted)] hover:text-white hover:bg-[var(--kuro-bg-surface)]'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Color</span>
          </button>
        )}

        {/* Speed Tab */}
        <button
          onClick={() => setActiveTab('speed')}
          className={`px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
            activeTab === 'speed'
              ? 'bg-white text-black shadow-sm font-bold'
              : 'text-[var(--kuro-text-muted)] hover:text-white hover:bg-[var(--kuro-bg-surface)]'
          }`}
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>Speed</span>
        </button>

        {/* Text Tab (shown if title clip) */}
        {isTitle && (
          <button
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
              activeTab === 'text'
                ? 'bg-white text-black shadow-sm font-bold'
                : 'text-[var(--kuro-text-muted)] hover:text-white hover:bg-[var(--kuro-bg-surface)]'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text</span>
          </button>
        )}
      </div>

      {/* ── Active Tab Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'video' && !isAudioTrack && (
          <VideoTab clip={selectedClip} onUpdateTransform={handleUpdateTransform} />
        )}

        {activeTab === 'audio' && (
          <AudioTab
            clip={selectedClip}
            timelineTimebase={project.timelineTimebase}
            onUpdateAudio={handleUpdateAudio}
          />
        )}

        {activeTab === 'color' && !isAudioTrack && (
          <ColorTab clip={selectedClip} onUpdateEffects={handleUpdateEffects} />
        )}

        {activeTab === 'speed' && (
          <SpeedTab
            clip={selectedClip}
            timelineTimebase={project.timelineTimebase}
            onUpdateSpeed={handleUpdateSpeed}
          />
        )}

        {activeTab === 'text' && (
          <TextTab clip={selectedClip} asset={asset} onUpdateMetadata={handleUpdateMetadata} />
        )}
      </div>
    </div>
  );
};
