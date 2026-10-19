import React, { useEffect, useRef, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { DEFAULT_TICKS_PER_SECOND, TimelineTicks } from '@kuro/shared';
import { SplitClipCommand, DeleteClipCommand } from '@kuro/editor-core';

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

  const playheadLeftPx = playheadTicks * pixelsPerTick;

  return (
    <div className="h-full flex flex-col bg-slate-950 border-t border-slate-800 select-none overflow-hidden">
      {/* Timeline Controls Header */}
      <div className="h-9 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">Timeline</span>
          <div className="h-3 w-px bg-slate-700" />
          <button
            onClick={handleSplitAtPlayhead}
            disabled={selectedClipIds.length === 0}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-[11px] font-medium"
            title="Split Clip at Playhead (Ctrl+K)"
          >
            ✂️ Split
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedClipIds.length === 0}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 disabled:opacity-40 text-slate-200 text-[11px] font-medium"
            title="Delete Selected Clip (Del)"
          >
            🗑️ Delete
          </button>
        </div>

        {/* Zoom Slider & Snapping */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => timelineStore.toggleSnapping()}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
              timelineStore.getIsSnappingEnabled()
                ? 'bg-sky-500/20 text-sky-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Snapping (S)"
          >
            🧲 Snapping
          </button>

          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span>-</span>
            <input
              type="range"
              min="0.2"
              max="4.0"
              step="0.1"
              value={zoom}
              onChange={(e) => timelineStore.setZoom(parseFloat(e.target.value))}
              className="w-20 accent-sky-500 cursor-pointer"
            />
            <span>+</span>
          </div>
        </div>
      </div>

      {/* Timeline Scroll Area */}
      <div className="flex-1 overflow-x-auto overflow-y-auto flex relative">
        {/* Track Headers (Left sidebar) */}
        <div className="w-36 bg-slate-900 border-r border-slate-800 shrink-0 sticky left-0 z-20">
          <div className="h-6 border-b border-slate-800" /> {/* Ruler spacer */}
          {project.tracks.map((track) => (
            <div
              key={track.id}
              className="h-16 px-2.5 border-b border-slate-800 flex items-center justify-between text-xs font-medium text-slate-300"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span>{track.kind === 'video' ? '🎬' : '🎵'}</span>
                <span className="truncate">{track.name}</span>
              </div>
              <button
                className={`text-[10px] px-1 py-0.5 rounded ${
                  track.muted ? 'bg-rose-950 text-rose-400 font-bold' : 'text-slate-500 hover:text-slate-300'
                }`}
                title="Mute Track"
              >
                M
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
            className="h-6 bg-slate-900/80 border-b border-slate-800 relative cursor-pointer"
          >
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-slate-800 text-[9px] font-mono text-slate-500 pl-1"
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
                const clipWidth = Math.max(20, clip.durationTicks * pixelsPerTick);
                const isSelected = selectedClipIds.includes(clip.id);

                return (
                  <div
                    key={clip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      timelineStore.selectClip(clip.id);
                    }}
                    className={`absolute top-1 bottom-1 rounded border px-2 py-1 text-xs font-medium cursor-pointer transition select-none flex flex-col justify-between overflow-hidden ${
                      track.kind === 'video'
                        ? 'bg-sky-950/70 border-sky-600/50 text-sky-200'
                        : 'bg-emerald-950/70 border-emerald-600/50 text-emerald-200'
                    } ${isSelected ? 'ring-2 ring-sky-400 shadow-lg shadow-sky-500/30' : 'hover:brightness-110'}`}
                    style={{ left: `${clipLeft}px`, width: `${clipWidth}px` }}
                  >
                    <div className="flex items-center justify-between text-[11px] truncate">
                      <span className="truncate">{clip.id}</span>
                      <span className="text-[10px] opacity-70">
                        {((clip.durationTicks / project.timelineTimebase)).toFixed(1)}s
                      </span>
                    </div>

                    {/* Waveform Visual Bars Mock */}
                    <div className="h-3 flex items-end gap-0.5 opacity-30 pointer-events-none">
                      {Array.from({ length: Math.min(30, Math.floor(clipWidth / 4)) }).map((_, idx) => (
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
