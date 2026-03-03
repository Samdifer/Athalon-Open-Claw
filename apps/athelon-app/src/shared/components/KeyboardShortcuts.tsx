import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";

export function KeyboardShortcuts() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPending = useCallback(() => {
    pendingRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      if (key === "?") {
        e.preventDefault();
        setShowHelp(true);
        clearPending();
        return;
      }

      if (pendingRef.current) {
        const combo = pendingRef.current + key;
        clearPending();

        switch (combo) {
          case "nw":
            e.preventDefault();
            navigate("/work-orders/new");
            return;
          case "ni":
            e.preventDefault();
            navigate("/billing/invoices/new");
            return;
          case "gd":
            e.preventDefault();
            navigate("/dashboard");
            return;
          case "gw":
            e.preventDefault();
            navigate("/work-orders");
            return;
        }
        return;
      }

      if (key === "n" || key === "g") {
        pendingRef.current = key;
        timerRef.current = setTimeout(clearPending, 800);
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [navigate, clearPending]);

  return <ShortcutsHelp open={showHelp} onOpenChange={setShowHelp} />;
}
