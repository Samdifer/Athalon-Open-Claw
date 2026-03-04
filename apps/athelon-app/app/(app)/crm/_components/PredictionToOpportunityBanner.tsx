import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function PredictionToOpportunityBanner({
  opportunityCount,
}: {
  opportunityCount: number;
}) {
  if (opportunityCount <= 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-3 px-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">{opportunityCount}</span> prediction
            {opportunityCount === 1 ? "" : "s"} can be converted into sales opportunities.
          </p>
        </div>
        <Button asChild size="sm" className="h-8">
          <Link to="/crm/pipeline" className="inline-flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            View Pipeline
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
