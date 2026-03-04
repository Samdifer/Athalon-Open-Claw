import { clsx } from "clsx";

interface IOSActionButtonProps {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "destructive";
  icon?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function IOSActionButton({
  label,
  onClick,
  variant = "primary",
  icon,
  disabled,
  fullWidth,
}: IOSActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2 h-[50px] rounded-[12px] text-[17px] font-semibold transition-all duration-200 px-6",
        fullWidth && "w-full",
        variant === "primary" && "bg-ios-blue text-white active:bg-ios-blue/80",
        variant === "secondary" &&
          "bg-ios-fill-tertiary text-ios-blue active:bg-ios-fill-secondary",
        variant === "destructive" &&
          "bg-ios-red text-white active:bg-ios-red/80",
        disabled && "opacity-40 pointer-events-none"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
