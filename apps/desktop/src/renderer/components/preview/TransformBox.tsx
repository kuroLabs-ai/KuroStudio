import React, { useRef, useState, useEffect } from 'react';
import { ClipTransform } from '@kuro/project-format';
import { RotateCw, Move, RotateCcw } from 'lucide-react';

interface TransformBoxProps {
  clipId: string;
  clipName: string;
  transform: ClipTransform;
  containerWidth: number;
  containerHeight: number;
  onUpdateTransform: (t: Partial<ClipTransform>) => void;
}

export const TransformBox: React.FC<TransformBoxProps> = ({
  clipName,
  transform,
  containerWidth,
  containerHeight,
  onUpdateTransform,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [resizingCorner, setResizingCorner] = useState<string | null>(null);

  const startDragRef = useRef<{
    startX: number;
    startY: number;
    initialTransformX: number;
    initialTransformY: number;
    initialScaleX: number;
    initialScaleY: number;
    initialRot: number;
  }>({
    startX: 0,
    startY: 0,
    initialTransformX: 0,
    initialTransformY: 0,
    initialScaleX: 1,
    initialScaleY: 1,
    initialRot: 0,
  });

  const posX = transform.x || 0;
  const posY = transform.y || 0;
  const scaleX = transform.scaleX ?? 1.0;
  const scaleY = transform.scaleY ?? 1.0;
  const rot = transform.rotation || 0;

  // Box dimensions relative to 16:9 canvas
  // The element covers the viewport by default, scaled and translated
  const boxW = containerWidth * scaleX;
  const boxH = containerHeight * scaleY;
  const centerX = containerWidth / 2 + posX;
  const centerY = containerHeight / 2 + posY;

  // ── Drag position (pan) ──
  const handleMouseDownMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    startDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialTransformX: posX,
      initialTransformY: posY,
      initialScaleX: scaleX,
      initialScaleY: scaleY,
      initialRot: rot,
    };
  };

  // ── Corner resize ──
  const handleMouseDownCorner = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    setResizingCorner(corner);
    startDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialTransformX: posX,
      initialTransformY: posY,
      initialScaleX: scaleX,
      initialScaleY: scaleY,
      initialRot: rot,
    };
  };

  // ── Top rotation handle ──
  const handleMouseDownRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRotating(true);
    startDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialTransformX: posX,
      initialTransformY: posY,
      initialScaleX: scaleX,
      initialScaleY: scaleY,
      initialRot: rot,
    };
  };

  useEffect(() => {
    if (!isDragging && !resizingCorner && !isRotating) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startDragRef.current.startX;
      const dy = e.clientY - startDragRef.current.startY;

      if (isDragging) {
        onUpdateTransform({
          x: Math.round(startDragRef.current.initialTransformX + dx),
          y: Math.round(startDragRef.current.initialTransformY + dy),
        });
      } else if (resizingCorner) {
        // Uniform scaling based on distance moved
        let factor = 1.0;
        if (resizingCorner === 'br') factor = (dx + dy) / 2;
        else if (resizingCorner === 'bl') factor = (-dx + dy) / 2;
        else if (resizingCorner === 'tr') factor = (dx - dy) / 2;
        else if (resizingCorner === 'tl') factor = (-dx - dy) / 2;

        const newScale = Math.max(0.1, Math.min(4.0, startDragRef.current.initialScaleX + factor / 150));
        onUpdateTransform({
          scaleX: parseFloat(newScale.toFixed(2)),
          scaleY: parseFloat(newScale.toFixed(2)),
        });
      } else if (isRotating) {
        // Angle from center
        const angleDelta = Math.round(dx * 0.5);
        let newRot = (startDragRef.current.initialRot + angleDelta) % 360;
        if (newRot > 180) newRot -= 360;
        if (newRot < -180) newRot += 360;
        onUpdateTransform({
          rotation: newRot,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setResizingCorner(null);
      setIsRotating(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, resizingCorner, isRotating, onUpdateTransform]);

  return (
    <div
      className="absolute pointer-events-auto select-none z-40 transition-none"
      style={{
        width: `${boxW}px`,
        height: `${boxH}px`,
        left: `${centerX - boxW / 2}px`,
        top: `${centerY - boxH / 2}px`,
        transform: `rotate(${rot}deg)`,
        transformOrigin: 'center center',
      }}
    >
      {/* Active Selection Outline */}
      <div
        onMouseDown={handleMouseDownMove}
        className={`w-full h-full border-2 border-blue-400 bg-blue-500/5 hover:bg-blue-500/10 cursor-move relative flex items-center justify-center transition-colors ${
          isDragging ? 'border-amber-400 bg-amber-500/15' : ''
        }`}
      >
        {/* Center Pivot Crosshair */}
        <div className="w-2.5 h-2.5 rounded-full border border-blue-400 bg-white/80 shadow pointer-events-none" />

        {/* Clip Name Floating Badge */}
        <div className="absolute top-1 left-2 bg-blue-600/90 text-white font-mono text-[9px] px-1.5 py-0.5 rounded shadow pointer-events-none tracking-wide flex items-center gap-1">
          <Move className="w-2.5 h-2.5" />
          <span className="truncate max-w-[120px]">{clipName}</span>
          <span className="text-white/60">({Math.round(scaleX * 100)}%)</span>
        </div>
      </div>

      {/* ── Rotation Handle Stem & Knob (Top Center) ── */}
      <div
        className="absolute left-1/2 -top-6 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing group"
        onMouseDown={handleMouseDownRotate}
        title="Drag to Rotate"
      >
        <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-md group-hover:scale-125 transition-transform flex items-center justify-center">
          <RotateCw className="w-2 h-2 text-white" />
        </div>
        <div className="w-0.5 h-2.5 bg-blue-400" />
      </div>

      {/* ── 4 Corner Handles for Scaling ── */}
      {/* Top Left */}
      <div
        onMouseDown={(e) => handleMouseDownCorner(e, 'tl')}
        className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-xs shadow cursor-nwse-resize hover:scale-125 transition-transform"
        title="Resize"
      />
      {/* Top Right */}
      <div
        onMouseDown={(e) => handleMouseDownCorner(e, 'tr')}
        className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-xs shadow cursor-nesw-resize hover:scale-125 transition-transform"
        title="Resize"
      />
      {/* Bottom Left */}
      <div
        onMouseDown={(e) => handleMouseDownCorner(e, 'bl')}
        className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-xs shadow cursor-nesw-resize hover:scale-125 transition-transform"
        title="Resize"
      />
      {/* Bottom Right */}
      <div
        onMouseDown={(e) => handleMouseDownCorner(e, 'br')}
        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-xs shadow cursor-nwse-resize hover:scale-125 transition-transform"
        title="Resize"
      />
    </div>
  );
};
