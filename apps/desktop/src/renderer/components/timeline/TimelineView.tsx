import React, { useEffect, useRef, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { SplitClipCommand, DeleteClipCommand, MuteTrackCommand } from '@kuro/editor-core';
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
  Clock
} from 'lucide-react';

export const TimelineView: React.FC = () => {
  const [, setTick] = useState(0);
  const rulerRef = useRef<HTMLDivElement>(null);

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
  const basePixelsPerSecond = 40;
  const pixelsPerSecond = basePixelsPerSecond * zoom;
  const pixelsPerTick = pixelsPerSecond / project.timelineTimebase;

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTicks = Math.round(clickX / pixelsPerTick);
    timelineStore.setPlayheadTicks(Math.max(0, newTicks));
  };

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
    <div className="h-full flex flex-col bg-slate-950 border-t border-slate-800 select-none overflow-hidden">
      {/* Timeline Controls Header */}
      <div className="h-10 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-300">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Timeline</span>
          </div>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={handleSplitAtPlayhead}
            disabled={selectedClipIds.length === 0}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
            title="Split Clip at Playhead (Ctrl+K)"
          >
            <Scissors className="w-3.5 h-3.5 text-sky-400" />
            <span>Split</span>
          </button>

          <button
            onClick={handleDeleteSelected}
            disabled={selectedClipIds.length === 0}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 disabled:opacity-40 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
            title="Delete Selected Clip (Del)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete</span>
          </button>
        </div>

        {/* Zoom Slider & Snapping */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => timelineStore.toggleSnapping()}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition ${
              timelineStore.getIsSnappingEnabled()
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Toggle Snapping (S)"
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snapping</span>
          </button>

          <div className="flex items-center gap-1.5 text-slate-400 text-xs bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
            <button
              onClick={() => timelineStore.setZoom(Math.max(0.2, zoom - 0.2))}
              className="hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="0.2"
              max="4.0"
              step="0.1"
              value={zoom}
              onChange={(e) => timelineStore.setZoom(parseFloat(e.target.value))}
              className="w-20 accent-sky-500 cursor-pointer"
            />
            <button
              onClick={() => timelineStore.setZoom(Math.min(4.0, zoom + 0.2))}
              className="hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Scroll Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto flex relative">
        {/* Track Headers (Left sidebar) */}
        <div className="w-40 bg-slate-900 border-r border-slate-800 shrink-0 sticky left-0 z-20 shadow-md">
          <div className="h-7 border-b border-slate-800 bg-slate-950/40 px-2 flex items-center text-[10px] text-slate-500 font-mono">
            TRACKS
          </div>
          {project.tracks.map((track) => (
            <div
              key={track.id}
              className="h-16 px-3 border-b border-slate-800 flex items-center justify-between text-xs font-medium text-slate-300 bg-slate-900/90"
            >
              <div className="flex items-center gap-2 truncate">
                {track.kind === 'video' ? (
                  <Video className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                ) : (
                  <Music className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span className="truncate text-xs text-slate-200">{track.name}</span>
              </div>
              <button
                onClick={() => handleToggleMute(track.id, track.muted)}
                className={`p-1 rounded transition ${
                  track.muted
                    ? 'bg-rose-950/80 text-rose-400 border border-rose-800/40'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={track.muted ? 'Unmute Track' : 'Mute Track'}
              >
                {track.muted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Tracks Content & Time Ruler */}
        <div className="flex-1 relative min-w-[2000px]">
          {/* Time Ruler */}
          <div
            ref={rulerRef}
            onClick={handleRulerClick}
            className="h-7 bg-slate-900/90 border-b border-slate-800 relative cursor-pointer"
          >
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-slate-800 text-[9px] font-mono text-slate-400 pl-1 flex items-center"
                style={{ left: `${i * 5 * pixelsPerSecond}px` }}
              >
                {i * 5}s
              </div>
            ))}
          </div>

          {/* Draggable Playhead Needle */}
          <div
            className="absolute top-0 bottom-0 w-px bg-sky-400 z-30 pointer-events-none"
            style={{ left: `${playheadLeftPx}px` }}
          >
            <div className="w-3 h-3 bg-sky-400 -translate-x-[5px] -translate-y-1 rotate-45 shadow-lg shadow-sky-500/50" />
          </div>

          {/* Tracks Clip Lanes */}
          {project.tracks.map((track) => (
            <div
              key={track.id}
              className="h-16 border-b border-slate-900/60 relative bg-slate-950/40"
            >
              {track.clips.map((clip) => {
                const clipLeft = clip.timelineStartTicks * pixelsPerTick;
                const clipWidth = Math.max(24, clip.durationTicks * pixelsPerTick);
                const isSelected = selectedClipIds.includes(clip.id);

                return (
                  <div
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      timelineStore.selectClip(clip.id);
                    }}
                    className={`absolute top-1 bottom-1 rounded-md border px-2.5 py-1 text-xs font-medium cursor-pointer transition select-none flex flex-col justify-between overflow-hidden shadow-sm ${
                      track.kind === 'video'
                        ? 'bg-sky-950/70 border-sky-600/50 text-sky-200 hover:border-sky-400'
                        : 'bg-emerald-950/70 border-emerald-600/50 text-emerald-200 hover:border-emerald-400'
                    } ${isSelected ? 'ring-2 ring-sky-400 border-sky-400 shadow-lg shadow-sky-500/30' : 'hover:brightness-110'}`}
                    style={{ left: `${clipLeft}px`, width: `${clipWidth}px` }}
                  >
                    <div className="flex items-center justify-between text-[11px] truncate font-medium">
                      <span className="truncate">{clip.id}</span>
                      <span className="text-[10px] opacity-75 font-mono ml-1">
                        {((clip.durationTicks / project.timelineTimebase)).toFixed(1)}s
                      </span>
                    </div>

                    {/* Waveform Visual Bars Mock */}
                    <div className="h-3 flex items-end gap-0.5 opacity-35 pointer-events-none">
                      {Array.from({ length: Math.min(30, Math.floor(clipWidth / 5)) }).map((_, idx) => (
                        <div
                          key={idx}
                          className="w-0.5 bg-current rounded-t"
                          style={{ height: `${20 + ((idx * 17) % 80)}%` }}
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
