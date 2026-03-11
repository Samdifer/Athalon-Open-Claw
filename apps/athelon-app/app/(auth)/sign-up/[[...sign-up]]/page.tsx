import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 sm:px-6">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">A</span>
          </div>
          <span className="text-2xl font-semibold tracking-tight text-foreground">
            Athelon
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          FAA Part 145 Maintenance Management
        </p>
      </div>
      <SignUp forceRedirectUrl="/dashboard" />
    </div>
  );
}
