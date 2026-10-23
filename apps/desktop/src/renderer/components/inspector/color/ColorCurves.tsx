import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, TrendingUp } from 'lucide-react';

export interface CurvePoint {
  x: number; // 0 to 1 (in)
  y: number; // 0 to 1 (out)
}

export type CurveChannel = 'master' | 'red' | 'green' | 'blue';

export interface CurvesState {
  master: CurvePoint[];
  red: CurvePoint[];
  green: CurvePoint[];
  blue: CurvePoint[];
}

interface ColorCurvesProps {
  curves: CurvesState;
  onChangeCurves: (curves: CurvesState) => void;
  onResetCurves: () => void;
}

const DEFAULT_POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

export const ColorCurves: React.FC<ColorCurvesProps> = ({
  curves,
  onChangeCurves,
  onResetCurves,
}) => {
  const [activeChannel, setActiveChannel] = useState<CurveChannel>('master');
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const currentPoints = curves[activeChannel] || DEFAULT_POINTS;

  const channelColor =
    activeChannel === 'master'
      ? '#ffffff'
      : activeChannel === 'red'
      ? '#ef4444'
      : activeChannel === 'green'
      ? '#22c55e'
      : '#3b82f6';

  // Generate smooth SVG cubic path from points
  const generatePath = (points: CurvePoint[]): string => {
    if (points.length < 2) return '';
    const sorted = [...points].sort((a, b) => a.x - b.x);

    // SVG coordinates: 0 to 100
    const toCoord = (p: CurvePoint) => ({
      x: p.x * 100,
      y: (1 - p.y) * 100,
    });

    const coords = sorted.map(toCoord);
    let d = `M ${coords[0]!.x} ${coords[0]!.y}`;

    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? 0 : i - 1]!;
      const p1 = coords[i]!;
      const p2 = coords[i + 1]!;
      const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1]!;

      // Catmull-Rom to Cubic Bezier control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    return d;
  };

  const handleSvgPointerDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickY = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    // Check if clicked near an existing point (threshold 0.08)
    const existingIdx = currentPoints.findIndex(
      (p) => Math.hypot(p.x - clickX, p.y - clickY) < 0.08
    );

    if (existingIdx !== -1) {
      setActivePointIndex(existingIdx);
    } else {
      // Add new point
      const newPts = [...currentPoints, { x: clickX, y: clickY }].sort((a, b) => a.x - b.x);
      onChangeCurves({
        ...curves,
        [activeChannel]: newPts,
      });
      setActivePointIndex(newPts.findIndex((p) => Math.abs(p.x - clickX) < 0.001));
    }
  };

  const handlePointerMove = useCallback(
    (e: MouseEvent) => {
      if (activePointIndex === null || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left) / rect.width;
      const rawY = 1 - (e.clientY - rect.top) / rect.height;

      const clampedX = Math.max(0, Math.min(1, rawX));
      const clampedY = Math.max(0, Math.min(1, rawY));

      const updated = currentPoints.map((pt, idx) => {
        if (idx !== activePointIndex) return pt;
        // Keep end points at boundaries
        const finalX = idx === 0 ? 0 : idx === currentPoints.length - 1 ? 1 : clampedX;
        return { x: finalX, y: clampedY };
      });

      onChangeCurves({
        ...curves,
        [activeChannel]: updated,
      });
    },
    [activePointIndex, currentPoints, curves, activeChannel, onChangeCurves]
  );

  const handlePointerUp = useCallback(() => {
    setActivePointIndex(null);
  }, []);

  useEffect(() => {
    if (activePointIndex === null) return;
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [activePointIndex, handlePointerMove, handlePointerUp]);

  // Apply S-Curve Contrast Preset
  const applySCurve = () => {
    onChangeCurves({
      ...curves,
      [activeChannel]: [
        { x: 0, y: 0 },
        { x: 0.25, y: 0.18 },
        { x: 0.5, y: 0.5 },
        { x: 0.75, y: 0.82 },
        { x: 1, y: 1 },
      ],
    });
  };

  // Apply Faded Matte Black Preset
  const applyFadedBlack = () => {
    onChangeCurves({
      ...curves,
      [activeChannel]: [
        { x: 0, y: 0.12 },
        { x: 0.25, y: 0.28 },
        { x: 0.75, y: 0.8 },
        { x: 1, y: 0.98 },
      ],
    });
  };

  return (
    <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3 select-none">
      {/* Header & Channel Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-[var(--kuro-text-primary)]">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          <span>Custom RGB Curves</span>
        </div>

        <button
          onClick={onResetCurves}
          className="flex items-center gap-1 text-[10px] text-[var(--kuro-text-muted)] hover:text-white px-2 py-0.5 rounded hover:bg-[var(--kuro-bg-panel)] transition cursor-pointer"
          title="Reset Curves"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Reset
        </button>
      </div>

      {/* Channel Switcher Pills */}
      <div className="flex items-center justify-between gap-1 bg-[var(--kuro-bg-panel)] p-1 rounded-md border border-[var(--kuro-border-subtle)]">
        {(['master', 'red', 'green', 'blue'] as CurveChannel[]).map((ch) => (
          <button
            key={ch}
            onClick={() => setActiveChannel(ch)}
            className={`flex-1 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer ${
              activeChannel === ch
                ? ch === 'master'
                  ? 'bg-white text-black shadow'
                  : ch === 'red'
                  ? 'bg-red-500 text-white shadow'
                  : ch === 'green'
                  ? 'bg-emerald-500 text-white shadow'
                  : 'bg-blue-500 text-white shadow'
                : 'text-[var(--kuro-text-muted)] hover:text-white'
            }`}
          >
            {ch === 'master' ? 'Luma (Y)' : ch[0]?.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Interactive SVG Curve Graph Canvas */}
      <div className="relative w-full aspect-square bg-[#0f0f11] rounded border border-white/10 shadow-inner overflow-hidden cursor-crosshair">
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          className="w-full h-full"
          onMouseDown={handleSvgPointerDown}
        >
          {/* 4x4 Grid lines */}
          {[25, 50, 75].map((val) => (
            <React.Fragment key={val}>
              <line x1={val} y1="0" x2={val} y2="100" stroke="#ffffff" strokeOpacity="0.08" strokeDasharray="2,2" />
              <line x1="0" y1={val} x2="100" y2={val} stroke="#ffffff" strokeOpacity="0.08" strokeDasharray="2,2" />
            </React.Fragment>
          ))}

          {/* Diagonal Reference Line */}
          <line x1="0" y1="100" x2="100" y2="0" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="0.8" />

          {/* Inactive Channels Ghost Curves */}
          {(['master', 'red', 'green', 'blue'] as CurveChannel[])
            .filter((ch) => ch !== activeChannel && curves[ch])
            .map((ch) => (
              <path
                key={ch}
                d={generatePath(curves[ch] || DEFAULT_POINTS)}
                fill="none"
                stroke={ch === 'master' ? '#ffffff' : ch === 'red' ? '#ef4444' : ch === 'green' ? '#22c55e' : '#3b82f6'}
                strokeOpacity="0.25"
                strokeWidth="1.2"
              />
            ))}

          {/* Active Channel Curve */}
          <path
            d={generatePath(currentPoints)}
            fill="none"
            stroke={channelColor}
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Points */}
          {currentPoints.map((pt, idx) => {
            const isSelected = activePointIndex === idx;
            return (
              <circle
                key={idx}
                cx={pt.x * 100}
                cy={(1 - pt.y) * 100}
                r={isSelected ? 4 : 3}
                fill={isSelected ? '#ffffff' : channelColor}
                stroke="#000000"
                strokeWidth="1.5"
                className="transition-all hover:scale-125"
              />
            );
          })}
        </svg>

        {/* Info overlay */}
        <div className="absolute bottom-1.5 left-2 text-[9px] font-mono text-[var(--kuro-text-muted)] pointer-events-none">
          Click line to add point · Drag to curve
        </div>
      </div>

      {/* Preset Curve Helpers */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={applySCurve}
          className="flex-1 py-1 px-2 rounded bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] border border-[var(--kuro-border-subtle)] text-[10px] text-white font-medium transition cursor-pointer text-center"
        >
          Punchy S-Curve
        </button>
        <button
          onClick={applyFadedBlack}
          className="flex-1 py-1 px-2 rounded bg-[var(--kuro-bg-panel)] hover:bg-[var(--kuro-bg-hover)] border border-[var(--kuro-border-subtle)] text-[10px] text-white font-medium transition cursor-pointer text-center"
        >
          Matte Faded Film
        </button>
      </div>
    </div>
  );
};
