import { Search, X } from "lucide-react";

interface IOSSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function IOSSearchBar({
  value,
  onChange,
  placeholder = "Search",
}: IOSSearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-ios-label-tertiary pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="ios-search-bar pl-8 pr-8"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2"
        >
          <div className="w-[16px] h-[16px] bg-ios-label-tertiary rounded-full flex items-center justify-center">
            <X className="w-[10px] h-[10px] text-white" strokeWidth={3} />
          </div>
        </button>
      )}
    </div>
  );
}
