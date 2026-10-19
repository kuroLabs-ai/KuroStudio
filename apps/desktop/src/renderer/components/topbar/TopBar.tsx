import React, { useEffect, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { aiStore } from '../../stores/useAIStore';
import { modalStore } from '../../stores/useModalStore';
import { themeStore } from '../../stores/useThemeStore';
import {
  Undo2,
  Redo2,
  ShoppingBag,
  Settings,
  Download,
  Sparkles,
  Save,
  Sun,
  Moon,
  Circle
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubEditor = editorStore.subscribe(() => setTick((t) => t + 1));
    const unsubAI = aiStore.subscribe(() => setTick((t) => t + 1));
    const unsubTheme = themeStore.subscribe(() => setTick((t) => t + 1));
    return () => {
      unsubEditor();
      unsubAI();
      unsubTheme();
    };
  }, []);

  const project = editorStore.getProject();
  const isDirty = editorStore.getIsDirty();
  const canUndo = editorStore.canUndo();
  const canRedo = editorStore.canRedo();
  const isDrawerOpen = aiStore.getIsDrawerOpen();
  const currentTheme = themeStore.getTheme();

  const handleUndo = async () => {
    await editorStore.undo();
  };

  const handleRedo = async () => {
    await editorStore.redo();
  };

  const handleSave = () => {
    editorStore.markSaved();
  };

  return (
    <header className="h-10 bg-[var(--kuro-bg-panel)] border-b border-[var(--kuro-border-subtle)] flex items-center justify-between px-3 select-none shrink-0 z-20">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold text-xs tracking-wider uppercase text-[var(--kuro-text-primary)]">
          <span className="w-5 h-5 rounded-sm bg-[var(--kuro-text-primary)] text-[var(--kuro-bg-canvas)] flex items-center justify-center text-[11px] font-black">
            K
          </span>
          <span className="font-semibold tracking-tight">KURO<span className="font-light opacity-60">STUDIO</span></span>
        </div>

        <div className="h-3 w-px bg-[var(--kuro-border-base)]" />

        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-[var(--kuro-text-secondary)]">{project.name}</span>
          <Circle
            className={`w-1.5 h-1.5 fill-current ${
              isDirty ? 'text-[var(--kuro-text-primary)] animate-pulse' : 'text-[var(--kuro-text-faint)]'
            }`}
            title={isDirty ? 'Unsaved changes' : 'All changes saved'}
          />
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`p-1 rounded text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)] transition ${
              !isDirty ? 'opacity-20 cursor-default' : 'text-[var(--kuro-text-primary)]'
            }`}
            title="Save Project (Ctrl+S)"
          >
            <Save className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* History Controls */}
      <div className="flex items-center gap-0.5 bg-[var(--kuro-bg-canvas)] p-0.5 rounded border border-[var(--kuro-border-subtle)]">
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition ${
            canUndo
              ? 'text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)]'
              : 'text-[var(--kuro-text-faint)] cursor-not-allowed opacity-30'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-3 h-3" />
          <span className="text-[11px]">Undo</span>
        </button>
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition ${
            canRedo
              ? 'text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)]'
              : 'text-[var(--kuro-text-faint)] cursor-not-allowed opacity-30'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-3 h-3" />
          <span className="text-[11px]">Redo</span>
        </button>
      </div>

      {/* Action Buttons, Monochrome Theme Switcher & AI Drawer */}
      <div className="flex items-center gap-1.5">
        {/* Strict Monochrome Theme Toggle */}
        <button
          onClick={() => themeStore.toggleTheme()}
          className="kuro-btn kuro-btn-secondary p-1.5"
          title={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {currentTheme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-white" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-black" />
          )}
        </button>

        <button
          onClick={() => modalStore.openModal('store')}
          className="kuro-btn kuro-btn-secondary flex items-center gap-1.5"
          title="Open Official Content Store"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Store</span>
        </button>

        <button
          onClick={() => modalStore.openModal('settings')}
          className="kuro-btn kuro-btn-secondary flex items-center gap-1.5"
          title="Settings & AI Providers"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>

        <button
          onClick={() => modalStore.openModal('export')}
          className="kuro-btn kuro-btn-primary flex items-center gap-1.5 font-semibold"
          title="Export Video"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        <div className="h-3.5 w-px bg-[var(--kuro-border-base)] mx-0.5" />

        <button
          onClick={() => aiStore.toggleDrawer()}
          className={`kuro-btn flex items-center gap-1.5 font-medium transition ${
            isDrawerOpen
              ? 'bg-[var(--kuro-text-primary)] text-[var(--kuro-bg-canvas)]'
              : 'kuro-btn-secondary'
          }`}
          title="Toggle Kuro AI Assistant (Ctrl+Space)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Kuro AI</span>
        </button>
      </div>
    </header>
  );
};
