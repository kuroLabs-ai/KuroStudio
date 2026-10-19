import React, { useEffect, useState } from 'react';
import { layoutStore } from '../../stores/useLayoutStore';
import {
  GripVertical,
  GripHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface VerticalSplitterProps {
  side: 'left' | 'right';
}

export const VerticalSplitter: React.FC<VerticalSplitterProps> = ({ side }) => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (side === 'left') {
        // Activity bar is 48px
        const newWidth = e.clientX - 48;
        layoutStore.setLeftPanelWidth(newWidth);
      } else {
        const newWidth = window.innerWidth - e.clientX;
        layoutStore.setInspectorWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDragging, side]);

  const handleDoubleClick = () => {
    if (side === 'left') {
      layoutStore.setLeftPanelWidth(320);
    } else {
      layoutStore.setInspectorWidth(290);
    }
  };

  return (
    <div
      onMouseDown={() => setIsDragging(true)}
      onDoubleClick={handleDoubleClick}
      className="w-1.5 hover:w-2 shrink-0 cursor-col-resize group relative flex items-center justify-center transition-all z-20"
      style={{
        background: isDragging
          ? 'var(--kuro-text-primary)'
          : 'var(--kuro-border-subtle)',
      }}
      title={`Drag to resize panel. Double-click to reset.`}
    >
      <div
        className="w-0.5 h-6 rounded-full transition opacity-0 group-hover:opacity-100"
        style={{ background: 'var(--kuro-text-primary)' }}
      />
    </div>
  );
};

export const HorizontalSplitter: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const isTimelineVisible = layoutStore.isTimelineVisible();

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      // TopBar is 40px
      const availableHeight = window.innerHeight - 40;
      const relativeY = e.clientY - 40;
      const ratio = relativeY / availableHeight;
      layoutStore.setUpperHeightRatio(ratio);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
  }, [isDragging]);

  const handleDoubleClick = () => {
    layoutStore.setUpperHeightRatio(0.58);
  };

  return (
    <div
      onMouseDown={() => setIsDragging(true)}
      onDoubleClick={handleDoubleClick}
      className="h-1.5 hover:h-2 w-full shrink-0 cursor-row-resize group relative flex items-center justify-center transition-all z-20"
      style={{
        background: isDragging
          ? 'var(--kuro-text-primary)'
          : 'var(--kuro-border-subtle)',
      }}
      title="Drag up/down to resize Timeline. Double-click to reset."
    >
      {/* Center grip pill */}
      <div
        className="h-1 w-12 rounded-full transition opacity-40 group-hover:opacity-100 flex items-center justify-center"
        style={{ background: 'var(--kuro-text-muted)' }}
      />

      {/* Quick toggle button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          layoutStore.toggleTimeline();
        }}
        className="absolute right-4 px-1.5 py-0.5 rounded text-[10px] hidden group-hover:flex items-center gap-1 shadow-sm transition"
        style={{
          background: 'var(--kuro-bg-elevated)',
          border: '1px solid var(--kuro-border-default)',
          color: 'var(--kuro-text-secondary)',
        }}
        title={isTimelineVisible ? 'Collapse Timeline' : 'Expand Timeline'}
      >
        {isTimelineVisible ? (
          <>
            <ChevronDown className="w-3 h-3" />
            <span>Hide Timeline</span>
          </>
        ) : (
          <>
            <ChevronUp className="w-3 h-3" />
            <span>Show Timeline</span>
          </>
        )}
      </button>
    </div>
  );
};
