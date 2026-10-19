import React, { useEffect, useRef, useState } from 'react';
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
  // Track the last blobUrl the video element was pointed at to avoid re-loading on every tick
  const lastBlobUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const unsubEditor = editorStore.subscribe(() => setTick((t) => t + 1));
    const unsubTimeline = timelineStore.subscribe(() => setTick((t) => t + 1));
    const unsubLayout = layoutStore.subscribe(() => setTick((t) => t + 1));

    // Initialise the clock with project timebase so the store rAF advances correctly
    const proj = editorStore.getProject();
    timelineStore.initClock(proj.timelineTimebase, 0);

    return () => {
      unsubEditor();
      unsubTimeline();
      unsubLayout();
    };
  }, []);

  const project = editorStore.getProject();
  const playheadTicks = timelineStore.getPlayheadTicks();
  const isPlaying = timelineStore.getIsPlaying();
  const selectedClipIds = timelineStore.getSelectedClipIds();

  // Find active video clip at playhead (search all video tracks, top layer wins)
  let activeClip = undefined as ReturnType<typeof project.tracks[0]['clips']['find']>;
  for (const track of project.tracks) {
    if (track.kind === 'video' && !track.muted && !track.hidden) {
      const atPlayhead = track.clips.find(
        (c) => playheadTicks >= c.timelineStartTicks && playheadTicks < c.timelineStartTicks + c.durationTicks
      );
      if (atPlayhead) {
        activeClip = atPlayhead;
        break;
      }
    }
  }

  // Fallback: show selected clip even if playhead isn't on it
  if (!activeClip && selectedClipIds[0]) {
    for (const track of project.tracks) {
      const found = track.clips.find((c) => c.id === selectedClipIds[0]);
      if (found) {
        activeClip = found;
        break;
      }
    }
  }

  const activeAsset = activeClip ? project.assets.find((a) => a.id === activeClip?.assetId) : undefined;
  const activeBlobUrl = (activeAsset?.metadata as Record<string, unknown> | undefined)?.['blobUrl'] as string | undefined;

  // Wire up video element src only when blobUrl changes (avoid reload on every rAF tick)
  useEffect(() => {
    if (!videoRef.current) return;
    if (activeBlobUrl !== lastBlobUrlRef.current) {
      lastBlobUrlRef.current = activeBlobUrl;
      if (activeBlobUrl) {
        videoRef.current.src = activeBlobUrl;
        videoRef.current.load();
      } else {
        videoRef.current.src = '';
      }
    }
  }, [activeBlobUrl]);

  // Sync HTML5 video play/pause state from timelineStore
  useEffect(() => {
    if (!videoRef.current || !activeBlobUrl) return;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, activeBlobUrl]);

  // Sync video seek position when user scrubs the playhead (threshold = 0.1s)
  useEffect(() => {
    if (!videoRef.current || !activeClip || !activeBlobUrl) return;
    const clipOffsetSec = (playheadTicks - activeClip.timelineStartTicks) / project.timelineTimebase;
    if (Math.abs(videoRef.current.currentTime - clipOffsetSec) > 0.1) {
      videoRef.current.currentTime = Math.max(0, clipOffsetSec);
    }
  }, [playheadTicks, activeClip, activeBlobUrl, project.timelineTimebase]);

  const timecode = formatTimecode(playheadTicks, {
    fpsNumerator: project.fpsNumerator,
    fpsDenominator: project.fpsDenominator,
    timebase: project.timelineTimebase,
  });

  const handleStepFrame = (deltaFrames: number) => {
    const ticksPerFrame = project.timelineTimebase / (project.fpsNumerator / project.fpsDenominator);
    timelineStore.setPlayheadTicks(Math.max(0, Math.round(playheadTicks + deltaFrames * ticksPerFrame)));
  };

  const handleJumpToStart = () => {
    timelineStore.setPlayheadTicks(0);
    timelineStore.setIsPlaying(false);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--kuro-bg-canvas)] select-none overflow-hidden transition-colors">
      {/* Top Monitor Strip */}
      <div className="h-8 px-3 border-b border-[var(--kuro-border-subtle)] flex items-center justify-between text-xs bg-[var(--kuro-bg-panel)] z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-[var(--kuro-text-secondary)]" />
          <span className="font-medium text-[var(--kuro-text-primary)] text-xs">Preview</span>
          <span className="text-[10px] bg-[var(--kuro-bg-surface)] text-[var(--kuro-text-muted)] px-1.5 py-0.5 rounded font-mono border border-[var(--kuro-border-subtle)]">
            {project.width}x{project.height}
          </span>
          {activeAsset && (
            <span className="text-[10px] text-[var(--kuro-text-secondary)] font-medium truncate max-w-[200px]">
              • {activeAsset.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
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
              const isMaximized = !layoutStore.isLeftPanelVisible() && !layoutStore.isInspectorVisible() && !layoutStore.isTimelineVisible();
              if (isMaximized) {
                layoutStore.resetLayout();
              } else {
                if (layoutStore.isLeftPanelVisible()) layoutStore.toggleLeftPanel();
                if (layoutStore.isInspectorVisible()) layoutStore.toggleInspector();
                if (layoutStore.isTimelineVisible()) layoutStore.toggleTimeline();
              }
            }}
            className="p-1 rounded text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)] transition"
            title={
              !layoutStore.isLeftPanelVisible() && !layoutStore.isInspectorVisible() && !layoutStore.isTimelineVisible()
                ? 'Restore Panels'
                : 'Maximize Preview'
            }
          >
            {!layoutStore.isLeftPanelVisible() && !layoutStore.isInspectorVisible() && !layoutStore.isTimelineVisible() ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Video Viewport Area – letterboxed 16:9, never overlays transport bar */}
      <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center p-3 relative overflow-hidden bg-[var(--kuro-bg-canvas)]">
        <div
          className="relative rounded border border-[var(--kuro-border-subtle)] shadow-2xl flex items-center justify-center overflow-hidden bg-black"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: '16 / 9',
            width: '100%',
            height: 'auto',
          }}
        >
          {activeBlobUrl ? (
            activeAsset?.type === 'image' ? (
              <img
                src={activeBlobUrl}
                alt={activeAsset.name}
                className="w-full h-full object-contain pointer-events-none select-none"
              />
            ) : (
              <video
                ref={videoRef}
                className="w-full h-full object-contain pointer-events-none"
                muted={isMuted}
                playsInline
                onEnded={() => timelineStore.setIsPlaying(false)}
              />
            )
          ) : activeAsset?.metadata?.['isTitle'] ? (
            <div className="w-full h-full bg-black flex items-center justify-center p-8 select-none">
              <span className="text-white text-2xl font-bold tracking-wider drop-shadow-lg text-center uppercase">
                {(activeAsset.metadata['text'] as string) || activeAsset.name}
              </span>
            </div>
          ) : (
            /* Pure black when no clip at playhead */
            <div className="w-full h-full bg-black flex items-center justify-center">
              {project.tracks.every((t) => t.clips.length === 0) && (
                <span className="text-white/20 text-xs font-mono tracking-widest uppercase select-none">
                  Drop clips on the timeline to begin
                </span>
              )}
            </div>
          )}

          {/* Monochrome Safe Margins Overlay */}
          {showSafeGuides && (
            <div className="absolute inset-8 border border-dashed border-white/30 pointer-events-none flex items-center justify-center">
              <div className="w-3 h-3 border-t border-l border-white/60 absolute top-0 left-0" />
              <div className="w-3 h-3 border-t border-r border-white/60 absolute top-0 right-0" />
              <div className="w-3 h-3 border-b border-l border-white/60 absolute bottom-0 left-0" />
              <div className="w-3 h-3 border-b border-r border-white/60 absolute bottom-0 right-0" />
              <div className="text-[9px] text-white/70 font-mono tracking-wider bg-black/70 px-2 py-0.5 rounded">
                SAFE AREA 90%
              </div>
            </div>
          )}

          {/* Playing indicator dot */}
          {isPlaying && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse shadow" />
          )}
        </div>
      </div>

      {/* Transport Bar – shrink-0 so it never gets pushed off screen */}
      <div className="h-10 shrink-0 px-4 bg-[var(--kuro-bg-panel)] border-t border-[var(--kuro-border-subtle)] flex items-center justify-between text-xs z-10 transition-colors">
        {/* Monospaced Timecode Display */}
        <div className="font-mono text-xs font-semibold text-[var(--kuro-text-primary)] tracking-wider bg-[var(--kuro-bg-canvas)] px-2.5 py-1 rounded border border-[var(--kuro-border-subtle)]">
          {timecode}
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-1">
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
            onClick={() => timelineStore.togglePlayback()}
            className="w-8 h-8 rounded-full bg-[var(--kuro-btn-primary-bg)] text-[var(--kuro-btn-primary-text)] hover:opacity-90 flex items-center justify-center transition active:scale-95"
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
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

        {/* Volume & FPS Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[var(--kuro-text-muted)]">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="hover:text-[var(--kuro-text-primary)]"
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
            <Circle className={`w-1.5 h-1.5 fill-current ${isPlaying ? 'text-[var(--kuro-text-primary)] animate-pulse' : 'text-[var(--kuro-text-faint)]'}`} />
            <span>{project.fpsNumerator}.0 fps</span>
          </div>
        </div>
      </div>
    </div>
  );
};
