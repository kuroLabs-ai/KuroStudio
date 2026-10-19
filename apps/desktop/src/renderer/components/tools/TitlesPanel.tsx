import React, { useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { AddClipCommand } from '@kuro/editor-core';
import { generateId } from '@kuro/shared';
import {
  Type,
  Search,
  Plus,
  Check,
  AlignLeft,
  Heading
} from 'lucide-react';

interface TitlePreset {
  id: string;
  name: string;
  style: string;
  defaultText: string;
  category: 'titles' | 'lower-thirds' | 'captions' | 'cinematic';
  description: string;
}

const TITLE_PRESETS: TitlePreset[] = [
  {
    id: 'title_cinematic',
    name: 'Cinematic Minimal',
    style: 'Serif uppercase with wide letter spacing',
    defaultText: 'KURO CINEMATIC',
    category: 'cinematic',
    description: 'Clean high-end film title header with letter tracking',
  },
  {
    id: 'title_lower_third',
    name: 'Modern Lower Third',
    style: 'Left-aligned with subheader box',
    defaultText: 'SPEAKER NAME | Lead Creative Director',
    category: 'lower-thirds',
    description: 'Professional documentary / interview lower third nameplate',
  },
  {
    id: 'title_bold_headline',
    name: 'Impact Headline',
    style: 'Bold sans-serif full center',
    defaultText: 'THE FUTURE OF EDITING',
    category: 'titles',
    description: 'High-impact central title for trailers and openers',
  },
  {
    id: 'title_clean_caption',
    name: 'Subtitle Caption',
    style: 'Bottom-centered high legibility',
    defaultText: 'Automatic captions synced to speech...',
    category: 'captions',
    description: 'Crisp subtitle formatting for dialogue and narration',
  },
  {
    id: 'title_corner_tag',
    name: 'Corner Watermark',
    style: 'Top right subtle mono text',
    defaultText: 'REC 00:04:12 // 4K 60FPS',
    category: 'captions',
    description: 'Technical camera HUD / viewfinder overlay aesthetic',
  },
];

export const TitlesPanel: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedId, setAddedId] = useState<string | null>(null);

  const project = editorStore.getProject();
  const playheadTicks = timelineStore.getPlayheadTicks();

  const filteredTitles = TITLE_PRESETS.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAddTitle = async (preset: TitlePreset) => {
    // Find first video track
    const videoTrack = project.tracks.find((t) => t.kind === 'video') || project.tracks[0];
    if (!videoTrack) return;

    // Create a new text asset in project if not exists
    const assetId = generateId('asset_title');
    const clipDurationTicks = Math.round(4.0 * project.timelineTimebase); // 4 seconds default

    const newClip = {
      id: generateId('clip_title'),
      assetId,
      timelineStartTicks: playheadTicks,
      durationTicks: clipDurationTicks,
      inPointTicks: 0,
      outPointTicks: clipDurationTicks,
      effects: [],
    };

    const cmd = new AddClipCommand(newClip, videoTrack.id);
    if (cmd.canExecute({ getProject: () => editorStore.getProject(), setProject: () => {} })) {
      await editorStore.executeCommand(cmd);
      setAddedId(preset.id);
      setTimeout(() => setAddedId(null), 1800);
    } else {
      // Find empty slot on track
      let maxEnd = playheadTicks;
      for (const c of videoTrack.clips) {
        const cEnd = c.timelineStartTicks + c.durationTicks;
        if (cEnd > maxEnd) maxEnd = cEnd;
      }
      const adjustedClip = { ...newClip, timelineStartTicks: maxEnd };
      const fallbackCmd = new AddClipCommand(adjustedClip, videoTrack.id);
      await editorStore.executeCommand(fallbackCmd);
      setAddedId(preset.id);
      setTimeout(() => setAddedId(null), 1800);
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
      {/* Search & Categories */}
      <div className="p-3 border-b space-y-2.5 shrink-0" style={{ borderColor: 'var(--kuro-border-subtle)' }}>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2" style={{ color: 'var(--kuro-text-muted)' }} />
          <input
            type="text"
            placeholder="Search titles & text presets..."
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

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {['all', 'cinematic', 'titles', 'lower-thirds', 'captions'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="px-2.5 py-1 rounded-md text-[11px] capitalize whitespace-nowrap font-medium transition"
              style={{
                background: selectedCategory === cat ? 'var(--kuro-text-primary)' : 'var(--kuro-bg-elevated)',
                color: selectedCategory === cat ? 'var(--kuro-bg-canvas)' : 'var(--kuro-text-muted)',
              }}
            >
              {cat.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Preset List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTitles.map((preset) => {
          const isAdded = addedId === preset.id;

          return (
            <div
              key={preset.id}
              className="group p-2.5 rounded-lg border flex items-center justify-between gap-3 transition hover:shadow-sm"
              style={{
                background: 'var(--kuro-bg-elevated)',
                borderColor: 'var(--kuro-border-subtle)',
              }}
            >
              <div
                className="w-10 h-10 rounded-md border flex items-center justify-center shrink-0 transition group-hover:scale-105"
                style={{
                  background: 'var(--kuro-bg-surface)',
                  borderColor: 'var(--kuro-border-default)',
                }}
              >
                <Type className="w-4 h-4" style={{ color: 'var(--kuro-text-secondary)' }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs truncate" style={{ color: 'var(--kuro-text-primary)' }}>
                    {preset.name}
                  </span>
                </div>
                <p className="text-[10px] mt-0.5 font-mono truncate" style={{ color: 'var(--kuro-text-muted)' }}>
                  "{preset.defaultText}"
                </p>
                <p className="text-[10px] opacity-70 line-clamp-1 mt-0.5" style={{ color: 'var(--kuro-text-muted)' }}>
                  {preset.description}
                </p>
              </div>

              <button
                onClick={() => handleAddTitle(preset)}
                className="studio-btn text-[11px] px-2.5 py-1 font-medium shrink-0 flex items-center gap-1 transition"
                style={{
                  background: isAdded ? 'var(--kuro-text-primary)' : 'var(--kuro-bg-surface)',
                  color: isAdded ? 'var(--kuro-bg-canvas)' : 'var(--kuro-text-primary)',
                  border: '1px solid var(--kuro-border-default)',
                }}
                title="Add title clip at current playhead"
              >
                {isAdded ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div
        className="p-2 border-t text-[10px] flex items-center justify-between"
        style={{
          borderColor: 'var(--kuro-border-subtle)',
          background: 'var(--kuro-bg-elevated)',
          color: 'var(--kuro-text-muted)',
        }}
      >
        <span>Inserts text clip at playhead position</span>
        <span className="font-mono">{filteredTitles.length} presets</span>
      </div>
    </div>
  );
};
