import { Link } from "react-router-dom";
import { Plane, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PortalNotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-4">
      <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
        <Plane className="w-7 h-7 text-white" />
      </div>

      <h1 className="text-6xl font-extrabold text-foreground mb-2">404</h1>
      <p className="text-xl font-semibold text-foreground mb-2">Page not found</p>
      <p className="text-muted-foreground max-w-sm mb-8">
        The page you're looking for doesn't exist or may have been moved.
      </p>

      <Button asChild>
        <Link to="/portal">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Portal Home
        </Link>
      </Button>
    </div>
  );
}
