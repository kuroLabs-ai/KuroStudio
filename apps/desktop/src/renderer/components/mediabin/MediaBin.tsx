import React, { useEffect, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { AssetReference } from '@kuro/project-format';
import { generateId, DEFAULT_TICKS_PER_SECOND } from '@kuro/shared';
import { AddClipCommand } from '@kuro/editor-core';
import {
  FolderOpen,
  Plus,
  Search,
  Video,
  Music,
  Sparkles,
  Film,
  PlusCircle
} from 'lucide-react';

export const MediaBin: React.FC = () => {
  const [, setTick] = useState(0);
  const [filterCategory, setFilterCategory] = useState<'all' | 'video' | 'audio' | 'remotion-scene'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    return editorStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const project = editorStore.getProject();
  const assets = project.assets;

  const handleSimulateImport = async () => {
    // Adds a demo high-definition media asset to the bin
    const assetId = generateId('asset');
    const newAsset: AssetReference = {
      id: assetId,
      name: `Footage_Take_${assets.length + 1}.mp4`,
      type: 'video',
      storageMode: 'linked',
      filePath: `C:/Media/Footage_Take_${assets.length + 1}.mp4`,
      fileSizeBytes: 1024 * 1024 * 85, // 85 MB
      durationTicks: DEFAULT_TICKS_PER_SECOND * 12, // 12 seconds
      width: 1920,
      height: 1080,
      fpsNumerator: 30,
      fpsDenominator: 1,
      codec: 'h264',
    };

    const updated = {
      ...project,
      assets: [...assets, newAsset],
    };
    editorStore.getEditorState().setProject(updated);
  };

  const handleAddAssetToTimeline = async (asset: AssetReference) => {
    const videoTrack = project.tracks.find((t) => t.kind === 'video') ?? project.tracks[0];
    if (!videoTrack) return;

    // Calculate start tick at the end of existing clips on this track
    const lastClipEnd = videoTrack.clips.reduce(
      (max, c) => Math.max(max, c.timelineStartTicks + c.durationTicks),
      0
    );

    const clipDuration = asset.durationTicks ?? DEFAULT_TICKS_PER_SECOND * 5;
    const clipId = generateId('clip');

    const cmd = new AddClipCommand(
      {
        id: clipId,
        assetId: asset.id,
        trackId: videoTrack.id,
        timelineStartTicks: lastClipEnd,
        durationTicks: clipDuration,
        sourceInTicks: 0,
        sourceOutTicks: clipDuration,
        effects: [],
      },
      videoTrack.id
    );

    await editorStore.executeCommand(cmd);
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = filterCategory === 'all' || asset.type === filterCategory;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800 select-none overflow-hidden">
      {/* Media Bin Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
          <span>Media Bin</span>
          <span className="text-slate-500 font-normal">({assets.length})</span>
        </h3>

        <button
          onClick={handleSimulateImport}
          className="studio-btn studio-btn-primary text-xs px-2.5 py-1 flex items-center gap-1.5 shadow-sm"
          title="Import Video, Audio, or Image files"
        >
          <Plus className="w-3 h-3" />
          <span>Import</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="p-2 border-b border-slate-800 space-y-2 bg-slate-950/40">
        <div className="relative">
          <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search media..."
            className="w-full bg-slate-900 border border-slate-800 rounded pl-7 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex gap-1 text-[11px]">
          {(['all', 'video', 'audio', 'remotion-scene'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2 py-0.5 rounded capitalize transition ${
                filterCategory === cat
                  ? 'bg-slate-800 text-sky-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'remotion-scene' ? 'Remotion' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Grid / List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredAssets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
            <Film className="w-8 h-8 text-slate-600 mb-2" />
            <p className="font-medium text-slate-400">No media assets</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[180px]">
              Click &quot;+ Import&quot; or drop footage here to start editing
            </p>
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const durationSec = ((asset.durationTicks ?? 0) / project.timelineTimebase).toFixed(1);
            return (
              <div
                key={asset.id}
                onClick={() => handleAddAssetToTimeline(asset)}
                className="group flex items-center justify-between p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 cursor-pointer transition shadow-sm"
                title="Click to place on timeline"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-md bg-slate-950 flex items-center justify-center text-sm shrink-0 border border-slate-800 text-slate-300">
                    {asset.type === 'video' ? (
                      <Video className="w-4 h-4 text-sky-400" />
                    ) : asset.type === 'audio' ? (
                      <Music className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    )}
                  </div>
                  <div className="truncate text-left">
                    <p className="text-xs font-medium text-slate-200 truncate group-hover:text-sky-300">
                      {asset.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {durationSec}s {asset.width ? `• ${asset.width}x${asset.height}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  className="opacity-0 group-hover:opacity-100 text-[11px] text-sky-400 bg-sky-950/60 hover:bg-sky-900 border border-sky-800 px-2 py-0.5 rounded flex items-center gap-1 transition"
                  title="Add clip to timeline"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
