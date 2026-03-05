import { useCallback, useEffect, useRef, useState } from "react";

export type UndoAction = {
  label: string;
  mutationName: string;
  inverseParams: Record<string, unknown>;
};

type UndoExecutor = (action: UndoAction) => Promise<void>;

const MAX_STACK = 5;

export function useScheduleUndo(executor: UndoExecutor) {
  const [stack, setStack] = useState<UndoAction[]>([]);
  const [undoing, setUndoing] = useState(false);
  const executorRef = useRef(executor);
  executorRef.current = executor;

  const pushAction = useCallback((action: UndoAction) => {
    setStack((prev) => [...prev.slice(-(MAX_STACK - 1)), action]);
  }, []);

  const undo = useCallback(async () => {
    // Read the top action from stack ref-safely, then pop.
    // Side effects (async executor) must run OUTSIDE the state updater
    // to avoid React batching issues and potential double-execution.
    let topAction: UndoAction | undefined;
    setStack((prev) => {
      if (prev.length === 0) return prev;
      topAction = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    if (!topAction) return;
    setUndoing(true);
    try {
      await executorRef.current(topAction);
    } catch {
      // swallow — executor handles its own toasts
    } finally {
      setUndoing(false);
    }
  }, []);

  const canUndo = stack.length > 0 && !undoing;
  const undoLabel = stack.length > 0 ? stack[stack.length - 1].label : undefined;
  const undoCount = stack.length;

  // Ctrl+Z / ⌘Z
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (stack.length > 0 && !undoing) {
          void undo();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, stack.length, undoing]);

  return { pushAction, undo, canUndo, undoLabel, undoCount, undoing };
}
