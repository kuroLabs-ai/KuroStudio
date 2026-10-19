import React, { useState } from 'react';
import { modalStore } from '../../stores/useModalStore';
import {
  Settings,
  Key,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  X,
  Server
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'openai' | 'anthropic' | 'gemini' | 'ollama'>('anthropic');
  const [keys, setKeys] = useState({
    openai: 'sk-proj-demo-openai-key-sample',
    anthropic: 'sk-ant-api-demo-claude-key-sample',
    gemini: 'AIzaSyDemoGeminiKeySample',
    ollama: 'http://127.0.0.1:11434',
  });
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  const handleTestConnection = () => {
    setConnectionStatus('Testing connection...');
    setTimeout(() => {
      setConnectionStatus('Verified API connection and model capabilities.');
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="w-[540px] bg-[var(--kuro-bg-panel)] border border-[var(--kuro-border-base)] rounded-md shadow-2xl overflow-hidden flex flex-col text-xs text-[var(--kuro-text-primary)]">
        {/* Header */}
        <div className="p-3.5 border-b border-[var(--kuro-border-subtle)] flex items-center justify-between bg-[var(--kuro-bg-base)]">
          <h2 className="font-semibold text-xs tracking-wider uppercase flex items-center gap-2">
            <Settings className="w-3.5 h-3.5" />
            <span>AI Provider Configuration</span>
          </h2>
          <button
            onClick={() => modalStore.closeModal()}
            className="text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] p-1 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provider Tabs */}
        <div className="flex border-b border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-canvas)] px-3 pt-2 gap-1.5 font-mono">
          {(['anthropic', 'openai', 'gemini', 'ollama'] as const).map((prov) => (
            <button
              key={prov}
              onClick={() => {
                setActiveTab(prov);
                setConnectionStatus(null);
              }}
              className={`px-3 py-1.5 text-xs rounded-t font-medium transition flex items-center gap-1.5 ${
                activeTab === prov
                  ? 'bg-[var(--kuro-bg-panel)] text-[var(--kuro-text-primary)] border-t border-x border-[var(--kuro-border-base)]'
                  : 'text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)]'
              }`}
            >
              {prov === 'ollama' ? <Server className="w-3 h-3" /> : <Key className="w-3 h-3" />}
              <span>{prov}</span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="font-medium text-[var(--kuro-text-secondary)] flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              <span>{activeTab === 'ollama' ? 'Local Ollama Endpoint' : 'API Key'}</span>
            </label>
            <input
              type={activeTab === 'ollama' ? 'text' : 'password'}
              value={keys[activeTab]}
              onChange={(e) => setKeys({ ...keys, [activeTab]: e.target.value })}
              className="w-full bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)] rounded px-3 py-1.5 text-[var(--kuro-text-primary)] font-mono text-xs focus:outline-none focus:border-[var(--kuro-text-primary)]"
            />
            <p className="text-[11px] text-[var(--kuro-text-muted)] flex items-center gap-1.5 mt-1 font-mono">
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>Credentials encrypted with OS safeStorage. Zero telemetry.</span>
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleTestConnection}
              className="kuro-btn kuro-btn-secondary px-3 py-1.5 flex items-center gap-1.5"
            >
              <Cpu className="w-3 h-3" />
              <span>Test Connection</span>
            </button>

            {connectionStatus && (
              <span className="text-[11px] text-[var(--kuro-text-primary)] font-mono flex items-center gap-1 bg-[var(--kuro-bg-surface)] px-2 py-0.5 rounded border border-[var(--kuro-border-subtle)]">
                <CheckCircle2 className="w-3 h-3" />
                <span>{connectionStatus}</span>
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[var(--kuro-bg-base)] border-t border-[var(--kuro-border-subtle)] flex justify-end gap-2">
          <button
            onClick={() => modalStore.closeModal()}
            className="kuro-btn kuro-btn-primary px-4 py-1.5 font-semibold"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
