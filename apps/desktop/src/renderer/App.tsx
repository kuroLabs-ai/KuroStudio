import React, { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { editorStore } from './stores/useEditorStore';
import { timelineStore } from './stores/useTimelineStore';
import { aiStore } from './stores/useAIStore';
import { DeleteClipCommand, SplitClipCommand } from '@kuro/editor-core';

export const App: React.FC = () => {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Space: Toggle Playback
      if (e.code === 'Space') {
        e.preventDefault();
        timelineStore.togglePlayback();
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

      // Ctrl + K: Split clip at playhead
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyK') {
        e.preventDefault();
        const selectedClipIds = timelineStore.getSelectedClipIds();
        const activeClipId = selectedClipIds[0];
        if (!activeClipId) return;

        const project = editorStore.getProject();
        const playhead = timelineStore.getPlayheadTicks();

        for (const track of project.tracks) {
          const clip = track.clips.find((c) => c.id === activeClipId);
          if (clip && playhead > clip.timelineStartTicks && playhead < clip.timelineStartTicks + clip.durationTicks) {
            await editorStore.executeCommand(new SplitClipCommand(clip.id, playhead));
            break;
          }
        }
        return;
      }

      // Delete or Backspace: Delete selected clip
      if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        const selectedClipIds = timelineStore.getSelectedClipIds();
        const activeClipId = selectedClipIds[0];
        if (activeClipId) {
          await editorStore.executeCommand(new DeleteClipCommand(activeClipId));
        }
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
