import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface IOSNavBarProps {
  title: string;
  backHref?: string;
  backLabel?: string;
  rightAction?: React.ReactNode;
  largeTitle?: boolean;
  children?: React.ReactNode;
}

export function IOSNavBar({
  title,
  backHref,
  backLabel,
  rightAction,
  largeTitle = true,
  children,
}: IOSNavBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!largeTitle) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-44px 0px 0px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [largeTitle]);

  const showInlineTitle = !largeTitle || collapsed;

  return (
    <>
      {/* Fixed nav bar */}
      <div className="ios-nav-bar">
        <div className="flex items-center justify-between h-[44px] px-4">
          <div className="flex items-center min-w-[80px]">
            {backHref && (
              <Link
                to={backHref}
                className="flex items-center text-ios-blue -ml-1.5"
              >
                <ChevronLeft className="w-[22px] h-[22px]" strokeWidth={2.5} />
                <span className="text-[17px]">{backLabel || "Back"}</span>
              </Link>
            )}
          </div>
          <div
            className={`ios-nav-title text-center transition-opacity duration-200 ${
              showInlineTitle ? "opacity-100" : "opacity-0"
            }`}
          >
            {title}
          </div>
          <div className="flex items-center justify-end min-w-[80px]">
            {rightAction}
          </div>
        </div>
      </div>

      {/* Spacer for fixed nav */}
      <div className="h-[44px]" />

      {/* Large title + sentinel */}
      {largeTitle && (
        <>
          <div ref={sentinelRef} className="h-0" />
          <div className="px-4 pt-1 pb-1">
            <h1 className="ios-large-title">{title}</h1>
          </div>
        </>
      )}

      {/* Optional children slot (search bar, segmented control, etc.) */}
      {children && <div className="px-4 pb-2">{children}</div>}
    </>
  );
}
