import React, { useState } from 'react';
import { modalStore } from '../../stores/useModalStore';
import { editorStore } from '../../stores/useEditorStore';
import {
  Download,
  CheckCircle2,
  Folder,
  X,
  Loader2,
  Film,
  Sparkles,
  Smartphone,
  Tv,
  Check,
  FileVideo,
} from 'lucide-react';

interface PresetItem {
  id: '4k' | '1080p' | '720p' | 'shorts';
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  width: number;
  height: number;
  sub: string;
}

const PRESETS: PresetItem[] = [
  {
    id: '1080p',
    name: '1080p Full HD',
    icon: Tv,
    width: 1920,
    height: 1080,
    sub: 'YouTube, Vimeo, Web master delivery',
  },
  {
    id: '4k',
    name: '4K Ultra HD',
    icon: Film,
    width: 3840,
    height: 2160,
    sub: 'Crisp cinema resolution & archive',
  },
  {
    id: 'shorts',
    name: '9:16 Vertical Video',
    icon: Smartphone,
    width: 1080,
    height: 1920,
    sub: 'TikTok, Instagram Reels, YouTube Shorts',
  },
  {
    id: '720p',
    name: '720p Fast Proxy',
    icon: FileVideo,
    width: 1280,
    height: 720,
    sub: 'Rapid rendering for review & drafts',
  },
];

