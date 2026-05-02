import { useState, useRef, useCallback, ReactNode } from "react";

interface ResizablePanelProps {
  children: ReactNode;
  width: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  onResize?: (width: number, height?: number) => void;
  resizeDirection?: "horizontal" | "vertical" | "both";
  className?: string;
  style?: React.CSSProperties;
}

export function ResizablePanel({
  children,
  width,
  height,
  minWidth = 200,
  maxWidth = 800,
  minHeight = 100,
  maxHeight = 600,
  onResize,
  resizeDirection = "horizontal",
  className = "",
  style = {},
}: ResizablePanelProps) {
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width;
    const startHeight = height || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing) return;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (resizeDirection === "horizontal" || resizeDirection === "both") {
        newWidth = startWidth + (moveEvent.clientX - startX);
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      }

      if ((resizeDirection === "vertical" || resizeDirection === "both") && height !== undefined) {
        newHeight = startHeight + (moveEvent.clientY - startY);
        newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      }

      onResize?.(newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [isResizing, width, height, minWidth, maxWidth, minHeight, maxHeight, onResize, resizeDirection]);

  return (
    <div
      ref={panelRef}
      className={`relative ${className}`}
      style={{ width, height, ...style }}
    >
      {children}
      
      {/* Resize handles */}
      {resizeDirection === "horizontal" && (
        <div
          className={`absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize bg-gray-700 hover:bg-blue-500 transition-colors ${
            isResizing ? "bg-blue-500" : ""
          }`}
          onMouseDown={handleMouseDown}
        />
      )}
      
      {resizeDirection === "vertical" && height !== undefined && (
        <div
          className={`absolute left-0 right-0 bottom-0 h-1 cursor-ns-resize bg-gray-700 hover:bg-blue-500 transition-colors ${
            isResizing ? "bg-blue-500" : ""
          }`}
          onMouseDown={handleMouseDown}
        />
      )}
      
      {resizeDirection === "both" && height !== undefined && (
        <>
          <div
            className={`absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize bg-gray-700 hover:bg-blue-500 transition-colors ${
              isResizing ? "bg-blue-500" : ""
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
              // Handle horizontal resize
            }}
          />
          <div
            className={`absolute left-0 right-0 bottom-0 h-1 cursor-ns-resize bg-gray-700 hover:bg-blue-500 transition-colors ${
              isResizing ? "bg-blue-500" : ""
            }`}
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
              // Handle vertical resize
            }}
          />
          <div
            className={`absolute right-0 bottom-0 w-3 h-3 cursor-se-resize bg-gray-700 hover:bg-blue-500 transition-colors ${
              isResizing ? "bg-blue-500" : ""
            }`}
            onMouseDown={handleMouseDown}
          />
        </>
      )}
    </div>
  );
}
