import React, { useEffect, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { formatTimecode, DEFAULT_TICKS_PER_SECOND } from '@kuro/shared';

export const PreviewMonitor: React.FC = () => {
  const [, setTick] = useState(0);
  const [showSafeGuides, setShowSafeGuides] = useState(false);
  const [previewQuality, setPreviewQuality] = useState<'1080p' | '720p' | '540p'>('1080p');

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
  const isPlaying = timelineStore.getIsPlaying();

  const timecode = formatTimecode(playheadTicks, {
    fpsNumerator: project.fpsNumerator,
    fpsDenominator: project.fpsDenominator,
    timebase: project.timelineTimebase,
  });

  const handleStepFrame = (deltaFrames: number) => {
    const ticksPerFrame = project.timelineTimebase / (project.fpsNumerator / project.fpsDenominator);
    timelineStore.setPlayheadTicks(Math.round(playheadTicks + deltaFrames * ticksPerFrame));
  };

  const handleJumpToStart = () => {
    timelineStore.setPlayheadTicks(0);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 select-none overflow-hidden">
      {/* Top Monitor Bar */}
      <div className="h-8 px-3 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 bg-slate-900/50">
        <span className="font-semibold text-slate-300">Preview Monitor</span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSafeGuides(!showSafeGuides)}
            className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition ${
              showSafeGuides ? 'bg-sky-500/20 text-sky-400' : 'hover:text-slate-200'
            }`}
            title="Toggle Action Safe Guides"
          >
            📐 Guides
          </button>

          <select
            value={previewQuality}
            onChange={(e) => setPreviewQuality(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-[11px] rounded px-1.5 py-0.5 text-slate-300 focus:outline-none"
          >
            <option value="1080p">Full (1080p)</option>
            <option value="720p">1/2 (720p)</option>
            <option value="540p">1/4 Proxy (540p)</option>
          </select>
        </div>
      </div>

      {/* Video Viewport Area */}
      <div className="flex-1 flex items-center justify-center p-4 relative bg-black/60">
        <div className="relative aspect-video max-h-full max-w-full w-[800px] bg-slate-900 rounded-md border border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden">
          {/* Safe Margins Overlay */}
          {showSafeGuides && (
            <div className="absolute inset-4 border border-dashed border-sky-500/30 pointer-events-none flex items-center justify-center">
              <div className="w-4 h-4 border-t border-l border-sky-400/50 absolute top-0 left-0" />
              <div className="w-4 h-4 border-t border-r border-sky-400/50 absolute top-0 right-0" />
              <div className="w-4 h-4 border-b border-l border-sky-400/50 absolute bottom-0 left-0" />
              <div className="w-4 h-4 border-b border-r border-sky-400/50 absolute bottom-0 right-0" />
            </div>
          )}

          {/* Active Canvas Mock Screen */}
          <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
            <span className="text-3xl">🖥️</span>
            <span className="text-xs font-mono tracking-wider text-slate-400">
              {project.width}x{project.height} @ {project.fpsNumerator}fps
            </span>
            <span className="text-[11px] text-slate-500">
              Playhead: {(playheadTicks / project.timelineTimebase).toFixed(2)}s
            </span>
          </div>
        </div>
      </div>

      {/* Playback Controls & Timecode Bar */}
      <div className="h-10 px-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs">
        {/* SMPTE Timecode Readout */}
        <div className="font-mono text-sm font-bold text-sky-400 tracking-wider bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          {timecode}
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleJumpToStart}
            className="w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center text-slate-300 transition"
            title="Jump to Start (Home)"
          >
            ⏮
          </button>
          <button
            onClick={() => handleStepFrame(-1)}
            className="w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center text-slate-300 transition"
            title="Step 1 Frame Back (Left Arrow)"
          >
            ◀
          </button>
          <button
            onClick={() => timelineStore.togglePlayback()}
            className="w-8 h-8 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-sky-500/20 transition"
            title="Play / Pause (Space)"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => handleStepFrame(1)}
            className="w-7 h-7 rounded hover:bg-slate-800 flex items-center justify-center text-slate-300 transition"
            title="Step 1 Frame Forward (Right Arrow)"
          >
            ▶
          </button>
        </div>

        {/* Playback FPS / Dropped Frames Feedback */}
        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Realtime 30.0 fps</span>
        </div>
      </div>
    </div>
  );
};
