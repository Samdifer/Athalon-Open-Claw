interface IOSSegmentedControlProps {
  segments: Array<{ label: string; value: string }>;
  selected: string;
  onChange: (val: string) => void;
}

export function IOSSegmentedControl({
  segments,
  selected,
  onChange,
}: IOSSegmentedControlProps) {
  return (
    <div className="ios-segmented-control">
      {segments.map((seg) => (
        <button
          key={seg.value}
          onClick={() => onChange(seg.value)}
          className={`ios-segment ${
            selected === seg.value ? "ios-segment-active" : ""
          }`}
        >
          {seg.label}
        </button>
      ))}
    </div>
  );
}
