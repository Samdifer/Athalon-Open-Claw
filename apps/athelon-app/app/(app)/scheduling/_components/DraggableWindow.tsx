"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Maximize2, Minimize2, GripHorizontal } from "lucide-react";

interface DraggableWindowProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export default function DraggableWindow({
  title,
  onClose,
  children,
  initialX,
  initialY,
  initialWidth = 600,
  initialHeight = 400,
  minWidth = 300,
  minHeight = 200,
}: DraggableWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMaxState, setPreMaxState] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const [position, setPosition] = useState(() => {
    let x = initialX;
    let y = initialY;
    if (typeof window !== "undefined") {
      if (x === undefined) x = Math.max(0, (window.innerWidth - initialWidth) / 2);
      if (y === undefined) y = Math.max(0, (window.innerHeight - initialHeight) / 2);
    } else {
      x = 100;
      y = 100;
    }
    return { x, y };
  });

  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizing, setResizing] = useState<{
    dir: ResizeDir;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);

  const toggleMaximize = () => {
    if (isMaximized) {
      if (preMaxState) {
        setPosition({ x: preMaxState.x, y: preMaxState.y });
        setSize({ width: preMaxState.w, height: preMaxState.h });
      }
      setIsMaximized(false);
      return;
    }
    setPreMaxState({ ...position, w: size.width, h: size.height });
    setIsMaximized(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isMaximized) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleResizeStart = (e: React.MouseEvent, dir: ResizeDir) => {
    if (isMaximized) return;
    e.stopPropagation();
    e.preventDefault();
    setResizing({
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: size.width,
      startH: size.height,
      startPosX: position.x,
      startPosY: position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
        return;
      }

      if (!resizing) return;

      const dx = e.clientX - resizing.startX;
      const dy = e.clientY - resizing.startY;

      let newW = resizing.startW;
      let newH = resizing.startH;
      let newX = resizing.startPosX;
      let newY = resizing.startPosY;

      if (resizing.dir.includes("e")) {
        newW = Math.max(minWidth, resizing.startW + dx);
      }
      if (resizing.dir.includes("w")) {
        const maxDelta = resizing.startW - minWidth;
        const effectiveDx = Math.min(dx, maxDelta);
        newW = resizing.startW - effectiveDx;
        newX = resizing.startPosX + effectiveDx;
      }
      if (resizing.dir.includes("s")) {
        newH = Math.max(minHeight, resizing.startH + dy);
      }
      if (resizing.dir.includes("n")) {
        const maxDelta = resizing.startH - minHeight;
        const effectiveDy = Math.min(dy, maxDelta);
        newH = resizing.startH - effectiveDy;
        newY = resizing.startPosY + effectiveDy;
      }

      setSize({ width: newW, height: newH });
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setResizing(null);
    };

    if (isDragging || resizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragOffset, isDragging, minHeight, minWidth, resizing]);

  const style: React.CSSProperties = isMaximized
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 3000,
        borderRadius: 0,
      }
    : {
        position: "fixed",
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: 3000,
      };

  return (
    <div
      ref={windowRef}
      className="flex flex-col bg-slate-900 border border-cyan-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all duration-75 rounded-lg overflow-hidden"
      style={style}
    >
      {!isMaximized && (
        <>
          <div
            onMouseDown={(e) => handleResizeStart(e, "n")}
            className="absolute -top-1 left-2 right-2 h-3 cursor-n-resize z-50 hover:bg-cyan-400/20 rounded-full transition-colors"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, "s")}
            className="absolute -bottom-1 left-2 right-2 h-3 cursor-s-resize z-50 hover:bg-cyan-400/20 rounded-full transition-colors"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, "w")}
            className="absolute top-2 bottom-2 -left-1 w-3 cursor-w-resize z-50 hover:bg-cyan-400/20 rounded-full transition-colors"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, "e")}
            className="absolute top-2 bottom-2 -right-1 w-3 cursor-e-resize z-50 hover:bg-cyan-400/20 rounded-full transition-colors"
          />

          <div
            onMouseDown={(e) => handleResizeStart(e, "nw")}
            className="absolute -top-1 -left-1 w-5 h-5 cursor-nw-resize z-50 hover:bg-cyan-400/20 rounded-full"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, "ne")}
            className="absolute -top-1 -right-1 w-5 h-5 cursor-ne-resize z-50 hover:bg-cyan-400/20 rounded-full"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, "sw")}
            className="absolute -bottom-1 -left-1 w-5 h-5 cursor-sw-resize z-50 hover:bg-cyan-400/20 rounded-full"
          />
          <div
            onMouseDown={(e) => handleResizeStart(e, "se")}
            className="absolute -bottom-1 -right-1 w-5 h-5 cursor-se-resize z-50 hover:bg-cyan-400/20 rounded-full"
          />
        </>
      )}

      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={toggleMaximize}
        className={`h-9 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-3 select-none shrink-0 ${
          !isMaximized ? "cursor-move" : ""
        }`}
      >
        <div className="flex items-center gap-2 text-slate-300">
          <GripHorizontal size={14} className="text-slate-600" />
          <span className="text-xs font-bold font-tactical text-cyan-400 uppercase tracking-widest shadow-black drop-shadow-md">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleMaximize}
            className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-slate-700 rounded transition-colors"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-900/20 rounded transition-colors"
            title="Stow Tray"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-950/90">
        {children}
      </div>
    </div>
  );
}

