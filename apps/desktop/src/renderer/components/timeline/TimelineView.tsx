import React, { useEffect, useRef, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import {
  SplitClipCommand,
  DeleteClipCommand,
  MuteTrackCommand,
  AddClipCommand,
  AddTransitionCommand,
  ApplyEffectCommand
} from '@kuro/editor-core';
import { layoutStore } from '../../stores/useLayoutStore';
import { generateId } from '@kuro/shared';
import { AssetReference, Clip } from '@kuro/project-format';
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
  ChevronDown,
  Layers,
  Sparkles,
  X
} from 'lucide-react';

export const TimelineView: React.FC = () => {
  const [, setTick] = useState(0);
  const rulerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Drag and Drop State
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [dragOverCutId, setDragOverCutId] = useState<string | null>(null);
  const [dragOverClipId, setDragOverClipId] = useState<string | null>(null);

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

  const handleRemoveTransition = (transId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = {
      ...project,
      transitions: project.transitions.filter((t) => t.id !== transId),
    };
    editorStore.getEditorState().setProject(updated);
  };

  // Helper to place a clip on track without overlapping
  const safelyInsertClip = async (trackId: string, clip: Clip) => {
    const track = project.tracks.find((t) => t.id === trackId);
    if (!track) return;

    let targetStart = clip.timelineStartTicks;
    const clipDuration = clip.durationTicks;

    // Check collision
    const collides = (start: number) => {
      const end = start + clipDuration;
      return track.clips.some((c) => start < c.timelineStartTicks + c.durationTicks && end > c.timelineStartTicks);
    };

    if (collides(targetStart)) {
      // Find nearest empty spot after targetStart
      let maxEnd = 0;
      for (const c of track.clips) {
        const cEnd = c.timelineStartTicks + c.durationTicks;
        if (cEnd > maxEnd) maxEnd = cEnd;
      }
      targetStart = maxEnd;
    }

    const finalClip = { ...clip, timelineStartTicks: targetStart };
    await editorStore.executeCommand(new AddClipCommand(finalClip, trackId));
    timelineStore.selectClip(finalClip.id);
  };

  // Drop on track lane (Assets, Titles, Audio, Transitions)
  const handleTrackDrop = async (trackId: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverTrackId(null);

    const track = project.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const laneRect = e.currentTarget.getBoundingClientRect();
    const dropX = e.clientX - laneRect.left;
    const dropTicks = Math.max(0, Math.round(dropX / pixelsPerTick));

    // 1. Asset Drop from Media Bin
    const assetData = e.dataTransfer.getData('application/kuro-asset');
    if (assetData) {
      try {
        const asset: AssetReference = JSON.parse(assetData);
        const durationTicks = asset.durationTicks || Math.round(5.0 * project.timelineTimebase);
        const newClip: Clip = {
          id: generateId('clip'),
          assetId: asset.id,
          timelineStartTicks: dropTicks,
          durationTicks,
          inPointTicks: 0,
          outPointTicks: durationTicks,
          effects: [],
          audio: asset.type === 'audio' || asset.type === 'video' ? { volume: 1.0 } : undefined,
        };
        await safelyInsertClip(trackId, newClip);
        return;
      } catch {
        // ignore parse error
      }
    }

    // 2. Title Drop from Titles Panel
    const titleData = e.dataTransfer.getData('application/kuro-title');
    if (titleData) {
      try {
        const titlePreset = JSON.parse(titleData);
        const durationTicks = Math.round(4.0 * project.timelineTimebase);
        const newClip: Clip = {
          id: generateId('clip_title'),
          assetId: generateId('asset_title'),
          timelineStartTicks: dropTicks,
          durationTicks,
          inPointTicks: 0,
          outPointTicks: durationTicks,
          effects: [],
        };
        await safelyInsertClip(trackId, newClip);
        return;
      } catch {
        // ignore
      }
    }

    // 3. Audio Drop from Audio Panel
    const audioData = e.dataTransfer.getData('application/kuro-audio');
    if (audioData) {
      try {
        const audioSample = JSON.parse(audioData);
        const durationTicks = Math.round((audioSample.durationSec || 2.0) * project.timelineTimebase);
        const newClip: Clip = {
          id: generateId('clip_audio'),
          assetId: generateId('asset_audio'),
          timelineStartTicks: dropTicks,
          durationTicks,
          inPointTicks: 0,
          outPointTicks: durationTicks,
          audio: { volume: 1.0 },
          effects: [],
        };
        await safelyInsertClip(trackId, newClip);
        return;
      } catch {
        // ignore
      }
    }

    // 4. Transition Drop on Track Lane (Find nearest cut between clips)
    const transitionData = e.dataTransfer.getData('application/kuro-transition');
    if (transitionData) {
      try {
        const transDef = JSON.parse(transitionData);
        if (track.clips.length >= 2) {
          // Sort clips by start time
          const sorted = [...track.clips].sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);
          for (let i = 0; i < sorted.length - 1; i++) {
            const outClip = sorted[i];
            const inClip = sorted[i + 1];
            const cutTicks = outClip.timelineStartTicks + outClip.durationTicks;
            const cutDistTicks = Math.abs(dropTicks - cutTicks);
            const toleranceTicks = Math.round(3.0 * project.timelineTimebase); // 3 second proximity

            if (cutDistTicks < toleranceTicks) {
              const durTicks = Math.round((transDef.durationSec || 1.0) * project.timelineTimebase);
              await editorStore.executeCommand(
                new AddTransitionCommand(transDef.type, outClip.id, inClip.id, durTicks)
              );
              return;
            }
          }
        }
      } catch {
        // ignore
      }
    }
  };

  // Drop transition on exact cut point between adjacent clips
  const handleDropTransitionOnCut = async (
    outgoingClipId: string,
    incomingClipId: string,
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCutId(null);

    const transitionData = e.dataTransfer.getData('application/kuro-transition');
    if (transitionData) {
      try {
        const transDef = JSON.parse(transitionData);
        const durTicks = Math.round((transDef.durationSec || 1.0) * project.timelineTimebase);
        await editorStore.executeCommand(
          new AddTransitionCommand(transDef.type, outgoingClipId, incomingClipId, durTicks)
        );
      } catch {
        // fallback default cross-dissolve
        const durTicks = Math.round(1.0 * project.timelineTimebase);
        await editorStore.executeCommand(
          new AddTransitionCommand('cross-dissolve', outgoingClipId, incomingClipId, durTicks)
        );
      }
    }
  };

  // Drop effect directly onto a clip
  const handleDropEffectOnClip = async (clipId: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverClipId(null);

    const effectData = e.dataTransfer.getData('application/kuro-effect');
    if (effectData) {
      try {
        const fxDef = JSON.parse(effectData);
        await editorStore.executeCommand(
          new ApplyEffectCommand(clipId, {
            effectType: fxDef.effectType,
            enabled: true,
            parameters: { value: fxDef.defaultValue },
          })
        );
      } catch {
        // ignore
      }
    }
  };

  const playheadLeftPx = playheadTicks * pixelsPerTick;

  return (
    <div className="h-full flex flex-col bg-[var(--kuro-timeline-bg)] border-t border-[var(--kuro-border-subtle)] select-none overflow-hidden transition-colors">
      {/* Timeline Controls Toolbar */}
      <div className="h-8 px-3 bg-[var(--kuro-bg-panel)] border-b border-[var(--kuro-border-subtle)] flex items-center justify-between text-xs z-10 shrink-0">
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

        {/* Zoom Slider & Snapping & Collapse */}
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
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-auto flex relative select-none"
      >
        {/* Track Headers (Left sticky sidebar) */}
        <div className="w-40 bg-[var(--kuro-bg-panel)] border-r border-[var(--kuro-border-subtle)] shrink-0 sticky left-0 z-30 shadow-sm">
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
        <div className="flex-1 relative min-w-[2800px]">
          {/* Time Ruler (Interactive Scrubbing) */}
          <div
            ref={rulerRef}
            onMouseDown={handleRulerMouseDown}
            className="h-6 bg-[var(--kuro-bg-surface)] border-b border-[var(--kuro-border-subtle)] relative cursor-ew-resize select-none"
            title="Click or drag to scrub playhead"
          >
            {Array.from({ length: 60 }).map((_, i) => (
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
            className="absolute top-0 bottom-0 w-px bg-[var(--kuro-playhead)] z-40 pointer-events-none"
            style={{ left: `${playheadLeftPx}px` }}
          >
            <div className="w-2.5 h-2.5 bg-[var(--kuro-playhead)] -translate-x-[4px] -translate-y-1 rotate-45 shadow-sm" />
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[var(--kuro-playhead)] text-[var(--kuro-bg-canvas)] font-mono text-[9px] font-bold px-1 rounded-sm shadow">
              {((playheadTicks / project.timelineTimebase)).toFixed(1)}s
            </div>
          </div>

          {/* Tracks Clip Lanes */}
          {project.tracks.map((track) => {
            const sortedClips = [...track.clips].sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);
            const isTrackOver = dragOverTrackId === track.id;

            return (
              <div
                key={track.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'copy';
                  setDragOverTrackId(track.id);
                }}
                onDragLeave={() => {
                  setDragOverTrackId(null);
                }}
                onDrop={(e) => handleTrackDrop(track.id, e)}
                className={`h-16 border-b border-[var(--kuro-border-subtle)] relative transition-colors ${
                  isTrackOver
                    ? 'bg-[var(--kuro-bg-hover)] ring-1 ring-inset ring-white/30'
                    : 'bg-[var(--kuro-bg-base)]/40'
                }`}
              >
                {/* 1. Clips */}
                {sortedClips.map((clip) => {
                  const clipLeft = clip.timelineStartTicks * pixelsPerTick;
                  const clipWidth = Math.max(32, clip.durationTicks * pixelsPerTick);
                  const isSelected = selectedClipIds.includes(clip.id);
                  const isClipOver = dragOverClipId === clip.id;
                  const asset = project.assets.find((a) => a.id === clip.assetId);

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        timelineStore.selectClip(clip.id);
                      }}
                      onDragOver={(e) => {
                        if (e.dataTransfer.types.includes('application/kuro-effect')) {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverClipId(clip.id);
                        }
                      }}
                      onDragLeave={() => setDragOverClipId(null)}
                      onDrop={(e) => handleDropEffectOnClip(clip.id, e)}
                      className={`absolute top-1 bottom-1 rounded-sm border text-xs font-medium cursor-pointer transition select-none flex flex-col justify-between overflow-hidden shadow-sm z-10 ${
                        track.kind === 'video'
                          ? 'bg-[var(--kuro-track-video)] text-[var(--kuro-text-primary)] border-[var(--kuro-border-strong)]'
                          : 'bg-[var(--kuro-track-audio)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-base)]'
                      } ${isSelected ? 'ring-1 ring-white border-white brightness-125' : 'hover:brightness-110'} ${
                        isClipOver ? 'ring-2 ring-white border-white scale-[1.01]' : ''
                      }`}
                      style={{ left: `${clipLeft}px`, width: `${clipWidth}px` }}
                      title={isClipOver ? 'Drop effect here' : `${asset?.name ?? clip.id} (Click to inspect)`}
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
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {clip.effects && clip.effects.length > 0 && (
                            <span className="text-[9px] bg-white/20 px-1 rounded flex items-center gap-0.5 font-mono">
                              <Sparkles className="w-2.5 h-2.5" />
                              {clip.effects.length} FX
                            </span>
                          )}
                          <span className="text-[10px] opacity-75 font-mono">
                            {((clip.durationTicks / project.timelineTimebase)).toFixed(1)}s
                          </span>
                        </div>
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

                {/* 2. Transition Cut Dropzones between Adjacent Clips */}
                {sortedClips.map((clipA, i) => {
                  const clipB = sortedClips[i + 1];
                  if (!clipB) return null;

                  const cutTicks = clipA.timelineStartTicks + clipA.durationTicks;
                  const cutX = cutTicks * pixelsPerTick;
                  const cutId = `${clipA.id}_${clipB.id}`;
                  const isCutHovered = dragOverCutId === cutId;

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
                      onDrop={(e) => handleDropTransitionOnCut(clipA.id, clipB.id, e)}
                      className={`absolute top-0 bottom-0 w-8 -ml-4 z-20 flex items-center justify-center cursor-pointer transition ${
                        isCutHovered
                          ? 'bg-white/25 ring-1 ring-white'
                          : 'hover:bg-white/10'
                      }`}
                      style={{ left: `${cutX}px` }}
                      title="Cut point: Drop transition here"
                    >
                      <div
                        className={`w-0.5 h-full transition ${
                          isCutHovered ? 'bg-white shadow-[0_0_8px_white]' : 'bg-white/25'
                        }`}
                      />
                      {isCutHovered && (
                        <div className="absolute top-1 bg-white text-black text-[9px] font-bold px-1 rounded shadow">
                          Drop Transition
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* 3. Existing Transitions Display on Track */}
                {project.transitions
                  .filter((t) => {
                    const hasOut = sortedClips.some((c) => c.id === t.outgoingClipId);
                    const hasIn = sortedClips.some((c) => c.id === t.incomingClipId);
                    return hasOut && hasIn;
                  })
                  .map((trans) => {
                    const outClip = sortedClips.find((c) => c.id === trans.outgoingClipId);
                    if (!outClip) return null;

                    const cutTicks = outClip.timelineStartTicks + outClip.durationTicks;
                    const transWidth = Math.max(32, trans.durationTicks * pixelsPerTick);
                    const transLeft = cutTicks * pixelsPerTick - transWidth / 2;

                    return (
                      <div
                        key={trans.id}
                        className="absolute top-1.5 bottom-1.5 z-25 rounded border border-white/80 bg-black/90 text-white flex items-center justify-between px-1.5 shadow-lg text-[10px] select-none group"
                        style={{
                          left: `${transLeft}px`,
                          width: `${transWidth}px`,
                          backgroundImage:
                            'repeating-linear-gradient(45deg, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 4px, transparent 4px, transparent 8px)',
                        }}
                        title={`Transition: ${trans.transitionType} (${(
                          trans.durationTicks / project.timelineTimebase
                        ).toFixed(1)}s)`}
                      >
                        <div className="flex items-center gap-1 truncate pointer-events-none">
                          <Layers className="w-3 h-3 text-white shrink-0" />
                          <span className="truncate text-[9px] font-mono capitalize tracking-tight">
                            {trans.transitionType.replace('-', ' ')}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleRemoveTransition(trans.id, e)}
                          className="opacity-0 group-hover:opacity-100 hover:bg-white/20 p-0.5 rounded transition text-white/80 hover:text-white"
                          title="Remove Transition"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
