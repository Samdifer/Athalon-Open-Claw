import { useCallback, useEffect, useState } from "react";

interface UseSchedulerKeyboardOptions {
  onUndo?: () => void;
  onExitMode?: () => void;
  timelineScrollRef?: React.RefObject<HTMLDivElement | null>;
  cellWidth?: number;
}

export function useSchedulerKeyboard({
  onUndo,
  onExitMode,
  timelineScrollRef,
  cellWidth = 40,
}: UseSchedulerKeyboardOptions = {}) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // F11 — toggle fullscreen
      if (e.key === "F11") {
        e.preventDefault();
        toggleFullscreen();
        return;
      }

      // Escape — exit current mode
      if (e.key === "Escape") {
        onExitMode?.();
        setShortcutsOpen(false);
        return;
      }

      // ? — show shortcuts overlay
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // Arrow keys — pan timeline
      const scrollEl = timelineScrollRef?.current;
      if (scrollEl) {
        const step = cellWidth * 3;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          scrollEl.scrollLeft = Math.max(0, scrollEl.scrollLeft - step);
          return;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          scrollEl.scrollLeft += step;
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          scrollEl.scrollTop = Math.max(0, scrollEl.scrollTop - 52);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          scrollEl.scrollTop += 52;
          return;
        }
      }

      // Ctrl+Z / ⌘Z handled by useScheduleUndo — but allow passthrough
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen, onExitMode, timelineScrollRef, cellWidth, onUndo]);

  return { shortcutsOpen, setShortcutsOpen };
}

export const KEYBOARD_SHORTCUTS = [
  { keys: "F11", description: "Toggle fullscreen" },
  { keys: "Ctrl+Z / ⌘Z", description: "Undo last action" },
  { keys: "Escape", description: "Exit current mode" },
  { keys: "← →", description: "Pan timeline horizontally" },
  { keys: "↑ ↓", description: "Pan timeline vertically" },
  { keys: "?", description: "Show keyboard shortcuts" },
] as const;
