import React, { useRef, useState, useCallback, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';

export interface WheelValue {
  x: number; // -1 to 1 (chroma X)
  y: number; // -1 to 1 (chroma Y)
  hue: number; // 0 to 360 degrees
  sat: number; // 0 to 100%
  luma: number; // -1.0 to 1.0
}

interface SingleWheelProps {
  label: string;
  sublabel: string;
  accentColor: string;
  value: WheelValue;
  onChange: (val: WheelValue) => void;
  onReset: () => void;
}

const SingleWheel: React.FC<SingleWheelProps> = ({
  label,
  sublabel,
  accentColor,
  value,
  onChange,
  onReset,
}) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!wheelRef.current) return;
      const rect = wheelRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const radius = rect.width / 2;

      let dx = (clientX - centerX) / radius;
      let dy = (clientY - centerY) / radius;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1.0) {
        dx /= dist;
        dy /= dist;
      }

      const clampedDist = Math.min(1.0, dist);
      // Angle in degrees: 0 to 360
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;

      onChange({
        ...value,
        x: dx,
        y: dy,
        hue: Math.round(angle),
        sat: Math.round(clampedDist * 100),
      });
    },
    [value, onChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateFromPointer(e.clientX, e.clientY);
  };

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      updateFromPointer(e.clientX, e.clientY);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateFromPointer]);

  // Puck position inside wheel in %
  const puckX = 50 + (value.x * 50);
  const puckY = 50 + (value.y * 50);

  const hasAdjustments = Math.abs(value.x) > 0.01 || Math.abs(value.y) > 0.01 || Math.abs(value.luma) > 0.01;

  return (
    <div className="flex flex-col items-center bg-[var(--kuro-bg-surface)] p-2.5 rounded-lg border border-[var(--kuro-border-subtle)] space-y-2 select-none">
      {/* Title & Reset */}
      <div className="w-full flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
          <span className="font-bold text-white uppercase tracking-wider">{label}</span>
          <span className="text-[9px] text-[var(--kuro-text-muted)] font-mono">({sublabel})</span>
        </div>
        <button
          onClick={onReset}
          disabled={!hasAdjustments}
          className={`p-1 rounded transition cursor-pointer ${
            hasAdjustments
              ? 'text-white hover:bg-white/10'
              : 'opacity-20 text-[var(--kuro-text-muted)] cursor-default'
          }`}
          title={`Reset ${label}`}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Circular Color Wheel */}
      <div
        ref={wheelRef}
        onMouseDown={handleMouseDown}
        onDoubleClick={onReset}
        className="w-24 h-24 rounded-full relative cursor-crosshair border border-white/20 shadow-inner overflow-hidden"
        style={{
          background: `
            radial-gradient(circle at center, #27272a 0%, transparent 75%),
            conic-gradient(from 90deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)
          `,
        }}
      >
        {/* Subtle crosshair guide */}
        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/15 pointer-events-none -translate-y-1/2" />
        <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/15 pointer-events-none -translate-x-1/2" />
        <div className="absolute inset-[30%] rounded-full border border-white/10 pointer-events-none" />

        {/* Draggable Puck */}
        <div
          className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-md absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-75"
          style={{
            left: `${puckX}%`,
            top: `${puckY}%`,
            backgroundColor: value.sat > 5 ? `hsl(${value.hue}, 90%, 55%)` : '#ffffff',
          }}
        />
      </div>

      {/* Numeric Readouts */}
      <div className="w-full flex items-center justify-between text-[9px] font-mono text-[var(--kuro-text-muted)] px-1">
        <span>H: <span className="text-white">{value.hue}°</span></span>
        <span>S: <span className="text-white">{value.sat}%</span></span>
        <span>Y: <span className="text-white">{value.luma > 0 ? `+${value.luma.toFixed(2)}` : value.luma.toFixed(2)}</span></span>
      </div>

      {/* Master Luminance Slider */}
      <div className="w-full space-y-1 pt-1 border-t border-[var(--kuro-border-subtle)]">
        <div className="flex items-center justify-between text-[9px]">
          <span className="text-[var(--kuro-text-secondary)] font-mono uppercase">Master Y</span>
          <span className="text-white font-mono text-[10px] font-semibold">
            {value.luma > 0 ? `+${value.luma.toFixed(2)}` : value.luma.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="-1.0"
          max="1.0"
          step="0.01"
          value={value.luma}
          onChange={(e) => onChange({ ...value, luma: parseFloat(e.target.value) })}
          onDoubleClick={() => onChange({ ...value, luma: 0 })}
          className="w-full accent-[var(--kuro-text-primary)] cursor-pointer h-1.5"
          title="Double-click to reset"
        />
      </div>
    </div>
  );
};

export interface ColorWheelsProps {
  lift: WheelValue;
  gamma: WheelValue;
  gain: WheelValue;
  offset: WheelValue;
  onChangeLift: (val: WheelValue) => void;
  onChangeGamma: (val: WheelValue) => void;
  onChangeGain: (val: WheelValue) => void;
  onChangeOffset: (val: WheelValue) => void;
  onResetAllWheels: () => void;
}

export const ColorWheels: React.FC<ColorWheelsProps> = ({
  lift,
  gamma,
  gain,
  offset,
  onChangeLift,
  onChangeGamma,
  onChangeGain,
  onChangeOffset,
  onResetAllWheels,
}) => {
  const defaultVal: WheelValue = { x: 0, y: 0, hue: 0, sat: 0, luma: 0 };

  return (
    <div className="space-y-3">
      {/* Wheels Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--kuro-text-primary)]">
            Primary Color Wheels
          </span>
          <span className="text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono px-1.5 py-0.2 rounded font-semibold">
            DaVinci Lift·Gamma·Gain
          </span>
        </div>
        <button
          onClick={onResetAllWheels}
          className="flex items-center gap-1 text-[10px] text-[var(--kuro-text-muted)] hover:text-white px-2 py-0.5 rounded hover:bg-[var(--kuro-bg-surface)] transition cursor-pointer"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Reset Wheels
        </button>
      </div>

      {/* 4 Primary Wheels Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <SingleWheel
          label="Lift"
          sublabel="Shadows"
          accentColor="#38bdf8"
          value={lift}
          onChange={onChangeLift}
          onReset={() => onChangeLift(defaultVal)}
        />
        <SingleWheel
          label="Gamma"
          sublabel="Midtones"
          accentColor="#4ade80"
          value={gamma}
          onChange={onChangeGamma}
          onReset={() => onChangeGamma(defaultVal)}
        />
        <SingleWheel
          label="Gain"
          sublabel="Highlights"
          accentColor="#facc15"
          value={gain}
          onChange={onChangeGain}
          onReset={() => onChangeGain(defaultVal)}
        />
        <SingleWheel
          label="Offset"
          sublabel="Master"
          accentColor="#f43f5e"
          value={offset}
          onChange={onChangeOffset}
          onReset={() => onChangeOffset(defaultVal)}
        />
      </div>
    </div>
  );
};
