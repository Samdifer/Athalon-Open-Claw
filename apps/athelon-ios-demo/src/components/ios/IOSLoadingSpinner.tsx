export function IOSLoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center py-8">
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        className="animate-spin"
        style={{ animationDuration: "0.8s" }}
      >
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="var(--color-ios-gray3)"
          strokeWidth="2.5"
          strokeDasharray="40 60"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
