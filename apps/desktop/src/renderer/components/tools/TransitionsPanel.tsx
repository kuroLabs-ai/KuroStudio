import React, { useState, useMemo } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { AddTransitionCommand } from '@kuro/editor-core';
import {
  TRANSITIONS_50_CATALOG,
  TransitionItem,
} from './transitionsCatalog';
import {
  Layers,
  Search,
  Clock,
  Sparkles,
  Check,
  Film,
  Zap,
  Move,
  Flame,
  Grid,
  Box,
  SlidersHorizontal,
  ArrowUpDown,
} from 'lucide-react';

type SortOption = 'name' | 'category' | 'duration' | 'popular';

const CATEGORIES = [
  { id: 'all', label: 'All (50)', icon: Sparkles },
  { id: 'dissolves', label: 'Dissolves', icon: Layers },
  { id: 'motion', label: 'Motion & Push', icon: Move },
  { id: 'wipes', label: 'Wipes', icon: Grid },
  { id: 'glitch', label: 'Glitch & FX', icon: Zap },
  { id: 'light', label: 'Light & Leaks', icon: Flame },
  { id: '3d', label: '3D Spatial', icon: Box },
  { id: 'cinematic', label: 'Cinematic', icon: Film },
];

export const TransitionsPanel: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [durationSec, setDurationSec] = useState(1.0);
  const [lastAppliedId, setLastAppliedId] = useState<string | null>(null);

  const project = editorStore.getProject();
  const selectedClipIds = timelineStore.getSelectedClipIds();

  // Filter & Sort
  const processedTransitions = useMemo(() => {
    let list = TRANSITIONS_50_CATALOG.filter((item) => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      if (sortBy === 'duration') return a.durationDefaultSec - b.durationDefaultSec;
      if (sortBy === 'popular') {
        const aPop = a.badge === 'Popular' ? 1 : 0;
        const bPop = b.badge === 'Popular' ? 1 : 0;
        return bPop - aPop;
      }
      return 0;
    });

    return list;
  }, [selectedCategory, searchQuery, sortBy]);

  const handleApplyTransition = async (item: TransitionItem) => {
    let outgoingId: string | null = null;
    let incomingId: string | null = null;

    if (selectedClipIds.length >= 2) {
      outgoingId = selectedClipIds[0] ?? null;
      incomingId = selectedClipIds[1] ?? null;
    } else if (selectedClipIds.length === 1) {
      const activeId = selectedClipIds[0];
      for (const track of project.tracks) {
        const clipIndex = track.clips.findIndex((c) => c.id === activeId);
        if (clipIndex !== -1 && track.clips[clipIndex + 1]) {
          outgoingId = track.clips[clipIndex]?.id ?? null;
          incomingId = track.clips[clipIndex + 1]?.id ?? null;
          break;
        } else if (clipIndex > 0) {
          outgoingId = track.clips[clipIndex - 1]?.id ?? null;
          incomingId = track.clips[clipIndex]?.id ?? null;
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
      {/* ── Top Search & Filters ── */}
      <div className="p-3 border-b space-y-2.5 shrink-0" style={{ borderColor: 'var(--kuro-border-subtle)' }}>
        {/* Search Bar & Sort Dropdown */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2" style={{ color: 'var(--kuro-text-muted)' }} />
            <input
              type="text"
              placeholder="Search 50 transitions (whips, glitch, flares, wipes...)"
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

          {/* Sort Selector */}
          <div className="flex items-center gap-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-[var(--kuro-bg-elevated)] border border-[var(--kuro-border-subtle)] text-[11px] rounded-lg px-2 py-1.5 text-[var(--kuro-text-secondary)] focus:outline-none cursor-pointer"
            >
              <option value="popular">Popular First</option>
              <option value="name">Alphabetical (A-Z)</option>
              <option value="category">By Category</option>
              <option value="duration">By Duration</option>
            </select>
          </div>
        </div>

        {/* Categories Horizontal Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap font-medium transition flex items-center gap-1 cursor-pointer"
                style={{
                  background: isSelected ? 'var(--kuro-text-primary)' : 'var(--kuro-bg-elevated)',
                  color: isSelected ? 'var(--kuro-bg-canvas)' : 'var(--kuro-text-muted)',
                }}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Duration Quick Presets */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5" style={{ color: 'var(--kuro-text-secondary)' }}>
            <Clock className="w-3 h-3 text-blue-400" />
            <span className="text-[11px] font-medium">Transition Duration:</span>
          </div>
          <div className="flex items-center gap-1">
            {[0.3, 0.5, 0.8, 1.0, 1.5, 2.0].map((d) => (
              <button
                key={d}
                onClick={() => setDurationSec(d)}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer"
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

      {/* ── Transition Card Grid ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {processedTransitions.map((item) => {
          const isApplied = lastAppliedId === item.id;

          return (
            <div
              key={item.id}
              draggable={true}
              onDragStart={(e) => {
                const payload = { ...item, durationSec };
                e.dataTransfer.setData('application/kuro-transition', JSON.stringify(payload));
                e.dataTransfer.setData('text/plain', JSON.stringify({ kuroType: 'transition', data: payload }));
                e.dataTransfer.effectAllowed = 'copyMove';
              }}
              className="group p-2.5 rounded-lg border flex items-center justify-between gap-3 transition hover:shadow-sm cursor-grab active:cursor-grabbing hover:border-white/30"
              title="Drag onto timeline seam or cut between clips, or click Apply"
              style={{
                background: 'var(--kuro-bg-elevated)',
                borderColor: 'var(--kuro-border-subtle)',
              }}
            >
              {/* Graphic Icon Thumbnail */}
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
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1 rounded uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {item.badge}
                    </span>
                  )}
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
                className="studio-btn text-[11px] px-2.5 py-1 font-medium shrink-0 flex items-center gap-1 transition cursor-pointer"
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

        {processedTransitions.length === 0 && (
          <div className="text-center py-8" style={{ color: 'var(--kuro-text-muted)' }}>
            <Film className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">No transitions found</p>
            <p className="text-[11px] opacity-70 mt-0.5">Try searching with another keyword or category</p>
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
        <span>Drag to cut seam or select adjacent clips</span>
        <span className="font-mono">{processedTransitions.length} of 50 visible</span>
      </div>
    </div>
  );
};
