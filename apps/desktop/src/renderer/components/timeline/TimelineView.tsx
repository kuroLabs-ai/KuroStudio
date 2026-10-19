import React, { useEffect, useRef, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { SplitClipCommand, DeleteClipCommand, MuteTrackCommand } from '@kuro/editor-core';
import { layoutStore } from '../../stores/useLayoutStore';
import {
  Scissors,
  Trash2,
  Magnet,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
  Video,
  Music,
  Clock,
  ChevronDown
} from 'lucide-react';

export const TimelineView: React.FC = () => {
  const [, setTick] = useState(0);
  const rulerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    const unsubEditor = editorStore.subscribe(() => setTick((t) => t + 1));
    const unsubTimeline = timelineStore.subscribe(() => setTick((t) => t + 1));
    return () => {
      unsubEditor();
      unsubTimeline();
    };
  }, []);

  const project = editorStore.getProject();
  const playheadTicks = timelineStore.getPlayheadTicks();
  const zoom = timelineStore.getZoom();
  const selectedClipIds = timelineStore.getSelectedClipIds();

  // Pixels per second calculation based on zoom
  const basePixelsPerSecond = 50;
  const pixelsPerSecond = basePixelsPerSecond * zoom;
  const pixelsPerTick = pixelsPerSecond / project.timelineTimebase;

  const updatePlayheadFromClientX = (clientX: number) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const newTicks = Math.round(clickX / pixelsPerTick);
    timelineStore.setPlayheadTicks(Math.max(0, newTicks));
  };

  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    updatePlayheadFromClientX(e.clientX);
  };

  useEffect(() => {
    if (!isScrubbing) return;

    const handleMouseMove = (e: MouseEvent) => {
      updatePlayheadFromClientX(e.clientX);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, pixelsPerTick]);

  const handleSplitAtPlayhead = async () => {
    const activeClipId = selectedClipIds[0];
    if (!activeClipId) return;

    for (const track of project.tracks) {
      const clip = track.clips.find((c) => c.id === activeClipId);
      if (clip) {
        if (playheadTicks > clip.timelineStartTicks && playheadTicks < clip.timelineStartTicks + clip.durationTicks) {
          await editorStore.executeCommand(new SplitClipCommand(clip.id, playheadTicks));
        }
        break;
      }
    }
  };

  const handleDeleteSelected = async () => {
    const activeClipId = selectedClipIds[0];
    if (!activeClipId) return;
    await editorStore.executeCommand(new DeleteClipCommand(activeClipId));
  };

  const handleToggleMute = async (trackId: string, currentMuted: boolean) => {
    await editorStore.executeCommand(new MuteTrackCommand(trackId, !currentMuted));
  };

  const playheadLeftPx = playheadTicks * pixelsPerTick;

  return (
    <div className="h-full flex flex-col bg-[var(--kuro-timeline-bg)] border-t border-[var(--kuro-border-subtle)] select-none overflow-hidden transition-colors">
      {/* Timeline Controls Toolbar */}
      <div className="h-8 px-3 bg-[var(--kuro-bg-panel)] border-b border-[var(--kuro-border-subtle)] flex items-center justify-between text-xs z-10">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 font-semibold text-[var(--kuro-text-primary)]">
            <Clock className="w-3.5 h-3.5 text-[var(--kuro-text-muted)]" />
            <span className="text-[11px] uppercase tracking-wider">Timeline</span>
          </div>

          <div className="h-3 w-px bg-[var(--kuro-border-base)] mx-1" />

          <button
            onClick={handleSplitAtPlayhead}
            disabled={selectedClipIds.length === 0}
            className="kuro-btn kuro-btn-secondary px-2 py-0.5 text-[11px] font-medium flex items-center gap-1 disabled:opacity-30"
            title="Split Selected Clip at Playhead (Ctrl+K)"
          >
            <Scissors className="w-3 h-3" />
            <span>Split</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={selectedClipIds.length === 0}
            className="kuro-btn kuro-btn-secondary px-2 py-0.5 text-[11px] font-medium flex items-center gap-1 disabled:opacity-30"
            title="Delete Selected Clip (Delete)"
          >
            <Trash2 className="w-3 h-3" />
            <span>Delete</span>
          </button>
        </div>

        {/* Zoom Slider & Snapping */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => timelineStore.toggleSnapping()}
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition ${
              timelineStore.getIsSnappingEnabled()
                ? 'bg-[var(--kuro-text-primary)] text-[var(--kuro-bg-canvas)]'
                : 'text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)]'
            }`}
            title="Toggle Snapping (S)"
          >
            <Magnet className="w-3 h-3" />
            <span>Snapping</span>
          </button>

          <div className="flex items-center gap-1.5 text-[var(--kuro-text-muted)] text-xs bg-[var(--kuro-bg-surface)] px-2 py-0.5 rounded border border-[var(--kuro-border-subtle)]">
            <button
              onClick={() => timelineStore.setZoom(Math.max(0.2, zoom - 0.2))}
              className="hover:text-[var(--kuro-text-primary)]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <input
              type="range"
              min="0.2"
              max="4.0"
              step="0.1"
              value={zoom}
              onChange={(e) => timelineStore.setZoom(parseFloat(e.target.value))}
              className="w-16 accent-[var(--kuro-text-primary)] cursor-pointer"
            />
            <button
              onClick={() => timelineStore.setZoom(Math.min(4.0, zoom + 0.2))}
              className="hover:text-[var(--kuro-text-primary)]"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          <div className="h-3 w-px bg-[var(--kuro-border-base)] mx-0.5" />

          <button
            onClick={() => layoutStore.toggleTimeline()}
            className="p-1 rounded hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] transition"
            title="Collapse Timeline"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Timeline Scroll Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto flex relative">
        {/* Track Headers (Left sidebar) */}
        <div className="w-40 bg-[var(--kuro-bg-panel)] border-r border-[var(--kuro-border-subtle)] shrink-0 sticky left-0 z-20 shadow-sm">
          <div className="h-6 border-b border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-canvas)] px-2.5 flex items-center text-[9px] text-[var(--kuro-text-muted)] font-mono uppercase tracking-wider">
            TRACKS ({project.tracks.length})
          </div>
          {project.tracks.map((track) => (
            <div
              key={track.id}
              className="h-16 px-2.5 border-b border-[var(--kuro-border-subtle)] flex items-center justify-between text-xs font-medium bg-[var(--kuro-bg-panel)] transition-colors"
            >
              <div className="flex items-center gap-2 truncate">
                <div className="w-5 h-5 rounded-sm bg-[var(--kuro-bg-surface)] text-[var(--kuro-text-secondary)] flex items-center justify-center shrink-0 border border-[var(--kuro-border-subtle)]">
                  {track.kind === 'video' ? <Video className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                </div>
                <div className="truncate">
                  <span className="truncate text-xs text-[var(--kuro-text-primary)] block font-medium">{track.name}</span>
                  <span className="text-[10px] text-[var(--kuro-text-muted)] font-mono">{track.clips.length} clips</span>
                </div>
              </div>

              <button
                onClick={() => handleToggleMute(track.id, track.muted ?? false)}
                className={`p-1 rounded text-[10px] font-mono transition ${
                  track.muted
                    ? 'bg-[var(--kuro-text-primary)] text-[var(--kuro-bg-canvas)] font-bold'
                    : 'text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)]'
                }`}
                title={track.muted ? 'Unmute Track' : 'Mute Track'}
              >
                {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
            </div>
          ))}
        </div>

        {/* Tracks Content & Time Ruler */}
        <div className="flex-1 relative min-w-[2400px]">
          {/* Time Ruler (Interactive Scrubbing) */}
          <div
            ref={rulerRef}
            onMouseDown={handleRulerMouseDown}
            className="h-6 bg-[var(--kuro-bg-surface)] border-b border-[var(--kuro-border-subtle)] relative cursor-ew-resize select-none"
            title="Click or drag to scrub playhead"
          >
            {Array.from({ length: 48 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-[var(--kuro-border-subtle)] text-[9px] font-mono text-[var(--kuro-text-muted)] pl-1 flex items-center pointer-events-none"
                style={{ left: `${i * 5 * pixelsPerSecond}px` }}
              >
                {i * 5}s
              </div>
            ))}
          </div>

          {/* Draggable Playhead Needle */}
          <div
            className="absolute top-0 bottom-0 w-px bg-[var(--kuro-playhead)] z-30 pointer-events-none"
            style={{ left: `${playheadLeftPx}px` }}
          >
            <div className="w-2.5 h-2.5 bg-[var(--kuro-playhead)] -translate-x-[4px] -translate-y-1 rotate-45 shadow-sm" />
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[var(--kuro-playhead)] text-[var(--kuro-bg-canvas)] font-mono text-[9px] font-bold px-1 rounded-sm shadow">
              {((playheadTicks / project.timelineTimebase)).toFixed(1)}s
            </div>
          </div>

          {/* Tracks Clip Lanes */}
          {project.tracks.map((track) => (
            <div
              key={track.id}
              className="h-16 border-b border-[var(--kuro-border-subtle)] relative bg-[var(--kuro-bg-base)]/40"
            >
              {track.clips.map((clip) => {
                const clipLeft = clip.timelineStartTicks * pixelsPerTick;
                const clipWidth = Math.max(32, clip.durationTicks * pixelsPerTick);
                const isSelected = selectedClipIds.includes(clip.id);
                const asset = project.assets.find((a) => a.id === clip.assetId);

                return (
                  <div
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      timelineStore.selectClip(clip.id);
                    }}
                    className={`absolute top-1 bottom-1 rounded-sm border text-xs font-medium cursor-pointer transition select-none flex flex-col justify-between overflow-hidden shadow-sm ${
                      track.kind === 'video'
                        ? 'bg-[var(--kuro-track-video)] text-[var(--kuro-text-primary)] border-[var(--kuro-border-strong)]'
                        : 'bg-[var(--kuro-track-audio)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-base)]'
                    } ${isSelected ? 'ring-1 ring-white border-white brightness-125' : 'hover:brightness-110'}`}
                    style={{ left: `${clipLeft}px`, width: `${clipWidth}px` }}
                  >
                    {/* Background real thumbnail if video */}
                    {asset?.thumbnailPath && (
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none filter grayscale"
                        style={{ backgroundImage: `url(${asset.thumbnailPath})` }}
                      />
                    )}

                    <div className="relative z-10 px-2 py-0.5 flex items-center justify-between text-[11px] truncate font-medium bg-black/40">
                      <span className="truncate font-semibold">{asset?.name ?? clip.id}</span>
                      <span className="text-[10px] opacity-75 font-mono ml-1 shrink-0">
                        {((clip.durationTicks / project.timelineTimebase)).toFixed(1)}s
                      </span>
                    </div>

                    {/* Monochrome Waveform / Visual Rhythm Bars */}
                    <div className="relative z-10 h-2.5 px-2 flex items-end gap-0.5 opacity-30 pointer-events-none">
                      {Array.from({ length: Math.min(40, Math.floor(clipWidth / 6)) }).map((_, idx) => (
                        <div
                          key={idx}
                          className="w-0.5 bg-current rounded-t-sm"
                          style={{ height: `${20 + ((idx * 23) % 75)}%` }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
