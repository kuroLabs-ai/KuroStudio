import React, { useEffect, useState } from 'react';
import { layoutStore } from '../../stores/useLayoutStore';
import { MediaBin } from '../mediabin/MediaBin';
import { TransitionsPanel } from './TransitionsPanel';
import { EffectsPanel } from './EffectsPanel';
import { TitlesPanel } from './TitlesPanel';
import { AudioPanel } from './AudioPanel';
import {
  FolderOpen,
  Layers,
  Wand2,
  Type,
  Music,
  ChevronLeft
} from 'lucide-react';

export const ToolsContainer: React.FC = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    return layoutStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const activeTab = layoutStore.getActiveToolTab();

  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'media':
        return { label: 'Media Bin', icon: FolderOpen, subtitle: 'Project footage & assets' };
      case 'transitions':
        return { label: 'Transitions', icon: Layers, subtitle: 'Crossfades & dynamic cuts' };
      case 'effects':
        return { label: 'Video Effects', icon: Wand2, subtitle: 'Visual filters & color grading' };
      case 'titles':
        return { label: 'Text & Titles', icon: Type, subtitle: 'Lower thirds & typography' };
      case 'audio':
        return { label: 'Audio & SFX', icon: Music, subtitle: 'Sound effects & music' };
    }
  };

  const info = getHeaderInfo();
  const Icon = info.icon;

  return (
    <div
      className="h-full flex flex-col select-none overflow-hidden border-r"
      style={{
        background: 'var(--kuro-bg-surface)',
        borderColor: 'var(--kuro-border-subtle)',
      }}
    >
      {/* Header */}
      <div
        className="h-8 px-3 border-b flex items-center justify-between shrink-0"
        style={{
          background: 'var(--kuro-bg-panel)',
          borderColor: 'var(--kuro-border-subtle)',
        }}
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--kuro-text-secondary)' }} />
          <span className="font-semibold text-xs tracking-tight" style={{ color: 'var(--kuro-text-primary)' }}>
            {info.label}
          </span>
          <span className="text-[10px] hidden sm:inline" style={{ color: 'var(--kuro-text-muted)' }}>
            • {info.subtitle}
          </span>
        </div>

        <button
          onClick={() => layoutStore.toggleLeftPanel()}
          className="p-1 rounded hover:bg-[var(--kuro-bg-hover)] transition"
          style={{ color: 'var(--kuro-text-muted)' }}
          title="Collapse Panel"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'media' && <MediaBin />}
        {activeTab === 'transitions' && <TransitionsPanel />}
        {activeTab === 'effects' && <EffectsPanel />}
        {activeTab === 'titles' && <TitlesPanel />}
        {activeTab === 'audio' && <AudioPanel />}
      </div>
    </div>
  );
};
