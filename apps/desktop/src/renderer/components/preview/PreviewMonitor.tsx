import React, { useEffect, useRef, useState, useMemo } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { layoutStore } from '../../stores/useLayoutStore';
import { TransformBox } from './TransformBox';
import { formatTimecode } from '@kuro/shared';
import {
  Play,
  Pause,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  Grid,
  Monitor,
  Volume2,
  VolumeX,
  Circle,
  Maximize2,
  Minimize2
} from 'lucide-react';

// ─── Visual Transform & Filter Helpers for Live Inspector Preview ───────────
function computeTransformStyle(clip?: any): React.CSSProperties {
  if (!clip || !clip.transform) return {};
  const t = clip.transform;
  const flipX = t.flipH ? -1 : 1;
  const flipY = t.flipV ? -1 : 1;
  const scaleX = (t.scaleX ?? 1.0) * flipX;
  const scaleY = (t.scaleY ?? 1.0) * flipY;
  const rot = t.rotation || 0;
  const x = t.x || 0;
  const y = t.y || 0;

  return {
    transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scaleX}, ${scaleY})`,
    opacity: t.opacity ?? 1.0,
    mixBlendMode: (t.blendMode as any) || 'normal',
  };
}

function computeFilterStyle(clip?: any): string | undefined {
  if (!clip || !clip.effects || clip.effects.length === 0) return undefined;
  const filters: string[] = [];

  // Parse any bypassed nodes from node graph
  const nodeGraphEff = clip.effects.find((e: any) => e.effectType === 'nodeGraph');
  let bypassedNodeIds: string[] = [];
  if (nodeGraphEff && nodeGraphEff.parameters?.bypassed) {
    try {
      bypassedNodeIds = JSON.parse(nodeGraphEff.parameters.bypassed as string);
    } catch {
      bypassedNodeIds = [];
    }
  }

  for (const eff of clip.effects) {
    if (!eff.enabled) continue;

    // Check node graph bypass
    if (bypassedNodeIds.includes('node-01') && ['lift', 'gamma', 'gain', 'offset'].includes(eff.effectType)) continue;
    if (bypassedNodeIds.includes('node-02') && eff.effectType === 'curves') continue;
    if (bypassedNodeIds.includes('node-04') && ['vignette', 'grain', 'blur', 'sepia', 'invert'].includes(eff.effectType)) continue;

    const val = Number(eff.parameters.value ?? 0);
    if (eff.effectType === 'brightness') filters.push(`brightness(${val})`);
    if (eff.effectType === 'contrast') filters.push(`contrast(${val})`);
    if (eff.effectType === 'saturation') filters.push(`saturate(${val})`);
    if (eff.effectType === 'vibrance' && val !== 0) {
      filters.push(`saturate(${(1.0 + val * 0.005).toFixed(3)})`);
    }
    if (eff.effectType === 'blur' && val > 0) filters.push(`blur(${val}px)`);
    if (eff.effectType === 'exposure' && val !== 0) {
      // Exposure EV to brightness multiplier: 2^EV
      filters.push(`brightness(${Math.pow(2, val).toFixed(3)})`);
    }
    if (eff.effectType === 'temperature' && val !== 0) {
      if (val > 0) filters.push(`sepia(${(val * 0.004).toFixed(3)}) hue-rotate(-${(val * 0.12).toFixed(1)}deg)`);
      else filters.push(`hue-rotate(${(Math.abs(val) * 0.2).toFixed(1)}deg)`);
    }
    if (eff.effectType === 'tint' && val !== 0) {
      filters.push(`hue-rotate(${(val * 0.4).toFixed(1)}deg)`);
    }
    if (eff.effectType === 'hue' && val !== 0) {
      filters.push(`hue-rotate(${val}deg)`);
    }
    if (eff.effectType === 'sepia' && val > 0) {
      filters.push(`sepia(${(val / 100).toFixed(2)})`);
    }
    if (eff.effectType === 'invert' && val > 0) {
      filters.push(`invert(${(val / 100).toFixed(2)})`);
    }
    if (eff.effectType === 'vignette' && val > 0) {
      filters.push(`drop-shadow(0 0 ${(val * 0.8).toFixed(1)}px rgba(0,0,0,${(val * 0.01).toFixed(2)}))`);
    }
    if (eff.effectType === 'whites' && val !== 0) {
      filters.push(`brightness(${(1.0 + val * 0.004).toFixed(3)})`);
    }
    if (eff.effectType === 'blacks' && val !== 0) {
      filters.push(`contrast(${(1.0 + val * 0.004).toFixed(3)})`);
    }
    if (eff.effectType === 'highlights' && val !== 0) {
      filters.push(`brightness(${(1.0 + val * 0.003).toFixed(3)})`);
    }
    if (eff.effectType === 'shadows' && val !== 0) {
      filters.push(`brightness(${(1.0 + val * 0.003).toFixed(3)})`);
    }

    // DaVinci Primary Color Wheels: Lift, Gamma, Gain, Offset
    if (eff.effectType === 'lift') {
      const luma = Number(eff.parameters.luma ?? 0);
      const sat = Number(eff.parameters.sat ?? 0);
      const hue = Number(eff.parameters.hue ?? 0);
      if (luma !== 0) filters.push(`brightness(${(1.0 + luma * 0.35).toFixed(3)})`);
      if (sat > 5) filters.push(`hue-rotate(${(hue * 0.1).toFixed(1)}deg)`);
    }
    if (eff.effectType === 'gamma') {
      const luma = Number(eff.parameters.luma ?? 0);
      const sat = Number(eff.parameters.sat ?? 0);
      const hue = Number(eff.parameters.hue ?? 0);
      if (luma !== 0) filters.push(`contrast(${(1.0 + luma * 0.4).toFixed(3)})`);
      if (sat > 5) filters.push(`hue-rotate(${(hue * 0.15).toFixed(1)}deg)`);
    }
    if (eff.effectType === 'gain') {
      const luma = Number(eff.parameters.luma ?? 0);
      const sat = Number(eff.parameters.sat ?? 0);
      const hue = Number(eff.parameters.hue ?? 0);
      if (luma !== 0) filters.push(`brightness(${(1.0 + luma * 0.5).toFixed(3)})`);
      if (sat > 5) filters.push(`hue-rotate(${(hue * 0.15).toFixed(1)}deg)`);
    }
    if (eff.effectType === 'offset') {
      const luma = Number(eff.parameters.luma ?? 0);
      const sat = Number(eff.parameters.sat ?? 0);
      const hue = Number(eff.parameters.hue ?? 0);
      if (luma !== 0) filters.push(`brightness(${(1.0 + luma * 0.4).toFixed(3)})`);
      if (sat > 5) filters.push(`hue-rotate(${(hue * 0.2).toFixed(1)}deg)`);
    }
  }
  return filters.length > 0 ? filters.join(' ') : undefined;
}

export const PreviewMonitor: React.FC = () => {
  const [, setTick] = useState(0);
    const [showSafeGuides, setShowSafeGuides] = useState(false);
  const [showTransformOverlay, setShowTransformOverlay] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasDim, setCanvasDim] = useState({ width: 640, height: 360 });

  useEffect(() => {
    if (!canvasRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasDim({
          width: entry.contentRect.width || 640,
          height: entry.contentRect.height || 360,
        });
      }
    });
    ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);
  const [previewQuality, setPreviewQuality] = useState<'1080p' | '720p' | '540p'>('1080p');
  const [monitorVolume, setMonitorVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  // Pool of HTMLVideoElements for video tracks
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  // Pool of HTMLAudioElements for dedicated audio tracks
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  // Track pending play() promise per element ID to avoid AbortError on rapid stop->play
  const pendingPlayRef = useRef<Map<string, Promise<void>>>(new Map());

  // Subscribe to all stores
  useEffect(() => {
    const unsubEditor = editorStore.subscribe(() => setTick((t) => t + 1));
    const unsubTimeline = timelineStore.subscribe(() => setTick((t) => t + 1));
    const unsubLayout = layoutStore.subscribe(() => setTick((t) => t + 1));

    const proj = editorStore.getProject();
    const initTotalTicks = proj.tracks.reduce(
      (max, t) => t.clips.reduce((m, c) => Math.max(m, c.timelineStartTicks + c.durationTicks), max),
      0
    );
    timelineStore.initClock(proj.timelineTimebase, initTotalTicks);

    return () => {
      unsubEditor();
      unsubTimeline();
      unsubLayout();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      videoRefs.current.forEach((el) => {
        el.pause();
        el.src = '';
      });
      videoRefs.current.clear();

      audioElementsRef.current.forEach((el) => {
        el.pause();
        el.src = '';
      });
      audioElementsRef.current.clear();
    };
  }, []);

  const project = editorStore.getProject();
  const playheadTicks = timelineStore.getPlayheadTicks();
  const isPlaying = timelineStore.getIsPlaying();
  const selectedClipIds = timelineStore.getSelectedClipIds();
  const activeSelectedClipId = selectedClipIds[0];

  // Find currently selected clip if active at playhead or on visual tracks
  const selectedVisualClip = useMemo(() => {
    if (!activeSelectedClipId) return null;
    for (const track of project.tracks) {
      if (track.kind === 'audio') continue;
      const found = track.clips.find((c) => c.id === activeSelectedClipId);
      if (found) {
        const asset = project.assets.find((a) => a.id === found.assetId);
        return { clip: found, asset, track };
      }
    }
    return null;
  }, [project, activeSelectedClipId]);

  const handleUpdateSelectedTransform = (newT: Partial<any>) => {
    if (!selectedVisualClip) return;
    const current = selectedVisualClip.clip.transform || {
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
    const updatedClip = {
      ...selectedVisualClip.clip,
      transform: {
        ...current,
        ...newT,
      },
    };
    const newTracks = project.tracks.map((t) => {
      if (t.id !== selectedVisualClip.track.id) return t;
      return {
        ...t,
        clips: t.clips.map((c) => (c.id === updatedClip.id ? updatedClip : c)),
      };
    });
    editorStore.getEditorState().setProject({
      ...project,
      tracks: newTracks,
    });
  };


  // ─── Compute all video track states at playhead ────────────────────────────
  // For each video track: what clip (if any) is at the playhead?
  // allVideoTrackStates covers EVERY video track — active ones get a clip,
  // inactive ones (gap) get clip = null → renders as hidden / black.
  const allVideoTrackStates = useMemo(() => {
    const vTracks = project.tracks.filter((t) => t.kind === 'video');
    const mainV = vTracks[vTracks.length - 1] ?? vTracks[0];
    const overlays = vTracks.filter((t) => t.id !== mainV?.id).reverse();
    const orderedVideoTracks = [
      ...(mainV ? [mainV] : []),
      ...overlays,
    ];

    return orderedVideoTracks
      .filter((t) => !t.hidden)
      .map((track, layerIdx) => {
        // Primary: clip whose timeline range contains the playhead
        const clipAtPlayhead = track.clips.find(
          (c) =>
            playheadTicks >= c.timelineStartTicks &&
            playheadTicks < c.timelineStartTicks + c.durationTicks
        );

        // Fallback: if playhead is in a gap on this track but the active selected clip
        // is on this track, show it so Inspector edits are reflected live in real-time.
        const fallbackClip =
          !clipAtPlayhead && activeSelectedClipId
            ? track.clips.find((c) => c.id === activeSelectedClipId)
            : undefined;

        const clip = clipAtPlayhead ?? fallbackClip ?? null;
        const isAtPlayhead = !!clipAtPlayhead;
        const isFallback = !clipAtPlayhead && !!fallbackClip;

        const asset = clip ? project.assets.find((a) => a.id === clip.assetId) : undefined;
        const blobUrl = (asset?.metadata as Record<string, unknown> | undefined)?.['blobUrl'] as string | undefined;
        const isTitle = !!(asset?.metadata as Record<string, unknown> | undefined)?.['isTitle'];
        const titleText = (asset?.metadata as Record<string, unknown> | undefined)?.['text'] as string | undefined;
        const isImage =
          asset?.type === 'image' ||
          (blobUrl ? /\.(png|jpe?g|webp|svg|gif|bmp)$/i.test(asset?.filePath || asset?.name || '') : false);
        const isVideo = !!blobUrl && !isImage && !isTitle;

        return {
          track,
          clip,
          hasClip: !!clip,
          isAtPlayhead,
          isFallback,
          asset: asset ?? undefined,
          blobUrl,
          isTitle,
          titleText: titleText || asset?.name || 'TITLE',
          isImage,
          isVideo,
          isMainTrack: track.id === mainV?.id,
          layerIndex: layerIdx,
        };
      });
  }, [project.tracks, project.assets, playheadTicks, activeSelectedClipId]);

  // activeVisualLayers = only the ones with a clip at playhead (for header count, images, titles)
  const activeVisualLayers = useMemo(
    () => allVideoTrackStates.filter((s) => s.hasClip),
    [allVideoTrackStates]
  );

  // ─── Synchronize All Video Elements Across Layers ───────────────────────────
  // We iterate allVideoTrackStates (not just activeVisualLayers) because video
  // elements for ALL tracks are permanently in the DOM now. Tracks in a gap get
  // paused + seeked-to-0 so they show pure black (no frozen last-frame).
  useEffect(() => {
    const videoMap = videoRefs.current;

    for (const state of allVideoTrackStates) {
      if (!state.isVideo) continue;
      const el = videoMap.get(state.track.id);
      if (!el) continue;

      if (!state.hasClip || !state.clip || !state.blobUrl) {
        // Gap: pause and clear to frame 0 → visible as black (element is CSS-hidden anyway)
        if (!el.paused) el.pause();
        if (el.currentTime !== 0) {
          try { el.currentTime = 0; } catch { /* ignore */ }
        }
        continue;
      }

      // Active clip on this track
      const clip = state.clip;

      // Ensure correct source
      if (el.src !== state.blobUrl) {
        el.src = state.blobUrl;
        el.load();
      }

      // Audio volume & mute for this video track
      const clipVolume = clip.audio?.volume ?? 1.0;
      el.volume = Math.max(0, Math.min(1, monitorVolume * clipVolume));
      el.muted = isMuted || !!state.track.muted;

      const speedRatio =
        clip.speedNumerator && clip.speedDenominator
          ? clip.speedNumerator / clip.speedDenominator
          : 1;

      const sourceInTicks = Number.isFinite(clip.sourceInTicks) ? clip.sourceInTicks : 0;
      let targetTime: number;

      if (state.isFallback) {
        // Fallback selected clip: display start of clip cleanly
        targetTime = Math.max(0, sourceInTicks / project.timelineTimebase);
      } else {
        const offsetTicksFromClipStart = playheadTicks - clip.timelineStartTicks;
        const sourceOffsetTicks = sourceInTicks + offsetTicksFromClipStart * speedRatio;
        targetTime = Math.max(0, sourceOffsetTicks / project.timelineTimebase);
      }

      if (isPlaying && !state.isFallback) {
        el.playbackRate = Math.max(0.1, speedRatio);
        // Sync seek if drifting by > 0.25s
        if (Math.abs(el.currentTime - targetTime) > 0.25) {
          el.currentTime = targetTime;
        }
        if (el.paused) {
          const playKey = `vid-${state.track.id}`;
          const pending = pendingPlayRef.current.get(playKey);
          const doPlay = () => {
            const p = el.play().catch(() => {});
            pendingPlayRef.current.set(playKey, p);
            p.finally(() => pendingPlayRef.current.delete(playKey));
          };
          if (pending) {
            pending.then(doPlay).catch(doPlay);
          } else {
            doPlay();
          }
        }
      } else {
        if (!el.paused) {
          el.pause();
        }
        if (Math.abs(el.currentTime - targetTime) > 0.04) {
          try { el.currentTime = targetTime; } catch { /* ignore */ }
        }
      }
    }
  }, [allVideoTrackStates, isPlaying, playheadTicks, monitorVolume, isMuted, project.timelineTimebase]);

  // ─── Multi-Track Audio Playback (A1, A2, Background Music, SFX) ────────────
  const activeAudioItems = useMemo(() => {
    const list: Array<{
      track: (typeof project.tracks)[0];
      clip: (typeof project.tracks)[0]['clips'][0];
      asset?: (typeof project.assets)[0];
      blobUrl?: string;
    }> = [];

    for (const track of project.tracks) {
      if (track.kind === 'audio' && !track.hidden) {
        const clip = track.clips.find(
          (c) => playheadTicks >= c.timelineStartTicks && playheadTicks < c.timelineStartTicks + c.durationTicks
        );
        if (clip) {
          const asset = project.assets.find((a) => a.id === clip.assetId);
          const blobUrl = (asset?.metadata as Record<string, unknown> | undefined)?.['blobUrl'] as string | undefined;
          list.push({
            track,
            clip,
            asset,
            blobUrl,
          });
        }
      }
    }
    return list;
  }, [project.tracks, project.assets, playheadTicks]);

  // Sync Audio Elements for all audio tracks simultaneously with video
  useEffect(() => {
    const audioMap = audioElementsRef.current;
    const activeTrackIds = new Set<string>();

    for (const item of activeAudioItems) {
      activeTrackIds.add(item.track.id);
      if (!item.blobUrl) continue;

      let el = audioMap.get(item.track.id);
      if (!el) {
        el = new Audio();
        el.preload = 'auto';
        audioMap.set(item.track.id, el);
      }

      if (el.src !== item.blobUrl) {
        el.src = item.blobUrl;
        el.load();
      }

      const clipVol = item.clip.audio?.volume ?? 1.0;
      el.volume = Math.max(0, Math.min(1, monitorVolume * clipVol));
      el.muted = isMuted || !!item.track.muted;

      const speedRatio =
        item.clip.speedNumerator && item.clip.speedDenominator
          ? item.clip.speedNumerator / item.clip.speedDenominator
          : 1;

      const sourceInTicks = Number.isFinite(item.clip.sourceInTicks) ? item.clip.sourceInTicks : 0;
      const offsetTicksFromClipStart = playheadTicks - item.clip.timelineStartTicks;
      const sourceOffsetTicks = sourceInTicks + offsetTicksFromClipStart * speedRatio;
      const targetTime = Math.max(0, sourceOffsetTicks / project.timelineTimebase);

      if (isPlaying) {
        el.playbackRate = Math.max(0.1, speedRatio);
        if (Math.abs(el.currentTime - targetTime) > 0.25) {
          el.currentTime = targetTime;
        }
        if (el.paused) {
          const playKey = `aud-${item.track.id}`;
          const pending = pendingPlayRef.current.get(playKey);
          const doPlay = () => {
            const p = el!.play().catch(() => {});
            pendingPlayRef.current.set(playKey, p);
            p.finally(() => pendingPlayRef.current.delete(playKey));
          };
          if (pending) {
            pending.then(doPlay).catch(doPlay);
          } else {
            doPlay();
          }
        }
      } else {
        if (!el.paused) {
          el.pause();
        }
        if (Math.abs(el.currentTime - targetTime) > 0.04) {
          try { el.currentTime = targetTime; } catch { /* ignore */ }
        }
      }
    }

    // Pause audio on tracks that have no active clip
    audioMap.forEach((el, trackId) => {
      if (!activeTrackIds.has(trackId)) {
        if (!el.paused) {
          el.pause();
        }
      }
    });
  }, [activeAudioItems, isPlaying, playheadTicks, monitorVolume, isMuted, project.timelineTimebase]);

  // Keep the RAF clock's durationTicks in sync with the actual project length
  useEffect(() => {
    const totalTicks = project.tracks.reduce(
      (max, t) => t.clips.reduce((m, c) => Math.max(m, c.timelineStartTicks + c.durationTicks), max),
      0
    );
    timelineStore.setDurationTicks(totalTicks);
  }, [project.tracks]);

  // Stop playback when playhead reaches end of entire project
  useEffect(() => {
    if (!isPlaying) return;
    const totalTicks = project.tracks.reduce(
      (max, t) => t.clips.reduce((m, c) => Math.max(m, c.timelineStartTicks + c.durationTicks), max),
      0
    );
    if (totalTicks > 0 && playheadTicks >= totalTicks) {
      timelineStore.setIsPlaying(false);
    }
  }, [playheadTicks, isPlaying, project.tracks]);

  // ─── Timecode & transport ──────────────────────────────────────────────────
  const timecode = formatTimecode(playheadTicks, {
    fpsNumerator: project.fpsNumerator,
    fpsDenominator: project.fpsDenominator,
    timebase: project.timelineTimebase,
  });

  const ticksPerFrame = project.timelineTimebase / (project.fpsNumerator / project.fpsDenominator);

  const handleStepFrame = (deltaFrames: number) => {
    timelineStore.setIsPlaying(false);
    timelineStore.setPlayheadTicks(Math.max(0, Math.round(playheadTicks + deltaFrames * ticksPerFrame)));
  };

  const handleJumpToStart = () => {
    timelineStore.setIsPlaying(false);
    timelineStore.setPlayheadTicks(0);
  };

  const handleTogglePlayback = () => {
    // If at or past the end of timeline clips, replay from beginning
    if (!isPlaying && totalTicks > 0 && playheadTicks >= totalTicks - ticksPerFrame) {
      timelineStore.setPlayheadTicks(0);
      timelineStore.setIsPlaying(true);
      return;
    }
    timelineStore.togglePlayback();
  };

  const totalTicks = project.tracks.reduce(
    (max, t) =>
      t.clips.reduce(
        (m, c) => Math.max(m, c.timelineStartTicks + c.durationTicks),
        max
      ),
    0
  );

  const isEmpty = project.tracks.every((t) => t.clips.length === 0);

  // Active clip asset name for header label
  const primaryActiveAsset = activeVisualLayers[activeVisualLayers.length - 1]?.asset;

  return (
    <div className="h-full flex flex-col bg-[var(--kuro-bg-canvas)] select-none overflow-hidden transition-colors">
      {/* Top Monitor Strip */}
      <div className="h-8 px-3 border-b border-[var(--kuro-border-subtle)] flex items-center justify-between text-xs bg-[var(--kuro-bg-panel)] z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Monitor className="w-3.5 h-3.5 text-[var(--kuro-text-secondary)] shrink-0" />
          <span className="font-medium text-[var(--kuro-text-primary)] text-xs shrink-0">Preview</span>
          <span className="text-[10px] bg-[var(--kuro-bg-surface)] text-[var(--kuro-text-muted)] px-1.5 py-0.5 rounded font-mono border border-[var(--kuro-border-subtle)] shrink-0">
            {project.width}×{project.height}
          </span>
          {activeVisualLayers.length > 0 && (
            <span className="text-[10px] bg-white text-black font-bold px-1.5 py-0.2 rounded font-mono shrink-0">
              {activeVisualLayers.length} {activeVisualLayers.length === 1 ? 'LAYER' : 'LAYERS'}
            </span>
          )}
          {primaryActiveAsset && (
            <span className="text-[10px] text-[var(--kuro-text-secondary)] font-medium truncate">
              · {primaryActiveAsset.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            onClick={() => setShowSafeGuides(!showSafeGuides)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition ${
              showSafeGuides
                ? 'bg-[var(--kuro-text-primary)] text-[var(--kuro-bg-canvas)]'
                : 'text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)]'
            }`}
            title="Toggle Safe Margins Grid"
          >
            <Grid className="w-3 h-3" />
            <span>Guides</span>
          </button>

          <select
            value={previewQuality}
            onChange={(e) => setPreviewQuality(e.target.value as '1080p' | '720p' | '540p')}
            className="bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)] text-[11px] rounded px-1.5 py-0.5 text-[var(--kuro-text-secondary)] focus:outline-none cursor-pointer"
          >
            <option value="1080p">1080p Full</option>
            <option value="720p">720p 1/2</option>
            <option value="540p">540p Proxy</option>
          </select>

          <button
            onClick={() => {
              const isMax =
                !layoutStore.isLeftPanelVisible() &&
                !layoutStore.isInspectorVisible() &&
                !layoutStore.isTimelineVisible();
              if (isMax) {
                layoutStore.resetLayout();
              } else {
                if (layoutStore.isLeftPanelVisible()) layoutStore.toggleLeftPanel();
                if (layoutStore.isInspectorVisible()) layoutStore.toggleInspector();
                if (layoutStore.isTimelineVisible()) layoutStore.toggleTimeline();
              }
            }}
            className="p-1 rounded text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)] transition"
            title={
              !layoutStore.isLeftPanelVisible() &&
              !layoutStore.isInspectorVisible() &&
              !layoutStore.isTimelineVisible()
                ? 'Restore Panels'
                : 'Maximize Preview'
            }
          >
            {!layoutStore.isLeftPanelVisible() &&
            !layoutStore.isInspectorVisible() &&
            !layoutStore.isTimelineVisible() ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* ── Multi-Layer Composited Viewport ── */}
      <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center p-2 relative overflow-hidden bg-[var(--kuro-bg-canvas)]">
        <div
          ref={canvasRef}
          className="relative rounded border border-[var(--kuro-border-subtle)] shadow-2xl overflow-hidden bg-black"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: '16 / 9',
            width: '100%',
            height: 'auto',
          }}
        >
          {/* Base Black Background Layer */}
          <div className="w-full h-full bg-black absolute inset-0 pointer-events-none" />

          {/* Empty Timeline Prompt */}
          {activeVisualLayers.length === 0 && (
            <div className="w-full h-full absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              {isEmpty && (
                <span className="text-white/20 text-[10px] font-mono tracking-widest uppercase select-none text-center px-4">
                  Import media · drag clips to timeline · press Play
                </span>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────
              Render ALL video track elements (always in DOM) but hide them
              via visibility when the playhead is in a gap on that track.
              This prevents frozen last-frames showing during gaps.
              ───────────────────────────────────────────────────────────────── */}
          {allVideoTrackStates.filter((s) => s.isVideo || s.hasClip).map((state) => {
            const isVisible = state.hasClip && state.isVideo;
            const zIndex = state.layerIndex * 10 + 1;

            if (!state.isVideo) return null; // images/titles handled below

            const transformStyle = computeTransformStyle(state.clip);
            const filterStyle = computeFilterStyle(state.clip);

            return (
              <video
                key={state.track.id}
                data-track-id={state.track.id}
                ref={(el) => {
                  if (el) videoRefs.current.set(state.track.id, el);
                  else videoRefs.current.delete(state.track.id);
                }}
                playsInline
                className="pointer-events-none absolute inset-0 w-full h-full object-contain"
                style={{
                  zIndex,
                  visibility: isVisible ? 'visible' : 'hidden',
                  filter: filterStyle,
                  ...transformStyle,
                }}
              />
            );
          })}

          {/* Images and Titles: only render when their clip is active (no DOM-persistence needed) */}
          {activeVisualLayers.map((layer) => {
            const zIndex = layer.layerIndex * 10 + 1;

            // 2. Photo / Image Layer (V1 Photo or V2 Overlay Photo - Same dimensions across all layers)
            if (layer.isImage && layer.blobUrl && layer.clip) {
              const imgTransform = computeTransformStyle(layer.clip);
              const imgFilter = computeFilterStyle(layer.clip);
              return (
                <img
                  key={layer.clip.id}
                  src={layer.blobUrl}
                  alt={layer.asset?.name || 'Image'}
                  className="pointer-events-none absolute select-none inset-0 w-full h-full object-contain"
                  style={{
                    zIndex,
                    filter: imgFilter,
                    ...imgTransform,
                  }}
                />
              );
            }

            // 3. Text / Title Layer (Overlay on Top of Everything)
            if (layer.isTitle && layer.clip) {
              const meta = (layer.asset?.metadata as Record<string, unknown> | undefined) || {};
              const fontSize = Number(meta['fontSize'] || 36);
              const fontFamily = (meta['fontFamily'] as string) || 'Inter';
              const textColor = (meta['textColor'] as string) || '#ffffff';
              const isBold = meta['isBold'] !== false;
              const isItalic = !!meta['isItalic'];
              const isUnderline = !!meta['isUnderline'];
              const textAlign = (meta['textAlign'] as any) || 'center';
              const textTransform = (meta['textTransform'] as any) || 'none';
              const letterSpacing = Number(meta['letterSpacing'] || 0);
              const lineHeight = Number(meta['lineHeight'] || 1.2);

              const showBg = !!meta['showBackground'];
              const backgroundColor = (meta['backgroundColor'] as string) || 'rgba(0,0,0,0.75)';
              const bgPadding = Number(meta['bgPadding'] || 12);
              const bgRadius = Number(meta['bgRadius'] || 8);

              const strokeWidth = Number(meta['strokeWidth'] || 0);
              const strokeColor = (meta['strokeColor'] as string) || '#000000';

              const shadowBlur = Number(meta['shadowBlur'] || 8);
              const shadowColor = (meta['shadowColor'] as string) || 'rgba(0,0,0,0.85)';
              const shadowOffsetX = Number(meta['shadowOffsetX'] || 0);
              const shadowOffsetY = Number(meta['shadowOffsetY'] || 3);

              const titleTransform = computeTransformStyle(layer.clip);

              const textShadowStyle = shadowBlur > 0
                ? `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px ${shadowColor}`
                : undefined;

              const webkitTextStroke = strokeWidth > 0
                ? `${strokeWidth}px ${strokeColor}`
                : undefined;

              return (
                <div
                  key={layer.clip.id}
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 select-none pointer-events-none"
                  style={{ zIndex, ...titleTransform }}
                >
                  <div
                    style={showBg ? {
                      backgroundColor,
                      padding: `${bgPadding}px ${bgPadding * 1.5}px`,
                      borderRadius: `${bgRadius}px`,
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    } : undefined}
                  >
                    <span
                      style={{
                        fontSize: `${fontSize}px`,
                        fontFamily,
                        color: textColor,
                        fontWeight: isBold ? 800 : 400,
                        fontStyle: isItalic ? 'italic' : 'normal',
                        textDecoration: isUnderline ? 'underline' : 'none',
                        textAlign,
                        textTransform,
                        letterSpacing: `${letterSpacing}px`,
                        lineHeight,
                        textShadow: textShadowStyle,
                        WebkitTextStroke: webkitTextStroke,
                        display: 'block',
                      }}
                    >
                      {(meta['text'] as string) || layer.titleText}
                    </span>
                  </div>
                </div>
              );
            }

            return null;
          })}

          {/* Progress bar at the bottom */}
          {totalTicks > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-50 pointer-events-none">
              <div
                className="h-full bg-white/60 transition-none"
                style={{ width: `${Math.min(100, (playheadTicks / totalTicks) * 100)}%` }}
              />
            </div>
          )}

          {/* Safe Margins Overlay */}
          {showSafeGuides && (
            <div className="absolute inset-[8%] border border-dashed border-white/30 pointer-events-none flex items-center justify-center z-50">
              <div className="w-3 h-3 border-t border-l border-white/60 absolute top-0 left-0" />
              <div className="w-3 h-3 border-t border-r border-white/60 absolute top-0 right-0" />
              <div className="w-3 h-3 border-b border-l border-white/60 absolute bottom-0 left-0" />
              <div className="w-3 h-3 border-b border-r border-white/60 absolute bottom-0 right-0" />
              <div className="text-[9px] text-white/70 font-mono tracking-wider bg-black/70 px-2 py-0.5 rounded">
                SAFE AREA 90%
              </div>
            </div>
          )}

                    {/* Interactive On-Screen Transform Controls for Selected Element */}
          {showTransformOverlay && selectedVisualClip && (
            <TransformBox
              clipId={selectedVisualClip.clip.id}
              clipName={selectedVisualClip.asset?.name || 'Selected Element'}
              transform={selectedVisualClip.clip.transform || {
                x: 0,
                y: 0,
                scaleX: 1.0,
                scaleY: 1.0,
                rotation: 0,
                opacity: 1.0,
              }}
              containerWidth={canvasDim.width}
              containerHeight={canvasDim.height}
              onUpdateTransform={handleUpdateSelectedTransform}
            />
          )}

          {/* Playing indicator */}
          {isPlaying && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse shadow pointer-events-none z-50" />
          )}
        </div>
      </div>

      {/* Transport Bar */}
      <div className="h-11 shrink-0 px-4 bg-[var(--kuro-bg-panel)] border-t border-[var(--kuro-border-subtle)] flex items-center justify-between text-xs z-10 transition-colors">
        {/* Timecode */}
        <div className="font-mono text-xs font-bold text-[var(--kuro-text-primary)] tracking-wider bg-[var(--kuro-bg-canvas)] px-2.5 py-1 rounded border border-[var(--kuro-border-subtle)] tabular-nums">
          {timecode}
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleJumpToStart}
            className="w-7 h-7 rounded hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-secondary)] hover:text-[var(--kuro-text-primary)] flex items-center justify-center transition"
            title="Jump to Start (Home)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleStepFrame(-1)}
            className="w-7 h-7 rounded hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-secondary)] hover:text-[var(--kuro-text-primary)] flex items-center justify-center transition"
            title="Step 1 Frame Back (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleTogglePlayback}
            className="w-9 h-9 rounded-full bg-[var(--kuro-btn-primary-bg)] text-[var(--kuro-btn-primary-text)] hover:opacity-90 flex items-center justify-center transition active:scale-95 mx-1"
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current translate-x-0.5" />
            )}
          </button>
          <button
            onClick={() => handleStepFrame(1)}
            className="w-7 h-7 rounded hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-secondary)] hover:text-[var(--kuro-text-primary)] flex items-center justify-center transition"
            title="Step 1 Frame Forward (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Volume & FPS */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[var(--kuro-text-muted)]">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="hover:text-[var(--kuro-text-primary)] transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : monitorVolume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setMonitorVolume(v);
                setIsMuted(false);
              }}
              className="w-16 accent-[var(--kuro-text-primary)] cursor-pointer"
            />
          </div>

          <div className="text-[10px] text-[var(--kuro-text-muted)] flex items-center gap-1.5 bg-[var(--kuro-bg-canvas)] px-2 py-0.5 rounded border border-[var(--kuro-border-subtle)] font-mono">
            <Circle
              className={`w-1.5 h-1.5 fill-current ${
                isPlaying
                  ? 'text-[var(--kuro-text-primary)] animate-pulse'
                  : 'text-[var(--kuro-text-faint)]'
              }`}
            />
            <span>{project.fpsNumerator} fps</span>
          </div>
        </div>
      </div>
    </div>
  );
};
