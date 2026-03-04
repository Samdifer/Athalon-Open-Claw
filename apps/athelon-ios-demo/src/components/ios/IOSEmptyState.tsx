interface IOSEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function IOSEmptyState({ icon, title, subtitle }: IOSEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      <div className="text-ios-gray3 mb-4 w-[48px] h-[48px] flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-[20px] font-semibold text-ios-label mb-1 text-center">
        {title}
      </h3>
      {subtitle && (
        <p className="text-[15px] text-ios-label-secondary text-center max-w-[260px]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
