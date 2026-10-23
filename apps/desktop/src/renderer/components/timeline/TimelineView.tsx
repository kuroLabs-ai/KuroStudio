import React, { useEffect, useRef, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore, TimelineTool } from '../../stores/useTimelineStore';
import {
  SplitClipCommand,
  DeleteClipCommand,
  MuteTrackCommand,
  AddClipCommand,
  TrimClipCommand,
  AddTransitionCommand,
  ApplyEffectCommand,
  MoveClipCommand
} from '@kuro/editor-core';
import { layoutStore } from '../../stores/useLayoutStore';
import { generateId } from '@kuro/shared';
import { AssetReference, Clip, Track, TransitionInstance } from '@kuro/project-format';
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
  X,
  Plus,
  MoveHorizontal,
  MousePointer,
  Gauge,
  Snowflake,
  Unlink,
  FastForward
} from 'lucide-react';

export const TimelineView: React.FC = () => {
  const [, setTick] = useState(0);
  const rulerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Drag and Drop Hover States for Existing Tracks
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [dragOverCutId, setDragOverCutId] = useState<string | null>(null);
  const [dragOverClipId, setDragOverClipId] = useState<string | null>(null);

  // Hover States for "+ New Layer" Drop Zones
  const [isDragOverNewVideo, setIsDragOverNewVideo] = useState(false);
  const [isDragOverNewAudio, setIsDragOverNewAudio] = useState(false);

  // Clip Repositioning (Live Moving across time and across layers) State
  const [movingClip, setMovingClip] = useState<{
    clipId: string;
    originalTrackId: string;
    targetTrackId: string;
    originalTicks: number;
    currentTicks: number;
    startX: number;
    startY: number;
    clipKind: 'video' | 'audio';
    durationTicks: number;
  } | null>(null);

  // Interactive Edge Trimming State (Extending or Compressing Duration)
  const [trimmingClip, setTrimmingClip] = useState<{
    clipId: string;
    trackId: string;
    edge: 'start' | 'end';
    initialStartTicks: number;
    initialDurationTicks: number;
    currentStartTicks: number;
    currentDurationTicks: number;
    startX: number;
  } | null>(null);

  // Razor Blade Hover Guide State
  const [razorHover, setRazorHover] = useState<{
    clipId: string;
    ticks: number;
  } | null>(null);

  // Speed selection dropdown visibility
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

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
  const isPlaying = timelineStore.getIsPlaying();
  const activeTool = timelineStore.getActiveTool();
  const selectedClipIds = timelineStore.getSelectedClipIds();

  // Selected clip object if any
  const selectedClip = React.useMemo(() => {
    if (!selectedClipIds[0]) return null;
    for (const t of project.tracks) {
      const found = t.clips.find((c) => c.id === selectedClipIds[0]);
      if (found) return { clip: found, track: t };
    }
    return null;
  }, [project.tracks, selectedClipIds]);

  // Whether playhead is hovering over any clip that can be split
  const clipUnderPlayhead = React.useMemo(() => {
    for (const t of project.tracks) {
      if (t.hidden || t.locked) continue;
      const found = t.clips.find(
        (c) => playheadTicks > c.timelineStartTicks && playheadTicks < c.timelineStartTicks + c.durationTicks
      );
      if (found) return found;
    }
    return null;
  }, [project.tracks, playheadTicks]);

  const canSplitAtPlayhead = selectedClipIds.length > 0 || !!clipUnderPlayhead;

  // Pixels per second calculation based on zoom
  const basePixelsPerSecond = 50;
  const pixelsPerSecond = basePixelsPerSecond * zoom;
  const pixelsPerTick = pixelsPerSecond / project.timelineTimebase;

  // Track Categorization for NLE Layer Stacking Order:
  const videoTracks = project.tracks.filter((t) => t.kind === 'video');
  const audioTracks = project.tracks.filter((t) => t.kind === 'audio');

  const mainVideoTrack = videoTracks[videoTracks.length - 1] ?? videoTracks[0];
  const mainAudioTrack = audioTracks[0];

  const overlayTracks = videoTracks.filter((t) => t.id !== mainVideoTrack?.id);
  const extraAudioTracks = audioTracks.filter((t) => t.id !== mainAudioTrack?.id);
  const orderedTracks = [
    ...overlayTracks,
    ...(mainVideoTrack ? [mainVideoTrack] : []),
    ...(mainAudioTrack ? [mainAudioTrack] : []),
    ...extraAudioTracks,
  ];

  // Auto-follow playhead during playback
  useEffect(() => {
    if (!isPlaying) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const playheadPx = playheadTicks * pixelsPerTick;
    const HEADER_WIDTH = 176;
    const visibleLeft = container.scrollLeft;
    const visibleWidth = container.clientWidth - HEADER_WIDTH;
    const needleInViewX = playheadPx - visibleLeft;

    if (needleInViewX > visibleWidth - 80 || needleInViewX < 20) {
      container.scrollLeft = Math.max(0, playheadPx - visibleWidth / 3);
    }
  }, [playheadTicks, isPlaying, pixelsPerTick]);

  // Horizontal Wheel Scroll & Zoom Listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        timelineStore.setZoom(Math.max(0.2, Math.min(4.0, timelineStore.getZoom() + delta)));
        return;
      }

      if (Math.abs(e.deltaY) > 0 || Math.abs(e.deltaX) > 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaX !== 0 ? e.deltaX : e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Multi-Layer: Add Video / Overlay Layer on Top
  const handleAddVideoTrack = (): string => {
    const currentProj = editorStore.getProject();
    const existingVideo = currentProj.tracks.filter((t) => t.kind === 'video');
    const newTrackNum = existingVideo.length + 1;
    const newTrack: Track = {
      id: generateId('trk_v'),
      name: `V${newTrackNum} Overlay`,
      kind: 'video',
      order: -newTrackNum,
      muted: false,
      locked: false,
      hidden: false,
      clips: [],
    };

    editorStore.getEditorState().setProject({
      ...currentProj,
      tracks: [newTrack, ...currentProj.tracks],
    });
    return newTrack.id;
  };

  // Multi-Layer: Add Audio Layer at Bottom
  const handleAddAudioTrack = (): string => {
    const currentProj = editorStore.getProject();
    const existingAudio = currentProj.tracks.filter((t) => t.kind === 'audio');
    const newTrackNum = existingAudio.length + 1;
    const newTrack: Track = {
      id: generateId('trk_a'),
      name: `A${newTrackNum} Audio`,
      kind: 'audio',
      order: newTrackNum,
      muted: false,
      locked: false,
      hidden: false,
      clips: [],
    };

    editorStore.getEditorState().setProject({
      ...currentProj,
      tracks: [...currentProj.tracks, newTrack],
    });
    return newTrack.id;
  };

  // Delete Track
  const handleDeleteTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentProj = editorStore.getProject();
    if (currentProj.tracks.length <= 2) return;
    editorStore.getEditorState().setProject({
      ...currentProj,
      tracks: currentProj.tracks.filter((t) => t.id !== trackId),
    });
  };

  // Move Clip Safely Across Tracks & Time
  const moveClipSafely = async (clipId: string, desiredTicks: number, destTrackId: string) => {
    const currentProj = editorStore.getProject();
    let sourceTrack: Track | undefined;
    let clip: Clip | undefined;

    for (const t of currentProj.tracks) {
      const found = t.clips.find((c) => c.id === clipId);
      if (found) {
        clip = found;
        sourceTrack = t;
        break;
      }
    }
    if (!clip || !sourceTrack) return;

    const destTrack = currentProj.tracks.find((t) => t.id === destTrackId);
    if (!destTrack) return;

    let finalTicks = Math.max(0, desiredTicks);
    const otherClips = destTrack.clips.filter((c) => c.id !== clipId);

    const collides = (start: number) => {
      const end = start + clip!.durationTicks;
      return otherClips.some((c) => start < c.timelineStartTicks + c.durationTicks && end > c.timelineStartTicks);
    };

    if (collides(finalTicks)) {
      const collidingClip = otherClips.find(
        (c) => finalTicks < c.timelineStartTicks + c.durationTicks && finalTicks + clip!.durationTicks > c.timelineStartTicks
      );
      if (collidingClip) {
        if (finalTicks >= collidingClip.timelineStartTicks) {
          finalTicks = collidingClip.timelineStartTicks + collidingClip.durationTicks;
        } else {
          finalTicks = Math.max(0, collidingClip.timelineStartTicks - clip.durationTicks);
        }
      }
    }

    const cmd = new MoveClipCommand(clipId, finalTicks, destTrackId);
    const success = await editorStore.executeCommand(cmd);

    if (!success) {
      const movedClip: Clip = {
        ...clip,
        trackId: destTrackId,
        timelineStartTicks: finalTicks,
      };

      const updatedTracks = currentProj.tracks.map((t) => {
        if (t.id === sourceTrack!.id && t.id === destTrackId) {
          const newClips = t.clips
            .map((c) => (c.id === clipId ? movedClip : c))
            .sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);
          return { ...t, clips: newClips };
        }
        if (t.id === sourceTrack!.id) {
          return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
        }
        if (t.id === destTrackId) {
          const newClips = [...t.clips, movedClip].sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);
          return { ...t, clips: newClips };
        }
        return t;
      });

      editorStore.getEditorState().setProject({
        ...currentProj,
        tracks: updatedTracks,
      });
    }

    timelineStore.selectClip(clipId);
  };

  // ─── Interactive Edge Trimming Handler (Extending / Compressing) ───────────
  useEffect(() => {
    if (!trimmingClip) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - trimmingClip.startX;
      const deltaTicks = Math.round(deltaX / pixelsPerTick);

      const track = project.tracks.find((t) => t.id === trimmingClip.trackId);
      const clipIndex = track?.clips.findIndex((c) => c.id === trimmingClip.clipId) ?? -1;
      const prevClip = clipIndex > 0 ? track?.clips[clipIndex - 1] : undefined;
      const nextClip = track && clipIndex < track.clips.length - 1 ? track.clips[clipIndex + 1] : undefined;

      const minDuration = Math.round(project.timelineTimebase * 0.2); // minimum 0.2s

      if (trimmingClip.edge === 'start') {
        let proposedStart = trimmingClip.initialStartTicks + deltaTicks;
        // Limit: cannot make clip shorter than minDuration
        proposedStart = Math.min(
          trimmingClip.initialStartTicks + trimmingClip.initialDurationTicks - minDuration,
          proposedStart
        );
        // Limit: cannot be before tick 0
        proposedStart = Math.max(0, proposedStart);
        // Limit: collision with previous clip on same track
        if (prevClip) {
          const prevEnd = prevClip.timelineStartTicks + prevClip.durationTicks;
          proposedStart = Math.max(prevEnd, proposedStart);
        }

        // Snapping to playhead
        if (timelineStore.getIsSnappingEnabled()) {
          const snapThreshold = Math.round(16 / pixelsPerTick);
          if (Math.abs(proposedStart - playheadTicks) < snapThreshold) {
            proposedStart = playheadTicks;
          }
        }

        const newDuration = trimmingClip.initialDurationTicks - (proposedStart - trimmingClip.initialStartTicks);
        setTrimmingClip((prev) =>
          prev ? { ...prev, currentStartTicks: proposedStart, currentDurationTicks: newDuration } : null
        );
      } else {
        // edge === 'end'
        let proposedDuration = trimmingClip.initialDurationTicks + deltaTicks;
        proposedDuration = Math.max(minDuration, proposedDuration);

        // Limit: collision with next clip on same track
        if (nextClip) {
          const maxEnd = nextClip.timelineStartTicks;
          proposedDuration = Math.min(maxEnd - trimmingClip.initialStartTicks, proposedDuration);
        }

        // Snapping to playhead
        if (timelineStore.getIsSnappingEnabled()) {
          const snapThreshold = Math.round(16 / pixelsPerTick);
          const proposedEnd = trimmingClip.initialStartTicks + proposedDuration;
          if (Math.abs(proposedEnd - playheadTicks) < snapThreshold) {
            proposedDuration = Math.max(minDuration, playheadTicks - trimmingClip.initialStartTicks);
          }
        }

        setTrimmingClip((prev) =>
          prev ? { ...prev, currentDurationTicks: proposedDuration } : null
        );
      }
    };

    const handleMouseUp = async () => {
      if (trimmingClip) {
        const deltaStart = trimmingClip.currentStartTicks - trimmingClip.initialStartTicks;
        const deltaDur = trimmingClip.currentDurationTicks - trimmingClip.initialDurationTicks;

        if (trimmingClip.edge === 'start' && deltaStart !== 0) {
          const cmd = new TrimClipCommand(trimmingClip.clipId, 'start', deltaStart);
          const success = await editorStore.executeCommand(cmd);
          if (!success) {
            const currentProj = editorStore.getProject();
            const updatedTracks = currentProj.tracks.map((t) => {
              if (t.id !== trimmingClip.trackId) return t;
              return {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === trimmingClip.clipId
                    ? {
                        ...c,
                        timelineStartTicks: trimmingClip.currentStartTicks,
                        durationTicks: trimmingClip.currentDurationTicks,
                        sourceInTicks: (c.sourceInTicks ?? 0) + deltaStart,
                        sourceOutTicks: c.sourceOutTicks ?? ((c.sourceInTicks ?? 0) + c.durationTicks),
                      }
                    : c
                ),
              };
            });
            editorStore.getEditorState().setProject({ ...currentProj, tracks: updatedTracks });
          }
        } else if (trimmingClip.edge === 'end' && deltaDur !== 0) {
          const cmd = new TrimClipCommand(trimmingClip.clipId, 'end', deltaDur);
          const success = await editorStore.executeCommand(cmd);
          if (!success) {
            const currentProj = editorStore.getProject();
            const updatedTracks = currentProj.tracks.map((t) => {
              if (t.id !== trimmingClip.trackId) return t;
              return {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === trimmingClip.clipId
                    ? {
                        ...c,
                        durationTicks: trimmingClip.currentDurationTicks,
                        sourceInTicks: c.sourceInTicks ?? 0,
                        sourceOutTicks: (c.sourceOutTicks ?? ((c.sourceInTicks ?? 0) + c.durationTicks)) + deltaDur,
                      }
                    : c
                ),
              };
            });
            editorStore.getEditorState().setProject({ ...currentProj, tracks: updatedTracks });
          }
        }
      }
      setTrimmingClip(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [trimmingClip, pixelsPerTick, playheadTicks, project]);

  // Live Clip Moving Drag Handler
  useEffect(() => {
    if (!movingClip) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = scrollContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const leftZone = rect.left + 176 + 80;
        const rightZone = rect.right - 80;

        if (e.clientX < leftZone) {
          const speed = Math.min(30, Math.max(6, (leftZone - e.clientX) / 2));
          container.scrollLeft -= speed;
        } else if (e.clientX > rightZone) {
          const speed = Math.min(30, Math.max(6, (e.clientX - rightZone) / 2));
          container.scrollLeft += speed;
        }
      }

      const deltaX = e.clientX - movingClip.startX;
      const deltaTicks = Math.round(deltaX / pixelsPerTick);
      let proposed = Math.max(0, movingClip.originalTicks + deltaTicks);

      if (timelineStore.getIsSnappingEnabled()) {
        const snapThresholdTicks = Math.round(16 / pixelsPerTick);
        if (Math.abs(proposed - playheadTicks) < snapThresholdTicks) {
          proposed = playheadTicks;
        } else if (proposed < snapThresholdTicks) {
          proposed = 0;
        } else {
          const targetTrack = project.tracks.find((t) => t.id === movingClip.targetTrackId);
          if (targetTrack) {
            for (const other of targetTrack.clips) {
              if (other.id === movingClip.clipId) continue;
              const otherEnd = other.timelineStartTicks + other.durationTicks;
              if (Math.abs(proposed - otherEnd) < snapThresholdTicks) {
                proposed = otherEnd;
                break;
              }
              const proposedEnd = proposed + movingClip.durationTicks;
              if (Math.abs(proposedEnd - other.timelineStartTicks) < snapThresholdTicks) {
                proposed = Math.max(0, other.timelineStartTicks - movingClip.durationTicks);
                break;
              }
            }
          }
        }
      }

      let resolvedTargetTrackId = movingClip.targetTrackId;
      const elUnder = document.elementFromPoint(e.clientX, e.clientY);
      const newTrackZone = elUnder?.closest('[data-new-track]') as HTMLElement | null;
      const trackLane = elUnder?.closest('[data-track-lane]') as HTMLElement | null;

      if (newTrackZone) {
        const zoneType = newTrackZone.getAttribute('data-new-track');
        if (zoneType === 'new_video' && movingClip.clipKind === 'video') {
          resolvedTargetTrackId = 'new_video';
        } else if (zoneType === 'new_audio' && movingClip.clipKind === 'audio') {
          resolvedTargetTrackId = 'new_audio';
        }
      } else if (trackLane) {
        const laneTrackId = trackLane.getAttribute('data-track-id');
        const laneTrackKind = trackLane.getAttribute('data-track-kind');
        if (laneTrackId && laneTrackKind === movingClip.clipKind) {
          resolvedTargetTrackId = laneTrackId;
        }
      }

      setMovingClip((prev) =>
        prev ? { ...prev, currentTicks: proposed, targetTrackId: resolvedTargetTrackId } : null
      );
    };

    const handleMouseUp = async () => {
      if (movingClip) {
        if (movingClip.targetTrackId === 'new_video') {
          const newTrackId = handleAddVideoTrack();
          await moveClipSafely(movingClip.clipId, movingClip.currentTicks, newTrackId);
        } else if (movingClip.targetTrackId === 'new_audio') {
          const newTrackId = handleAddAudioTrack();
          await moveClipSafely(movingClip.clipId, movingClip.currentTicks, newTrackId);
        } else if (
          movingClip.targetTrackId !== movingClip.originalTrackId ||
          movingClip.currentTicks !== movingClip.originalTicks
        ) {
          await moveClipSafely(movingClip.clipId, movingClip.currentTicks, movingClip.targetTrackId);
        }
      }
      setMovingClip(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [movingClip, pixelsPerTick, playheadTicks, project]);

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

  // ─── Split / Cut Actions ──────────────────────────────────────────────────
  const handleSplitAtPlayhead = async () => {
    let targetClipId = selectedClipIds[0];

    // If no clip selected, target the clip directly under the playhead
    if (!targetClipId) {
      for (const track of project.tracks) {
        if (track.hidden || track.locked) continue;
        const found = track.clips.find(
          (c) => playheadTicks > c.timelineStartTicks && playheadTicks < c.timelineStartTicks + c.durationTicks
        );
        if (found) {
          targetClipId = found.id;
          break;
        }
      }
    }

    if (!targetClipId) return;

    for (const track of project.tracks) {
      const clip = track.clips.find((c) => c.id === targetClipId);
      if (clip) {
        if (playheadTicks > clip.timelineStartTicks && playheadTicks < clip.timelineStartTicks + clip.durationTicks) {
          const cmd = new SplitClipCommand(clip.id, playheadTicks);
          const success = await editorStore.executeCommand(cmd);
          if (success && cmd.createdResult) {
            timelineStore.selectClip(cmd.createdResult.rightClip.id);
          }
        }
        break;
      }
    }
  };

  // Razor Tool Click on Clip to Slice
  const handleRazorClickOnClip = async (clipId: string, clientX: number, e: React.MouseEvent) => {
    if (activeTool !== 'razor') return;
    e.stopPropagation();

    const container = scrollContainerRef.current;
    const HEADER_WIDTH = 176;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const relativeX = clientX - containerRect.left - HEADER_WIDTH + container.scrollLeft;
    const sliceTicks = Math.max(0, Math.round(relativeX / pixelsPerTick));

    for (const track of project.tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip && sliceTicks > clip.timelineStartTicks && sliceTicks < clip.timelineStartTicks + clip.durationTicks) {
        const cmd = new SplitClipCommand(clip.id, sliceTicks);
        const success = await editorStore.executeCommand(cmd);
        if (success && cmd.createdResult) {
          timelineStore.selectClip(cmd.createdResult.rightClip.id);
        }
        setRazorHover(null);
        break;
      }
    }
  };

  // ─── Delete Actions ───────────────────────────────────────────────────────
  const handleDeleteSelected = async () => {
    const activeClipId = selectedClipIds[0];
    if (!activeClipId) return;
    await editorStore.executeCommand(new DeleteClipCommand(activeClipId));
  };

  // Ripple Delete (Closes Gap by pulling subsequent clips backward)
  const handleRippleDelete = async () => {
    const activeClipId = selectedClipIds[0];
    if (!activeClipId) return;

    const currentProj = editorStore.getProject();
    for (const track of currentProj.tracks) {
      const clip = track.clips.find((c) => c.id === activeClipId);
      if (clip) {
        const deletedStart = clip.timelineStartTicks;
        const deletedDuration = clip.durationTicks;

        const remainingClips = track.clips
          .filter((c) => c.id !== activeClipId)
          .map((c) => {
            if (c.timelineStartTicks > deletedStart) {
              return {
                ...c,
                timelineStartTicks: Math.max(deletedStart, c.timelineStartTicks - deletedDuration),
              };
            }
            return c;
          });

        editorStore.getEditorState().setProject({
          ...currentProj,
          tracks: currentProj.tracks.map((t) => (t.id === track.id ? { ...t, clips: remainingClips } : t)),
        });
        timelineStore.clearSelection();
        break;
      }
    }
  };

  // ─── Freeze Frame (Hold Frame 3s) ─────────────────────────────────────────
  const handleFreezeFrame = async () => {
    const currentProj = editorStore.getProject();
    let targetClip: Clip | undefined;
    let targetTrack: Track | undefined;

    for (const t of currentProj.tracks) {
      if (t.kind === 'video') {
        const hit = t.clips.find(
          (c) => playheadTicks >= c.timelineStartTicks && playheadTicks < c.timelineStartTicks + c.durationTicks
        );
        if (hit) {
          targetClip = hit;
          targetTrack = t;
          break;
        }
      }
    }
    if (!targetClip || !targetTrack) return;

    const parentAsset = currentProj.assets.find((a) => a.id === targetClip!.assetId);
    const freezeDurationTicks = Math.round(3.0 * currentProj.timelineTimebase);

    const freezeAssetId = generateId('asset_freeze');
    const freezeAsset: AssetReference = {
      id: freezeAssetId,
      name: `Freeze Frame (${parentAsset?.name || 'Frame'})`,
      type: 'image',
      storageMode: 'linked',
      filePath: parentAsset?.filePath || 'freeze://frame',
      fileSizeBytes: 0,
      durationTicks: freezeDurationTicks,
      thumbnailPath: parentAsset?.thumbnailPath,
      metadata: {
        blobUrl: (parentAsset?.metadata as Record<string, unknown> | undefined)?.['blobUrl'],
        isFreezeFrame: true,
      },
    };

    const firstHalfDuration = playheadTicks - targetClip.timelineStartTicks;
    const secondHalfDuration = targetClip.durationTicks - firstHalfDuration;

    const firstHalf: Clip = {
      ...targetClip,
      durationTicks: firstHalfDuration,
      sourceOutTicks: targetClip.sourceInTicks + firstHalfDuration,
    };

    const freezeClip: Clip = {
      id: generateId('clip_freeze'),
      assetId: freezeAssetId,
      trackId: targetTrack.id,
      timelineStartTicks: playheadTicks,
      durationTicks: freezeDurationTicks,
      sourceInTicks: 0,
      sourceOutTicks: freezeDurationTicks,
      effects: [],
    };

    const secondHalf: Clip = {
      id: generateId('clip'),
      assetId: targetClip.assetId,
      trackId: targetTrack.id,
      timelineStartTicks: playheadTicks + freezeDurationTicks,
      durationTicks: secondHalfDuration,
      sourceInTicks: targetClip.sourceInTicks + firstHalfDuration,
      sourceOutTicks: targetClip.sourceOutTicks,
      audio: targetClip.audio,
      effects: targetClip.effects,
    };

    const updatedClips = targetTrack.clips
      .filter((c) => c.id !== targetClip!.id)
      .map((c) => {
        if (c.timelineStartTicks >= playheadTicks) {
          return { ...c, timelineStartTicks: c.timelineStartTicks + freezeDurationTicks };
        }
        return c;
      });

    const newTrackClips = [
      ...updatedClips,
      firstHalf,
      freezeClip,
      secondHalf,
    ].sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);

    editorStore.getEditorState().setProject({
      ...currentProj,
      assets: [...currentProj.assets, freezeAsset],
      tracks: currentProj.tracks.map((t) => (t.id === targetTrack!.id ? { ...t, clips: newTrackClips } : t)),
    });
  };

  // ─── Detach Audio (Extract Audio from Video onto Audio Track) ──────────────
  const handleDetachAudio = async () => {
    const activeClipId = selectedClipIds[0];
    if (!activeClipId) return;

    const currentProj = editorStore.getProject();
    let videoClip: Clip | undefined;
    let videoTrack: Track | undefined;

    for (const t of currentProj.tracks) {
      if (t.kind === 'video') {
        const found = t.clips.find((c) => c.id === activeClipId);
        if (found) {
          videoClip = found;
          videoTrack = t;
          break;
        }
      }
    }
    if (!videoClip || !videoTrack) return;

    let targetAudioTrack = currentProj.tracks.find((t) => t.kind === 'audio');
    let updatedTracks = [...currentProj.tracks];

    if (!targetAudioTrack) {
      const newAudioTrack: Track = {
        id: generateId('trk_a'),
        name: 'A1 Audio',
        kind: 'audio',
        order: 1,
        muted: false,
        locked: false,
        hidden: false,
        clips: [],
      };
      updatedTracks.push(newAudioTrack);
      targetAudioTrack = newAudioTrack;
    }

    const detachedAudioClip: Clip = {
      id: generateId('clip_audio'),
      assetId: videoClip.assetId,
      trackId: targetAudioTrack.id,
      timelineStartTicks: videoClip.timelineStartTicks,
      durationTicks: videoClip.durationTicks,
      sourceInTicks: videoClip.sourceInTicks,
      sourceOutTicks: videoClip.sourceOutTicks,
      audio: { volume: 1.0 },
      effects: [],
    };

    const updatedVideoClips = videoTrack.clips.map((c) =>
      c.id === videoClip!.id ? { ...c, audio: { volume: 0.0 } } : c
    );

    const finalTracks = updatedTracks.map((t) => {
      if (t.id === videoTrack!.id) return { ...t, clips: updatedVideoClips };
      if (t.id === targetAudioTrack!.id) {
        return {
          ...t,
          clips: [...t.clips, detachedAudioClip].sort((a, b) => a.timelineStartTicks - b.timelineStartTicks),
        };
      }
      return t;
    });

    editorStore.getEditorState().setProject({
      ...currentProj,
      tracks: finalTracks,
    });
  };

  // ─── Speed / Duration Adjuster (0.5x, 1x, 1.5x, 2x) ───────────────────────
  const handleSetClipSpeed = async (speedMultiplier: number) => {
    setShowSpeedMenu(false);
    const activeClipId = selectedClipIds[0];
    if (!activeClipId) return;

    const currentProj = editorStore.getProject();
    for (const track of currentProj.tracks) {
      const clip = track.clips.find((c) => c.id === activeClipId);
      if (clip) {
        const newDurationTicks = Math.max(
          Math.round(currentProj.timelineTimebase * 0.2),
          Math.round(clip.durationTicks / speedMultiplier)
        );
        const updatedClips = track.clips.map((c) =>
          c.id === clip.id ? { ...c, durationTicks: newDurationTicks } : c
        );
        editorStore.getEditorState().setProject({
          ...currentProj,
          tracks: currentProj.tracks.map((t) => (t.id === track.id ? { ...t, clips: updatedClips } : t)),
        });
        break;
      }
    }
  };

  const handleToggleMute = async (trackId: string, currentMuted: boolean) => {
    await editorStore.executeCommand(new MuteTrackCommand(trackId, !currentMuted));
  };

  const handleRemoveTransition = (transId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentProj = editorStore.getProject();
    const updated = {
      ...currentProj,
      transitions: currentProj.transitions.filter((t) => t.id !== transId),
    };
    editorStore.getEditorState().setProject(updated);
  };

  const findAvailableStart = (track: Track, requestedStart: number, duration: number): number => {
    const sorted = [...track.clips].sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);
    let start = Math.max(0, requestedStart);

    let collision = true;
    let guard = 0;
    while (collision && guard < 100) {
      guard++;
      collision = false;
      const end = start + duration;
      for (const c of sorted) {
        const cEnd = c.timelineStartTicks + c.durationTicks;
        if (start < cEnd && end > c.timelineStartTicks) {
          start = cEnd;
          collision = true;
          break;
        }
      }
    }
    return start;
  };

  const safelyInsertClip = async (trackId: string, clip: Clip) => {
    const currentProj = editorStore.getProject();
    const track = currentProj.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const start = findAvailableStart(track, clip.timelineStartTicks, clip.durationTicks);
    const finalClip: Clip = {
      ...clip,
      trackId,
      timelineStartTicks: start,
      sourceInTicks: 0,
      sourceOutTicks: clip.durationTicks,
    };

    const cmd = new AddClipCommand(finalClip, trackId);
    const success = await editorStore.executeCommand(cmd);

    if (!success) {
      const updatedTracks = currentProj.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const newClips = [...t.clips, finalClip].sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);
        return { ...t, clips: newClips };
      });
      editorStore.getEditorState().setProject({
        ...currentProj,
        tracks: updatedTracks,
      });
    }

    timelineStore.selectClip(finalClip.id);
  };

  const handleApplyTransitionBetween = async (
    outgoingClipId: string,
    incomingClipId: string,
    transType: string = 'cross-dissolve',
    durationSec: number = 1.0
  ) => {
    const currentProj = editorStore.getProject();
    const durTicks = Math.max(1, Math.round(durationSec * currentProj.timelineTimebase));

    const cleanTransitions = currentProj.transitions.filter(
      (t) => !(t.outgoingClipId === outgoingClipId && t.incomingClipId === incomingClipId)
    );

    const newTrans: TransitionInstance = {
      id: generateId('trans'),
      transitionType: transType as 'cross-dissolve' | 'fade-to-black' | 'hard-cut',
      durationTicks: durTicks,
      outgoingClipId,
      incomingClipId,
    };

    editorStore.getEditorState().setProject({
      ...currentProj,
      transitions: [...cleanTransitions, newTrans],
    });
  };

  const insertPayloadOntoTrack = async (
    trackId: string,
    dropTicks: number,
    dataTransfer: DataTransfer
  ) => {
    const currentProj = editorStore.getProject();
    const track = currentProj.tracks.find((t) => t.id === trackId);
    if (!track) return;

    let rawAsset = dataTransfer.getData('application/kuro-asset');
    let rawTitle = dataTransfer.getData('application/kuro-title');
    let rawAudio = dataTransfer.getData('application/kuro-audio');
    let rawTrans = dataTransfer.getData('application/kuro-transition');
    let rawEffect = dataTransfer.getData('application/kuro-effect');

    const plainText = dataTransfer.getData('text/plain') || dataTransfer.getData('text');
    if (plainText) {
      try {
        const parsed = JSON.parse(plainText);
        if (parsed.kuroType === 'asset') rawAsset = JSON.stringify(parsed.data);
        else if (parsed.kuroType === 'title') rawTitle = JSON.stringify(parsed.data);
        else if (parsed.kuroType === 'audio') rawAudio = JSON.stringify(parsed.data);
        else if (parsed.kuroType === 'transition') rawTrans = JSON.stringify(parsed.data);
        else if (parsed.kuroType === 'effect') rawEffect = JSON.stringify(parsed.data);
      } catch {
        // Not JSON
      }
    }

    if (dataTransfer.files && dataTransfer.files.length > 0) {
      const file = dataTransfer.files[0];
      const blobUrl = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(file.name);
      const assetId = generateId('asset');
      const durationTicks = Math.round(5.0 * currentProj.timelineTimebase);
      const newAsset: AssetReference = {
        id: assetId,
        name: file.name,
        type: isAudio ? 'audio' : 'video',
        storageMode: 'linked',
        filePath: file.name,
        fileSizeBytes: file.size,
        durationTicks,
        metadata: { blobUrl, mimeType: file.type },
      };
      editorStore.getEditorState().setProject({
        ...currentProj,
        assets: [...currentProj.assets, newAsset],
      });
      rawAsset = JSON.stringify(newAsset);
    }

    if (rawAsset) {
      try {
        const asset: AssetReference = JSON.parse(rawAsset);
        const clipDuration = asset.durationTicks || Math.round(5.0 * currentProj.timelineTimebase);
        const newClip: Clip = {
          id: generateId('clip'),
          assetId: asset.id,
          trackId: track.id,
          timelineStartTicks: dropTicks,
          durationTicks: clipDuration,
          sourceInTicks: 0,
          sourceOutTicks: clipDuration,
          effects: [],
          audio: asset.type === 'audio' || asset.type === 'video' ? { volume: 1.0 } : undefined,
        };
        await safelyInsertClip(track.id, newClip);
        return;
      } catch {
        // ignore
      }
    }

    if (rawTitle) {
      try {
        const titlePreset = JSON.parse(rawTitle);
        const durationTicks = Math.round(4.0 * currentProj.timelineTimebase);
        const assetId = generateId('asset_title');
        const newAsset: AssetReference = {
          id: assetId,
          name: titlePreset.name,
          type: 'video',
          storageMode: 'linked',
          filePath: 'title://' + titlePreset.id,
          fileSizeBytes: 0,
          durationTicks,
          metadata: { isTitle: true, text: titlePreset.defaultText },
        };
        const latestProj = editorStore.getProject();
        editorStore.getEditorState().setProject({
          ...latestProj,
          assets: [...latestProj.assets, newAsset],
        });

        const newClip: Clip = {
          id: generateId('clip_title'),
          assetId,
          trackId: track.id,
          timelineStartTicks: dropTicks,
          durationTicks,
          sourceInTicks: 0,
          sourceOutTicks: durationTicks,
          effects: [],
        };
        await safelyInsertClip(track.id, newClip);
        return;
      } catch {
        // ignore
      }
    }

    if (rawAudio) {
      try {
        const audioSample = JSON.parse(rawAudio);
        const durationTicks = Math.round((audioSample.durationSec || 3.0) * currentProj.timelineTimebase);
        const assetId = generateId('asset_audio');
        const newAsset: AssetReference = {
          id: assetId,
          name: audioSample.name,
          type: 'audio',
          storageMode: 'linked',
          filePath: 'audio://' + audioSample.id,
          fileSizeBytes: 0,
          durationTicks,
          metadata: { isAudioSample: true, synthesizeType: audioSample.synthesizeType },
        };
        const latestProj = editorStore.getProject();
        editorStore.getEditorState().setProject({
          ...latestProj,
          assets: [...latestProj.assets, newAsset],
        });

        const newClip: Clip = {
          id: generateId('clip_audio'),
          assetId,
          trackId: track.id,
          timelineStartTicks: dropTicks,
          durationTicks,
          sourceInTicks: 0,
          sourceOutTicks: durationTicks,
          audio: { volume: 1.0 },
          effects: [],
        };
        await safelyInsertClip(track.id, newClip);
        return;
      } catch {
        // ignore
      }
    }

    if (rawTrans) {
      try {
        const transDef = JSON.parse(rawTrans);
        if (track.clips.length >= 2) {
          const sorted = [...track.clips].sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);
          let closestDist = Infinity;
          let bestCut: [string, string] | null = null;

          for (let i = 0; i < sorted.length - 1; i++) {
            const outClip = sorted[i];
            const inClip = sorted[i + 1];
            const cutTicks = outClip.timelineStartTicks + outClip.durationTicks;
            const dist = Math.abs(dropTicks - cutTicks);
            if (dist < closestDist) {
              closestDist = dist;
              bestCut = [outClip.id, inClip.id];
            }
          }

          if (bestCut) {
            await handleApplyTransitionBetween(bestCut[0], bestCut[1], transDef.type, transDef.durationSec || 1.0);
            return;
          }
        }
      } catch {
        // ignore
      }
    }
  };

  const handleTrackDrop = async (trackId: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTrackId(null);

    const container = scrollContainerRef.current;
    const HEADER_WIDTH = 176;
    let dropTicks = 0;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const relativeX = e.clientX - containerRect.left - HEADER_WIDTH + container.scrollLeft;
      dropTicks = Math.max(0, Math.round(relativeX / pixelsPerTick));
    } else {
      const laneRect = e.currentTarget.getBoundingClientRect();
      dropTicks = Math.max(0, Math.round((e.clientX - laneRect.left) / pixelsPerTick));
    }

    await insertPayloadOntoTrack(trackId, dropTicks, e.dataTransfer);
  };

  const handleDropOnNewTrack = async (kind: 'video' | 'audio', e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverNewVideo(false);
    setIsDragOverNewAudio(false);

    const container = scrollContainerRef.current;
    const HEADER_WIDTH = 176;
    let dropTicks = 0;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const relativeX = e.clientX - containerRect.left - HEADER_WIDTH + container.scrollLeft;
      dropTicks = Math.max(0, Math.round(relativeX / pixelsPerTick));
    }

    let newTrackId = '';
    if (kind === 'video') {
      newTrackId = handleAddVideoTrack();
    } else {
      newTrackId = handleAddAudioTrack();
    }

    await insertPayloadOntoTrack(newTrackId, dropTicks, e.dataTransfer);
  };

  const handleDropTransitionOnCut = async (
    outgoingClipId: string,
    incomingClipId: string,
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCutId(null);

    let rawTrans = e.dataTransfer.getData('application/kuro-transition');
    const plainText = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
    if (plainText) {
      try {
        const parsed = JSON.parse(plainText);
        if (parsed.kuroType === 'transition') rawTrans = JSON.stringify(parsed.data);
      } catch {
        // ignore
      }
    }

    let transType = 'cross-dissolve';
    let durationSec = 1.0;

    if (rawTrans) {
      try {
        const transDef = JSON.parse(rawTrans);
        if (transDef.type) transType = transDef.type;
        if (transDef.durationSec) durationSec = transDef.durationSec;
      } catch {
        // fallback
      }
    }

    await handleApplyTransitionBetween(outgoingClipId, incomingClipId, transType, durationSec);
  };

  const handleDropEffectOnClip = async (clipId: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverClipId(null);

    let rawEffect = e.dataTransfer.getData('application/kuro-effect');
    const plainText = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
    if (plainText) {
      try {
        const parsed = JSON.parse(plainText);
        if (parsed.kuroType === 'effect') rawEffect = JSON.stringify(parsed.data);
      } catch {
        // ignore
      }
    }

    if (rawEffect) {
      try {
        const fxDef = JSON.parse(rawEffect);
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
      {/* ─── Comprehensive Professional NLE Toolbar ─── */}
      <div className="h-9 px-3 bg-[var(--kuro-bg-panel)] border-b border-[var(--kuro-border-subtle)] flex items-center justify-between text-xs z-20 shrink-0">
        <div className="flex items-center gap-1">
          {/* Tool Selector: Selection (V) vs Razor (C) */}
          <div className="flex items-center bg-[var(--kuro-bg-surface)] p-0.5 rounded border border-[var(--kuro-border-subtle)] gap-0.5 mr-1">
            <button
              onClick={() => timelineStore.setActiveTool('select')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition ${
                activeTool === 'select'
                  ? 'bg-[var(--kuro-text-primary)] text-[var(--kuro-bg-canvas)] shadow-xs'
                  : 'text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)]'
              }`}
              title="Selection Tool (V) - Select and drag clips"
            >
              <MousePointer className="w-3 h-3" />
              <span>Select (V)</span>
            </button>

            <button
              onClick={() => timelineStore.setActiveTool('razor')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition ${
                activeTool === 'razor'
                  ? 'bg-[var(--kuro-text-primary)] text-[var(--kuro-bg-canvas)] shadow-xs'
                  : 'text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)]'
              }`}
              title="Razor / Blade Tool (C) - Click on any clip to slice"
            >
              <Scissors className="w-3 h-3" />
              <span>Razor (C)</span>
            </button>
          </div>

          <div className="h-3.5 w-px bg-[var(--kuro-border-base)] mx-1" />

          {/* Split at Playhead */}
          <button
            onClick={handleSplitAtPlayhead}
            disabled={!canSplitAtPlayhead}
            className="kuro-btn kuro-btn-secondary px-2 py-0.5 text-[11px] font-medium flex items-center gap-1 disabled:opacity-30"
            title="Split at Playhead (Ctrl+K)"
          >
            <Scissors className="w-3 h-3" />
            <span>Split</span>
          </button>

          {/* Ripple Delete (Closes Gap) */}
          <button
            onClick={handleRippleDelete}
            disabled={selectedClipIds.length === 0}
            className="kuro-btn kuro-btn-secondary px-2 py-0.5 text-[11px] font-medium flex items-center gap-1 disabled:opacity-30"
            title="Ripple Delete (Shift+Delete) - Remove clip & close gap"
          >
            <Trash2 className="w-3 h-3" />
            <span>Ripple Del</span>
          </button>

          {/* Standard Delete */}
          <button
            onClick={handleDeleteSelected}
            disabled={selectedClipIds.length === 0}
            className="kuro-btn kuro-btn-secondary px-2 py-0.5 text-[11px] font-medium flex items-center gap-1 disabled:opacity-30"
            title="Delete Selected Clip (Delete) - Leaves gap"
          >
            <Trash2 className="w-3 h-3 opacity-60" />
            <span>Delete</span>
          </button>

          <div className="h-3.5 w-px bg-[var(--kuro-border-base)] mx-1" />

          {/* Detach Audio (Extract Audio from Video) */}
          <button
            onClick={handleDetachAudio}
            disabled={!selectedClip || selectedClip.track.kind !== 'video'}
            className="kuro-btn kuro-btn-secondary px-2 py-0.5 text-[11px] font-medium flex items-center gap-1 disabled:opacity-30"
            title="Detach Audio - Extract audio into a separate audio track"
          >
            <Unlink className="w-3 h-3" />
            <span>Detach Audio</span>
          </button>

          {/* Freeze Frame (Hold Frame 3s) */}
          <button
            onClick={handleFreezeFrame}
            className="kuro-btn kuro-btn-secondary px-2 py-0.5 text-[11px] font-medium flex items-center gap-1"
            title="Freeze Frame - Insert 3s still frame at playhead"
          >
            <Snowflake className="w-3 h-3" />
            <span>Freeze</span>
          </button>

          {/* Speed / Duration Quick-Setter */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              disabled={selectedClipIds.length === 0}
              className="kuro-btn kuro-btn-secondary px-2 py-0.5 text-[11px] font-medium flex items-center gap-1 disabled:opacity-30"
              title="Adjust Clip Speed / Duration"
            >
              <Gauge className="w-3 h-3" />
              <span>Speed</span>
            </button>

            {showSpeedMenu && selectedClip && (
              <div className="absolute top-7 left-0 bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-base)] rounded shadow-2xl p-1 z-50 flex flex-col gap-0.5 w-24">
                {[0.5, 1.0, 1.5, 2.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSetClipSpeed(s)}
                    className="px-2 py-1 text-left text-[11px] rounded hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-primary)] font-mono"
                  >
                    {s}x {s === 0.5 ? 'Slow' : s === 1.0 ? 'Normal' : 'Fast'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Snapping, Zoom & Collapse Toolbar Section */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => timelineStore.toggleSnapping()}
            className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition ${
              timelineStore.getIsSnappingEnabled()
                ? 'bg-[var(--kuro-text-primary)] text-[var(--kuro-bg-canvas)] font-bold'
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
        className={`flex-1 overflow-x-auto overflow-y-auto flex relative select-none kuro-timeline-scroll ${
          activeTool === 'razor' ? 'cursor-crosshair' : ''
        }`}
      >
        {/* Track Headers (Left sticky sidebar) */}
        <div className="w-44 bg-[var(--kuro-bg-panel)] border-r border-[var(--kuro-border-subtle)] shrink-0 sticky left-0 z-40 shadow-sm flex flex-col">
          <div className="h-6 border-b border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-canvas)] px-2 flex items-center justify-between text-[9px] text-[var(--kuro-text-muted)] font-mono uppercase tracking-wider shrink-0">
            <span>LAYERS ({project.tracks.length})</span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleAddVideoTrack}
                className="px-1.5 py-0.5 rounded bg-[var(--kuro-bg-elevated)] hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] text-[9px] font-bold flex items-center gap-0.5 transition"
                title="Add Video / Overlay Layer on Top"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>+V</span>
              </button>
              <button
                onClick={handleAddAudioTrack}
                className="px-1.5 py-0.5 rounded bg-[var(--kuro-bg-elevated)] hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] text-[9px] font-bold flex items-center gap-0.5 transition"
                title="Add Audio Track at Bottom"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>+A</span>
              </button>
            </div>
          </div>

          {/* New Video Layer Header Zone */}
          <div className="h-8 px-2 border-b border-dashed border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-surface)]/30 flex items-center justify-between text-[9px] font-mono text-[var(--kuro-text-muted)] shrink-0">
            <span className="flex items-center gap-1 text-[var(--kuro-text-secondary)] font-semibold">
              <Plus className="w-2.5 h-2.5" />
              NEW VIDEO
            </span>
            <button
              onClick={handleAddVideoTrack}
              className="px-1 py-0.2 rounded bg-[var(--kuro-bg-elevated)] hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] text-[8px] font-bold"
              title="Add Video Track on Top"
            >
              +V
            </button>
          </div>

          {/* Track Headers in Stacking Order */}
          {orderedTracks.map((track) => {
            const isMainVideo = track.id === mainVideoTrack?.id;
            const isMainAudio = track.id === mainAudioTrack?.id;
            const isOverlay = track.kind === 'video' && !isMainVideo;
            const isExtraAudio = track.kind === 'audio' && !isMainAudio;
            const isCustomTrack = isOverlay || isExtraAudio;

            const trackLabel = isMainVideo
              ? 'V1: Main Video'
              : isMainAudio
              ? 'A1: Main Audio'
              : isOverlay
              ? `V${videoTracks.length - videoTracks.indexOf(track)}: Overlay`
              : `A${audioTracks.indexOf(track) + 1}: Audio`;

            const subLabel = isMainVideo
              ? 'Media & Photos'
              : isOverlay
              ? 'Titles / Overlay'
              : `${track.clips.length} clip${track.clips.length !== 1 ? 's' : ''}`;

            return (
              <div
                key={track.id}
                className={`h-14 px-2 border-b border-[var(--kuro-border-subtle)] flex items-center justify-between text-xs font-medium transition-colors group shrink-0 ${
                  isMainVideo
                    ? 'bg-[var(--kuro-bg-panel)]'
                    : isMainAudio
                    ? 'bg-[var(--kuro-bg-surface)]'
                    : isOverlay
                    ? 'bg-[var(--kuro-bg-elevated)]'
                    : 'bg-[var(--kuro-bg-base)]'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate min-w-0">
                  <div
                    className={`w-0.5 self-stretch rounded-full shrink-0 ${
                      isOverlay
                        ? 'bg-white/60'
                        : isMainVideo
                        ? 'bg-white'
                        : isMainAudio
                        ? 'bg-white/40'
                        : 'bg-white/20'
                    }`}
                  />
                  <div className="w-5 h-5 rounded-sm bg-[var(--kuro-bg-canvas)] text-[var(--kuro-text-secondary)] flex items-center justify-center shrink-0 border border-[var(--kuro-border-subtle)]">
                    {track.kind === 'video' ? <Video className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                  </div>
                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span
                        className={`truncate text-[11px] font-semibold block ${
                          isMainVideo || isMainAudio
                            ? 'text-[var(--kuro-text-primary)]'
                            : 'text-[var(--kuro-text-secondary)]'
                        }`}
                      >
                        {trackLabel}
                      </span>
                      {(isMainVideo || isMainAudio) && (
                        <span className="text-[8px] bg-white text-black font-black px-1 rounded tracking-tighter shadow-xs shrink-0">
                          MAIN
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-[var(--kuro-text-muted)] font-mono block truncate">
                      {subLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isCustomTrack && (
                    <button
                      onClick={(e) => handleDeleteTrack(track.id, e)}
                      className="p-1 rounded text-[var(--kuro-text-muted)] hover:text-white hover:bg-[var(--kuro-bg-hover)] opacity-0 group-hover:opacity-100 transition"
                      title="Remove this layer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}

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
              </div>
            );
          })}

          {/* New Audio Layer Header Zone */}
          <div className="h-8 px-2 border-b border-dashed border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-surface)]/30 flex items-center justify-between text-[9px] font-mono text-[var(--kuro-text-muted)] shrink-0">
            <span className="flex items-center gap-1 text-[var(--kuro-text-secondary)] font-semibold">
              <Plus className="w-2.5 h-2.5" />
              NEW AUDIO
            </span>
            <button
              onClick={handleAddAudioTrack}
              className="px-1 py-0.2 rounded bg-[var(--kuro-bg-elevated)] hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] text-[8px] font-bold"
              title="Add Audio Track at Bottom"
            >
              +A
            </button>
          </div>
        </div>

        {/* Tracks Content & Time Ruler */}
        <div className="flex-1 relative min-w-[3200px]">
          {/* Time Ruler */}
          <div
            ref={rulerRef}
            onMouseDown={handleRulerMouseDown}
            className="h-6 bg-[var(--kuro-bg-surface)] border-b border-[var(--kuro-border-subtle)] relative cursor-ew-resize select-none shrink-0"
            title="Click or drag to scrub playhead"
          >
            {Array.from({ length: 70 }).map((_, i) => (
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
            className="absolute top-0 bottom-0 w-px bg-[var(--kuro-playhead)] z-50 pointer-events-none"
            style={{ left: `${playheadLeftPx}px` }}
          >
            <div className="w-2.5 h-2.5 bg-[var(--kuro-playhead)] -translate-x-[4px] -translate-y-1 rotate-45 shadow-sm" />
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[var(--kuro-playhead)] text-[var(--kuro-bg-canvas)] font-mono text-[9px] font-bold px-1 rounded-sm shadow">
              {(playheadTicks / project.timelineTimebase).toFixed(1)}s
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
            onDrop={(e) => handleDropOnNewTrack('video', e)}
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
                  ? `Release to create V${videoTracks.length + 1} Overlay & place clip here`
                  : `+ Drop here to create new Video Layer (V${videoTracks.length + 1} Overlay)`}
              </span>
            </div>
          </div>

          {/* ── Track Clip Lanes in Stacking Order ── */}
          {orderedTracks.map((track) => {
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

                  const container = scrollContainerRef.current;
                  if (container) {
                    const rect = container.getBoundingClientRect();
                    const leftZone = rect.left + 176 + 80;
                    const rightZone = rect.right - 80;

                    if (e.clientX < leftZone) {
                      container.scrollLeft -= 18;
                    } else if (e.clientX > rightZone) {
                      container.scrollLeft += 18;
                    }
                  }
                }}
                onDragLeave={() => {
                  setDragOverTrackId(null);
                }}
                onDrop={(e) => handleTrackDrop(track.id, e)}
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

                  // Compute active display coordinates for moving or trimming
                  let displayStartTicks = clip.timelineStartTicks;
                  let displayDurationTicks = clip.durationTicks;

                  if (isBeingMoved) {
                    displayStartTicks = movingClip.currentTicks;
                  } else if (isBeingTrimmed) {
                    displayStartTicks = trimmingClip.currentStartTicks;
                    displayDurationTicks = trimmingClip.currentDurationTicks;
                  }

                  const clipLeft = displayStartTicks * pixelsPerTick;
                  const clipWidth = Math.max(36, displayDurationTicks * pixelsPerTick);
                  const isSelected = selectedClipIds.includes(clip.id);
                  const isClipOver = dragOverClipId === clip.id;
                  const asset = project.assets.find((a) => a.id === clip.assetId);

                  if (isTargetingDifferentTrack) {
                    const origLeft = clip.timelineStartTicks * pixelsPerTick;
                    return (
                      <div
                        key={`ghost_${clip.id}`}
                        className="absolute top-1 bottom-1 rounded border border-dashed border-white/40 bg-white/5 text-[10px] flex items-center justify-center text-white/50 font-mono pointer-events-none"
                        style={{ left: `${origLeft}px`, width: `${clipWidth}px` }}
                      >
                        Moving to Layer
                      </div>
                    );
                  }

                  return (
                    <div
                      key={clip.id}
                      onMouseDown={(e) => {
                        if (activeTool === 'razor') return;
                        e.stopPropagation();
                        timelineStore.selectClip(clip.id);
                        setMovingClip({
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
                          handleRazorClickOnClip(clip.id, e.clientX, e);
                        }
                      }}
                      onMouseMove={(e) => {
                        if (activeTool === 'razor') {
                          const container = scrollContainerRef.current;
                          const HEADER_WIDTH = 176;
                          if (container) {
                            const rect = container.getBoundingClientRect();
                            const relX = e.clientX - rect.left - HEADER_WIDTH + container.scrollLeft;
                            const ticks = Math.max(0, Math.round(relX / pixelsPerTick));
                            setRazorHover({ clipId: clip.id, ticks });
                          }
                        }
                      }}
                      onMouseLeave={() => {
                        if (activeTool === 'razor') setRazorHover(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'copy';
                        setDragOverClipId(clip.id);
                      }}
                      onDragLeave={() => setDragOverClipId(null)}
                      onDrop={(e) => handleDropEffectOnClip(clip.id, e)}
                      className={`absolute top-1 bottom-1 rounded border text-xs font-medium transition-all select-none flex flex-col justify-between overflow-hidden shadow-sm z-10 ${
                        activeTool === 'razor'
                          ? 'cursor-crosshair'
                          : 'cursor-grab active:cursor-grabbing'
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
                          : `${asset?.name ?? clip.id} (Drag edges to extend/compress, drag center to move)`
                      }
                    >
                      {/* ── Left Edge Interactive Trim Handle (Trim In) ── */}
                      {activeTool === 'select' && (
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            timelineStore.selectClip(clip.id);
                            setTrimmingClip({
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
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            timelineStore.selectClip(clip.id);
                            setTrimmingClip({
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

                      {/* Live Trimming Tooltip Badge */}
                      {isBeingTrimmed && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white text-black font-mono font-bold text-[9px] px-2 py-0.5 rounded shadow-2xl z-50 whitespace-nowrap">
                          {trimmingClip.edge === 'start' ? 'Trim In: ' : 'Trim Out: '}
                          {(displayDurationTicks / project.timelineTimebase).toFixed(2)}s
                        </div>
                      )}

                      {/* Razor Tool Hover Cut Line & Badge */}
                      {activeTool === 'razor' && razorHover?.clipId === clip.id && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-400 shadow-[0_0_8px_red] z-50 pointer-events-none"
                          style={{
                            left: `${(razorHover.ticks - displayStartTicks) * pixelsPerTick}px`,
                          }}
                        >
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-red-500 text-white font-bold text-[8px] px-1 rounded shadow whitespace-nowrap">
                            ✂ Cut
                          </div>
                        </div>
                      )}

                      {/* Background Thumbnail if video */}
                      {asset?.thumbnailPath && (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none filter grayscale"
                          style={{ backgroundImage: `url(${asset.thumbnailPath})` }}
                        />
                      )}

                      <div className="relative z-10 px-2 py-0.5 flex items-center justify-between text-[11px] truncate font-medium bg-black/60 pointer-events-none">
                        <div className="flex items-center gap-1 truncate">
                          <MoveHorizontal className="w-2.5 h-2.5 opacity-60 shrink-0" />
                          <span className="truncate font-semibold">{asset?.name ?? clip.id}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          {clip.effects && clip.effects.length > 0 && (
                            <span className="text-[9px] bg-white text-black font-bold px-1 rounded flex items-center gap-0.5 font-mono">
                              <Sparkles className="w-2.5 h-2.5" />
                              {clip.effects.length} FX
                            </span>
                          )}
                          <span className="text-[10px] opacity-75 font-mono">
                            {(displayDurationTicks / project.timelineTimebase).toFixed(1)}s
                          </span>
                        </div>
                      </div>

                      {/* Rhythm / Waveform Bars */}
                      <div className="relative z-10 h-2 px-2 flex items-end gap-0.5 opacity-35 pointer-events-none">
                        {Array.from({ length: Math.min(30, Math.floor(clipWidth / 8)) }).map((_, idx) => (
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
                          {(movingClip.currentTicks / project.timelineTimebase).toFixed(1)}s
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

                  const existingTrans = project.transitions.find(
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
                      onDrop={(e) => handleDropTransitionOnCut(clipA.id, clipB.id, e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyTransitionBetween(clipA.id, clipB.id, 'cross-dissolve', 1.0);
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
                          trans.durationTicks / project.timelineTimebase
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
                              {(trans.durationTicks / project.timelineTimebase).toFixed(1)}s
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 z-10">
                          <button
                            onClick={(e) => handleRemoveTransition(trans.id, e)}
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
            onDrop={(e) => handleDropOnNewTrack('audio', e)}
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
                  ? `Release to create A${audioTracks.length + 1} Audio & place clip here`
                  : `+ Drop here to create new Audio Layer (A${audioTracks.length + 1} Audio)`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
