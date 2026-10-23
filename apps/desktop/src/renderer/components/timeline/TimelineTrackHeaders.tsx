import React from 'react';
import { Track } from '@kuro/project-format';
import { Video, Music, Volume2, VolumeX, Plus, Trash2 } from 'lucide-react';

export interface TimelineTrackHeadersProps {
  tracks: Track[];
  mainVideoTrack?: Track;
  mainAudioTrack?: Track;
  dragOverTrackId: string | null;
  isDragOverNewVideo: boolean;
  isDragOverNewAudio: boolean;
  onAddVideoTrack: () => string;
  onAddAudioTrack: () => string;
  onDeleteTrack: (trackId: string, e: React.MouseEvent) => void;
  onToggleMute: (trackId: string, currentMuted: boolean) => void;
  getTrackHeight: (trackId: string) => number;
  onStartResizeTrack: (trackId: string, e: React.MouseEvent) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const TimelineTrackHeaders: React.FC<TimelineTrackHeadersProps> = ({
  tracks,
  mainVideoTrack,
  mainAudioTrack,
  dragOverTrackId,
  isDragOverNewVideo,
  isDragOverNewAudio,
  onAddVideoTrack,
  onAddAudioTrack,
  onDeleteTrack,
  onToggleMute,
  getTrackHeight,
  onStartResizeTrack,
  containerRef,
}) => {
  return (
    <div
      ref={containerRef}
      className="w-44 bg-[var(--kuro-bg-panel)] border-r border-[var(--kuro-border-subtle)] shrink-0 z-40 shadow-sm flex flex-col select-none overflow-hidden"
    >
      {/* Top Header Controls */}
      <div className="h-6 border-b border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-canvas)] px-2 flex items-center justify-between text-[9px] text-[var(--kuro-text-muted)] font-mono uppercase tracking-wider shrink-0">
        <span>LAYERS ({tracks.length})</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddVideoTrack}
            className="px-1.5 py-0.5 rounded bg-[var(--kuro-bg-elevated)] hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] text-[9px] font-bold flex items-center gap-0.5 transition cursor-pointer"
            title="Add Video / Overlay Layer on Top"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>+V</span>
          </button>
          <button
            onClick={onAddAudioTrack}
            className="px-1.5 py-0.5 rounded bg-[var(--kuro-bg-elevated)] hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] text-[9px] font-bold flex items-center gap-0.5 transition cursor-pointer"
            title="Add Audio Track at Bottom"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>+A</span>
          </button>
        </div>
      </div>

      {/* New Video Layer Drop Header */}
      <div
        className={`h-8 px-2 border-b border-dashed flex items-center justify-between text-[9px] font-mono shrink-0 transition-colors ${
          isDragOverNewVideo
            ? 'bg-white/20 text-white font-bold border-white'
            : 'border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-surface)]/30 text-[var(--kuro-text-muted)]'
        }`}
      >
        <span className="flex items-center gap-1 text-[var(--kuro-text-secondary)] font-semibold">
          <Plus className="w-2.5 h-2.5" />
          NEW VIDEO
        </span>
        <button
          onClick={onAddVideoTrack}
          className="px-1 py-0.2 rounded bg-[var(--kuro-bg-elevated)] hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] text-[8px] font-bold cursor-pointer"
          title="Add Video Track on Top"
        >
          +V
        </button>
      </div>

      {/* Track Headers Stack */}
      <div className="flex-1 flex flex-col">
        {tracks.map((track) => {
          const isMainVideo = track.id === mainVideoTrack?.id;
          const isMainAudio = track.id === mainAudioTrack?.id;
          const isCustomTrack = !isMainVideo && !isMainAudio;
          const isOver = dragOverTrackId === track.id;
          const trackHeight = getTrackHeight(track.id);

          let trackLabel = track.name;
          let subLabel = `${track.clips.length} clip${track.clips.length === 1 ? '' : 's'}`;

          if (isMainVideo) {
            trackLabel = 'V1: Main Video';
            subLabel = 'Media & Photos';
          } else if (track.kind === 'video') {
            subLabel = 'Titles / overlay';
          } else if (isMainAudio) {
            trackLabel = 'A1: Main Audio';
          }

          return (
            <div
              key={track.id}
              style={{ height: `${trackHeight}px` }}
              className={`px-2.5 border-b border-[var(--kuro-border-subtle)] flex items-center justify-between transition-colors group relative shrink-0 ${
                isOver ? 'bg-[var(--kuro-bg-hover)]' : 'bg-[var(--kuro-bg-panel)]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)] text-[var(--kuro-text-secondary)] shrink-0">
                  {track.kind === 'video' ? <Video className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-semibold truncate ${
                        track.muted ? 'line-through opacity-50' : isMainVideo ? 'text-[var(--kuro-text-primary)]' : 'text-[var(--kuro-text-secondary)]'
                      }`}
                    >
                      {trackLabel}
                    </span>
                    {(isMainVideo || isMainAudio) && (
                      <span className="text-[8px] bg-white text-black font-black px-1 rounded tracking-tighter shadow-xs shrink-0">
                        MAIN
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-[var(--kuro-text-muted)] font-mono block truncate">
                    {subLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {isCustomTrack && (
                  <button
                    onClick={(e) => onDeleteTrack(track.id, e)}
                    className="p-1 rounded text-[var(--kuro-text-muted)] hover:text-white hover:bg-[var(--kuro-bg-hover)] opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Remove this layer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                <button
                  onClick={() => onToggleMute(track.id, track.muted ?? false)}
                  className={`p-1 rounded text-[10px] font-mono transition cursor-pointer ${
                    track.muted
                      ? 'bg-[var(--kuro-text-primary)] text-[var(--kuro-bg-canvas)] font-bold'
                      : 'text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] hover:bg-[var(--kuro-bg-hover)]'
                  }`}
                  title={track.muted ? 'Unmute Track' : 'Mute Track'}
                >
                  {track.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                </button>
              </div>

              {/* Bottom Interactive Resize Handle (Extend Layer in Y) */}
              <div
                onMouseDown={(e) => onStartResizeTrack(track.id, e)}
                className="absolute bottom-0 left-0 right-0 h-1.5 cursor-row-resize hover:bg-white/60 z-30 transition-colors"
                title="Drag up/down to extend layer height (Y)"
              />
            </div>
          );
        })}
      </div>

      {/* New Audio Layer Drop Header */}
      <div
        className={`h-8 px-2 border-b border-dashed flex items-center justify-between text-[9px] font-mono shrink-0 transition-colors ${
          isDragOverNewAudio
            ? 'bg-white/20 text-white font-bold border-white'
            : 'border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-surface)]/30 text-[var(--kuro-text-muted)]'
        }`}
      >
        <span className="flex items-center gap-1 text-[var(--kuro-text-secondary)] font-semibold">
          <Plus className="w-2.5 h-2.5" />
          NEW AUDIO
        </span>
        <button
          onClick={onAddAudioTrack}
          className="px-1 py-0.2 rounded bg-[var(--kuro-bg-elevated)] hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-primary)] border border-[var(--kuro-border-subtle)] text-[8px] font-bold cursor-pointer"
          title="Add Audio Track at Bottom"
        >
          +A
        </button>
      </div>
    </div>
  );
};
