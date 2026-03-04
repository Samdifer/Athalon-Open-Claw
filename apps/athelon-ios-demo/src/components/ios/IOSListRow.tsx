import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface IOSListRowProps {
  title: string;
  subtitle?: string;
  detail?: string | React.ReactNode;
  icon?: React.ReactNode;
  iconBg?: string;
  accessory?: "disclosure" | "checkmark" | "badge" | React.ReactNode;
  badgeCount?: number;
  destructive?: boolean;
  href?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function IOSListRow({
  title,
  subtitle,
  detail,
  icon,
  iconBg,
  accessory = "disclosure",
  badgeCount,
  destructive,
  href,
  onClick,
  children,
}: IOSListRowProps) {
  const content = (
    <div className="ios-row ios-pressable py-[11px]">
      {icon && (
        <div
          className={`w-[29px] h-[29px] rounded-[6px] flex items-center justify-center mr-3 flex-shrink-0 ${
            iconBg || "bg-ios-blue"
          }`}
        >
          <div className="text-white w-[17px] h-[17px] flex items-center justify-center">
            {icon}
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div
          className={`text-[17px] leading-[22px] ${
            destructive ? "text-ios-red" : "text-ios-label"
          }`}
        >
          {title}
        </div>
        {subtitle && (
          <div className="text-[15px] leading-[20px] text-ios-label-secondary truncate">
            {subtitle}
          </div>
        )}
        {children}
      </div>
      <div className="flex items-center ml-2 flex-shrink-0">
        {detail && (
          <span className="text-[17px] text-ios-label-secondary mr-1.5">
            {detail}
          </span>
        )}
        {accessory === "disclosure" && (
          <ChevronRight className="w-[14px] h-[14px] text-ios-gray3" strokeWidth={3} />
        )}
        {accessory === "checkmark" && (
          <svg className="w-[14px] h-[14px] text-ios-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {accessory === "badge" && badgeCount !== undefined && badgeCount > 0 && (
          <span className="ios-badge">{badgeCount}</span>
        )}
        {accessory !== "disclosure" &&
          accessory !== "checkmark" &&
          accessory !== "badge" &&
          accessory}
      </div>
    </div>
  );

  if (href) {
    return <Link to={href} className="block">{content}</Link>;
  }
  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{content}</button>;
  }
  return content;
}
