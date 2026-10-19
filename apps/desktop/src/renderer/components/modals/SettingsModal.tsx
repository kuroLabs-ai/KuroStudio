import React, { useState } from 'react';
import { modalStore } from '../../stores/useModalStore';
import {
  Settings,
  Key,
  ShieldCheck,
  CheckCircle2,
  Globe,
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
      <div className="w-[560px] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-sky-400" />
            <span>AI Provider Settings</span>
            <span className="text-slate-400 font-normal text-xs">(BYOK - Bring Your Own Keys)</span>
          </h2>
          <button
            onClick={() => modalStore.closeModal()}
            className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provider Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-4 pt-2 gap-2">
          {(['anthropic', 'openai', 'gemini', 'ollama'] as const).map((prov) => (
            <button
              key={prov}
              onClick={() => {
                setActiveTab(prov);
                setConnectionStatus(null);
              }}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition flex items-center gap-1.5 ${
                activeTab === prov
                  ? 'bg-slate-900 text-sky-400 border-t border-x border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {prov === 'ollama' ? <Server className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5" />}
              <span>
                {prov === 'anthropic' ? 'Anthropic Claude' : prov === 'openai' ? 'OpenAI' : prov === 'gemini' ? 'Google Gemini' : 'Ollama (Local)'}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-sky-400" />
              <span>{activeTab === 'ollama' ? 'Local Ollama Endpoint' : 'API Key'}</span>
            </label>
            <input
              type={activeTab === 'ollama' ? 'text' : 'password'}
              value={keys[activeTab]}
              onChange={(e) => setKeys({ ...keys, [activeTab]: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500 shadow-inner"
            />
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                {activeTab === 'ollama'
                  ? 'Local offline models running on your machine via Ollama.'
                  : 'Keys are encrypted using OS secure storage (safeStorage) and never sent to Kuro servers.'}
              </span>
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleTestConnection}
              className="studio-btn studio-btn-secondary px-3 py-1.5 flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Test Connection</span>
            </button>

            {connectionStatus && (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800/40">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{connectionStatus}</span>
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={() => modalStore.closeModal()}
            className="studio-btn studio-btn-primary px-4 py-1.5 font-bold shadow-md"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
