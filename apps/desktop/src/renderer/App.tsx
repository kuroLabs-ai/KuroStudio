import React, { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { editorStore } from './stores/useEditorStore';
import { timelineStore } from './stores/useTimelineStore';
import { aiStore } from './stores/useAIStore';
import { DeleteClipCommand, SplitClipCommand } from '@kuro/editor-core';

export const App: React.FC = () => {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if user is currently typing in a text input or textarea.
      // Range inputs (sliders) should still pass through so Space/arrows work
      // while an Inspector slider is focused.
      const target = e.target as HTMLElement;
      const isTextInput =
        (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'range') ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (isTextInput) {
        return;
      }

      // Space: Toggle Playback (Replay from start if at end of video)
      if (e.code === 'Space') {
        e.preventDefault();
        const project = editorStore.getProject();
        const totalTicks = project.tracks.reduce(
          (max, t) => t.clips.reduce((m, c) => Math.max(m, c.timelineStartTicks + c.durationTicks), max),
          0
        );
        const playhead = timelineStore.getPlayheadTicks();
        const isPlaying = timelineStore.getIsPlaying();
        const fps = project.fpsNumerator / project.fpsDenominator;
        const ticksPerFrame = Math.round(project.timelineTimebase / fps);

        if (!isPlaying && totalTicks > 0 && playhead >= totalTicks - ticksPerFrame) {
          timelineStore.setPlayheadTicks(0);
          timelineStore.setIsPlaying(true);
          return;
        }

        timelineStore.togglePlayback();
        return;
      }

      // V: Selection Tool
      if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        timelineStore.setActiveTool('select');
        return;
      }

      // C: Razor / Blade Tool
      if (e.code === 'KeyC' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        timelineStore.setActiveTool('razor');
        return;
      }

      // S: Toggle Snapping
      if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        timelineStore.toggleSnapping();
        return;
      }

      // Ctrl + Space: Toggle AI Drawer
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        aiStore.toggleDrawer();
        return;
      }

      // Ctrl + Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        if (editorStore.canUndo()) {
          await editorStore.undo();
        }
        return;
      }

      // Ctrl + Y or Ctrl + Shift + Z: Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ')
      ) {
        e.preventDefault();
        if (editorStore.canRedo()) {
          await editorStore.redo();
        }
        return;
      }

      // Ctrl + S: Save Project
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        editorStore.markSaved();
        return;
      }

      // Ctrl + M or Ctrl + E: Open Export Modal
      if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyM' || e.code === 'KeyE')) {
        e.preventDefault();
        const { modalStore } = await import('./stores/useModalStore');
        modalStore.openModal('export');
        return;
      }

      // Ctrl + K: Split clip at playhead
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault();
        const selectedClipIds = timelineStore.getSelectedClipIds();
        let targetClipId = selectedClipIds[0];

        const project = editorStore.getProject();
        const playhead = timelineStore.getPlayheadTicks();

        if (!targetClipId) {
          for (const track of project.tracks) {
            if (track.hidden || track.locked) continue;
            const found = track.clips.find(
              (c) => playhead > c.timelineStartTicks && playhead < c.timelineStartTicks + c.durationTicks
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
          if (clip && playhead > clip.timelineStartTicks && playhead < clip.timelineStartTicks + clip.durationTicks) {
            const cmd = new SplitClipCommand(clip.id, playhead);
            const success = await editorStore.executeCommand(cmd);
            if (success && cmd.createdResult) {
              timelineStore.selectClip(cmd.createdResult.rightClip.id);
            }
            break;
          }
        }
        return;
      }

      // Ripple Delete: Shift + Delete or Shift + Backspace
      if (e.shiftKey && (e.code === 'Delete' || e.code === 'Backspace')) {
        e.preventDefault();
        const selectedClipIds = timelineStore.getSelectedClipIds();
        const activeClipId = selectedClipIds[0];
        if (activeClipId) {
          const currentProj = editorStore.getProject();
          for (const track of currentProj.tracks) {
            const clip = track.clips.find((c) => c.id === activeClipId);
            if (clip) {
              const deletedStart = clip.timelineStartTicks;
              const deletedDur = clip.durationTicks;
              const remainingClips = track.clips
                .filter((c) => c.id !== activeClipId)
                .map((c) => {
                  if (c.timelineStartTicks > deletedStart) {
                    return {
                      ...c,
                      timelineStartTicks: Math.max(deletedStart, c.timelineStartTicks - deletedDur),
                    };
                  }
                  return c;
                });
              const updatedTracks = currentProj.tracks.map((t) =>
                t.id === track.id ? { ...t, clips: remainingClips } : t
              );
              editorStore.getEditorState().setProject({
                ...currentProj,
                tracks: updatedTracks,
              });
              timelineStore.clearSelection();
              break;
            }
          }
        }
        return;
      }

      // Standard Delete or Backspace: Delete selected clips (leaves gap)
      if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        const selectedClipIds = timelineStore.getSelectedClipIds();
        for (const clipId of selectedClipIds) {
          await editorStore.executeCommand(new DeleteClipCommand(clipId));
        }
        timelineStore.clearSelection();
        return;
      }

      // Home: Jump to start
      if (e.code === 'Home') {
        e.preventDefault();
        timelineStore.setIsPlaying(false);
        timelineStore.setPlayheadTicks(0);
        return;
      }

      // Left / Right arrow: Step one frame (pause first)
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        timelineStore.setIsPlaying(false);
        const project = editorStore.getProject();
        const fps = project.fpsNumerator / project.fpsDenominator;
        const ticksPerFrame = Math.round(project.timelineTimebase / fps);
        const delta = e.code === 'ArrowLeft' ? -ticksPerFrame : ticksPerFrame;
        timelineStore.setPlayheadTicks(
          Math.max(0, timelineStore.getPlayheadTicks() + delta)
        );
        return;
      }

      // J: Rewind (pause), K: Pause, L: Play
      if (e.code === 'KeyJ') { e.preventDefault(); timelineStore.setIsPlaying(false); return; }
      if (e.code === 'KeyK') { e.preventDefault(); timelineStore.setIsPlaying(false); return; }
      if (e.code === 'KeyL') { e.preventDefault(); timelineStore.setIsPlaying(true); return; }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <AppLayout />;
};

export default App;

