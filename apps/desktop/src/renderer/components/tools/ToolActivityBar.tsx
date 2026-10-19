import React from 'react';
import { layoutStore, ToolTab } from '../../stores/useLayoutStore';
import {
  FolderOpen,
  Layers,
  Wand2,
  Type,
  Music,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface ToolItem {
  id: ToolTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TOOLS: ToolItem[] = [
  { id: 'media', label: 'Media', icon: FolderOpen, description: 'Import and manage project media' },
  { id: 'transitions', label: 'Transitions', icon: Layers, description: 'Cuts, dissolves & motion transitions' },
  { id: 'effects', label: 'Effects', icon: Wand2, description: 'Visual filters, blur, grain & color FX' },
  { id: 'titles', label: 'Titles', icon: Type, description: 'Lower thirds, subtitles & text presets' },
  { id: 'audio', label: 'Audio', icon: Music, description: 'Sound effects & background music' },
];

export const ToolActivityBar: React.FC = () => {
  const activeTab = layoutStore.getActiveToolTab();
  const isLeftPanelVisible = layoutStore.isLeftPanelVisible();

  const handleToolClick = (id: ToolTab) => {
    if (activeTab === id && isLeftPanelVisible) {
      layoutStore.toggleLeftPanel();
    } else {
      layoutStore.setActiveToolTab(id);
    }
  };

  return (
    <div
      className="w-12 h-full flex flex-col justify-between items-center py-2 shrink-0 select-none border-r transition-colors"
      style={{
        background: 'var(--kuro-bg-surface)',
        borderColor: 'var(--kuro-border-subtle)',
      }}
    >
      {/* Top Tool Icons List */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTab === tool.id && isLeftPanelVisible;

          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className="relative w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all group"
              style={{
                background: isActive ? 'var(--kuro-bg-elevated)' : 'transparent',
                color: isActive ? 'var(--kuro-text-primary)' : 'var(--kuro-text-muted)',
              }}
              title={`${tool.label} — ${tool.description}`}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r"
                  style={{ background: 'var(--kuro-text-primary)' }}
                />
              )}
              <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span className="text-[9px] font-medium mt-0.5 tracking-tight opacity-80 scale-90">
                {tool.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Panel Toggle */}
      <div className="w-full flex justify-center pt-2 border-t" style={{ borderColor: 'var(--kuro-border-subtle)' }}>
        <button
          onClick={() => layoutStore.toggleLeftPanel()}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-[var(--kuro-bg-hover)]"
          style={{ color: 'var(--kuro-text-muted)' }}
          title={isLeftPanelVisible ? 'Collapse Left Drawer' : 'Expand Left Drawer'}
        >
          {isLeftPanelVisible ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
