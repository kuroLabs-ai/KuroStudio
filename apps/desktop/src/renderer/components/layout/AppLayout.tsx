import React, { useEffect, useState } from 'react';
import { TopBar } from '../topbar/TopBar';
import { ToolActivityBar } from '../tools/ToolActivityBar';
import { ToolsContainer } from '../tools/ToolsContainer';
import { PreviewMonitor } from '../preview/PreviewMonitor';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { TimelineView } from '../timeline/TimelineView';
import { VerticalSplitter, HorizontalSplitter } from './Splitters';
import { AIAssistantDrawer } from '../ai/AIAssistantDrawer';
import { ExportModal } from '../modals/ExportModal';
import { SettingsModal } from '../modals/SettingsModal';
import { StoreModal } from '../modals/StoreModal';
import { modalStore } from '../../stores/useModalStore';
import { layoutStore } from '../../stores/useLayoutStore';

export const AppLayout: React.FC = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubModal = modalStore.subscribe(() => setTick((t) => t + 1));
    const unsubLayout = layoutStore.subscribe(() => setTick((t) => t + 1));
    return () => {
      unsubModal();
      unsubLayout();
    };
  }, []);

  const activeModal = modalStore.getActiveModal();

  const isLeftPanelVisible = layoutStore.isLeftPanelVisible();
  const isInspectorVisible = layoutStore.isInspectorVisible();
  const isTimelineVisible = layoutStore.isTimelineVisible();
  const leftPanelWidth = layoutStore.getLeftPanelWidth();
  const inspectorWidth = layoutStore.getInspectorWidth();
  const upperHeightRatio = layoutStore.getUpperHeightRatio();

  // If timeline is hidden, upper section takes 100%
  const upperFlex = isTimelineVisible ? `${upperHeightRatio * 100}%` : '100%';
  const timelineFlex = isTimelineVisible ? `${(1 - upperHeightRatio) * 100}%` : '0%';

  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden font-sans select-none"
      style={{
        background: 'var(--kuro-bg-base)',
        color: 'var(--kuro-text-primary)',
      }}
    >
      {/* 1. Global Top Navigation Bar */}
      <TopBar />

      {/* 2. Main Workstation Body */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Upper Workspace Section (Tools Rail, Tools Drawer, Preview Monitor, Inspector) */}
        <div
          className="flex overflow-hidden relative"
          style={{
            height: isTimelineVisible ? `calc(${upperFlex} - 3px)` : '100%',
            minHeight: isTimelineVisible ? '200px' : '100%',
          }}
        >
          {/* Left Vertical Tool Rail (Always accessible icons for Media, Transitions, Effects, Titles, Audio) */}
          <ToolActivityBar />

          {/* Left Drawer (Media Bin / Active Tool Panel) */}
          {isLeftPanelVisible && (
            <>
              <div
                className="h-full shrink-0 overflow-hidden"
                style={{ width: `${leftPanelWidth}px` }}
              >
                <ToolsContainer />
              </div>

              {/* Vertical Splitter between Tools & Preview */}
              <VerticalSplitter side="left" />
            </>
          )}

          {/* Center: Video Preview Monitor & Transport Controls */}
          <div className="flex-1 h-full min-w-[320px] overflow-hidden">
            <PreviewMonitor />
          </div>

          {/* Right: Inspector / Clip Parameter Panel */}
          {isInspectorVisible && (
            <>
              {/* Vertical Splitter between Preview & Inspector */}
              <VerticalSplitter side="right" />

              <div
                className="h-full shrink-0 overflow-hidden"
                style={{ width: `${inspectorWidth}px` }}
              >
                <InspectorPanel />
              </div>
            </>
          )}
        </div>

        {/* Horizontal Splitter between Upper Workspace & Lower Timeline */}
        {isTimelineVisible && <HorizontalSplitter />}

        {/* Lower Section: Full-Width Multi-Track Timeline (left edge to right edge 100%) */}
        {isTimelineVisible && (
          <div
            className="w-full overflow-hidden"
            style={{
              height: `calc(${timelineFlex} - 3px)`,
              minHeight: '140px',
            }}
          >
            <TimelineView />
          </div>
        )}

        {/* Right Collapsible AI Assistant Drawer */}
        <AIAssistantDrawer />
      </div>

      {/* 3. Global Modals */}
      {activeModal === 'export' && <ExportModal />}
      {activeModal === 'settings' && <SettingsModal />}
      {activeModal === 'store' && <StoreModal />}
    </div>
  );
};
