import React, { useEffect, useRef, useState, useMemo } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { layoutStore } from '../../stores/useLayoutStore';
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

export const PreviewMonitor: React.FC = () => {
  const [, setTick] = useState(0);
  const [showSafeGuides, setShowSafeGuides] = useState(false);
  const [previewQuality, setPreviewQuality] = useState<'1080p' | '720p' | '540p'>('1080p');
  const [monitorVolume, setMonitorVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  // Pool of HTMLVideoElements for video tracks
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  // Pool of HTMLAudioElements for dedicated audio tracks
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Subscribe to all stores
  useEffect(() => {
    const unsubEditor = editorStore.subscribe(() => setTick((t) => t + 1));
    const unsubTimeline = timelineStore.subscribe(() => setTick((t) => t + 1));
    const unsubLayout = layoutStore.subscribe(() => setTick((t) => t + 1));

    const proj = editorStore.getProject();
    timelineStore.initClock(proj.timelineTimebase, 0);

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

  // ─── Multi-Layer Visual Compositing ─────────────────────────────────────────
  // Find all active clips across ALL video tracks at the current playhead.
  // Order layers from bottom (V1: Main Video) to top (V2, V3 Overlay) so overlays render on top!
  const activeVisualLayers = useMemo(() => {
    const vTracks = project.tracks.filter((t) => t.kind === 'video');
    const mainV = vTracks[vTracks.length - 1] ?? vTracks[0];
    const overlays = vTracks.filter((t) => t.id !== mainV?.id).reverse(); // V2 below V3
    const orderedVideoTracks = [
      ...(mainV ? [mainV] : []),
      ...overlays,
    ];

    return orderedVideoTracks
      .filter((t) => !t.hidden)
      .map((track, layerIdx) => {
        let clip = track.clips.find(
          (c) =>
            playheadTicks >= c.timelineStartTicks &&
            playheadTicks < c.timelineStartTicks + c.durationTicks
        );

        // Fallback: if no clip at playhead on this track, but it's selected, show it
        if (!clip && selectedClipIds.length > 0) {
          const found = track.clips.find((c) => selectedClipIds.includes(c.id));
          if (found) clip = found;
        }

        if (!clip) return null;

        const asset = project.assets.find((a) => a.id === clip!.assetId);
        const blobUrl = (asset?.metadata as Record<string, unknown> | undefined)?.['blobUrl'] as string | undefined;
        const isTitle = !!(asset?.metadata as Record<string, unknown> | undefined)?.['isTitle'];
        const titleText = (asset?.metadata as Record<string, unknown> | undefined)?.['text'] as string | undefined;
        const isImage =
          asset?.type === 'image' ||
          (blobUrl ? /\.(png|jpe?g|webp|svg|gif|bmp)$/i.test(asset?.filePath || asset?.name || '') : false);

        return {
          track,
          clip,
          asset,
          blobUrl,
          isTitle,
          titleText: titleText || asset?.name || 'TITLE',
          isImage,
          isVideo: !!blobUrl && !isImage && !isTitle,
          isMainTrack: track.id === mainV?.id,
          layerIndex: layerIdx,
        };
      })
      .filter(Boolean) as Array<{
        track: (typeof project.tracks)[0];
        clip: (typeof project.tracks)[0]['clips'][0];
        asset?: (typeof project.assets)[0];
        blobUrl?: string;
        isTitle: boolean;
        titleText: string;
        isImage: boolean;
        isVideo: boolean;
        isMainTrack: boolean;
        layerIndex: number;
      }>;
  }, [project.tracks, project.assets, playheadTicks, selectedClipIds]);

  // ─── Synchronize All Video Elements Across Layers ───────────────────────────
  useEffect(() => {
    const videoMap = videoRefs.current;
    const activeVideoTrackIds = new Set<string>();

    for (const layer of activeVisualLayers) {
      if (!layer.isVideo || !layer.blobUrl) continue;
      activeVideoTrackIds.add(layer.track.id);

      const el = videoMap.get(layer.track.id);
      if (!el) continue;

      // Ensure correct source
      if (el.src !== layer.blobUrl) {
        el.src = layer.blobUrl;
        el.load();
      }

      // Audio volume & mute for this video track
      const clipVolume = layer.clip.audio?.volume ?? 1.0;
      el.volume = Math.max(0, Math.min(1, monitorVolume * clipVolume));
      el.muted = isMuted || !!layer.track.muted;

      const clipOffsetSec = (playheadTicks - layer.clip.timelineStartTicks) / project.timelineTimebase;
      const targetTime = Math.max(0, clipOffsetSec);

      if (isPlaying) {
        // Sync seek if drifting by > 0.25s
        if (Math.abs(el.currentTime - targetTime) > 0.25) {
          el.currentTime = targetTime;
        }
        if (el.paused) {
          el.play().catch(() => {});
        }
      } else {
        if (!el.paused) {
          el.pause();
        }
        if (Math.abs(el.currentTime - targetTime) > 0.04) {
          el.currentTime = targetTime;
        }
      }
    }

    // Pause videos for tracks that no longer have an active video clip
    videoMap.forEach((el, trackId) => {
      if (!activeVideoTrackIds.has(trackId)) {
        if (!el.paused) el.pause();
      }
    });
  }, [activeVisualLayers, isPlaying, playheadTicks, monitorVolume, isMuted, project.timelineTimebase]);

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

      const clipOffsetSec = (playheadTicks - item.clip.timelineStartTicks) / project.timelineTimebase;
      const targetTime = Math.max(0, clipOffsetSec);

      if (isPlaying) {
        if (Math.abs(el.currentTime - targetTime) > 0.25) {
          el.currentTime = targetTime;
        }
        if (el.paused) {
          el.play().catch(() => {});
        }
      } else {
        if (!el.paused) {
          el.pause();
        }
        if (Math.abs(el.currentTime - targetTime) > 0.04) {
          el.currentTime = targetTime;
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

          {/* Render All Active Layers Stacked in Z-Index Order */}
          {activeVisualLayers.map((layer) => {
            const zIndex = layer.layerIndex * 10 + 1;

            // 1. Video Layer (V1 or Overlay Video)
            if (layer.isVideo) {
              return (
                <video
                  key={layer.track.id}
                  ref={(el) => {
                    if (el) videoRefs.current.set(layer.track.id, el);
                    else videoRefs.current.delete(layer.track.id);
                  }}
                  playsInline
                  className={`pointer-events-none absolute ${
                    layer.isMainTrack
                      ? 'inset-0 w-full h-full object-contain'
                      : 'inset-4 max-w-[80%] max-h-[80%] m-auto object-contain shadow-2xl border border-white/20 rounded'
                  }`}
                  style={{ zIndex }}
                />
              );
            }

            // 2. Photo / Image Layer (V1 Photo or V2 Overlay Photo)
            if (layer.isImage && layer.blobUrl) {
              return (
                <img
                  key={layer.clip.id}
                  src={layer.blobUrl}
                  alt={layer.asset?.name || 'Image'}
                  className={`pointer-events-none absolute select-none ${
                    layer.isMainTrack
                      ? 'inset-0 w-full h-full object-contain'
                      : 'inset-6 max-w-[75%] max-h-[75%] m-auto object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.8)] border border-white/30 rounded shadow-2xl'
                  }`}
                  style={{ zIndex }}
                />
              );
            }

            // 3. Text / Title Layer (Overlay on Top of Everything)
            if (layer.isTitle) {
              return (
                <div
                  key={layer.clip.id}
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 select-none pointer-events-none"
                  style={{ zIndex }}
                >
                  <div className="bg-black/65 px-6 py-2.5 rounded-lg border border-white/30 shadow-2xl backdrop-blur-xs">
                    <span className="text-white text-2xl font-black tracking-wider uppercase text-center block drop-shadow-lg">
                      {layer.titleText}
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
