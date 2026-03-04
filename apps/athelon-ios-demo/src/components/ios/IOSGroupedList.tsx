import React from "react";

interface IOSGroupedListSection {
  header?: string;
  footer?: string;
  items: React.ReactNode[];
}

interface IOSGroupedListProps {
  sections: IOSGroupedListSection[];
}

export function IOSGroupedList({ sections }: IOSGroupedListProps) {
  return (
    <div className="px-4 space-y-0">
      {sections.map((section, si) => (
        <div key={si}>
          {section.header && (
            <div className="ios-section-header">{section.header}</div>
          )}
          <div className="ios-grouped-section">
            {section.items.map((item, ii) => (
              <div
                key={ii}
                className={
                  ii < section.items.length - 1 ? "ios-row-separator" : ""
                }
              >
                {item}
              </div>
            ))}
          </div>
          {section.footer && (
            <div className="ios-section-footer">{section.footer}</div>
          )}
        </div>
      ))}
    </div>
  );
}
