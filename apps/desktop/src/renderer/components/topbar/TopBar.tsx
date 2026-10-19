import React, { useEffect, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { aiStore } from '../../stores/useAIStore';
import { modalStore } from '../../stores/useModalStore';

export const TopBar: React.FC = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubEditor = editorStore.subscribe(() => setTick((t) => t + 1));
    const unsubAI = aiStore.subscribe(() => setTick((t) => t + 1));
    return () => {
      unsubEditor();
      unsubAI();
    };
  }, []);

  const project = editorStore.getProject();
  const isDirty = editorStore.getIsDirty();
  const canUndo = editorStore.canUndo();
  const canRedo = editorStore.canRedo();
  const isDrawerOpen = aiStore.getIsDrawerOpen();

  const handleUndo = async () => {
    await editorStore.undo();
  };

  const handleRedo = async () => {
    await editorStore.redo();
  };

  return (
    <header className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 select-none shrink-0">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold text-base tracking-wide text-white">
          <span className="w-6 h-6 rounded bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-xs font-black shadow-lg shadow-sky-500/20">
            K
          </span>
          <span>Kuro<span className="text-sky-400">Studio</span></span>
        </div>

        <div className="h-4 w-px bg-slate-700" />

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="font-medium text-slate-200">{project.name}</span>
          <span
            className={`w-2 h-2 rounded-full ${
              isDirty ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            }`}
            title={isDirty ? 'Unsaved changes' : 'All changes saved'}
          />
        </div>
      </div>

      {/* History Controls */}
      <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-md border border-slate-800">
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className={`px-2.5 py-1 text-xs rounded font-medium flex items-center gap-1 transition ${
            canUndo
              ? 'text-slate-200 hover:bg-slate-800'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className={`px-2.5 py-1 text-xs rounded font-medium flex items-center gap-1 transition ${
            canRedo
              ? 'text-slate-200 hover:bg-slate-800'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </button>
      </div>

      {/* Action Buttons & AI Drawer Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => modalStore.openModal('store')}
          className="studio-btn studio-btn-secondary text-xs px-2.5 py-1.5"
          title="Open Official Content Store"
        >
          🛍️ Store
        </button>

        <button
          onClick={() => modalStore.openModal('settings')}
          className="studio-btn studio-btn-secondary text-xs px-2.5 py-1.5"
          title="Settings & AI Providers"
        >
          ⚙️ Settings
        </button>

        <button
          onClick={() => modalStore.openModal('export')}
          className="studio-btn studio-btn-primary text-xs px-3 py-1.5 font-semibold"
          title="Export Video"
        >
          🚀 Export
        </button>

        <div className="h-4 w-px bg-slate-700" />

        <button
          onClick={() => aiStore.toggleDrawer()}
          className={`studio-btn text-xs px-3 py-1.5 font-semibold transition ${
            isDrawerOpen
              ? 'studio-btn-ai'
              : 'bg-slate-800 text-purple-300 border border-purple-500/30 hover:bg-purple-950/40'
          }`}
          title="Toggle Kuro AI Assistant (Ctrl+Space)"
        >
          ✨ Kuro AI
        </button>
      </div>
    </header>
  );
};
