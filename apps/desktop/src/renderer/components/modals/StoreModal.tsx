import React, { useState } from 'react';
import { modalStore } from '../../stores/useModalStore';
import { OFFICIAL_KURO_STORE_CATALOG } from '@kuro/store';

export const StoreModal: React.FC = () => {
  const [installedPacks, setInstalledPacks] = useState<Set<string>>(new Set(['pack_cyberpunk_luts']));

  const handleToggleInstall = (packId: string) => {
    setInstalledPacks((prev) => {
      const next = new Set(prev);
      if (next.has(packId)) {
        next.delete(packId);
      } else {
        next.add(packId);
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="w-[640px] max-h-[85vh] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-slate-100">🛍️ Official Content Store</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
              Closed Beta
            </span>
          </div>
          <button
            onClick={() => modalStore.closeModal()}
            className="text-slate-400 hover:text-slate-200 text-sm px-1.5"
          >
            ✕
          </button>
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-slate-400 text-xs">
            Download approved KuroLabs asset packs, LUTs, and Remotion scene templates. All content is cryptographically verified.
          </p>

          <div className="space-y-2.5">
            {OFFICIAL_KURO_STORE_CATALOG.map((pack) => {
              const isInstalled = installedPacks.has(pack.id);
              return (
                <div
                  key={pack.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shrink-0">
                      {pack.category === 'luts' ? '🎨' : pack.category === 'transitions' ? '⚡' : '✨'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-xs">{pack.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono">v{pack.version}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{pack.description}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                        <span>By {pack.author}</span>
                        <span>•</span>
                        <span>{pack.declaredFiles.length} assets included</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleInstall(pack.id)}
                    className={`studio-btn text-xs px-3 py-1.5 font-bold shrink-0 transition ${
                      isInstalled
                        ? 'bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300'
                        : 'studio-btn-primary'
                    }`}
                  >
                    {isInstalled ? 'Uninstall' : 'Install'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => modalStore.closeModal()}
            className="studio-btn studio-btn-secondary px-4 py-1.5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
