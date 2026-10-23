import React, { useEffect, useRef, useState } from 'react';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
import { AssetReference } from '@kuro/project-format';
import { generateId, DEFAULT_TICKS_PER_SECOND } from '@kuro/shared';
import { AddClipCommand } from '@kuro/editor-core';
import {
  FolderOpen,
  Plus,
  Search,
  Video,
  Music,
  PlusCircle,
  Upload,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';

export const MediaBin: React.FC = () => {
  const [, setTick] = useState(0);
  const [filterCategory, setFilterCategory] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return editorStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const project = editorStore.getProject();
  const assets = project.assets;

  // Real File Import Handler
  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    const newAssets: AssetReference[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;

      const blobUrl = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi)$/i.test(file.name);
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|aac|flac)$/i.test(file.name);
      const isImg = file.type.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file.name);

      let assetType: 'video' | 'audio' | 'image' = 'video';
      if (isAudio) assetType = 'audio';
      else if (isImg) assetType = 'image';

      let durationSec = 5.0;
      let width = 1920;
      let height = 1080;
      let thumbnailDataUrl: string | undefined = undefined;

      if (isVideo) {
        try {
          const tempVideo = document.createElement('video');
          tempVideo.src = blobUrl;
          tempVideo.muted = true;
          tempVideo.playsInline = true;

          await new Promise<void>((resolve) => {
            const timer = setTimeout(() => resolve(), 3000);
            tempVideo.onloadedmetadata = () => {
              clearTimeout(timer);
              durationSec = tempVideo.duration || 5.0;
              width = tempVideo.videoWidth || 1920;
              height = tempVideo.videoHeight || 1080;
              resolve();
            };
            tempVideo.onerror = () => {
              clearTimeout(timer);
              resolve();
            };
          });

          // Generate real thumbnail frame
          try {
            tempVideo.currentTime = Math.min(1.0, durationSec / 3);
            await new Promise<void>((res) => {
              const t = setTimeout(() => res(), 1000);
              tempVideo.onseeked = () => {
                clearTimeout(t);
                res();
              };
            });
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 90;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(tempVideo, 0, 0, 160, 90);
              thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            }
          } catch {
            // Fallback
          }
        } catch {
          // Fallback
        }
      } else if (isAudio) {
        try {
          const tempAudio = document.createElement('audio');
          tempAudio.src = blobUrl;
          await new Promise<void>((resolve) => {
            const timer = setTimeout(() => resolve(), 2000);
            tempAudio.onloadedmetadata = () => {
              clearTimeout(timer);
              durationSec = tempAudio.duration || 10.0;
              resolve();
            };
            tempAudio.onerror = () => {
              clearTimeout(timer);
              resolve();
            };
          });
        } catch {
          durationSec = 10.0;
        }
      } else if (isImg) {
        thumbnailDataUrl = blobUrl;
        durationSec = 5.0;
      }

      const localFilePath = (file as unknown as { path?: string }).path || file.name;
      const assetId = generateId('asset');
      const assetRef: AssetReference = {
        id: assetId,
        name: file.name,
        type: assetType,
        storageMode: 'linked',
        filePath: localFilePath,
        fileSizeBytes: file.size,
        durationTicks: Math.round(durationSec * project.timelineTimebase),
        width: isVideo || isImg ? width : undefined,
        height: isVideo || isImg ? height : undefined,
        thumbnailPath: thumbnailDataUrl,
        metadata: {
          blobUrl,
          localPath: (file as unknown as { path?: string }).path || undefined,
          mimeType: file.type,
          lastModified: file.lastModified,
        },
      };

      newAssets.push(assetRef);
    }

    if (newAssets.length > 0) {
      const updatedProject = {
        ...project,
        assets: [...assets, ...newAssets],
      };
      editorStore.getEditorState().setProject(updatedProject);

      if (project.tracks[0]?.clips.length === 0 && newAssets[0]) {
        await handleAddAssetToTimeline(newAssets[0]);
      }
    }

    setIsProcessing(false);
  };

  const handleAddAssetToTimeline = async (asset: AssetReference) => {
    // Always read fresh project state — don't close over the stale render-time snapshot
    const currentProject = editorStore.getProject();
    const targetKind = asset.type === 'audio' ? 'audio' : 'video';
    const targetTrack =
      currentProject.tracks.find((t) => t.kind === targetKind) ?? currentProject.tracks[0];
    if (!targetTrack) return;

    const lastClipEnd = targetTrack.clips.reduce(
      (max, c) => Math.max(max, c.timelineStartTicks + c.durationTicks),
      0
    );

    const clipDuration = asset.durationTicks ?? DEFAULT_TICKS_PER_SECOND * 5;
    const clipId = generateId('clip');

    const cmd = new AddClipCommand(
      {
        id: clipId,
        assetId: asset.id,
        trackId: targetTrack.id,
        timelineStartTicks: lastClipEnd,
        durationTicks: clipDuration,
        sourceInTicks: 0,
        sourceOutTicks: clipDuration,
        effects: [],
        audio: asset.type === 'audio' || asset.type === 'video' ? { volume: 1.0 } : undefined,
      },
      targetTrack.id
    );

    await editorStore.executeCommand(cmd);
    timelineStore.setPlayheadTicks(lastClipEnd);
  };


  const handleDeleteAsset = (assetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = {
      ...project,
      assets: assets.filter((a) => a.id !== assetId),
    };
    editorStore.getEditorState().setProject(updated);
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesCategory = filterCategory === 'all' || asset.type === filterCategory;
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div
      className={`h-full flex flex-col bg-[var(--kuro-bg-panel)] select-none overflow-hidden transition-colors ${
        isDragging ? 'ring-1 ring-[var(--kuro-text-primary)] ring-inset' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files) {
          handleFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*,.mp4,.mov,.webm,.mkv,.avi,.mp3,.wav,.ogg,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Header */}
      <div className="p-2.5 border-b border-[var(--kuro-border-subtle)] flex items-center justify-between bg-[var(--kuro-bg-base)]">
        <h3 className="text-xs font-semibold text-[var(--kuro-text-primary)] uppercase tracking-wider flex items-center gap-1.5">
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Media Bin</span>
          <span className="text-[var(--kuro-text-muted)] font-normal font-mono text-[11px]">
            ({assets.length})
          </span>
        </h3>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
          className="kuro-btn kuro-btn-primary text-xs px-2.5 py-1 flex items-center gap-1 font-semibold"
          title="Browse & Import Videos, Audios, or Images from PC"
        >
          <Upload className="w-3 h-3" />
          <span>{isProcessing ? 'Importing...' : 'Import Media'}</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="p-2 border-b border-[var(--kuro-border-subtle)] space-y-1.5 bg-[var(--kuro-bg-canvas)]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--kuro-text-muted)] absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clips..."
            className="w-full bg-[var(--kuro-bg-panel)] border border-[var(--kuro-border-subtle)] rounded pl-7 pr-2.5 py-1 text-xs text-[var(--kuro-text-primary)] placeholder-[var(--kuro-text-muted)] focus:outline-none focus:border-[var(--kuro-text-primary)] transition"
          />
        </div>

        <div className="flex gap-1 text-[11px]">
          {(['all', 'video', 'audio', 'image'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2 py-0.5 rounded capitalize transition font-medium ${
                filterCategory === cat
                  ? 'bg-[var(--kuro-text-primary)] text-[var(--kuro-bg-canvas)]'
                  : 'text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Grid / List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredAssets.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="h-full flex flex-col items-center justify-center text-center p-4 text-[var(--kuro-text-muted)] text-xs border border-dashed border-[var(--kuro-border-base)] rounded-md cursor-pointer hover:border-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-surface)] transition"
          >
            <div className="w-10 h-10 rounded bg-[var(--kuro-bg-surface)] flex items-center justify-center mb-2 text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)]">
              <Upload className="w-5 h-5" />
            </div>
            <p className="font-semibold text-[var(--kuro-text-primary)] text-xs">Drop media files here</p>
            <p className="text-[11px] text-[var(--kuro-text-muted)] mt-1 max-w-[200px]">
              or click &quot;Import Media&quot; to pick real MP4, MOV, MP3, PNG files from your PC
            </p>
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const durationSec = ((asset.durationTicks ?? 0) / project.timelineTimebase).toFixed(1);
            return (
              <div
                key={asset.id}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/kuro-asset', JSON.stringify(asset));
                  e.dataTransfer.setData('text/plain', JSON.stringify({ kuroType: 'asset', data: asset }));
                  e.dataTransfer.effectAllowed = 'copyMove';
                }}
                onClick={() => handleAddAssetToTimeline(asset)}
                className="group flex items-center justify-between p-2 rounded bg-[var(--kuro-bg-surface)] hover:bg-[var(--kuro-bg-hover)] border border-[var(--kuro-border-subtle)] hover:border-[var(--kuro-border-base)] cursor-grab active:cursor-grabbing transition"
                title="Click or drag to place on timeline"
              >
                <div className="flex items-center gap-2.5 truncate">
                  {/* Thumbnail / Icon Badge */}
                  <div className="w-11 h-8 rounded-sm bg-[var(--kuro-bg-canvas)] flex items-center justify-center overflow-hidden shrink-0 border border-[var(--kuro-border-subtle)]">
                    {asset.thumbnailPath ? (
                      <img
                        src={asset.thumbnailPath}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : asset.type === 'video' ? (
                      <Video className="w-3.5 h-3.5 text-[var(--kuro-text-secondary)]" />
                    ) : asset.type === 'audio' ? (
                      <Music className="w-3.5 h-3.5 text-[var(--kuro-text-secondary)]" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-[var(--kuro-text-secondary)]" />
                    )}
                  </div>

                  <div className="truncate text-left">
                    <p className="text-xs font-medium text-[var(--kuro-text-primary)] truncate">
                      {asset.name}
                    </p>
                    <p className="text-[10px] text-[var(--kuro-text-muted)] font-mono">
                      {durationSec}s {asset.width ? `• ${asset.width}x${asset.height}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddAssetToTimeline(asset);
                    }}
                    className="kuro-btn kuro-btn-primary text-[10px] px-2 py-0.5 flex items-center gap-1"
                    title="Add to Timeline"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteAsset(asset.id, e)}
                    className="p-1 text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] rounded transition"
                    title="Remove from Media Bin"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
