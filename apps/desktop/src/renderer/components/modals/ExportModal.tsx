import React, { useState } from 'react';
import { modalStore } from '../../stores/useModalStore';
import { editorStore } from '../../stores/useEditorStore';

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
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="w-[500px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <span>🚀 Export Video</span>
            <span className="text-slate-400 font-normal">({project.name})</span>
          </h2>
          <button
            onClick={() => modalStore.closeModal()}
            className="text-slate-400 hover:text-slate-200 text-sm px-1.5"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Resolution Preset</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setResolution('1080p')}
                className={`p-2.5 rounded border text-left transition ${
                  resolution === '1080p'
                    ? 'bg-sky-950/60 border-sky-500 text-sky-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">1080p Full HD</div>
                <div className="text-[11px] opacity-70">1920 x 1080 • Standard Delivery</div>
              </button>
              <button
                onClick={() => setResolution('720p')}
                className={`p-2.5 rounded border text-left transition ${
                  resolution === '720p'
                    ? 'bg-sky-950/60 border-sky-500 text-sky-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">720p Fast Preview</div>
                <div className="text-[11px] opacity-70">1280 x 720 • Quick Social Export</div>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Frame Rate</label>
            <select
              value={fps}
              onChange={(e) => setFps(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none"
            >
              <option value={24}>24 fps (Cinematic)</option>
              <option value={30}>30 fps (Standard Web/Social)</option>
              <option value={60}>60 fps (Smooth Motion)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Output Destination</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`C:/Users/Kuro/Videos/${project.name.replace(/\s+/g, '_')}_1080p.mp4`}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-[11px] text-slate-400 font-mono"
              />
              <button className="studio-btn studio-btn-secondary px-3 py-1.5 text-[11px]">
                Browse...
              </button>
            </div>
          </div>

          {/* Render Progress Bar */}
          {isRendering && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex justify-between text-slate-300 font-medium text-[11px]">
                <span>Encoding FFmpeg Stream...</span>
                <span className="font-mono text-sky-400 font-bold">{progress}%</span>
              </div>
              <div className="w-full h-2 rounded bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {progress === 100 && (
            <div className="p-2.5 bg-emerald-950/50 border border-emerald-500/50 rounded text-emerald-300 text-xs flex items-center justify-between">
              <span>✅ Video exported successfully!</span>
              <button className="underline font-bold text-[11px]">Reveal File</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={() => modalStore.closeModal()}
            className="studio-btn studio-btn-secondary px-3 py-1.5"
          >
            Close
          </button>
          <button
            onClick={handleStartRender}
            disabled={isRendering}
            className="studio-btn studio-btn-primary px-4 py-1.5 font-bold disabled:opacity-50"
          >
            {isRendering ? 'Rendering...' : 'Start Export'}
          </button>
        </div>
      </div>
    </div>
  );
};
