import React, { useEffect, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { formatTimecode } from '@kuro/shared';
import {
  Play,
  Pause,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  Grid,
  Monitor,
  Maximize2
} from 'lucide-react';

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

  // Realtime playback loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      if (timelineStore.getIsPlaying()) {
        const deltaMs = currentTime - lastTime;
        const deltaSeconds = deltaMs / 1000;
        const currentTicks = timelineStore.getPlayheadTicks();
        const deltaTicks = Math.round(deltaSeconds * project.timelineTimebase);
        timelineStore.setPlayheadTicks(currentTicks + deltaTicks);
      }
      lastTime = currentTime;
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [project.timelineTimebase]);

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
      <div className="h-9 px-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-900/60 z-10">
        <div className="flex items-center gap-2">
          <Monitor className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-slate-300">Preview Monitor</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
            {project.width}x{project.height}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSafeGuides(!showSafeGuides)}
            className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1.5 transition ${
              showSafeGuides ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Toggle Action Safe Guides"
          >
            <Grid className="w-3 h-3" />
            <span>Guides</span>
          </button>

          <select
            value={previewQuality}
            onChange={(e) => setPreviewQuality(e.target.value as '1080p' | '720p' | '540p')}
            className="bg-slate-900 border border-slate-700 text-[11px] rounded px-2 py-0.5 text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="1080p">Full (1080p)</option>
            <option value="720p">1/2 (720p)</option>
            <option value="540p">1/4 Proxy (540p)</option>
          </select>
        </div>
      </div>

      {/* Video Viewport Area */}
      <div className="flex-1 flex items-center justify-center p-4 relative bg-black/70">
        <div className="relative aspect-video max-h-full max-w-full w-[800px] bg-slate-900 rounded-lg border border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden">
          {/* Safe Margins Overlay */}
          {showSafeGuides && (
            <div className="absolute inset-6 border border-dashed border-sky-500/30 pointer-events-none flex items-center justify-center">
              <div className="w-4 h-4 border-t border-l border-sky-400/50 absolute top-0 left-0" />
              <div className="w-4 h-4 border-t border-r border-sky-400/50 absolute top-0 right-0" />
              <div className="w-4 h-4 border-b border-l border-sky-400/50 absolute bottom-0 left-0" />
              <div className="w-4 h-4 border-b border-r border-sky-400/50 absolute bottom-0 right-0" />
              <div className="text-[10px] text-sky-400/60 font-mono">ACTION SAFE 90%</div>
            </div>
          )}

          {/* Active Canvas Screen Mock */}
          <div className="flex flex-col items-center justify-center text-slate-600 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400 shadow-inner">
              <Monitor className="w-8 h-8 text-sky-400/80" />
            </div>
            <div className="text-center">
              <div className="text-xs font-mono tracking-wider text-slate-300 font-semibold">
                {project.width}x{project.height} @ {project.fpsNumerator}fps
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                Playhead: {(playheadTicks / project.timelineTimebase).toFixed(2)}s
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Playback Controls & Timecode Bar */}
      <div className="h-11 px-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs z-10">
        {/* SMPTE Timecode Readout */}
        <div className="font-mono text-xs font-bold text-sky-400 tracking-wider bg-slate-950 px-2.5 py-1 rounded border border-slate-800 shadow-inner">
          {timecode}
        </div>

        {/* Transport Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleJumpToStart}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 transition"
            title="Jump to Start (Home)"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStepFrame(-1)}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 transition"
            title="Step 1 Frame Back (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => timelineStore.togglePlayback()}
            className="w-9 h-9 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-sky-500/25 transition hover:scale-105 active:scale-95"
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
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-300 transition"
            title="Step 1 Frame Forward (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Playback FPS Feedback */}
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="font-mono">Realtime {project.fpsNumerator}.0 fps</span>
        </div>
      </div>
    </div>
  );
};
