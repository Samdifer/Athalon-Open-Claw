import { useEffect } from "react";

interface IOSSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  detent?: "medium" | "large";
}

export function IOSSheet({
  open,
  onClose,
  title,
  children,
  detent = "large",
}: IOSSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{ background: "rgba(0, 0, 0, 0.4)" }}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-ios-bg-secondary rounded-t-[12px] overflow-y-auto transition-transform duration-300 ${
          detent === "medium" ? "max-h-[50vh]" : "max-h-[90vh]"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 20px)" }}
      >
        <div className="ios-sheet-handle" />
        {title && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-ios-separator">
            <div className="w-[60px]" />
            <span className="ios-nav-title">{title}</span>
            <button
              onClick={onClose}
              className="text-ios-blue text-[17px] font-semibold w-[60px] text-right"
            >
              Done
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </>
  );
}
