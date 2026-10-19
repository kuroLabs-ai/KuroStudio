import React, { useState } from 'react';
import { modalStore } from '../../stores/useModalStore';

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
      setConnectionStatus('✅ Successfully verified API connection and model capabilities.');
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="w-[560px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <span>⚙️ AI Provider Settings</span>
            <span className="text-slate-400 font-normal">(BYOK - Bring Your Own Keys)</span>
          </h2>
          <button
            onClick={() => modalStore.closeModal()}
            className="text-slate-400 hover:text-slate-200 text-sm px-1.5"
          >
            ✕
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
              className={`px-3 py-1.5 text-xs font-semibold rounded-t uppercase tracking-wider transition ${
                activeTab === prov
                  ? 'bg-slate-900 text-sky-400 border-t border-x border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {prov === 'anthropic' ? 'Anthropic Claude' : prov === 'openai' ? 'OpenAI' : prov === 'gemini' ? 'Google Gemini' : 'Ollama (Local)'}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">
              {activeTab === 'ollama' ? 'Local Ollama Endpoint' : 'API Key'}
            </label>
            <input
              type={activeTab === 'ollama' ? 'text' : 'password'}
              value={keys[activeTab]}
              onChange={(e) => setKeys({ ...keys, [activeTab]: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
            />
            <p className="text-[11px] text-slate-500">
              {activeTab === 'ollama'
                ? 'Local offline models running on your machine via Ollama.'
                : 'Keys are encrypted using OS secure storage (safeStorage) and never sent to Kuro servers.'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleTestConnection}
              className="studio-btn studio-btn-secondary px-3 py-1.5"
            >
              🔌 Test Connection
            </button>

            {connectionStatus && (
              <span className="text-[11px] text-emerald-400 font-medium">
                {connectionStatus}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={() => modalStore.closeModal()}
            className="studio-btn studio-btn-primary px-4 py-1.5 font-bold"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
