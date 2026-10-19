import React, { useEffect, useRef, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import {
  SplitClipCommand,
  DeleteClipCommand,
  MuteTrackCommand,
  AddClipCommand,
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
  MoveHorizontal
} from 'lucide-react';

export const TimelineView: React.FC = () => {
  const [, setTick] = useState(0);
  const rulerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Drag and Drop Hover States
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [dragOverCutId, setDragOverCutId] = useState<string | null>(null);
  const [dragOverClipId, setDragOverClipId] = useState<string | null>(null);

  // Clip Repositioning (Live Moving) State
  const [movingClip, setMovingClip] = useState<{
    clipId: string;
    trackId: string;
    originalTicks: number;
    currentTicks: number;
    startX: number;
  } | null>(null);

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

  // Track Categorization for NLE Layer Stacking Order:
  // Overlay video tracks (added via +V) on TOP
  // Main Video (V1) – the FIRST video track created – in the middle
  // Main Audio (A1) – the FIRST audio track created – below video
  // Extra audio tracks (added via +A) at the BOTTOM
  const videoTracks = project.tracks.filter((t) => t.kind === 'video');
  const audioTracks = project.tracks.filter((t) => t.kind === 'audio');

  // V1 = last in the list because +V always prepends; A1 = first audio track
  const mainVideoTrack = videoTracks[videoTracks.length - 1] ?? videoTracks[0];
  const mainAudioTrack = audioTracks[0];

  // overlays on top, main video below them, then main audio, then extra audio
  const overlayTracks = videoTracks.filter((t) => t.id !== mainVideoTrack?.id);
  const extraAudioTracks = audioTracks.filter((t) => t.id !== mainAudioTrack?.id);
  const orderedTracks = [
    ...overlayTracks,
    ...(mainVideoTrack ? [mainVideoTrack] : []),
    ...(mainAudioTrack ? [mainAudioTrack] : []),
    ...extraAudioTracks,
  ];

  // Horizontal Wheel Scroll & Ctrl+Wheel Zoom Listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        // Zoom timeline
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        timelineStore.setZoom(Math.max(0.2, Math.min(4.0, timelineStore.getZoom() + delta)));
        return;
      }

      // Smooth horizontal scroll
      if (Math.abs(e.deltaY) > 0 || Math.abs(e.deltaX) > 0) {
        e.preventDefault();
        container.scrollLeft += e.deltaX !== 0 ? e.deltaX : e.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Live Clip Moving Drag Handler with Auto-Scroll (left & right edges)
  useEffect(() => {
    if (!movingClip) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Auto-scroll when dragging near edges
      const container = scrollContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const leftZone = rect.left + 160 + 100; // accounting for sticky track headers (160px)
        const rightZone = rect.right - 100;

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

      // Snap logic
      if (timelineStore.getIsSnappingEnabled()) {
        const snapThresholdTicks = Math.round(16 / pixelsPerTick);
        if (Math.abs(proposed - playheadTicks) < snapThresholdTicks) {
          proposed = playheadTicks;
        } else if (proposed < snapThresholdTicks) {
          proposed = 0;
        } else {
          const track = project.tracks.find((t) => t.id === movingClip.trackId);
          const activeClip = track?.clips.find((c) => c.id === movingClip.clipId);
          if (track && activeClip) {
            for (const other of track.clips) {
              if (other.id === movingClip.clipId) continue;
              const otherEnd = other.timelineStartTicks + other.durationTicks;
              if (Math.abs(proposed - otherEnd) < snapThresholdTicks) {
                proposed = otherEnd;
                break;
              }
              const proposedEnd = proposed + activeClip.durationTicks;
              if (Math.abs(proposedEnd - other.timelineStartTicks) < snapThresholdTicks) {
                proposed = Math.max(0, other.timelineStartTicks - activeClip.durationTicks);
                break;
              }
            }
          }
        }
      }

      setMovingClip((prev) => (prev ? { ...prev, currentTicks: proposed } : null));
    };

    const handleMouseUp = async () => {
      if (movingClip && movingClip.currentTicks !== movingClip.originalTicks) {
        await moveClipSafely(movingClip.clipId, movingClip.currentTicks, movingClip.trackId);
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

  // Multi-Layer Management: Add Video / Overlay Layer on Top
  const handleAddVideoTrack = () => {
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

    // Insert on top (first in tracks array)
    editorStore.getEditorState().setProject({
      ...currentProj,
      tracks: [newTrack, ...currentProj.tracks],
    });
  };

  // Multi-Layer Management: Add Audio Layer at Bottom
  const handleAddAudioTrack = () => {
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

    // Insert at bottom (last in tracks array)
    editorStore.getEditorState().setProject({
      ...currentProj,
      tracks: [...currentProj.tracks, newTrack],
    });
  };

  // Delete Track (protecting the 2 main tracks)
  const handleDeleteTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentProj = editorStore.getProject();
    if (currentProj.tracks.length <= 2) return;
    editorStore.getEditorState().setProject({
      ...currentProj,
      tracks: currentProj.tracks.filter((t) => t.id !== trackId),
    });
  };

  // Safely move clip to new position with collision handling
  const moveClipSafely = async (clipId: string, desiredTicks: number, trackId: string) => {
    const currentProj = editorStore.getProject();
    const track = currentProj.tracks.find((t) => t.id === trackId);
    if (!track) return;
    const clip = track.clips.find((c) => c.id === clipId);
    if (!clip) return;

    let finalTicks = Math.max(0, desiredTicks);
    const otherClips = track.clips.filter((c) => c.id !== clipId);

    const collides = (start: number) => {
      const end = start + clip.durationTicks;
      return otherClips.some((c) => start < c.timelineStartTicks + c.durationTicks && end > c.timelineStartTicks);
    };

    if (collides(finalTicks)) {
      const collidingClip = otherClips.find(
        (c) => finalTicks < c.timelineStartTicks + c.durationTicks && finalTicks + clip.durationTicks > c.timelineStartTicks
      );
      if (collidingClip) {
        if (finalTicks >= collidingClip.timelineStartTicks) {
          finalTicks = collidingClip.timelineStartTicks + collidingClip.durationTicks;
        } else {
          finalTicks = Math.max(0, collidingClip.timelineStartTicks - clip.durationTicks);
        }
      }
    }

    const cmd = new MoveClipCommand(clipId, finalTicks, trackId);
    const success = await editorStore.executeCommand(cmd);

    if (!success) {
      const updatedTracks = currentProj.tracks.map((t) => {
        if (t.id !== trackId) return t;
        const newClips = t.clips
          .map((c) => (c.id === clipId ? { ...c, timelineStartTicks: finalTicks } : c))
          .sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);
        return { ...t, clips: newClips };
      });
      editorStore.getEditorState().setProject({
        ...currentProj,
        tracks: updatedTracks,
      });
    }

    timelineStore.selectClip(clipId);
  };

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

  // Track Drop Handler with Auto-Scroll Detection
  const handleTrackDrop = async (trackId: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTrackId(null);

    const currentProj = editorStore.getProject();
    const track = currentProj.tracks.find((t) => t.id === trackId);
    if (!track) return;

    const laneRect = e.currentTarget.getBoundingClientRect();
    const dropX = e.clientX - laneRect.left;
    const dropTicks = Math.max(0, Math.round(dropX / pixelsPerTick));

    let rawAsset = e.dataTransfer.getData('application/kuro-asset');
    let rawTitle = e.dataTransfer.getData('application/kuro-title');
    let rawAudio = e.dataTransfer.getData('application/kuro-audio');
    let rawTrans = e.dataTransfer.getData('application/kuro-transition');
    let rawEffect = e.dataTransfer.getData('application/kuro-effect');

    const plainText = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text');
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

    // Direct desktop file drag & drop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
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

    // Media & Photos Drop
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

    // Titles & Text Drop
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

    // Audio & Music Drop
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

    // Transition Drop on Track Lane
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

  // Drop transition on exact cut notch
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

  // Drop effect directly onto a clip
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

      {/* Timeline Scroll Area (Dedicated Highly Visible Horizontal Scrollbar + Mouse Wheel Pan) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto overflow-y-auto flex relative select-none kuro-timeline-scroll"
      >
        {/* Track Headers (Left sticky sidebar with Multi-Layer controls) */}
        <div className="w-44 bg-[var(--kuro-bg-panel)] border-r border-[var(--kuro-border-subtle)] shrink-0 sticky left-0 z-40 shadow-sm">
          {/* Multi-Layer Controls Header */}
          <div className="h-6 border-b border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-canvas)] px-2 flex items-center justify-between text-[9px] text-[var(--kuro-text-muted)] font-mono uppercase tracking-wider">
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

          {/* Track Headers List in NLE Stacking Order */}
          {orderedTracks.map((track, trackIndex) => {
            const isMainVideo = track.id === mainVideoTrack?.id;
            const isMainAudio = track.id === mainAudioTrack?.id;
            const isOverlay = track.kind === 'video' && !isMainVideo;
            const isExtraAudio = track.kind === 'audio' && !isMainAudio;
            const isCustomTrack = isOverlay || isExtraAudio;

            // Human-readable label for display
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
                className={`h-14 px-2 border-b border-[var(--kuro-border-subtle)] flex items-center justify-between text-xs font-medium transition-colors group ${
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
                  {/* Layer color accent bar */}
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
                      <span className={`truncate text-[11px] font-semibold block ${isMainVideo || isMainAudio ? 'text-[var(--kuro-text-primary)]' : 'text-[var(--kuro-text-secondary)]'}`}>
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
                  {/* Delete Track button for custom added layers */}
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
        </div>

        {/* Tracks Content & Time Ruler */}
        <div className="flex-1 relative min-w-[3200px]">
          {/* Time Ruler (Interactive Scrubbing) */}
          <div
            ref={rulerRef}
            onMouseDown={handleRulerMouseDown}
            className="h-6 bg-[var(--kuro-bg-surface)] border-b border-[var(--kuro-border-subtle)] relative cursor-ew-resize select-none"
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
              {((playheadTicks / project.timelineTimebase)).toFixed(1)}s
            </div>
          </div>

          {/* Tracks Clip Lanes in Stacking Order */}
          {orderedTracks.map((track) => {
            const sortedClips = [...track.clips].sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);
            const isTrackOver = dragOverTrackId === track.id;
            const isMainVideo = track.id === mainVideoTrack?.id;
            const isMainAudio = track.id === mainAudioTrack?.id;
            const isOverlay = track.kind === 'video' && !isMainVideo;

            return (
              <div
                key={track.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'copy';
                  setDragOverTrackId(track.id);

                  // Auto-scroll when dragging near edges
                  const container = scrollContainerRef.current;
                  if (container) {
                    const rect = container.getBoundingClientRect();
                    const leftZone = rect.left + 160 + 100;
                    const rightZone = rect.right - 100;

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
                  isTrackOver
                    ? 'bg-[var(--kuro-bg-hover)] ring-1 ring-inset ring-white/40'
                    : isMainVideo
                    ? 'bg-[var(--kuro-bg-base)]/60'
                    : isOverlay
                    ? 'bg-[var(--kuro-bg-elevated)]/40'
                    : isMainAudio
                    ? 'bg-[var(--kuro-bg-surface)]/30'
                    : 'bg-[var(--kuro-bg-base)]/20'
                }`}
              >
                {/* 1. Clips (Interactive Drag-to-Move across timeline) */}
                {sortedClips.map((clip) => {
                  const isBeingMoved = movingClip?.clipId === clip.id;
                  const displayTicks = isBeingMoved ? movingClip.currentTicks : clip.timelineStartTicks;

                  const clipLeft = displayTicks * pixelsPerTick;
                  const clipWidth = Math.max(36, clip.durationTicks * pixelsPerTick);
                  const isSelected = selectedClipIds.includes(clip.id);
                  const isClipOver = dragOverClipId === clip.id;
                  const asset = project.assets.find((a) => a.id === clip.assetId);

                  return (
                    <div
                      key={clip.id}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        timelineStore.selectClip(clip.id);
                        setMovingClip({
                          clipId: clip.id,
                          trackId: track.id,
                          originalTicks: clip.timelineStartTicks,
                          currentTicks: clip.timelineStartTicks,
                          startX: e.clientX,
                        });
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'copy';
                        setDragOverClipId(clip.id);
                      }}
                      onDragLeave={() => setDragOverClipId(null)}
                      onDrop={(e) => handleDropEffectOnClip(clip.id, e)}
                      className={`absolute top-1 bottom-1 rounded border text-xs font-medium transition-all select-none flex flex-col justify-between overflow-hidden shadow-sm z-10 cursor-grab active:cursor-grabbing ${
                        track.kind === 'video'
                          ? 'bg-[var(--kuro-track-video)] text-[var(--kuro-text-primary)] border-[var(--kuro-border-strong)]'
                          : 'bg-[var(--kuro-track-audio)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-base)]'
                      } ${isSelected ? 'ring-2 ring-white border-white brightness-125' : 'hover:brightness-110'} ${
                        isBeingMoved ? 'opacity-90 ring-2 ring-white scale-[1.02] z-40 shadow-2xl' : ''
                      } ${isClipOver ? 'ring-2 ring-white border-white scale-[1.01]' : ''}`}
                      style={{ left: `${clipLeft}px`, width: `${clipWidth}px` }}
                      title={
                        isBeingMoved
                          ? `Moving to ${(displayTicks / project.timelineTimebase).toFixed(2)}s`
                          : `${asset?.name ?? clip.id} (Click and drag to move along timeline)`
                      }
                    >
                      {/* Background real thumbnail if video */}
                      {asset?.thumbnailPath && (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none filter grayscale"
                          style={{ backgroundImage: `url(${asset.thumbnailPath})` }}
                        />
                      )}

                      <div className="relative z-10 px-2 py-0.5 flex items-center justify-between text-[11px] truncate font-medium bg-black/50">
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
                            {isBeingMoved
                              ? `${(displayTicks / project.timelineTimebase).toFixed(1)}s`
                              : `${(clip.durationTicks / project.timelineTimebase).toFixed(1)}s`}
                          </span>
                        </div>
                      </div>

                      {/* Monochrome Waveform / Visual Rhythm Bars */}
                      <div className="relative z-10 h-2.5 px-2 flex items-end gap-0.5 opacity-35 pointer-events-none">
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

                {/* 2. Transition Cut Seams & Drop Slots between Adjacent Clips */}
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

                {/* 3. Prominent Physical Transition Blocks on Track */}
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
        </div>
      </div>
    </div>
  );
};
