import React, { useState } from 'react';
import { modalStore } from '../../stores/useModalStore';
import { OFFICIAL_KURO_STORE_CATALOG } from '@kuro/store';
import {
  ShoppingBag,
  Palette,
  Zap,
  Sparkles,
  Check,
  Download,
  Trash2,
  X,
  ShieldCheck
} from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="w-[640px] max-h-[85vh] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Official Content Store</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  Closed Beta
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={() => modalStore.closeModal()}
            className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-slate-400 text-xs flex items-center gap-1.5 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Download approved KuroLabs asset packs, LUTs, and Remotion scene templates. All content is cryptographically verified.
            </span>
          </p>

          <div className="space-y-2.5">
            {OFFICIAL_KURO_STORE_CATALOG.map((pack) => {
              const isInstalled = installedPacks.has(pack.id);
              return (
                <div
                  key={pack.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition shadow-sm"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shrink-0">
                      {pack.category === 'luts' ? (
                        <Palette className="w-5 h-5 text-amber-400" />
                      ) : pack.category === 'transitions' ? (
                        <Zap className="w-5 h-5 text-sky-400" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200 text-xs">{pack.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                          v{pack.version}
                        </span>
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
                    className={`studio-btn text-xs px-3 py-1.5 font-bold shrink-0 transition flex items-center gap-1.5 shadow-sm ${
                      isInstalled
                        ? 'bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300'
                        : 'studio-btn-primary'
                    }`}
                  >
                    {isInstalled ? (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Uninstall</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Install</span>
                      </>
                    )}
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
