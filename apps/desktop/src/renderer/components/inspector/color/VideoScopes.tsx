import React, { useState, useMemo } from 'react';
import { Activity, BarChart2, Eye } from 'lucide-react';

interface VideoScopesProps {
  exposure: number;
  contrast: number;
  temperature: number;
  tint: number;
  saturation: number;
  liftLuma: number;
  gainLuma: number;
}

export const VideoScopes: React.FC<VideoScopesProps> = ({
  exposure,
  contrast,
  temperature,
  tint,
  saturation,
  liftLuma,
  gainLuma,
}) => {
  const [scopeMode, setScopeMode] = useState<'waveform' | 'parade'>('waveform');

  // Compute simulated scope signal curves based on current color grading parameters
  const simulatedWaveform = useMemo(() => {
    // 50 horizontal sample points
    const points: Array<{ x: number; yMin: number; yMax: number }> = [];

    // Base luma level (IRE 0 - 100)
    const baseFloor = Math.max(0, Math.min(40, 10 + liftLuma * 25));
    const baseCeil = Math.max(60, Math.min(100, 90 + gainLuma * 30 + exposure * 10));
    const dynamicRange = Math.max(10, (baseCeil - baseFloor) * contrast);

    for (let i = 0; i <= 50; i++) {
      const x = (i / 50) * 100;
      // Simulated video scene variation: shadows, subjects, highlights
      const sceneVariation = Math.sin(i * 0.35) * 15 + Math.cos(i * 0.7) * 10;
      const center = baseFloor + (dynamicRange * 0.5) + sceneVariation;
      const spread = (dynamicRange * 0.35) + Math.abs(Math.sin(i * 0.2)) * 10;

      const yMin = Math.max(0, Math.min(100, center - spread / 2));
      const yMax = Math.max(0, Math.min(100, center + spread / 2));

      points.push({ x, yMin, yMax });
    }
    return points;
  }, [exposure, contrast, liftLuma, gainLuma]);

  // Compute simulated RGB parade offsets
  const paradeData = useMemo(() => {
    const tempShift = temperature * 0.3; // warmer = more Red, less Blue
    const tintShift = tint * 0.3; // magenta = more Red & Blue, less Green

    return {
      red: {
        offset: tempShift + tintShift * 0.5,
        color: '#ef4444',
        label: 'RED',
      },
      green: {
        offset: -tintShift,
        color: '#22c55e',
        label: 'GREEN',
      },
      blue: {
        offset: -tempShift + tintShift * 0.5,
        color: '#3b82f6',
        label: 'BLUE',
      },
    };
  }, [temperature, tint]);

  return (
    <div className="bg-[var(--kuro-bg-surface)] p-3 rounded-lg border border-[var(--kuro-border-subtle)] space-y-3 select-none">
      {/* Scope Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] text-[var(--kuro-text-primary)]">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span>Real-time Video Scopes</span>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center bg-[var(--kuro-bg-panel)] rounded p-0.5 border border-[var(--kuro-border-subtle)]">
          <button
            onClick={() => setScopeMode('waveform')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition cursor-pointer ${
              scopeMode === 'waveform'
                ? 'bg-white text-black'
                : 'text-[var(--kuro-text-muted)] hover:text-white'
            }`}
          >
            Waveform
          </button>
          <button
            onClick={() => setScopeMode('parade')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition cursor-pointer ${
              scopeMode === 'parade'
                ? 'bg-white text-black'
                : 'text-[var(--kuro-text-muted)] hover:text-white'
            }`}
          >
            RGB Parade
          </button>
        </div>
      </div>

      {/* Scope Screen */}
      <div className="relative w-full h-36 bg-[#090b0e] rounded border border-white/10 shadow-inner overflow-hidden font-mono">
        {/* IRE Reference Scale Lines */}
        <div className="absolute inset-y-0 left-0 w-8 flex flex-col justify-between py-1 px-1 text-[8px] text-white/30 z-10 pointer-events-none select-none border-r border-white/5">
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>25</span>
          <span>0</span>
        </div>

        {/* Horizontal IRE Graticule Grid */}
        <div className="absolute inset-0 pl-8 pointer-events-none">
          {[0, 25, 50, 75, 100].map((ire) => (
            <div
              key={ire}
              className="absolute inset-x-0 border-b border-white/[0.07]"
              style={{ bottom: `${ire}%` }}
            />
          ))}
        </div>

        {/* Waveform Mode Content */}
        {scopeMode === 'waveform' && (
          <div className="absolute inset-0 pl-9 pr-2 py-1">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
              {/* Density fill */}
              {simulatedWaveform.map((pt, i) => (
                <line
                  key={i}
                  x1={pt.x}
                  y1={100 - pt.yMax}
                  x2={pt.x}
                  y2={100 - pt.yMin}
                  stroke="#22c55e"
                  strokeWidth="1.8"
                  strokeOpacity="0.4"
                  strokeLinecap="round"
                />
              ))}

              {/* Peak Bright Trace */}
              <polyline
                fill="none"
                stroke="#86efac"
                strokeWidth="1.2"
                strokeOpacity="0.9"
                points={simulatedWaveform.map((pt) => `${pt.x},${100 - pt.yMax}`).join(' ')}
              />
              <polyline
                fill="none"
                stroke="#15803d"
                strokeWidth="1.0"
                strokeOpacity="0.8"
                points={simulatedWaveform.map((pt) => `${pt.x},${100 - pt.yMin}`).join(' ')}
              />
            </svg>
          </div>
        )}

        {/* RGB Parade Mode Content */}
        {scopeMode === 'parade' && (
          <div className="absolute inset-0 pl-9 pr-2 py-1 grid grid-cols-3 gap-1 divide-x divide-white/10">
            {(['red', 'green', 'blue'] as const).map((channel) => {
              const data = paradeData[channel];
              return (
                <div key={channel} className="relative h-full px-1">
                  <div
                    className="absolute top-1 left-1 text-[8px] font-bold font-mono px-1 rounded"
                    style={{ color: data.color }}
                  >
                    {data.label}
                  </div>
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full pt-4">
                    {simulatedWaveform.map((pt, i) => {
                      const yMax = Math.max(0, Math.min(100, pt.yMax + data.offset));
                      const yMin = Math.max(0, Math.min(100, pt.yMin + data.offset));
                      return (
                        <line
                          key={i}
                          x1={pt.x}
                          y1={100 - yMax}
                          x2={pt.x}
                          y2={100 - yMin}
                          stroke={data.color}
                          strokeWidth="2.0"
                          strokeOpacity="0.5"
                          strokeLinecap="round"
                        />
                      );
                    })}
                  </svg>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono text-[var(--kuro-text-muted)]">
        <span>Scale: 0 to 100 IRE</span>
        <span className="text-emerald-400">Signal: Normal (No Clipping)</span>
      </div>
    </div>
  );
};