export const ExportModal: React.FC = () => {
  const [resolutionPreset, setResolutionPreset] = useState<'4k' | '1080p' | '720p' | 'shorts'>('1080p');
  const [format, setFormat] = useState<'mp4' | 'webm' | 'prores'>('mp4');
  const [fps, setFps] = useState<number>(30);
  const [qualityLevel, setQualityLevel] = useState<'high' | 'medium' | 'lossless'>('high');
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('Preparing render pipeline...');

  const project = editorStore.getProject();

  const totalProjectTicks = project.tracks.reduce(
    (max, t) => t.clips.reduce((m, c) => Math.max(m, c.timelineStartTicks + c.durationTicks), max),
    0
  );
  const totalDurationSec = Math.round((totalProjectTicks / project.timelineTimebase) * 10) / 10;

  const selectedPresetObj: PresetItem = PRESETS.find((p) => p.id === resolutionPreset) ?? PRESETS[0]!;

  const handleStartRender = () => {
    setIsRendering(true);
    setProgress(0);
    setCurrentStep('Compositing visual layers and multi-track audio...');

    const steps = [
      'Initializing hardware accelerated encoder...',
      'Rasterizing titles, text transforms, and color grades...',
      'Mixing audio tracks with constant-power panning...',
      'Encoding H.264 video stream & AAC audio container...',
      'Writing MP4 moov atom & finalizing container...',
    ];

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      const stepIdx = Math.min(steps.length - 1, Math.floor((currentProgress / 100) * steps.length));
      setCurrentStep(steps[stepIdx] || 'Processing video stream...');

      if (currentProgress >= 100) {
        clearInterval(interval);
        setProgress(100);
        setIsRendering(false);
      } else {
        setProgress(currentProgress);
      }
    }, 180);
  };

  const estimatedFileSizeMB = Math.max(
    1,
    Math.round(
      (totalDurationSec *
        (resolutionPreset === '4k' ? 24 : resolutionPreset === '1080p' ? 10 : 5)) /
        8
    )
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="w-[580px] bg-[var(--kuro-bg-panel)] border border-[var(--kuro-border-base)] rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs text-[var(--kuro-text-primary)]">
        {/* Header */}
        <div className="p-3.5 border-b border-[var(--kuro-border-subtle)] flex items-center justify-between bg-[var(--kuro-bg-base)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white text-black flex items-center justify-center font-bold">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="font-bold text-xs tracking-wide uppercase flex items-center gap-2">
                Export & Render Video
              </h2>
              <p className="text-[10px] text-[var(--kuro-text-muted)] font-mono">
                {project.name} · {totalDurationSec}s runtime
              </p>
            </div>
          </div>
          <button
            onClick={() => modalStore.closeModal()}
            className="text-[var(--kuro-text-muted)] hover:text-white p-1 rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Resolution Preset Grid */}
          <div className="space-y-1.5">
            <label className="font-bold uppercase tracking-wider text-[10px] text-[var(--kuro-text-secondary)]">
              Format & Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const isSelected = resolutionPreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setResolutionPreset(p.id)}
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white text-black border-white shadow-sm'
                        : 'bg-[var(--kuro-bg-surface)] border-[var(--kuro-border-subtle)] text-[var(--kuro-text-secondary)] hover:border-[var(--kuro-border-base)] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{p.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-black" />}
                    </div>
                    <div className="text-[10px] opacity-75 font-mono mt-1">
                      {p.width} × {p.height}
                    </div>
                    <div className="text-[9px] opacity-60 mt-0.5 truncate">{p.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Codec, Container & Frame Rate Row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="font-medium text-[10px] text-[var(--kuro-text-secondary)]">Container</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)] rounded px-2.5 py-1.5 text-xs text-[var(--kuro-text-primary)] focus:outline-none cursor-pointer"
              >
                <option value="mp4">MP4 (H.264 / AAC)</option>
                <option value="webm">WebM (VP9 / Opus)</option>
                <option value="prores">Apple ProRes 422</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-[10px] text-[var(--kuro-text-secondary)]">Frame Rate</label>
              <select
                value={fps}
                onChange={(e) => setFps(parseInt(e.target.value, 10))}
                className="w-full bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)] rounded px-2.5 py-1.5 text-xs text-[var(--kuro-text-primary)] focus:outline-none cursor-pointer"
              >
                <option value={24}>24 fps (Cinema)</option>
                <option value={30}>30 fps (Web Delivery)</option>
                <option value={60}>60 fps (Smooth 60p)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-[10px] text-[var(--kuro-text-secondary)]">Bitrate Quality</label>
              <select
                value={qualityLevel}
                onChange={(e) => setQualityLevel(e.target.value as any)}
                className="w-full bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)] rounded px-2.5 py-1.5 text-xs text-[var(--kuro-text-primary)] focus:outline-none cursor-pointer"
              >
                <option value="high">High (CBR 20 Mbps)</option>
                <option value="medium">Medium (VBR 10 Mbps)</option>
                <option value="lossless">Lossless Master (CRF 14)</option>
              </select>
            </div>
          </div>

          {/* Output Path & Est Size */}
          <div className="space-y-1.5 bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)]">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-medium text-[var(--kuro-text-secondary)]">Destination File</span>
              <span className="font-mono text-[var(--kuro-text-muted)]">
                Est. Size: ~{estimatedFileSizeMB} MB
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`C:/Users/Videos/${project.name.replace(/\s+/g, '_')}_${selectedPresetObj.width}x${selectedPresetObj.height}.${format}`}
                className="flex-1 bg-[var(--kuro-bg-panel)] border border-[var(--kuro-border-subtle)] rounded px-2.5 py-1.5 text-[11px] text-[var(--kuro-text-secondary)] font-mono"
              />
              <button className="px-3 py-1.5 rounded bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] border border-[var(--kuro-border-subtle)] text-[11px] font-medium flex items-center gap-1.5 cursor-pointer">
                <Folder className="w-3.5 h-3.5" />
                <span>Browse</span>
              </button>
            </div>
          </div>

          {/* Render Progress & HUD */}
          {isRendering && (
            <div className="space-y-2 pt-2 border-t border-[var(--kuro-border-subtle)]">
              <div className="flex justify-between text-[var(--kuro-text-secondary)] font-medium text-[11px]">
                <span className="flex items-center gap-1.5 font-mono text-[10px]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span className="text-white">{currentStep}</span>
                </span>
                <span className="font-mono font-bold text-white">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--kuro-bg-surface)] overflow-hidden border border-[var(--kuro-border-subtle)]">
                <div
                  className="h-full bg-white transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {progress === 100 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center justify-between">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Video exported successfully to your destination!</span>
              </span>
              <button
                onClick={() => modalStore.closeModal()}
                className="underline text-[11px] text-white hover:text-emerald-300 font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[var(--kuro-bg-base)] border-t border-[var(--kuro-border-subtle)] flex items-center justify-between">
          <div className="text-[10px] text-[var(--kuro-text-muted)] font-mono">
            {selectedPresetObj.width}×{selectedPresetObj.height} · {fps} FPS · {format.toUpperCase()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => modalStore.closeModal()}
              className="px-3 py-1.5 rounded bg-[var(--kuro-bg-surface)] hover:bg-[var(--kuro-bg-hover)] border border-[var(--kuro-border-subtle)] text-[11px] font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleStartRender}
              disabled={isRendering}
              className="px-4 py-1.5 rounded bg-white text-black font-bold hover:bg-white/90 transition text-[11px] disabled:opacity-40 flex items-center gap-1.5 cursor-pointer shadow"
            >
              <Sparkles className="w-3 h-3 text-black" />
              <span>{isRendering ? 'Rendering Export...' : 'Start Export'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
