import React, { useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { AddClipCommand } from '@kuro/editor-core';
import { generateId } from '@kuro/shared';
import {
  Music,
  Search,
  Play,
  Pause,
  Plus,
  Check,
  Volume2
} from 'lucide-react';

interface AudioSample {
  id: string;
  name: string;
  category: 'sfx' | 'impact' | 'foley' | 'ambient';
  durationSec: number;
  description: string;
  synthesizeType: 'whoosh' | 'boom' | 'click' | 'drone' | 'riser';
}

const AUDIO_CATALOG: AudioSample[] = [
  {
    id: 'sfx_whoosh_fast',
    name: 'Fast Cinema Whoosh',
    category: 'sfx',
    durationSec: 1.2,
    description: 'Quick air displacement sound for fast cuts and transitions',
    synthesizeType: 'whoosh',
  },
  {
    id: 'sfx_sub_boom',
    name: 'Sub Bass Impact Boom',
    category: 'impact',
    durationSec: 2.5,
    description: 'Deep low-end rumble hit for cinematic drops and title cards',
    synthesizeType: 'boom',
  },
  {
    id: 'sfx_click_pop',
    name: 'Clean Interface Click',
    category: 'foley',
    durationSec: 0.3,
    description: 'Crisp mechanical tactile button switch sound',
    synthesizeType: 'click',
  },
  {
    id: 'sfx_ambient_drone',
    name: 'Atmospheric Dark Drone',
    category: 'ambient',
    durationSec: 5.0,
    description: 'Deep evolving cinematic texture drone',
    synthesizeType: 'drone',
  },
  {
    id: 'sfx_tension_riser',
    name: 'Tension Pitch Riser',
    category: 'sfx',
    durationSec: 3.0,
    description: 'Gradual ascending frequency sweep building anticipation',
    synthesizeType: 'riser',
  },
];

export const AudioPanel: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  const project = editorStore.getProject();
  const playheadTicks = timelineStore.getPlayheadTicks();

  const playSynthesizedAudio = (sample: AudioSample) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (sample.synthesizeType === 'boom') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(25, ctx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.7, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.6);
      } else if (sample.synthesizeType === 'whoosh') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.3);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.7);
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.8);
      } else if (sample.synthesizeType === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        gain.gain.setValueAtTime(0.6, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (sample.synthesizeType === 'riser') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 2.0);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 1.8);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 2.2);
      } else {
        // drone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(65, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 2.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 2.6);
      }

      setPlayingId(sample.id);
      setTimeout(() => setPlayingId(null), sample.durationSec * 1000);
    } catch {
      // Audio not permitted without interaction
    }
  };

  const handleAddToAudioTrack = async (sample: AudioSample) => {
    const audioTrack = project.tracks.find((t) => t.kind === 'audio') || project.tracks[project.tracks.length - 1];
    if (!audioTrack) return;

    const assetId = generateId('asset_audio');
    const clipDurationTicks = Math.round(sample.durationSec * project.timelineTimebase);

    const newClip = {
      id: generateId('clip_audio'),
      assetId,
      timelineStartTicks: playheadTicks,
      durationTicks: clipDurationTicks,
      inPointTicks: 0,
      outPointTicks: clipDurationTicks,
      audio: {
        volume: 1.0,
      },
      effects: [],
    };

    const cmd = new AddClipCommand(newClip, audioTrack.id);
    if (cmd.canExecute({ getProject: () => editorStore.getProject(), setProject: () => {} })) {
      await editorStore.executeCommand(cmd);
      setAddedId(sample.id);
      setTimeout(() => setAddedId(null), 1800);
    } else {
      let maxEnd = playheadTicks;
      for (const c of audioTrack.clips) {
        const cEnd = c.timelineStartTicks + c.durationTicks;
        if (cEnd > maxEnd) maxEnd = cEnd;
      }
      const adjustedClip = { ...newClip, timelineStartTicks: maxEnd };
      const fallbackCmd = new AddClipCommand(adjustedClip, audioTrack.id);
      await editorStore.executeCommand(fallbackCmd);
      setAddedId(sample.id);
      setTimeout(() => setAddedId(null), 1800);
    }
  };

  const filteredAudio = AUDIO_CATALOG.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

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
            placeholder="Search sound effects & tracks..."
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
          {['all', 'sfx', 'impact', 'foley', 'ambient'].map((cat) => (
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
      </div>

      {/* Audio Sample List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredAudio.map((sample) => {
          const isPlaying = playingId === sample.id;
          const isAdded = addedId === sample.id;

          return (
            <div
              key={sample.id}
              draggable={true}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/kuro-audio', JSON.stringify(sample));
                e.dataTransfer.effectAllowed = 'copyMove';
              }}
              className="group p-2.5 rounded-lg border flex items-center justify-between gap-3 transition hover:shadow-sm cursor-grab active:cursor-grabbing"
              title="Drag onto audio track on timeline, or click Add"
              style={{
                background: 'var(--kuro-bg-elevated)',
                borderColor: 'var(--kuro-border-subtle)',
              }}
            >
              {/* Play preview button */}
              <button
                onClick={() => playSynthesizedAudio(sample)}
                className="w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition active:scale-95"
                style={{
                  background: isPlaying ? 'var(--kuro-text-primary)' : 'var(--kuro-bg-surface)',
                  color: isPlaying ? 'var(--kuro-bg-canvas)' : 'var(--kuro-text-primary)',
                  borderColor: 'var(--kuro-border-default)',
                }}
                title="Preview sound"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs truncate" style={{ color: 'var(--kuro-text-primary)' }}>
                    {sample.name}
                  </span>
                  <span
                    className="text-[9px] uppercase px-1 rounded font-mono"
                    style={{
                      background: 'var(--kuro-bg-surface)',
                      color: 'var(--kuro-text-muted)',
                    }}
                  >
                    {sample.durationSec}s
                  </span>
                </div>
                <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'var(--kuro-text-muted)' }}>
                  {sample.description}
                </p>
              </div>

              <button
                onClick={() => handleAddToAudioTrack(sample)}
                className="studio-btn text-[11px] px-2.5 py-1 font-medium shrink-0 flex items-center gap-1 transition"
                style={{
                  background: isAdded ? 'var(--kuro-text-primary)' : 'var(--kuro-bg-surface)',
                  color: isAdded ? 'var(--kuro-bg-canvas)' : 'var(--kuro-text-primary)',
                  border: '1px solid var(--kuro-border-default)',
                }}
                title="Add audio clip to audio track"
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
        <span>Click play icon to audition sound</span>
        <span className="font-mono">{filteredAudio.length} audio tracks</span>
      </div>
    </div>
  );
};
