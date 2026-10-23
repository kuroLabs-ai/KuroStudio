import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
  ChevronDown,
  Plus,
  MousePointer,
  Gauge,
  Snowflake,
  Unlink,
  FastForward,
  MoveVertical
} from 'lucide-react';
import { TimelineTrackHeaders } from './TimelineTrackHeaders';
import { TimelineViewport } from './TimelineViewport';

export const TimelineView: React.FC = () => {
  const [, setTick] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

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
  const movingClipRef = useRef<typeof movingClip>(null);
  useEffect(() => { movingClipRef.current = movingClip; }, [movingClip]);

  // Interactive Edge Trimming State (Extending or Compressing Duration)
  // Track Height Resizing State (Extending Layer in Y)
  const [resizingTrack, setResizingTrack] = useState<{
    trackId: string;
    startY: number;
    initialHeight: number;
  } | null>(null);

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
  const trimmingClipRef = useRef<typeof trimmingClip>(null);
  useEffect(() => { trimmingClipRef.current = trimmingClip; }, [trimmingClip]);


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

  const totalProjectTicks = useMemo(() => {
    return project.tracks.reduce(
      (max, t) => t.clips.reduce((m, c) => Math.max(m, c.timelineStartTicks + c.durationTicks), max),
      0
    );
  }, [project.tracks]);

  const totalDurationSec = totalProjectTicks / project.timelineTimebase;
  const fps = Math.round(project.fpsNumerator / project.fpsDenominator) || 30;

  // ─── Adaptive Time Ruler Config (Frames, Seconds, Minutes based on Zoom) ───
  const rulerTicks = useMemo(() => {
    const maxSec = Math.max(300, totalDurationSec + 120);
    let majorIntervalSec = 5;
    let minorIntervalSec = 1;
    let formatTick = (sec: number) => `${sec}s`;

    if (pixelsPerSecond >= 250) {
      // Extreme zoom in: show frames! (e.g. 5f or 10f)
      const frameStep = fps <= 30 ? 5 : 10;
      majorIntervalSec = frameStep / fps;
      minorIntervalSec = 1 / fps;
      formatTick = (sec: number) => {
        const totalFrames = Math.round(sec * fps);
        const s = Math.floor(totalFrames / fps);
        const f = totalFrames % fps;
        return f === 0 ? `${s}s` : `${f}f`;
      };
    } else if (pixelsPerSecond >= 90) {
      // Zoom in: 1s major, 0.25s minor
      majorIntervalSec = 1;
      minorIntervalSec = 0.25;
      formatTick = (sec: number) => `${sec}s`;
    } else if (pixelsPerSecond >= 40) {
      // Normal: 2s major, 1s minor
      majorIntervalSec = 2;
      minorIntervalSec = 1;
      formatTick = (sec: number) => `${sec}s`;
    } else if (pixelsPerSecond >= 20) {
      // Zoom out: 5s major, 1s minor
      majorIntervalSec = 5;
      minorIntervalSec = 1;
      formatTick = (sec: number) => `${sec}s`;
    } else if (pixelsPerSecond >= 10) {
      // Zoom out more: 15s major
      majorIntervalSec = 15;
      minorIntervalSec = 5;
      formatTick = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = Math.round(sec % 60);
        return m > 0 ? (s === 0 ? `${m}m` : `${m}m${s}s`) : `${s}s`;
      };
    } else {
      // Ultra zoom out: 60s (1m) or 120s (2m)
      majorIntervalSec = 60;
      minorIntervalSec = 15;
      formatTick = (sec: number) => {
        const m = Math.floor(sec / 60);
        return `${m}m`;
      };
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
  }, [pixelsPerSecond, totalDurationSec, fps]);

  const timelineContentWidthPx = Math.max(3600, (totalDurationSec + 120) * pixelsPerSecond);

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
    const container = viewportRef.current;
    if (!container) return;

    const playheadPx = playheadTicks * pixelsPerTick;
    const visibleLeft = container.scrollLeft;
    const visibleWidth = container.clientWidth;
    const needleInViewX = playheadPx - visibleLeft;

    if (needleInViewX > visibleWidth - 80 || needleInViewX < 20) {
      container.scrollLeft = Math.max(0, playheadPx - visibleWidth / 3);
    }
  }, [playheadTicks, isPlaying, pixelsPerTick]);

  // Horizontal Wheel Scroll & Zoom Listener
  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        timelineStore.setZoom(Math.max(0.02, Math.min(6.0, timelineStore.getZoom() + delta)));
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

  // ─── Interactive Track Height (Y) Resizing Listener ───────────────────────
  useEffect(() => {
    if (!resizingTrack) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizingTrack.startY;
      const newHeight = Math.max(48, Math.min(240, resizingTrack.initialHeight + deltaY));
      timelineStore.setTrackHeight(resizingTrack.trackId, newHeight);
    };

    const handleMouseUp = () => {
      setResizingTrack(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingTrack]);

  const handleStartResizeTrack = (trackId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingTrack({
      trackId,
      startY: e.clientY,
      initialHeight: timelineStore.getTrackHeight(trackId),
    });
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
      const tc = trimmingClipRef.current;
      if (tc) {
        const deltaStart = tc.currentStartTicks - tc.initialStartTicks;
        const deltaDur = tc.currentDurationTicks - tc.initialDurationTicks;

        if (tc.edge === 'start' && deltaStart !== 0) {
          const cmd = new TrimClipCommand(tc.clipId, 'start', deltaStart);
          const success = await editorStore.executeCommand(cmd);
          if (!success) {
            const currentProj = editorStore.getProject();
            const updatedTracks = currentProj.tracks.map((t) => {
              if (t.id !== tc.trackId) return t;
              return {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === tc.clipId
                    ? {
                        ...c,
                        timelineStartTicks: tc.currentStartTicks,
                        durationTicks: tc.currentDurationTicks,
                        sourceInTicks: (c.sourceInTicks ?? 0) + deltaStart,
                        sourceOutTicks: c.sourceOutTicks ?? ((c.sourceInTicks ?? 0) + c.durationTicks),
                      }
                    : c
                ),
              };
            });
            editorStore.getEditorState().setProject({ ...currentProj, tracks: updatedTracks });
          }
        } else if (tc.edge === 'end' && deltaDur !== 0) {
          const cmd = new TrimClipCommand(tc.clipId, 'end', deltaDur);
          const success = await editorStore.executeCommand(cmd);
          if (!success) {
            const currentProj = editorStore.getProject();
            const updatedTracks = currentProj.tracks.map((t) => {
              if (t.id !== tc.trackId) return t;
              return {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === tc.clipId
                    ? {
                        ...c,
                        durationTicks: tc.currentDurationTicks,
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
      const container = viewportRef.current;
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
      const mc = movingClipRef.current;
      if (mc) {
        if (mc.targetTrackId === 'new_video') {
          const newTrackId = handleAddVideoTrack();
          await moveClipSafely(mc.clipId, mc.currentTicks, newTrackId);
        } else if (mc.targetTrackId === 'new_audio') {
          const newTrackId = handleAddAudioTrack();
          await moveClipSafely(mc.clipId, mc.currentTicks, newTrackId);
        } else if (
          mc.targetTrackId !== mc.originalTrackId ||
          mc.currentTicks !== mc.originalTicks
        ) {
          await moveClipSafely(mc.clipId, mc.currentTicks, mc.targetTrackId);
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

    const container = viewportRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const relativeX = clientX - containerRect.left + container.scrollLeft;
    const sliceTicks = Math.max(0, Math.round(relativeX / pixelsPerTick));

    for (const track of project.tracks) {
      const clip = track.clips.find((c) => c.id === clipId);
      if (clip && sliceTicks > clip.timelineStartTicks && sliceTicks < clip.timelineStartTicks + clip.durationTicks) {
        const cmd = new SplitClipCommand(clip.id, sliceTicks);
        const success = await editorStore.executeCommand(cmd);
        if (success && cmd.createdResult) {
          timelineStore.selectClip(cmd.createdResult.rightClip.id);
        }
        break;
      }
    }
  };

  // ─── Delete Actions ───────────────────────────────────────────────────────
  const handleDeleteSelected = async () => {
    if (selectedClipIds.length === 0) return;
    for (const clipId of selectedClipIds) {
      await editorStore.executeCommand(new DeleteClipCommand(clipId));
    }
    timelineStore.clearSelection();
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

  // ─── Freeze Frame (Hold Frame 3s - Snapshots exact stopped frame) ─────────
  const handleFreezeFrame = async () => {
    const currentProj = editorStore.getProject();
    let targetClip: Clip | undefined;
    let targetTrack: Track | undefined;

    // First check selected clip if it's video
    if (selectedClipIds[0]) {
      for (const t of currentProj.tracks) {
        if (t.kind === 'video') {
          const hit = t.clips.find((c) => c.id === selectedClipIds[0]);
          if (hit) {
            targetClip = hit;
            targetTrack = t;
            break;
          }
        }
      }
    }

    // Otherwise find clip under playhead
    if (!targetClip || !targetTrack) {
      for (const t of currentProj.tracks) {
        if (t.kind === 'video' && !t.hidden) {
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
    }
    if (!targetClip || !targetTrack) return;

    // Capture the exact stopped frame from the HTMLVideoElement
    let frameDataUrl: string | undefined;
    const videoEl =
      document.querySelector<HTMLVideoElement>(`video[data-track-id="${targetTrack.id}"]`) ||
      document.querySelector<HTMLVideoElement>('video');

    if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          frameDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        }
      } catch (err) {
        console.warn('Could not snapshot video canvas frame:', err);
      }
    }

    const parentAsset = currentProj.assets.find((a) => a.id === targetClip!.assetId);
    const freezeDurationTicks = Math.round(3.0 * currentProj.timelineTimebase);
    const snapshotUrl =
      frameDataUrl || (parentAsset?.metadata as Record<string, unknown> | undefined)?.['blobUrl'];

    const freezeAssetId = generateId('asset_freeze');
    const freezeAsset: AssetReference = {
      id: freezeAssetId,
      name: `Freeze Frame (${parentAsset?.name || 'Frame'})`,
      type: 'image',
      storageMode: 'managed',
      filePath: `freeze://${freezeAssetId}.jpg`,
      fileSizeBytes: frameDataUrl ? Math.round(frameDataUrl.length * 0.75) : 0,
      durationTicks: freezeDurationTicks,
      thumbnailPath: frameDataUrl || parentAsset?.thumbnailPath,
      metadata: {
        blobUrl: snapshotUrl,
        isFreezeFrame: true,
      },
    };

    const targetStart = targetClip.timelineStartTicks;
    const cutTick = Math.max(targetStart + 1, Math.min(targetStart + targetClip.durationTicks - 1, playheadTicks));
    const firstHalfDuration = cutTick - targetStart;
    const secondHalfDuration = targetClip.durationTicks - firstHalfDuration;

    const origSourceIn = Number.isFinite(targetClip.sourceInTicks) ? targetClip.sourceInTicks : 0;
    const speedRatio =
      targetClip.speedNumerator && targetClip.speedDenominator
        ? targetClip.speedNumerator / targetClip.speedDenominator
        : 1;

    const firstHalf: Clip = {
      ...targetClip,
      durationTicks: firstHalfDuration,
      sourceInTicks: origSourceIn,
      sourceOutTicks: origSourceIn + Math.round(firstHalfDuration * speedRatio),
    };

    const freezeClip: Clip = {
      id: generateId('clip_freeze'),
      assetId: freezeAssetId,
      trackId: targetTrack.id,
      timelineStartTicks: cutTick,
      durationTicks: freezeDurationTicks,
      sourceInTicks: 0,
      sourceOutTicks: freezeDurationTicks,
      effects: [],
    };

    const secondHalf: Clip = {
      id: generateId('clip'),
      assetId: targetClip.assetId,
      trackId: targetTrack.id,
      timelineStartTicks: cutTick + freezeDurationTicks,
      durationTicks: secondHalfDuration,
      sourceInTicks: firstHalf.sourceOutTicks,
      sourceOutTicks: targetClip.sourceOutTicks ?? (origSourceIn + Math.round(targetClip.durationTicks * speedRatio)),
      audio: targetClip.audio,
      effects: targetClip.effects,
      speedNumerator: targetClip.speedNumerator,
      speedDenominator: targetClip.speedDenominator,
    };

    const updatedClips = targetTrack.clips
      .filter((c) => c.id !== targetClip!.id)
      .map((c) => {
        if (c.timelineStartTicks >= cutTick) {
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

    timelineStore.selectClip(freezeClip.id);
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

  // ─── Speed / Duration Adjuster (Presets & Custom Slider) ───────────────────
  const handleSetClipSpeed = async (speedMultiplier: number) => {
    const validSpeed = Math.max(0.1, Math.min(10.0, speedMultiplier));
    const activeClipId = selectedClipIds[0];
    if (!activeClipId) return;

    const currentProj = editorStore.getProject();
    for (const track of currentProj.tracks) {
      const clip = track.clips.find((c) => c.id === activeClipId);
      if (clip) {
        const currentSpeed =
          clip.speedNumerator && clip.speedDenominator
            ? clip.speedNumerator / clip.speedDenominator
            : 1.0;

        // Source duration in ticks
        const sourceDurationTicks = Math.round(clip.durationTicks * currentSpeed);
        // New timeline duration based on new speed
        const newDurationTicks = Math.max(
          Math.round(currentProj.timelineTimebase * 0.1),
          Math.round(sourceDurationTicks / validSpeed)
        );

        const updatedClip: Clip = {
          ...clip,
          durationTicks: newDurationTicks,
          speedNumerator: Math.round(validSpeed * 100),
          speedDenominator: 100,
        };

        const updatedClips = track.clips.map((c) => (c.id === clip.id ? updatedClip : c));
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
      if (!file) return;
      const blobUrl = URL.createObjectURL(file);
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg)$/i.test(file.name);
      const assetId = generateId('asset');
      const durationTicks = Math.round(5.0 * currentProj.timelineTimebase);
      const localFilePath = (file as unknown as { path?: string }).path || file.name;
      const newAsset: AssetReference = {
        id: assetId,
        name: file.name,
        type: isAudio ? 'audio' : 'video',
        storageMode: 'linked',
        filePath: localFilePath,
        fileSizeBytes: file.size,
        durationTicks,
        metadata: {
          blobUrl,
          localPath: (file as unknown as { path?: string }).path || undefined,
          mimeType: file.type
        },
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
            if (!outClip || !inClip) continue;
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

    const container = viewportRef.current;
    let dropTicks = 0;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const relativeX = e.clientX - containerRect.left + container.scrollLeft;
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

    const container = viewportRef.current;
    let dropTicks = 0;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const relativeX = e.clientX - containerRect.left + container.scrollLeft;
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

          {/* Ripple Delete */}
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

          {/* Detach Audio */}
          <button
            onClick={handleDetachAudio}
            disabled={!selectedClip || selectedClip.track.kind !== 'video'}
            className="kuro-btn kuro-btn-secondary px-2 py-0.5 text-[11px] font-medium flex items-center gap-1 disabled:opacity-30"
            title="Detach Audio - Extract audio into a separate audio track"
          >
            <Unlink className="w-3 h-3" />
            <span>Detach Audio</span>
          </button>

          {/* Freeze Frame */}
          <button
            onClick={handleFreezeFrame}
            className="kuro-btn kuro-btn-secondary px-2 py-0.5 text-[11px] font-medium flex items-center gap-1"
            title="Freeze Frame - Insert 3s still frame at playhead"
          >
            <Snowflake className="w-3 h-3" />
            <span>Freeze</span>
          </button>

          {/* Speed / Duration */}
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
              <div className="absolute top-7 left-0 bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-base)] rounded shadow-2xl p-2 z-50 flex flex-col gap-2 w-48">
                <div className="text-[10px] font-bold text-[var(--kuro-text-secondary)] tracking-wider uppercase flex items-center justify-between">
                  <span>Clip Speed</span>
                  <span className="font-mono text-white">
                    {((selectedClip.clip.speedNumerator && selectedClip.clip.speedDenominator
                      ? selectedClip.clip.speedNumerator / selectedClip.clip.speedDenominator
                      : 1.0)).toFixed(2)}x
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0, 8.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSetClipSpeed(s)}
                      className="px-1.5 py-1 text-center text-[11px] rounded bg-[var(--kuro-bg-canvas)] hover:bg-white hover:text-black text-[var(--kuro-text-primary)] font-mono border border-[var(--kuro-border-subtle)] transition"
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-1 border-t border-[var(--kuro-border-subtle)] pt-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[var(--kuro-text-muted)] font-mono">
                    <span>Custom:</span>
                    <span>0.1x — 5x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.05"
                    value={
                      selectedClip.clip.speedNumerator && selectedClip.clip.speedDenominator
                        ? selectedClip.clip.speedNumerator / selectedClip.clip.speedDenominator
                        : 1.0
                    }
                    onChange={(e) => handleSetClipSpeed(parseFloat(e.target.value))}
                    className="w-full accent-[var(--kuro-text-primary)] cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Snapping, Zoom & Collapse */}
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

          {/* Layer Height (Y-Extension) Presets */}
          <div className="flex items-center gap-1 bg-[var(--kuro-bg-surface)] px-1.5 py-0.5 rounded border border-[var(--kuro-border-subtle)] text-[10px] font-mono">
            <span className="text-[var(--kuro-text-muted)] text-[9px] uppercase font-bold flex items-center gap-0.5">
              <MoveVertical className="w-2.5 h-2.5" />
              Y:
            </span>
            {[
              { label: 'S', h: 52 },
              { label: 'M', h: 72 },
              { label: 'L', h: 105 },
              { label: 'XL', h: 150 },
            ].map(({ label, h }) => (
              <button
                key={label}
                onClick={() => {
                  timelineStore.setDefaultTrackHeight(h);
                  timelineStore.resetTrackHeights();
                }}
                className={`px-1 py-0.2 rounded font-bold transition cursor-pointer ${
                  timelineStore.getDefaultTrackHeight() === h
                    ? 'bg-white text-black'
                    : 'text-[var(--kuro-text-muted)] hover:text-white hover:bg-[var(--kuro-bg-hover)]'
                }`}
                title={`Extend Layer Height to ${h}px (${label})`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-3.5 w-px bg-[var(--kuro-border-base)] mx-0.5" />
          <div className="flex items-center gap-1.5 text-[var(--kuro-text-muted)] text-xs bg-[var(--kuro-bg-surface)] px-2 py-0.5 rounded border border-[var(--kuro-border-subtle)]">
            <button
              onClick={() => timelineStore.setZoom(Math.max(0.02, zoom - 0.2))}
              className="hover:text-[var(--kuro-text-primary)]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <input
              type="range"
              min="0.02"
              max="6.0"
              step="0.02"
              value={zoom}
              onChange={(e) => timelineStore.setZoom(parseFloat(e.target.value))}
              className="w-16 accent-[var(--kuro-text-primary)] cursor-pointer"
            />
            <button
              onClick={() => timelineStore.setZoom(Math.min(6.0, zoom + 0.2))}
              className="hover:text-[var(--kuro-text-primary)]"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <span className="text-[9px] font-mono text-[var(--kuro-text-muted)] w-8 text-right">{zoom.toFixed(2)}x</span>
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

      {/* ─── Two-pane timeline body: [Track Headers] | [Viewport] ─── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left: Layers/Track Headers sidebar */}
        <TimelineTrackHeaders
          tracks={orderedTracks}
          mainVideoTrack={mainVideoTrack}
          mainAudioTrack={mainAudioTrack}
          dragOverTrackId={dragOverTrackId}
          isDragOverNewVideo={isDragOverNewVideo}
          isDragOverNewAudio={isDragOverNewAudio}
          onAddVideoTrack={handleAddVideoTrack}
          onAddAudioTrack={handleAddAudioTrack}
          onDeleteTrack={handleDeleteTrack}
          onToggleMute={handleToggleMute}
          getTrackHeight={(id) => timelineStore.getTrackHeight(id)}
          onStartResizeTrack={handleStartResizeTrack}
          containerRef={headerRef}
        />

        {/* Right: Timeline Viewport (ruler + clips with filmstrip/waveforms) */}
        <TimelineViewport
          tracks={orderedTracks}
          assets={project.assets}
          transitions={project.transitions}
          timelineTimebase={project.timelineTimebase}
          playheadTicks={playheadTicks}
          pixelsPerTick={pixelsPerTick}
          pixelsPerSecond={pixelsPerSecond}
          zoom={zoom}
          activeTool={activeTool}
          selectedClipIds={selectedClipIds}
          movingClip={movingClip}
          trimmingClip={trimmingClip}
          dragOverTrackId={dragOverTrackId}
          dragOverCutId={dragOverCutId}
          dragOverClipId={dragOverClipId}
          isDragOverNewVideo={isDragOverNewVideo}
          isDragOverNewAudio={isDragOverNewAudio}
          mainVideoTrack={mainVideoTrack}
          mainAudioTrack={mainAudioTrack}
          videoTracksCount={videoTracks.length}
          audioTracksCount={audioTracks.length}
          totalDurationSec={totalDurationSec}
          getTrackHeight={(id) => timelineStore.getTrackHeight(id)}
          onStartResizeTrack={handleStartResizeTrack}
          onScrubPlayhead={(ticks) => timelineStore.setPlayheadTicks(ticks)}
          onSelectClip={(clipId, multi) => {
            timelineStore.selectClip(clipId, multi);
            if (!multi) {
              const proj = editorStore.getProject();
              for (const t of proj.tracks) {
                const c = t.clips.find((cl) => cl.id === clipId);
                if (c) {
                  const ph = timelineStore.getPlayheadTicks();
                  if (ph < c.timelineStartTicks || ph >= c.timelineStartTicks + c.durationTicks) {
                    timelineStore.setPlayheadTicks(c.timelineStartTicks);
                  }
                  break;
                }
              }
            }
          }}
          onClearSelection={() => timelineStore.clearSelection()}
          onSetSelectedClipIds={(ids) => timelineStore.setSelectedClipIds(ids)}
          onStartMoveClip={(info) => setMovingClip(info)}
          onStartTrimClip={(info) => setTrimmingClip(info)}
          onRazorClick={handleRazorClickOnClip}
          onTrackDrop={handleTrackDrop}
          onNewTrackDrop={handleDropOnNewTrack}
          onCutDropTransition={handleDropTransitionOnCut}
          onClipDropEffect={handleDropEffectOnClip}
          onApplyTransition={handleApplyTransitionBetween}
          onRemoveTransition={handleRemoveTransition}
          setDragOverTrackId={setDragOverTrackId}
          setDragOverCutId={setDragOverCutId}
          setDragOverClipId={setDragOverClipId}
          setIsDragOverNewVideo={setIsDragOverNewVideo}
          setIsDragOverNewAudio={setIsDragOverNewAudio}
          viewportRef={viewportRef}
          onScroll={(e) => {
            if (headerRef.current) {
              headerRef.current.scrollTop = (e.target as HTMLDivElement).scrollTop;
            }
          }}
        />
      </div>
    </div>
  );
};
