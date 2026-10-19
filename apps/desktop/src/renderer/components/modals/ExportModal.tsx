import React, { useState } from 'react';
import { modalStore } from '../../stores/useModalStore';
import { editorStore } from '../../stores/useEditorStore';
import {
  Download,
  CheckCircle2,
  Folder,
  X,
  Loader2
} from 'lucide-react';

export const ExportModal: React.FC = () => {
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [fps, setFps] = useState<number>(30);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);

  const project = editorStore.getProject();

  const handleStartRender = () => {
    setIsRendering(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsRendering(false);
          return 100;
        }
        return prev + 10;
      });
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="w-[500px] bg-[var(--kuro-bg-panel)] border border-[var(--kuro-border-base)] rounded-md shadow-2xl overflow-hidden flex flex-col text-xs text-[var(--kuro-text-primary)]">
        {/* Header */}
        <div className="p-3.5 border-b border-[var(--kuro-border-subtle)] flex items-center justify-between bg-[var(--kuro-bg-base)]">
          <h2 className="font-semibold text-xs tracking-wider uppercase flex items-center gap-2">
            <Download className="w-3.5 h-3.5" />
            <span>Export Video</span>
            <span className="text-[var(--kuro-text-muted)] font-normal text-[11px]">({project.name})</span>
          </h2>
          <button
            onClick={() => modalStore.closeModal()}
            className="text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] p-1 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="font-medium text-[var(--kuro-text-secondary)]">Resolution Preset</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setResolution('1080p')}
                className={`p-3 rounded border text-left transition ${
                  resolution === '1080p'
                    ? 'bg-[var(--kuro-text-primary)] text-[var(--kuro-bg-canvas)] border-[var(--kuro-text-primary)] font-semibold'
                    : 'bg-[var(--kuro-bg-surface)] border-[var(--kuro-border-subtle)] text-[var(--kuro-text-secondary)] hover:border-[var(--kuro-border-base)]'
                }`}
              >
                <div className="font-semibold text-xs">1080p Full HD</div>
                <div className="text-[10px] opacity-70 mt-0.5 font-mono">1920 x 1080 • Standard Delivery</div>
              </button>
              <button
                onClick={() => setResolution('720p')}
                className={`p-3 rounded border text-left transition ${
                  resolution === '720p'
                    ? 'bg-[var(--kuro-text-primary)] text-[var(--kuro-bg-canvas)] border-[var(--kuro-text-primary)] font-semibold'
                    : 'bg-[var(--kuro-bg-surface)] border-[var(--kuro-border-subtle)] text-[var(--kuro-text-secondary)] hover:border-[var(--kuro-border-base)]'
                }`}
              >
                <div className="font-semibold text-xs">720p Fast Preview</div>
                <div className="text-[10px] opacity-70 mt-0.5 font-mono">1280 x 720 • Quick Draft</div>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[var(--kuro-text-secondary)]">Frame Rate</label>
            <select
              value={fps}
              onChange={(e) => setFps(parseInt(e.target.value, 10))}
              className="w-full bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)] rounded p-2 text-[var(--kuro-text-primary)] focus:outline-none cursor-pointer"
            >
              <option value={24}>24 fps (Cinematic)</option>
              <option value={30}>30 fps (Web Delivery)</option>
              <option value={60}>60 fps (Smooth Motion)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[var(--kuro-text-secondary)]">Output Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`C:/Users/Kuro/Videos/${project.name.replace(/\s+/g, '_')}_1080p.mp4`}
                className="flex-1 bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)] rounded px-2.5 py-1.5 text-[11px] text-[var(--kuro-text-muted)] font-mono"
              />
              <button className="kuro-btn kuro-btn-secondary px-3 py-1.5 text-[11px] flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5" />
                <span>Browse</span>
              </button>
            </div>
          </div>

          {/* Render Progress */}
          {isRendering && (
            <div className="space-y-2 pt-2 border-t border-[var(--kuro-border-subtle)]">
              <div className="flex justify-between text-[var(--kuro-text-secondary)] font-medium text-[11px]">
                <span className="flex items-center gap-1.5 font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Encoding FFmpeg Stream...</span>
                </span>
                <span className="font-mono font-bold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-sm bg-[var(--kuro-bg-surface)] overflow-hidden border border-[var(--kuro-border-subtle)]">
                <div
                  className="h-full bg-[var(--kuro-text-primary)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {progress === 100 && (
            <div className="p-2.5 bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-strong)] rounded text-[var(--kuro-text-primary)] text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Video exported successfully.</span>
              </span>
              <button className="underline text-[11px]">Reveal File</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[var(--kuro-bg-base)] border-t border-[var(--kuro-border-subtle)] flex justify-end gap-2">
          <button
            onClick={() => modalStore.closeModal()}
            className="kuro-btn kuro-btn-secondary px-3 py-1.5"
          >
            Close
          </button>
          <button
            onClick={handleStartRender}
            disabled={isRendering}
            className="kuro-btn kuro-btn-primary px-4 py-1.5 font-semibold disabled:opacity-30"
          >
            {isRendering ? 'Rendering...' : 'Start Export'}
          </button>
        </div>
      </div>
    </div>
  );
};
