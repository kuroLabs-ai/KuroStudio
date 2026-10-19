import React, { useState } from 'react';
import { modalStore } from '../../stores/useModalStore';
import { OFFICIAL_KURO_STORE_CATALOG } from '@kuro/store';
import {
  ShoppingBag,
  Palette,
  Zap,
  Sparkles,
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none"
      style={{ background: 'rgba(0,0,0,0.75)' }}
    >
      <div
        className="w-[640px] max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs"
        style={{
          background: 'var(--kuro-bg-elevated)',
          border: '1px solid var(--kuro-border-default)',
          color: 'var(--kuro-text-primary)',
        }}
      >
        {/* Header */}
        <div
          className="p-4 flex items-center justify-between"
          style={{
            borderBottom: '1px solid var(--kuro-border-default)',
            background: 'var(--kuro-bg-surface)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{
                background: 'var(--kuro-bg-muted)',
                border: '1px solid var(--kuro-border-default)',
              }}
            >
              <ShoppingBag className="w-4 h-4" style={{ color: 'var(--kuro-text-secondary)' }} />
            </div>
            <div>
              <h2
                className="font-bold text-sm flex items-center gap-2"
                style={{ color: 'var(--kuro-text-primary)' }}
              >
                <span>Official Content Store</span>
                <span
                  className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded"
                  style={{
                    background: 'var(--kuro-bg-muted)',
                    color: 'var(--kuro-text-muted)',
                    border: '1px solid var(--kuro-border-subtle)',
                  }}
                >
                  Closed Beta
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={() => modalStore.closeModal()}
            className="p-1 rounded transition"
            style={{ color: 'var(--kuro-text-muted)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--kuro-bg-muted)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--kuro-text-primary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--kuro-text-muted)';
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Catalog */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p
            className="text-xs flex items-center gap-1.5 p-2.5 rounded-lg"
            style={{
              background: 'var(--kuro-bg-surface)',
              border: '1px solid var(--kuro-border-subtle)',
              color: 'var(--kuro-text-muted)',
            }}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'var(--kuro-text-secondary)' }} />
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
                  className="p-3.5 rounded-xl flex items-center justify-between gap-4 transition"
                  style={{
                    background: 'var(--kuro-bg-surface)',
                    border: '1px solid var(--kuro-border-default)',
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: 'var(--kuro-bg-muted)',
                        border: '1px solid var(--kuro-border-default)',
                      }}
                    >
                      {pack.category === 'luts' ? (
                        <Palette className="w-5 h-5" style={{ color: 'var(--kuro-text-secondary)' }} />
                      ) : pack.category === 'transitions' ? (
                        <Zap className="w-5 h-5" style={{ color: 'var(--kuro-text-secondary)' }} />
                      ) : (
                        <Sparkles className="w-5 h-5" style={{ color: 'var(--kuro-text-secondary)' }} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs" style={{ color: 'var(--kuro-text-primary)' }}>
                          {pack.title}
                        </span>
                        <span
                          className="text-[10px] font-mono px-1.5 rounded"
                          style={{
                            background: 'var(--kuro-bg-muted)',
                            color: 'var(--kuro-text-muted)',
                            border: '1px solid var(--kuro-border-subtle)',
                          }}
                        >
                          v{pack.version}
                        </span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--kuro-text-secondary)' }}>
                        {pack.description}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] mt-1" style={{ color: 'var(--kuro-text-muted)' }}>
                        <span>By {pack.author}</span>
                        <span>•</span>
                        <span>{pack.declaredFiles.length} assets included</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleInstall(pack.id)}
                    className="studio-btn text-xs px-3 py-1.5 font-bold shrink-0 flex items-center gap-1.5"
                    style={
                      isInstalled
                        ? {
                            background: 'var(--kuro-bg-muted)',
                            border: '1px solid var(--kuro-border-default)',
                            color: 'var(--kuro-text-secondary)',
                          }
                        : {}
                    }
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
        <div
          className="p-3 flex justify-end"
          style={{
            background: 'var(--kuro-bg-surface)',
            borderTop: '1px solid var(--kuro-border-default)',
          }}
        >
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
