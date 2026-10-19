import React, { useEffect, useState } from 'react';
import { TopBar } from '../topbar/TopBar';
import { MediaBin } from '../mediabin/MediaBin';
import { PreviewMonitor } from '../preview/PreviewMonitor';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { TimelineView } from '../timeline/TimelineView';
import { AIAssistantDrawer } from '../ai/AIAssistantDrawer';
import { ExportModal } from '../modals/ExportModal';
import { SettingsModal } from '../modals/SettingsModal';
import { StoreModal } from '../modals/StoreModal';
import { modalStore } from '../../stores/useModalStore';

export const AppLayout: React.FC = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    return modalStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const activeModal = modalStore.getActiveModal();

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden font-sans select-none" style={{ background: 'var(--kuro-bg-base)', color: 'var(--kuro-text-primary)' }}>
      {/* 1. Global Top Navigation Bar */}
      <TopBar />

      {/* 2. Main Workstation Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Media Bin */}
        <div className="w-64 h-full shrink-0">
          <MediaBin />
        </div>

        {/* Center-Right Workspace Split */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Upper Section: Preview Monitor & Inspector */}
          <div className="h-[55%] flex overflow-hidden">
            <div className="flex-1 h-full">
              <PreviewMonitor />
            </div>
            <div className="w-72 h-full shrink-0">
              <InspectorPanel />
            </div>
          </div>

          {/* Lower Section: Multi-Track Timeline */}
          <div className="h-[45%] w-full overflow-hidden">
            <TimelineView />
          </div>
        </div>

        {/* Right Collapsible AI Drawer */}
        <AIAssistantDrawer />
      </div>

      {/* 3. Global Modals */}
      {activeModal === 'export' && <ExportModal />}
      {activeModal === 'settings' && <SettingsModal />}
      {activeModal === 'store' && <StoreModal />}
    </div>
  );
};
