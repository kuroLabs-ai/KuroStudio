import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  // Track which blobUrl the video element is currently loaded with
  const loadedBlobUrlRef = useRef<string | null>(null);
  // Flag to prevent seek loops: true while we are seeking programmatically
  const isSyncSeekingRef = useRef(false);

  // Subscribe to all stores so the component re-renders on every change
  useEffect(() => {
    const unsubEditor = editorStore.subscribe(() => setTick((t) => t + 1));
    const unsubTimeline = timelineStore.subscribe(() => setTick((t) => t + 1));
    const unsubLayout = layoutStore.subscribe(() => setTick((t) => t + 1));

    // Init the global clock with the project timebase
    const proj = editorStore.getProject();
    timelineStore.initClock(proj.timelineTimebase, 0);

    return () => {
      unsubEditor();
      unsubTimeline();
      unsubLayout();
    };
  }, []);

  // Derived state from stores (computed fresh every render)
  const project = editorStore.getProject();
  const playheadTicks = timelineStore.getPlayheadTicks();
  const isPlaying = timelineStore.getIsPlaying();
  const selectedClipIds = timelineStore.getSelectedClipIds();

  // ─── Active clip resolution ──────────────────────────────────────────────
  // Find the highest-priority video clip at the current playhead position.
  // Overlay tracks (rendered first in orderedTracks) win over V1.
  let activeClip: (typeof project.tracks[0]['clips'][0]) | undefined = undefined;
  for (const track of project.tracks) {
    if (track.kind === 'video' && !track.muted && !track.hidden) {
      const hit = track.clips.find(
        (c) =>
          playheadTicks >= c.timelineStartTicks &&
          playheadTicks < c.timelineStartTicks + c.durationTicks
      );
      if (hit) {
        activeClip = hit;
        break;
      }
    }
  }

  // Fallback: show the selected clip even if playhead is not on it (so user sees
  // what they selected in the bin or timeline)
  if (!activeClip && selectedClipIds[0]) {
    for (const track of project.tracks) {
      const found = track.clips.find((c) => c.id === selectedClipIds[0]);
      if (found) { activeClip = found; break; }
    }
  }

  const activeAsset = activeClip
    ? project.assets.find((a) => a.id === activeClip!.assetId)
    : undefined;

  const activeBlobUrl = (activeAsset?.metadata as Record<string, unknown> | undefined)
    ?.['blobUrl'] as string | undefined;

  // ─── HTML5 video element management ─────────────────────────────────────
  // Only load/reload the video element when the source actually changes.
  // Using a useEffect + ref so we don't hammer the element every rAF tick.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const newSrc = activeBlobUrl ?? '';

    if (newSrc !== (loadedBlobUrlRef.current ?? '')) {
      loadedBlobUrlRef.current = newSrc || null;
      video.src = newSrc;
      if (newSrc) {
        video.load();
      }
    }
  }, [activeBlobUrl]);

  // ─── Play / Pause sync ───────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeBlobUrl) return;

    if (isPlaying) {
      // Prevent double-play if already playing (avoids DOMException on some browsers)
      if (video.paused) {
        video.play().catch(() => {});
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [isPlaying, activeBlobUrl]);

  // ─── Seek sync: playhead → video currentTime ─────────────────────────────
  // Only seek when the user scrubs (not during normal playback, to avoid jitter).
  // We detect "user scrub" by checking if the video is paused or if the drift is large.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClip || !activeBlobUrl) return;

    const clipOffsetSec = (playheadTicks - activeClip.timelineStartTicks) / project.timelineTimebase;
    const clampedOffset = Math.max(0, clipOffsetSec);

    // Only force-seek when NOT playing (user is scrubbing) or when drift is large (>0.5s)
    const drift = Math.abs(video.currentTime - clampedOffset);
    if (!isPlaying || drift > 0.5) {
      isSyncSeekingRef.current = true;
      video.currentTime = clampedOffset;
    }
  }, [playheadTicks, activeClip?.id, activeBlobUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Video → playhead sync during playback ───────────────────────────────
  // When video is playing, let the VIDEO drive the playhead (more accurate than rAF).
  // The store's rAF clock is still running but we override it here.
  const handleVideoTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !activeClip || isSyncSeekingRef.current) return;
    if (!timelineStore.getIsPlaying()) return;

    const newTicks = Math.round(
      activeClip.timelineStartTicks + video.currentTime * project.timelineTimebase
    );
    // Only update store if the video is ahead — don't let rAF and video fight
    timelineStore.setPlayheadTicks(newTicks);
  }, [activeClip, project.timelineTimebase]);

  const handleVideoSeeked = useCallback(() => {
    // Clear the sync-seek flag so timeupdate events are processed again
    isSyncSeekingRef.current = false;
  }, []);

  const handleVideoEnded = useCallback(() => {
    timelineStore.setIsPlaying(false);
  }, []);

  // ─── Timecode & transport ─────────────────────────────────────────────────
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

  // ─── Total timeline duration for progress display ─────────────────────────
  const totalTicks = project.tracks.reduce(
    (max, t) =>
      t.clips.reduce(
        (m, c) => Math.max(m, c.timelineStartTicks + c.durationTicks),
        max
      ),
    0
  );

  const isEmpty = project.tracks.every((t) => t.clips.length === 0);

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
          {activeAsset && (
            <span className="text-[10px] text-[var(--kuro-text-secondary)] font-medium truncate">
              · {activeAsset.name}
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

      {/* ── Video Viewport Area ── letterboxed 16:9, never overlays transport */}
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
          {/* Always mount the video element (hidden when not in use) so the ref is always valid */}
          <video
            ref={videoRef}
            className={`w-full h-full object-contain pointer-events-none absolute inset-0 ${
              activeBlobUrl && activeAsset?.type !== 'image' ? 'opacity-100' : 'opacity-0'
            }`}
            muted={isMuted}
            playsInline
            onTimeUpdate={handleVideoTimeUpdate}
            onSeeked={handleVideoSeeked}
            onEnded={handleVideoEnded}
          />

          {/* Image overlay */}
          {activeBlobUrl && activeAsset?.type === 'image' && (
            <img
              src={activeBlobUrl}
              alt={activeAsset.name}
              className="w-full h-full object-contain pointer-events-none absolute inset-0"
            />
          )}

          {/* Title card overlay */}
          {!activeBlobUrl && activeAsset?.metadata?.['isTitle'] && (
            <div className="w-full h-full bg-black flex items-center justify-center p-8 absolute inset-0">
              <span className="text-white text-2xl font-bold tracking-wider drop-shadow-lg text-center uppercase">
                {(activeAsset.metadata['text'] as string) || activeAsset.name}
              </span>
            </div>
          )}

          {/* Pure black when no clip at playhead */}
          {!activeClip && (
            <div className="w-full h-full bg-black absolute inset-0 flex items-center justify-center">
              {isEmpty && (
                <span className="text-white/20 text-[10px] font-mono tracking-widest uppercase select-none text-center px-4">
                  Import media · drag clips to timeline · press Play
                </span>
              )}
            </div>
          )}

          {/* Progress bar at the bottom of the viewport */}
          {totalTicks > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
              <div
                className="h-full bg-white/50 transition-none"
                style={{ width: `${Math.min(100, (playheadTicks / totalTicks) * 100)}%` }}
              />
            </div>
          )}

          {/* Safe margins overlay */}
          {showSafeGuides && (
            <div className="absolute inset-[8%] border border-dashed border-white/30 pointer-events-none flex items-center justify-center">
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
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse shadow pointer-events-none" />
          )}
        </div>
      </div>

      {/* ── Transport Bar ─ shrink-0 ensures it never gets pushed offscreen */}
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
                if (videoRef.current) videoRef.current.volume = v;
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
