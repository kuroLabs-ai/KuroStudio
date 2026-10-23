import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AssetReference, Clip, Track, TransitionInstance } from '@kuro/project-format';
import { TimelineTool } from '../../stores/useTimelineStore';
import {
  formatHumanDuration,
  formatTimecodeClock,
  getRealAudioWaveform,
  extractVideoFilmstrip,
} from './timelineUtils';
import {
  Scissors,
  Plus,
  MoveHorizontal,
  Sparkles,
  Layers,
  X,
  FastForward,
} from 'lucide-react';

export interface TimelineViewportProps {
  tracks: Track[];
  assets: AssetReference[];
  transitions: TransitionInstance[];
  timelineTimebase: number;
  playheadTicks: number;
  pixelsPerTick: number;
  pixelsPerSecond: number;
  zoom: number;
  activeTool: TimelineTool;
  selectedClipIds: string[];
  movingClip: {
    clipId: string;
    originalTrackId: string;
    targetTrackId: string;
    originalTicks: number;
    currentTicks: number;
    startX: number;
    startY: number;
    clipKind: 'video' | 'audio';
    durationTicks: number;
  } | null;
  trimmingClip: {
    clipId: string;
    trackId: string;
    edge: 'start' | 'end';
    initialStartTicks: number;
    initialDurationTicks: number;
    currentStartTicks: number;
    currentDurationTicks: number;
    startX: number;
  } | null;
  dragOverTrackId: string | null;
  dragOverCutId: string | null;
  dragOverClipId: string | null;
  isDragOverNewVideo: boolean;
  isDragOverNewAudio: boolean;
  mainVideoTrack?: Track;
  mainAudioTrack?: Track;
  videoTracksCount: number;
  audioTracksCount: number;
  totalDurationSec: number;
  onScrubPlayhead: (ticks: number) => void;
  onSelectClip: (clipId: string, multiSelect?: boolean) => void;
  onClearSelection: () => void;
  onSetSelectedClipIds: (clipIds: string[]) => void;
  onStartMoveClip: (clipInfo: {
    clipId: string;
    originalTrackId: string;
    targetTrackId: string;
    originalTicks: number;
    currentTicks: number;
    startX: number;
    startY: number;
    clipKind: 'video' | 'audio';
    durationTicks: number;
  }) => void;
  onStartTrimClip: (trimInfo: {
    clipId: string;
    trackId: string;
    edge: 'start' | 'end';
    initialStartTicks: number;
    initialDurationTicks: number;
    currentStartTicks: number;
    currentDurationTicks: number;
    startX: number;
  }) => void;
  onRazorClick: (clipId: string, clientX: number, e: React.MouseEvent) => void;
  onTrackDrop: (trackId: string, e: React.DragEvent<HTMLDivElement>) => void;
  onNewTrackDrop: (kind: 'video' | 'audio', e: React.DragEvent<HTMLDivElement>) => void;
  onCutDropTransition: (outgoingClipId: string, incomingClipId: string, e: React.DragEvent<HTMLDivElement>) => void;
  onClipDropEffect: (clipId: string, e: React.DragEvent<HTMLDivElement>) => void;
  onApplyTransition: (outgoingClipId: string, incomingClipId: string, type?: string, durationSec?: number) => void;
  onRemoveTransition: (transId: string, e: React.MouseEvent) => void;
  setDragOverTrackId: (id: string | null) => void;
  setDragOverCutId: (id: string | null) => void;
  setDragOverClipId: (id: string | null) => void;
  setIsDragOverNewVideo: (over: boolean) => void;
  setIsDragOverNewAudio: (over: boolean) => void;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

// ─── Individual Clip Component with Real Waveforms & Filmstrip ────────────────
const TimelineClipItem: React.FC<{
  clip: Clip;
  track: Track;
  asset?: AssetReference;
  timelineTimebase: number;
  pixelsPerTick: number;
  pixelsPerSecond: number;
  activeTool: TimelineTool;
  isSelected: boolean;
  isBeingMoved: boolean;
  isBeingTrimmed: boolean;
  isClipOver: boolean;
  displayStartTicks: number;
  displayDurationTicks: number;
  onSelectClip: (clipId: string, multiSelect?: boolean) => void;
  onStartMoveClip: (clipInfo: {
    clipId: string;
    originalTrackId: string;
    targetTrackId: string;
    originalTicks: number;
    currentTicks: number;
    startX: number;
    startY: number;
    clipKind: 'video' | 'audio';
    durationTicks: number;
  }) => void;
  onStartTrimClip: (trimInfo: {
    clipId: string;
    trackId: string;
    edge: 'start' | 'end';
    initialStartTicks: number;
    initialDurationTicks: number;
    currentStartTicks: number;
    currentDurationTicks: number;
    startX: number;
  }) => void;
  onRazorClick: (clipId: string, clientX: number, e: React.MouseEvent) => void;
  onClipDropEffect: (clipId: string, e: React.DragEvent<HTMLDivElement>) => void;
  setDragOverClipId: (id: string | null) => void;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
}> = ({
  clip,
  track,
  asset,
  timelineTimebase,
  pixelsPerTick,
  pixelsPerSecond,
  activeTool,
  isSelected,
  isBeingMoved,
  isBeingTrimmed,
  isClipOver,
  displayStartTicks,
  displayDurationTicks,
  onSelectClip,
  onStartMoveClip,
  onStartTrimClip,
  onRazorClick,
  onClipDropEffect,
  setDragOverClipId,
  viewportRef,
}) => {
  const [wavePeaks, setWavePeaks] = useState<number[]>([]);
  const [filmstripFrames, setFilmstripFrames] = useState<string[]>([]);
  const [razorHoverTick, setRazorHoverTick] = useState<number | null>(null);

  const clipLeft = displayStartTicks * pixelsPerTick;
  const clipWidth = Math.max(36, displayDurationTicks * pixelsPerTick);
  const durationSec = displayDurationTicks / timelineTimebase;

  const blobUrl = (asset?.metadata as Record<string, unknown> | undefined)?.['blobUrl'] as string | undefined;

  // Load Real Waveforms
  useEffect(() => {
    let isMounted = true;
    const targetUrl = blobUrl || asset?.filePath || '';
    if (targetUrl) {
      getRealAudioWaveform(targetUrl, clip.assetId, 160).then((peaks) => {
        if (isMounted) setWavePeaks(peaks);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [blobUrl, asset?.filePath, clip.assetId]);

  // Load Filmstrip Thumbnails for Video Clips
  useEffect(() => {
    if (track.kind !== 'video') return;
    let isMounted = true;
    const targetUrl = blobUrl || asset?.filePath || '';
    if (targetUrl && (asset?.type === 'video' || !asset?.type)) {
      // Calculate how many thumbnails to show based on width (approx 80px per thumb)
      const targetCount = Math.max(2, Math.min(16, Math.floor(clipWidth / 80)));
      extractVideoFilmstrip(targetUrl, clip.assetId, durationSec, targetCount).then((frames) => {
        if (isMounted && frames.length > 0) {
          setFilmstripFrames(frames);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [track.kind, blobUrl, asset?.filePath, clip.assetId, clipWidth, durationSec, asset?.type]);

  const speedVal =
    clip.speedNumerator && clip.speedDenominator
      ? clip.speedNumerator / clip.speedDenominator
      : 1.0;

  return (
    <div
      data-clip-id={clip.id}
      onMouseDown={(e) => {
        if (activeTool === 'razor') return;
        e.stopPropagation();
        const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
        onSelectClip(clip.id, isMulti);
        onStartMoveClip({
          clipId: clip.id,
          originalTrackId: track.id,
          targetTrackId: track.id,
          originalTicks: clip.timelineStartTicks,
          currentTicks: clip.timelineStartTicks,
          startX: e.clientX,
          startY: e.clientY,
          clipKind: track.kind,
          durationTicks: clip.durationTicks,
        });
      }}
      onClick={(e) => {
        if (activeTool === 'razor') {
          onRazorClick(clip.id, e.clientX, e);
        }
      }}
      onMouseMove={(e) => {
        if (activeTool === 'razor' && viewportRef?.current) {
          const container = viewportRef.current;
          const rect = container.getBoundingClientRect();
          const relX = e.clientX - rect.left + container.scrollLeft;
          const ticks = Math.max(0, Math.round(relX / pixelsPerTick));
          setRazorHoverTick(ticks);
        }
      }}
      onMouseLeave={() => {
        if (activeTool === 'razor') setRazorHoverTick(null);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        setDragOverClipId(clip.id);
      }}
      onDragLeave={() => setDragOverClipId(null)}
      onDrop={(e) => onClipDropEffect(clip.id, e)}
      className={`absolute top-1 bottom-1 rounded border text-xs font-medium transition-all select-none flex flex-col justify-between overflow-hidden shadow-sm z-10 ${
        activeTool === 'razor' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
      } ${
        track.kind === 'video'
          ? 'bg-[var(--kuro-track-video)] text-[var(--kuro-text-primary)] border-[var(--kuro-border-strong)]'
          : 'bg-[var(--kuro-track-audio)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-base)]'
      } ${isSelected ? 'ring-2 ring-white border-white brightness-125' : 'hover:brightness-110'} ${
        isBeingMoved || isBeingTrimmed
          ? 'opacity-95 ring-2 ring-white scale-[1.01] z-40 shadow-2xl brightness-125'
          : ''
      } ${isClipOver ? 'ring-2 ring-white border-white scale-[1.01]' : ''}`}
      style={{ left: `${clipLeft}px`, width: `${clipWidth}px` }}
      title={
        activeTool === 'razor'
          ? 'Click to cut clip at cursor'
          : `${asset?.name ?? clip.id} (${formatHumanDuration(durationSec)})`
      }
    >
      {/* ── Left Edge Interactive Trim Handle (Trim In) ── */}
      {activeTool === 'select' && (
        <div
          data-trim-handle="true"
          onMouseDown={(e) => {
            e.stopPropagation();
            onSelectClip(clip.id);
            onStartTrimClip({
              clipId: clip.id,
              trackId: track.id,
              edge: 'start',
              initialStartTicks: clip.timelineStartTicks,
              initialDurationTicks: clip.durationTicks,
              currentStartTicks: clip.timelineStartTicks,
              currentDurationTicks: clip.durationTicks,
              startX: e.clientX,
            });
          }}
          className="absolute left-0 top-0 bottom-0 w-3 hover:w-3.5 z-30 cursor-ew-resize group/left flex items-center justify-center transition-all bg-transparent hover:bg-white/40"
          title="Drag to extend or compress start (Trim In)"
        >
          <div className="w-1 h-3 rounded-full bg-white/60 group-hover/left:bg-white shadow-sm" />
        </div>
      )}

      {/* ── Right Edge Interactive Trim Handle (Trim Out) ── */}
      {activeTool === 'select' && (
        <div
          data-trim-handle="true"
          onMouseDown={(e) => {
            e.stopPropagation();
            onSelectClip(clip.id);
            onStartTrimClip({
              clipId: clip.id,
              trackId: track.id,
              edge: 'end',
              initialStartTicks: clip.timelineStartTicks,
              initialDurationTicks: clip.durationTicks,
              currentStartTicks: clip.timelineStartTicks,
              currentDurationTicks: clip.durationTicks,
              startX: e.clientX,
            });
          }}
          className="absolute right-0 top-0 bottom-0 w-3 hover:w-3.5 z-30 cursor-ew-resize group/right flex items-center justify-center transition-all bg-transparent hover:bg-white/40"
          title="Drag to extend or compress end (Trim Out)"
        >
          <div className="w-1 h-3 rounded-full bg-white/60 group-hover/right:bg-white shadow-sm" />
        </div>
      )}

      {/* Razor Tool Hover Cut Line & Badge */}
      {activeTool === 'razor' && razorHoverTick !== null && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-400 shadow-[0_0_8px_red] z-50 pointer-events-none"
          style={{
            left: `${(razorHoverTick - displayStartTicks) * pixelsPerTick}px`,
          }}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white font-bold text-[8px] px-1 rounded shadow whitespace-nowrap">
            ✂ Cut
          </div>
        </div>
      )}

      {/* ── Filmstrip Frames Background for Video Track ── */}
      {track.kind === 'video' && filmstripFrames.length > 0 && (
        <div className="absolute inset-0 flex overflow-hidden opacity-35 pointer-events-none filter grayscale">
          {filmstripFrames.map((frameSrc, idx) => (
            <img
              key={idx}
              src={frameSrc}
              alt=""
              className="h-full object-cover shrink-0 border-r border-black/40"
              style={{ width: `${Math.max(60, clipWidth / filmstripFrames.length)}px` }}
            />
          ))}
        </div>
      )}

      {/* Single Thumbnail Fallback if no extracted filmstrip yet */}
      {track.kind === 'video' && filmstripFrames.length === 0 && asset?.thumbnailPath && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none filter grayscale"
          style={{ backgroundImage: `url(${asset.thumbnailPath})` }}
        />
      )}

      {/* ── Clip Top Header Bar with Name, Speed, FX & Human Time ── */}
      <div className="relative z-10 px-2 py-0.5 flex items-center justify-between text-[11px] truncate font-medium bg-black/65 backdrop-blur-xs pointer-events-none border-b border-white/10">
        <div className="flex items-center gap-1.5 truncate">
          <MoveHorizontal className="w-2.5 h-2.5 opacity-60 shrink-0" />
          <span className="truncate font-semibold tracking-tight">{asset?.name ?? clip.id}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {speedVal !== 1.0 && (
            <span className="text-[9px] bg-white/20 text-white font-bold px-1 rounded flex items-center gap-0.5 font-mono">
              <FastForward className="w-2.5 h-2.5" />
              {speedVal.toFixed(1)}x
            </span>
          )}
          {clip.effects && clip.effects.length > 0 && (
            <span className="text-[9px] bg-white text-black font-bold px-1 rounded flex items-center gap-0.5 font-mono">
              <Sparkles className="w-2.5 h-2.5" />
              {clip.effects.length}
            </span>
          )}
          <span className="text-[10px] text-white/90 font-mono font-bold bg-black/40 px-1 py-0.2 rounded">
            {formatHumanDuration(durationSec)}
          </span>
        </div>
      </div>

      {/* ── Realistic Audio Waveform ── */}
      {/* For Audio tracks: full-height mirrored waveform. For Video tracks: bottom audio strip */}
      <div
        className={`relative z-10 px-1 flex items-center pointer-events-none ${
          track.kind === 'audio' ? 'flex-1 py-1' : 'h-3.5 pb-0.5 bg-black/40'
        }`}
      >
        {wavePeaks.length > 0 && (
          <svg
            className="w-full h-full"
            preserveAspectRatio="none"
            viewBox={`0 0 ${wavePeaks.length} 100`}
          >
            {track.kind === 'audio' ? (
              // Mirrored acoustic waveform for dedicated audio track
              wavePeaks.map((peak, idx) => {
                const barHeight = Math.max(6, peak * 90);
                const y = (100 - barHeight) / 2;
                return (
                  <rect
                    key={idx}
                    x={idx}
                    y={y}
                    width={0.75}
                    height={barHeight}
                    fill="currentColor"
                    opacity={0.6 + peak * 0.4}
                    rx={0.3}
                  />
                );
              })
            ) : (
              // Audio bottom strip for video track
              wavePeaks.map((peak, idx) => {
                const barHeight = Math.max(10, peak * 85);
                const y = 100 - barHeight;
                return (
                  <rect
                    key={idx}
                    x={idx}
                    y={y}
                    width={0.7}
                    height={barHeight}
                    fill="#ffffff"
                    opacity={0.5 + peak * 0.4}
                    rx={0.3}
                  />
                );
              })
            )}
          </svg>
        )}
      </div>
    </div>
  );
};

// ─── Main Timeline Viewport Component ─────────────────────────────────────────
export const TimelineViewport: React.FC<TimelineViewportProps> = ({
  tracks,
  assets,
  transitions,
  timelineTimebase,
  playheadTicks,
  pixelsPerTick,
  pixelsPerSecond,
  zoom,
  activeTool,
  selectedClipIds,
  movingClip,
  trimmingClip,
  dragOverTrackId,
  dragOverCutId,
  dragOverClipId,
  isDragOverNewVideo,
  isDragOverNewAudio,
  mainVideoTrack,
  mainAudioTrack,
  videoTracksCount,
  audioTracksCount,
  totalDurationSec,
  onScrubPlayhead,
  onSelectClip,
  onClearSelection,
  onSetSelectedClipIds,
  onStartMoveClip,
  onStartTrimClip,
  onRazorClick,
  onTrackDrop,
  onNewTrackDrop,
  onCutDropTransition,
  onClipDropEffect,
  onApplyTransition,
  onRemoveTransition,
  setDragOverTrackId,
  setDragOverCutId,
  setDragOverClipId,
  setIsDragOverNewVideo,
  setIsDragOverNewAudio,
  viewportRef,
  onScroll,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null);
  const lanesContainerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // ─── Adaptive Time Ruler Config (Frames, Seconds, Minutes, Hours) ──────────
  const rulerTicks = useMemo(() => {
    const maxSec = Math.max(300, totalDurationSec + 120);
    let majorIntervalSec = 5;
    let minorIntervalSec = 1;

    // Formatting based on scale
    let formatTick = (sec: number) => formatTimecodeClock(sec);

    if (pixelsPerSecond >= 250) {
      // Extreme zoom in: show frames! (e.g. 5f or 10f)
      const fps = 30;
      const frameStep = 5;
      majorIntervalSec = frameStep / fps;
      minorIntervalSec = 1 / fps;
      formatTick = (sec: number) => {
        const totalFrames = Math.round(sec * fps);
        const s = Math.floor(totalFrames / fps);
        const f = totalFrames % fps;
        return f === 0 ? formatTimecodeClock(s) : `${f}f`;
      };
    } else if (pixelsPerSecond >= 90) {
      majorIntervalSec = 1;
      minorIntervalSec = 0.25;
      formatTick = (sec: number) => formatTimecodeClock(sec);
    } else if (pixelsPerSecond >= 40) {
      majorIntervalSec = 2;
      minorIntervalSec = 1;
      formatTick = (sec: number) => formatTimecodeClock(sec);
    } else if (pixelsPerSecond >= 20) {
      majorIntervalSec = 5;
      minorIntervalSec = 1;
      formatTick = (sec: number) => formatTimecodeClock(sec);
    } else if (pixelsPerSecond >= 10) {
      majorIntervalSec = 15;
      minorIntervalSec = 5;
      formatTick = (sec: number) => formatTimecodeClock(sec);
    } else if (pixelsPerSecond >= 4) {
      majorIntervalSec = 30;
      minorIntervalSec = 10;
      formatTick = (sec: number) => formatTimecodeClock(sec);
    } else if (pixelsPerSecond >= 1.5) {
      // Zoomed out: 1 minute ticks
      majorIntervalSec = 60;
      minorIntervalSec = 15;
      formatTick = (sec: number) => formatTimecodeClock(sec);
    } else if (pixelsPerSecond >= 0.5) {
      // Zoomed out more: 5 minute ticks
      majorIntervalSec = 300;
      minorIntervalSec = 60;
      formatTick = (sec: number) => formatTimecodeClock(sec);
    } else {
      // Ultra zoom out: 15 to 30 minute ticks
      majorIntervalSec = 900;
      minorIntervalSec = 180;
      formatTick = (sec: number) => formatTimecodeClock(sec);
    }

    const ticks: Array<{
      key: string;
      timeSec: number;
      leftPx: number;
      label: string;
      isMajor: boolean;
    }> = [];

    const numMajor = Math.ceil(maxSec / majorIntervalSec) + 1;
    for (let i = 0; i < numMajor; i++) {
      const timeSec = i * majorIntervalSec;
      const leftPx = timeSec * pixelsPerSecond;
      ticks.push({
        key: `maj_${i}`,
        timeSec,
        leftPx,
        label: formatTick(timeSec),
        isMajor: true,
      });

      const numMinors = Math.round(majorIntervalSec / minorIntervalSec);
      if (numMinors > 1 && numMinors <= 12) {
        for (let j = 1; j < numMinors; j++) {
          const minorSec = timeSec + j * minorIntervalSec;
          if (minorSec < maxSec) {
            ticks.push({
              key: `min_${i}_${j}`,
              timeSec: minorSec,
              leftPx: minorSec * pixelsPerSecond,
              label: '',
              isMajor: false,
            });
          }
        }
      }
    }

    return ticks;
  }, [pixelsPerSecond, totalDurationSec]);

  const timelineContentWidthPx = Math.max(3600, (totalDurationSec + 120) * pixelsPerSecond);
  const playheadLeftPx = playheadTicks * pixelsPerTick;

  // Scrubbing playhead
  const updatePlayheadFromClientX = (clientX: number) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const newTicks = Math.round(clickX / pixelsPerTick);
    onScrubPlayhead(Math.max(0, newTicks));
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

  // Windows-style marquee box selection
  useEffect(() => {
    if (!marquee) return;
    const handleMouseMove = (e: MouseEvent) => {
      const container = lanesContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;

      setMarquee((prev) => (prev ? { ...prev, currentX, currentY } : null));

      const boxLeft = Math.min(marquee.startX, currentX);
      const boxRight = Math.max(marquee.startX, currentX);
      const boxTop = Math.min(marquee.startY, currentY);
      const boxBottom = Math.max(marquee.startY, currentY);

      if (Math.abs(currentX - marquee.startX) > 4 || Math.abs(currentY - marquee.startY) > 4) {
        const clipEls = container.querySelectorAll<HTMLElement>('[data-clip-id]');
        const matchedIds: string[] = [];

        clipEls.forEach((el) => {
          const elRect = el.getBoundingClientRect();
          const clipLeft = elRect.left - rect.left;
          const clipRight = elRect.right - rect.left;
          const clipTop = elRect.top - rect.top;
          const clipBottom = elRect.bottom - rect.top;

          const intersects =
            boxLeft < clipRight &&
            boxRight > clipLeft &&
            boxTop < clipBottom &&
            boxBottom > clipTop;

          if (intersects) {
            const cid = el.getAttribute('data-clip-id');
            if (cid) matchedIds.push(cid);
          }
        });

        onSetSelectedClipIds(matchedIds);
      }
    };

    const handleMouseUp = () => {
      setMarquee(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [marquee, onSetSelectedClipIds]);

  return (
    <div
      ref={viewportRef}
      onScroll={onScroll}
      className={`flex-1 overflow-x-auto overflow-y-auto relative select-none kuro-timeline-scroll ${
        activeTool === 'razor' ? 'cursor-crosshair' : ''
      }`}
    >
      <div
        ref={lanesContainerRef}
        onMouseDown={(e) => {
          if (e.button !== 0 || activeTool !== 'select') return;
          const target = e.target as HTMLElement;
          if (
            target.closest('[data-clip-id]') ||
            target.closest('button') ||
            target.closest('[data-trim-handle]') ||
            target.closest('[data-ruler]')
          ) {
            return;
          }

          const container = lanesContainerRef.current;
          if (!container) return;

          const rect = container.getBoundingClientRect();
          const startX = e.clientX - rect.left;
          const startY = e.clientY - rect.top;

          if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
            onClearSelection();
          }

          setMarquee({ startX, startY, currentX: startX, currentY: startY });
        }}
        className="relative"
        style={{ minWidth: `${timelineContentWidthPx}px` }}
      >
        {/* Marquee Drag-Selection Box (Windows style) */}
        {marquee &&
          (Math.abs(marquee.currentX - marquee.startX) > 4 ||
            Math.abs(marquee.currentY - marquee.startY) > 4) && (
            <div
              className="absolute border border-white/80 bg-white/10 rounded-xs pointer-events-none z-50 shadow-md backdrop-blur-[1px]"
              style={{
                left: Math.min(marquee.startX, marquee.currentX),
                top: Math.min(marquee.startY, marquee.currentY),
                width: Math.abs(marquee.currentX - marquee.startX),
                height: Math.abs(marquee.currentY - marquee.startY),
              }}
            />
          )}

        {/* ── Time Ruler (Adaptive Frames, Seconds, Minutes, Hours) ── */}
        <div
          ref={rulerRef}
          data-ruler="true"
          onMouseDown={handleRulerMouseDown}
          className="h-6 bg-[var(--kuro-bg-surface)] border-b border-[var(--kuro-border-subtle)] relative cursor-ew-resize select-none shrink-0 overflow-hidden"
          title="Click or drag to scrub playhead"
        >
          {rulerTicks.map((tick) => (
            <div
              key={tick.key}
              className={`absolute top-0 pointer-events-none ${
                tick.isMajor
                  ? 'bottom-0 border-l border-[var(--kuro-border-base)] text-[9px] font-mono text-[var(--kuro-text-secondary)] pl-1 flex items-center font-medium'
                  : 'bottom-0 h-2 border-l border-[var(--kuro-border-subtle)]/70'
              }`}
              style={{ left: `${tick.leftPx}px` }}
            >
              {tick.isMajor ? tick.label : null}
            </div>
          ))}
        </div>

        {/* ── Draggable Playhead Needle with Formatted Time Badge ── */}
        <div
          className="absolute top-0 bottom-0 w-px bg-[var(--kuro-playhead)] z-50 pointer-events-none"
          style={{ left: `${playheadLeftPx}px` }}
        >
          <div className="w-2.5 h-2.5 bg-[var(--kuro-playhead)] -translate-x-[4px] -translate-y-1 rotate-45 shadow-sm" />
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[var(--kuro-playhead)] text-[var(--kuro-bg-canvas)] font-mono text-[9px] font-bold px-1 rounded-sm shadow whitespace-nowrap">
            {formatHumanDuration(playheadTicks / timelineTimebase)}
          </div>
        </div>

        {/* ── Auto-Add New Video Layer Drop Zone ── */}
        <div
          data-new-track="new_video"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            setIsDragOverNewVideo(true);
          }}
          onDragLeave={() => setIsDragOverNewVideo(false)}
          onDrop={(e) => onNewTrackDrop('video', e)}
          className={`h-8 border-b border-dashed flex items-center justify-center transition-all select-none ${
            isDragOverNewVideo || movingClip?.targetTrackId === 'new_video'
              ? 'bg-white/20 border-white text-white font-bold shadow-inner'
              : 'border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-surface)]/20 text-[var(--kuro-text-muted)] hover:bg-[var(--kuro-bg-hover)] hover:text-[var(--kuro-text-primary)] hover:border-white/50'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[10px] tracking-wider uppercase font-mono">
            <Plus className="w-3 h-3" />
            <span>
              {movingClip?.targetTrackId === 'new_video'
                ? `Release to create V${videoTracksCount + 1} Overlay & place clip here`
                : `+ Drop here to create new Video Layer (V${videoTracksCount + 1} Overlay)`}
            </span>
          </div>
        </div>

        {/* ── Track Clip Lanes in Stacking Order ── */}
        {tracks.map((track) => {
          const sortedClips = [...track.clips].sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);
          const isTrackOver = dragOverTrackId === track.id;
          const isMainVideo = track.id === mainVideoTrack?.id;
          const isMainAudio = track.id === mainAudioTrack?.id;
          const isOverlay = track.kind === 'video' && !isMainVideo;
          const isClipTargetingThisTrack = movingClip?.targetTrackId === track.id;

          return (
            <div
              key={track.id}
              data-track-lane="true"
              data-track-id={track.id}
              data-track-kind={track.kind}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
                setDragOverTrackId(track.id);
              }}
              onDragLeave={() => setDragOverTrackId(null)}
              onDrop={(e) => onTrackDrop(track.id, e)}
              className={`h-14 border-b border-[var(--kuro-border-subtle)] relative transition-colors ${
                isTrackOver || isClipTargetingThisTrack
                  ? 'bg-[var(--kuro-bg-hover)] ring-1 ring-inset ring-white/50'
                  : isMainVideo
                  ? 'bg-[var(--kuro-bg-base)]/60'
                  : isOverlay
                  ? 'bg-[var(--kuro-bg-elevated)]/40'
                  : isMainAudio
                  ? 'bg-[var(--kuro-bg-surface)]/30'
                  : 'bg-[var(--kuro-bg-base)]/20'
              }`}
            >
              {/* Clips Rendered in Track */}
              {sortedClips.map((clip) => {
                const isBeingMoved = movingClip?.clipId === clip.id;
                const isBeingTrimmed = trimmingClip?.clipId === clip.id;
                const isTargetingDifferentTrack = isBeingMoved && movingClip.targetTrackId !== track.id;

                let displayStartTicks = clip.timelineStartTicks;
                let displayDurationTicks = clip.durationTicks;

                if (isBeingMoved) {
                  displayStartTicks = movingClip.currentTicks;
                } else if (isBeingTrimmed) {
                  displayStartTicks = trimmingClip.currentStartTicks;
                  displayDurationTicks = trimmingClip.currentDurationTicks;
                }

                const isSelected = selectedClipIds.includes(clip.id);
                const isClipOver = dragOverClipId === clip.id;
                const asset = assets.find((a) => a.id === clip.assetId);

                if (isTargetingDifferentTrack) {
                  const origLeft = clip.timelineStartTicks * pixelsPerTick;
                  const clipW = Math.max(36, clip.durationTicks * pixelsPerTick);
                  return (
                    <div
                      key={`ghost_${clip.id}`}
                      className="absolute top-1 bottom-1 rounded border border-dashed border-white/40 bg-white/5 text-[10px] flex items-center justify-center text-white/50 font-mono pointer-events-none"
                      style={{ left: `${origLeft}px`, width: `${clipW}px` }}
                    >
                      Moving to Layer
                    </div>
                  );
                }

                return (
                  <TimelineClipItem
                    key={clip.id}
                    clip={clip}
                    track={track}
                    asset={asset}
                    timelineTimebase={timelineTimebase}
                    pixelsPerTick={pixelsPerTick}
                    pixelsPerSecond={pixelsPerSecond}
                    activeTool={activeTool}
                    isSelected={isSelected}
                    isBeingMoved={isBeingMoved}
                    isBeingTrimmed={isBeingTrimmed}
                    isClipOver={isClipOver}
                    displayStartTicks={displayStartTicks}
                    displayDurationTicks={displayDurationTicks}
                    onSelectClip={onSelectClip}
                    onStartMoveClip={onStartMoveClip}
                    onStartTrimClip={onStartTrimClip}
                    onRazorClick={onRazorClick}
                    onClipDropEffect={onClipDropEffect}
                    setDragOverClipId={setDragOverClipId}
                    viewportRef={viewportRef}
                  />
                );
              })}

              {/* Moving Clip Target Preview on this track */}
              {movingClip &&
                movingClip.targetTrackId === track.id &&
                movingClip.originalTrackId !== track.id && (
                  <div
                    className={`absolute top-1 bottom-1 rounded border-2 border-white ring-2 ring-white/50 text-xs font-medium z-40 shadow-2xl flex flex-col justify-between overflow-hidden scale-[1.02] ${
                      track.kind === 'video'
                        ? 'bg-[var(--kuro-track-video)] text-white'
                        : 'bg-[var(--kuro-track-audio)] text-white'
                    }`}
                    style={{
                      left: `${movingClip.currentTicks * pixelsPerTick}px`,
                      width: `${Math.max(36, movingClip.durationTicks * pixelsPerTick)}px`,
                    }}
                  >
                    <div className="px-2 py-0.5 flex items-center justify-between text-[11px] font-bold bg-white text-black">
                      <span className="truncate">Move to {track.name}</span>
                      <span className="font-mono text-[10px]">
                        {formatHumanDuration(movingClip.currentTicks / timelineTimebase)}
                      </span>
                    </div>
                    <div className="px-2 py-0.5 text-[9px] text-white/80 font-mono">
                      Drop to place on this layer
                    </div>
                  </div>
                )}

              {/* Transition Cut Seams & Drop Slots */}
              {sortedClips.map((clipA, i) => {
                const clipB = sortedClips[i + 1];
                if (!clipB) return null;

                const cutTicks = clipA.timelineStartTicks + clipA.durationTicks;
                const cutX = cutTicks * pixelsPerTick;
                const cutId = `${clipA.id}_${clipB.id}`;
                const isCutHovered = dragOverCutId === cutId;

                const existingTrans = transitions.find(
                  (t) => t.outgoingClipId === clipA.id && t.incomingClipId === clipB.id
                );

                if (existingTrans) return null;

                return (
                  <div
                    key={`cut_${cutId}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'copy';
                      setDragOverCutId(cutId);
                    }}
                    onDragLeave={() => setDragOverCutId(null)}
                    onDrop={(e) => onCutDropTransition(clipA.id, clipB.id, e)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onApplyTransition(clipA.id, clipB.id, 'cross-dissolve', 1.0);
                    }}
                    className={`absolute top-0 bottom-0 z-20 flex items-center justify-center cursor-pointer transition-all ${
                      isCutHovered
                        ? 'w-14 -ml-7 bg-white/30 border-2 border-dashed border-white shadow-lg'
                        : 'w-6 -ml-3 hover:bg-white/15'
                    }`}
                    style={{ left: `${cutX}px` }}
                    title="Cut Point: Click or drop transition here"
                  >
                    <div
                      className={`w-0.5 h-full transition ${
                        isCutHovered ? 'bg-white shadow-[0_0_8px_white]' : 'bg-white/40'
                      }`}
                    />
                    <div
                      className={`w-4 h-4 rounded-full border border-white flex items-center justify-center shadow transition-transform ${
                        isCutHovered ? 'scale-125 bg-white text-black' : 'bg-black/80 text-white hover:scale-110'
                      }`}
                    >
                      <Plus className="w-2.5 h-2.5" />
                    </div>
                    {isCutHovered && (
                      <div className="absolute -top-5 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md whitespace-nowrap">
                        + Drop Transition
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Tactile Transition Blocks */}
              {transitions
                .filter((t) => {
                  const hasOut = sortedClips.some((c) => c.id === t.outgoingClipId);
                  const hasIn = sortedClips.some((c) => c.id === t.incomingClipId);
                  return hasOut && hasIn;
                })
                .map((trans) => {
                  const outClip = sortedClips.find((c) => c.id === trans.outgoingClipId);
                  if (!outClip) return null;

                  const cutTicks = outClip.timelineStartTicks + outClip.durationTicks;
                  const transWidth = Math.max(56, trans.durationTicks * pixelsPerTick);
                  const transLeft = cutTicks * pixelsPerTick - transWidth / 2;

                  return (
                    <div
                      key={trans.id}
                      className="absolute top-0.5 bottom-0.5 z-30 rounded-md border-2 border-white text-white flex items-center justify-between px-2 shadow-2xl text-[10px] select-none group cursor-pointer transition hover:scale-[1.02]"
                      style={{
                        left: `${transLeft}px`,
                        width: `${transWidth}px`,
                        backgroundColor: '#0a0a0a',
                        backgroundImage:
                          'repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0, rgba(255,255,255,0.18) 5px, rgba(10,10,10,0.95) 5px, rgba(10,10,10,0.95) 10px)',
                      }}
                      title={`Transition: ${trans.transitionType} (${(
                        trans.durationTicks / timelineTimebase
                      ).toFixed(1)}s)`}
                    >
                      <div className="absolute left-0 top-1 bottom-1 w-1 bg-white rounded-r-sm" />
                      <div className="flex items-center gap-1.5 truncate pointer-events-none z-10">
                        <div className="w-5 h-5 rounded bg-white text-black flex items-center justify-center shrink-0 shadow">
                          <Layers className="w-3 h-3" />
                        </div>
                        <div className="truncate">
                          <span className="font-extrabold uppercase text-[10px] tracking-wider block text-white drop-shadow">
                            {trans.transitionType.replace('-', ' ')}
                          </span>
                          <span className="text-[9px] font-mono text-white/80 block">
                            {(trans.durationTicks / timelineTimebase).toFixed(1)}s
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 z-10">
                        <button
                          onClick={(e) => onRemoveTransition(trans.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded bg-black/80 hover:bg-white hover:text-black border border-white text-white transition shadow"
                          title="Remove Transition"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="absolute right-0 top-1 bottom-1 w-1 bg-white rounded-l-sm" />
                    </div>
                  );
                })}
            </div>
          );
        })}

        {/* ── Auto-Add New Audio Layer Drop Zone ── */}
        <div
          data-new-track="new_audio"
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            setIsDragOverNewAudio(true);
          }}
          onDragLeave={() => setIsDragOverNewAudio(false)}
          onDrop={(e) => onNewTrackDrop('audio', e)}
          className={`h-8 border-b border-dashed flex items-center justify-center transition-all select-none ${
            isDragOverNewAudio || movingClip?.targetTrackId === 'new_audio'
              ? 'bg-white/20 border-white text-white font-bold shadow-inner'
              : 'border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-surface)]/20 text-[var(--kuro-text-muted)] hover:bg-[var(--kuro-bg-hover)] hover:text-[var(--kuro-text-primary)] hover:border-white/50'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[10px] tracking-wider uppercase font-mono">
            <Plus className="w-3 h-3" />
            <span>
              {movingClip?.targetTrackId === 'new_audio'
                ? `Release to create A${audioTracksCount + 1} Audio & place clip here`
                : `+ Drop here to create new Audio Layer (A${audioTracksCount + 1} Audio)`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
