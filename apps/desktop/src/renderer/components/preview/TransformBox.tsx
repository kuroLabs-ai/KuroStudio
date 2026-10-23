import React, { useRef, useState, useEffect } from 'react';
import { ClipTransform } from '@kuro/project-format';
import { RotateCw, Move, Maximize2 } from 'lucide-react';

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
  const [resizingSide, setResizingSide] = useState<string | null>(null);

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
  const boxW = Math.max(30, containerWidth * Math.abs(scaleX));
  const boxH = Math.max(20, containerHeight * Math.abs(scaleY));
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

  // ── Corner & Edge resize ──
  const handleMouseDownResize = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    setResizingSide(handle);
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
    if (!isDragging && !resizingSide && !isRotating) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startDragRef.current.startX;
      const dy = e.clientY - startDragRef.current.startY;

      if (isDragging) {
        onUpdateTransform({
          x: Math.round(startDragRef.current.initialTransformX + dx),
          y: Math.round(startDragRef.current.initialTransformY + dy),
        });
      } else if (resizingSide) {
        // Uniform diagonal corner resize
        if (['tl', 'tr', 'bl', 'br'].includes(resizingSide)) {
          let factor = 1.0;
          if (resizingSide === 'br') factor = (dx + dy) / 2;
          else if (resizingSide === 'bl') factor = (-dx + dy) / 2;
          else if (resizingSide === 'tr') factor = (dx - dy) / 2;
          else if (resizingSide === 'tl') factor = (-dx - dy) / 2;

          const sensitivity = Math.max(120, containerWidth * 0.35);
          const newScale = Math.max(0.05, Math.min(8.0, startDragRef.current.initialScaleX + factor / sensitivity));
          onUpdateTransform({
            scaleX: parseFloat(newScale.toFixed(3)),
            scaleY: parseFloat(newScale.toFixed(3)),
          });
        }
        // Horizontal side resize (X only)
        else if (resizingSide === 'e' || resizingSide === 'w') {
          const deltaX = resizingSide === 'e' ? dx : -dx;
          const sensitivity = Math.max(100, containerWidth * 0.4);
          const newScaleX = Math.max(0.05, Math.min(8.0, startDragRef.current.initialScaleX + deltaX / sensitivity));
          onUpdateTransform({
            scaleX: parseFloat(newScaleX.toFixed(3)),
          });
        }
        // Vertical side resize (Y only)
        else if (resizingSide === 'n' || resizingSide === 's') {
          const deltaY = resizingSide === 's' ? dy : -dy;
          const sensitivity = Math.max(80, containerHeight * 0.4);
          const newScaleY = Math.max(0.05, Math.min(8.0, startDragRef.current.initialScaleY + deltaY / sensitivity));
          onUpdateTransform({
            scaleY: parseFloat(newScaleY.toFixed(3)),
          });
        }
      } else if (isRotating) {
        const angleDelta = Math.round(dx * 0.4);
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
      setResizingSide(null);
      setIsRotating(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, resizingSide, isRotating, containerWidth, containerHeight, onUpdateTransform]);

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
        className={`w-full h-full border-2 border-blue-400 bg-blue-500/10 hover:bg-blue-500/15 cursor-move relative flex items-center justify-center transition-colors ${
          isDragging ? 'border-amber-400 bg-amber-500/20 shadow-lg' : ''
        }`}
      >
        {/* Center Pivot Crosshair */}
        <div className="w-2.5 h-2.5 rounded-full border border-blue-400 bg-white shadow-sm pointer-events-none" />

        {/* Clip Name Floating HUD */}
        <div className="absolute top-1 left-2 bg-blue-600/90 text-white font-mono text-[9px] px-1.5 py-0.5 rounded shadow pointer-events-none tracking-wide flex items-center gap-1.5">
          <Move className="w-2.5 h-2.5" />
          <span className="truncate max-w-[120px] font-semibold">{clipName}</span>
          <span className="text-white/70">
            {Math.round(scaleX * 100)}% · {rot}°
          </span>
        </div>
      </div>

      {/* ── Rotation Handle Stem & Knob (Top Center) ── */}
      <div
        className="absolute left-1/2 -top-6 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing group"
        onMouseDown={handleMouseDownRotate}
        title="Drag horizontally to rotate"
      >
        <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md group-hover:scale-125 transition-transform flex items-center justify-center">
          <RotateCw className="w-2.5 h-2.5 text-white" />
        </div>
        <div className="w-0.5 h-2.5 bg-blue-400" />
      </div>

      {/* ── 4 Corner Handles for Scaling ── */}
      <div
        onMouseDown={(e) => handleMouseDownResize(e, 'tl')}
        className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-xs shadow cursor-nwse-resize hover:scale-125 transition-transform"
        title="Resize diagonal"
      />
      <div
        onMouseDown={(e) => handleMouseDownResize(e, 'tr')}
        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-xs shadow cursor-nesw-resize hover:scale-125 transition-transform"
        title="Resize diagonal"
      />
      <div
        onMouseDown={(e) => handleMouseDownResize(e, 'bl')}
        className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-xs shadow cursor-nesw-resize hover:scale-125 transition-transform"
        title="Resize diagonal"
      />
      <div
        onMouseDown={(e) => handleMouseDownResize(e, 'br')}
        className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-xs shadow cursor-nwse-resize hover:scale-125 transition-transform"
        title="Resize diagonal"
      />

      {/* ── 4 Edge Midpoint Handles ── */}
      <div
        onMouseDown={(e) => handleMouseDownResize(e, 'n')}
        className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-blue-500 rounded-xs shadow cursor-ns-resize hover:scale-125 transition-transform"
        title="Resize height"
      />
      <div
        onMouseDown={(e) => handleMouseDownResize(e, 's')}
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-blue-500 rounded-xs shadow cursor-ns-resize hover:scale-125 transition-transform"
        title="Resize height"
      />
      <div
        onMouseDown={(e) => handleMouseDownResize(e, 'w')}
        className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-4 bg-white border border-blue-500 rounded-xs shadow cursor-ew-resize hover:scale-125 transition-transform"
        title="Resize width"
      />
      <div
        onMouseDown={(e) => handleMouseDownResize(e, 'e')}
        className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-4 bg-white border border-blue-500 rounded-xs shadow cursor-ew-resize hover:scale-125 transition-transform"
        title="Resize width"
      />
    </div>
  );
};
