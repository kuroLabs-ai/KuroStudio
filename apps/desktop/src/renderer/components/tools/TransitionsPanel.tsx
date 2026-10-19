import React, { useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { AddTransitionCommand } from '@kuro/editor-core';
import {
  Layers,
  Search,
  Clock,
  Sparkles,
  Check,
  Film
} from 'lucide-react';

interface TransitionItem {
  id: string;
  name: string;
  category: 'dissolves' | 'motion' | 'cinematic' | 'stylized';
  type: 'cross-dissolve' | 'fade-to-black' | 'hard-cut';
  description: string;
  previewClass: string;
}

const TRANSITIONS_CATALOG: TransitionItem[] = [
  {
    id: 'tr_cross_dissolve',
    name: 'Cross Dissolve',
    category: 'dissolves',
    type: 'cross-dissolve',
    description: 'Smooth linear blend between two adjacent shots',
    previewClass: 'opacity-50',
  },
  {
    id: 'tr_dip_black',
    name: 'Dip to Black',
    category: 'cinematic',
    type: 'fade-to-black',
    description: 'Fades outgoing clip to pure black, then fades in incoming shot',
    previewClass: 'bg-black',
  },
  {
    id: 'tr_dip_white',
    name: 'Dip to White',
    category: 'cinematic',
    type: 'cross-dissolve',
    description: 'Flash transition fading through pure white for high-energy cuts',
    previewClass: 'bg-white',
  },
  {
    id: 'tr_slide_left',
    name: 'Slide Left',
    category: 'motion',
    type: 'cross-dissolve',
    description: 'Next video slides in horizontally from right to left',
    previewClass: 'translate-x-2',
  },
  {
    id: 'tr_slide_right',
    name: 'Slide Right',
    category: 'motion',
    type: 'cross-dissolve',
    description: 'Next video pushes outgoing clip to the right',
    previewClass: '-translate-x-2',
  },
  {
    id: 'tr_zoom_in',
    name: 'Zoom Push',
    category: 'motion',
    type: 'cross-dissolve',
    description: 'Dynamic forward zoom push entering the next scene',
    previewClass: 'scale-110',
  },
  {
    id: 'tr_glitch_flash',
    name: 'Digital Glitch',
    category: 'stylized',
    type: 'cross-dissolve',
    description: 'RGB chromatic tear and displacement jump transition',
    previewClass: 'skew-x-2',
  },
  {
    id: 'tr_whip_pan',
    name: 'Whip Pan',
    category: 'motion',
    type: 'cross-dissolve',
    description: 'High-speed directional motion blur simulating fast camera pan',
    previewClass: 'blur-xs',
  },
  {
    id: 'tr_clock_wipe',
    name: 'Radial Wipe',
    category: 'dissolves',
    type: 'cross-dissolve',
    description: 'Rotational 360 clock sweep revealing the second track',
    previewClass: 'rotate-45',
  },
  {
    id: 'tr_iris_close',
    name: 'Iris Circle',
    category: 'cinematic',
    type: 'cross-dissolve',
    description: 'Classic circular cinematic iris wipe',
    previewClass: 'rounded-full',
  },
];

export const TransitionsPanel: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [durationSec, setDurationSec] = useState(1.0);
  const [lastAppliedId, setLastAppliedId] = useState<string | null>(null);

  const project = editorStore.getProject();
  const selectedClipIds = timelineStore.getSelectedClipIds();

  const filteredTransitions = TRANSITIONS_CATALOG.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleApplyTransition = async (item: TransitionItem) => {
    // If two clips are selected or we have adjacent clips on a track
    let outgoingId: string | null = null;
    let incomingId: string | null = null;

    if (selectedClipIds.length >= 2) {
      outgoingId = selectedClipIds[0];
      incomingId = selectedClipIds[1];
    } else if (selectedClipIds.length === 1) {
      // Find the selected clip and check if there's an adjacent clip on the same track
      const activeId = selectedClipIds[0];
      for (const track of project.tracks) {
        const clipIndex = track.clips.findIndex((c) => c.id === activeId);
        if (clipIndex !== -1 && track.clips[clipIndex + 1]) {
          outgoingId = track.clips[clipIndex].id;
          incomingId = track.clips[clipIndex + 1].id;
          break;
        } else if (clipIndex > 0) {
          outgoingId = track.clips[clipIndex - 1].id;
          incomingId = track.clips[clipIndex].id;
          break;
        }
      }
    }

    const durationTicks = Math.round(durationSec * project.timelineTimebase);

    if (outgoingId && incomingId) {
      const cmd = new AddTransitionCommand(item.type, outgoingId, incomingId, durationTicks);
      await editorStore.executeCommand(cmd);
      setLastAppliedId(item.id);
      setTimeout(() => setLastAppliedId(null), 2000);
    } else {
      // Informative quick status
      setLastAppliedId(item.id);
      setTimeout(() => setLastAppliedId(null), 1500);
    }
  };

  return (
    <div
      className="h-full flex flex-col select-none overflow-hidden text-xs"
      style={{
        background: 'var(--kuro-bg-surface)',
        color: 'var(--kuro-text-primary)',
      }}
    >
      {/* Search & Category Filter */}
      <div className="p-3 border-b space-y-2.5 shrink-0" style={{ borderColor: 'var(--kuro-border-subtle)' }}>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2" style={{ color: 'var(--kuro-text-muted)' }} />
          <input
            type="text"
            placeholder="Search transitions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none transition"
            style={{
              background: 'var(--kuro-bg-elevated)',
              border: '1px solid var(--kuro-border-subtle)',
              color: 'var(--kuro-text-primary)',
            }}
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {['all', 'dissolves', 'motion', 'cinematic', 'stylized'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-2.5 py-1 rounded-md text-[11px] capitalize whitespace-nowrap font-medium transition"
              style={{
                background: selectedCategory === cat ? 'var(--kuro-text-primary)' : 'var(--kuro-bg-elevated)',
                color: selectedCategory === cat ? 'var(--kuro-bg-canvas)' : 'var(--kuro-text-muted)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Duration Control */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5" style={{ color: 'var(--kuro-text-secondary)' }}>
            <Clock className="w-3 h-3" />
            <span className="text-[11px] font-medium">Default Duration:</span>
          </div>
          <div className="flex items-center gap-1">
            {[0.5, 1.0, 1.5, 2.0].map((d) => (
              <button
                key={d}
                onClick={() => setDurationSec(d)}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono transition"
                style={{
                  background: durationSec === d ? 'var(--kuro-bg-muted)' : 'transparent',
                  color: durationSec === d ? 'var(--kuro-text-primary)' : 'var(--kuro-text-muted)',
                  border: durationSec === d ? '1px solid var(--kuro-border-default)' : '1px solid transparent',
                }}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transition Grid List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTransitions.map((item) => {
          const isApplied = lastAppliedId === item.id;

          return (
            <div
              key={item.id}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/kuro-transition', JSON.stringify({ ...item, durationSec }));
                e.dataTransfer.effectAllowed = 'copyMove';
              }}
              className="group p-2.5 rounded-lg border flex items-center justify-between gap-3 transition hover:shadow-sm cursor-grab active:cursor-grabbing"
              title="Drag onto timeline between clips, or click Apply"
              style={{
                background: 'var(--kuro-bg-elevated)',
                borderColor: 'var(--kuro-border-subtle)',
              }}
            >
              {/* Preview Graphic */}
              <div
                className="w-10 h-10 rounded-md border flex items-center justify-center shrink-0 relative overflow-hidden transition group-hover:scale-105"
                style={{
                  background: 'var(--kuro-bg-surface)',
                  borderColor: 'var(--kuro-border-default)',
                }}
              >
                <div
                  className="w-5 h-5 rounded-sm border flex items-center justify-center transition"
                  style={{
                    borderColor: 'var(--kuro-text-muted)',
                  }}
                >
                  <Layers className="w-3 h-3" style={{ color: 'var(--kuro-text-secondary)' }} />
                </div>
              </div>

              {/* Title & Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs truncate" style={{ color: 'var(--kuro-text-primary)' }}>
                    {item.name}
                  </span>
                  <span
                    className="text-[9px] uppercase px-1 rounded font-mono"
                    style={{
                      background: 'var(--kuro-bg-surface)',
                      color: 'var(--kuro-text-muted)',
                    }}
                  >
                    {item.category}
                  </span>
                </div>
                <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'var(--kuro-text-muted)' }}>
                  {item.description}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleApplyTransition(item)}
                className="studio-btn text-[11px] px-2.5 py-1 font-medium shrink-0 flex items-center gap-1 transition"
                style={{
                  background: isApplied ? 'var(--kuro-text-primary)' : 'var(--kuro-bg-surface)',
                  color: isApplied ? 'var(--kuro-bg-canvas)' : 'var(--kuro-text-primary)',
                  border: '1px solid var(--kuro-border-default)',
                }}
                title="Apply transition between selected clips"
              >
                {isApplied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Applied</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Apply</span>
                  </>
                )}
              </button>
            </div>
          );
        })}

        {filteredTransitions.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--kuro-text-muted)' }}>
            <Film className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">No transitions found</p>
            <p className="text-[11px] opacity-70 mt-0.5">Try searching with another keyword</p>
          </div>
        )}
      </div>

      {/* Helpful Status Footer */}
      <div
        className="p-2 border-t text-[10px] flex items-center justify-between"
        style={{
          borderColor: 'var(--kuro-border-subtle)',
          background: 'var(--kuro-bg-elevated)',
          color: 'var(--kuro-text-muted)',
        }}
      >
        <span>Select adjacent clips on timeline to apply</span>
        <span className="font-mono">{filteredTransitions.length} available</span>
      </div>
    </div>
  );
};
