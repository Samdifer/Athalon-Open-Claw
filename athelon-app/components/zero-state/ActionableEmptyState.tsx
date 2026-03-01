import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

type ActionType = "link" | "button";

interface ActionableEmptyStateProps {
  title: string;
  missingInfo: string;
  primaryActionLabel: string;
  primaryActionType: ActionType;
  primaryActionTarget: string | (() => void);
  secondaryActionLabel?: string;
  secondaryActionTarget?: string;
  testId?: string;
}

export function ActionableEmptyState({
  title,
  missingInfo,
  primaryActionLabel,
  primaryActionType,
  primaryActionTarget,
  secondaryActionLabel,
  secondaryActionTarget,
  testId = "empty-state",
}: ActionableEmptyStateProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="py-16 text-center" data-testid={testId}>
        <AlertCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">{missingInfo}</p>

        <div className="mt-4 flex items-center justify-center gap-2">
          {primaryActionType === "link" ? (
            <Button asChild size="sm" data-testid="empty-state-primary-action">
              <Link to={String(primaryActionTarget)}>{primaryActionLabel}</Link>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={primaryActionTarget as () => void}
              data-testid="empty-state-primary-action"
            >
              {primaryActionLabel}
            </Button>
          )}

          {secondaryActionLabel && secondaryActionTarget && (
            <Button asChild size="sm" variant="outline">
              <Link to={secondaryActionTarget}>{secondaryActionLabel}</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
