import { Link } from "react-router-dom";
import { SignIn } from "@clerk/clerk-react";

export default function CustomerSignInPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-5">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-300">Athelon</p>
          <h1 className="text-4xl font-bold leading-tight">Customer Portal</h1>
          <p className="text-slate-300 max-w-md">
            Track work order progress, review invoices, and approve or decline quotes in one secure view.
          </p>
          <div className="text-sm text-slate-400">
            Staff login? <Link className="text-blue-300 hover:text-blue-200" to="/sign-in">Use the maintenance app sign-in</Link>
          </div>
        </div>

        <div className="flex justify-center md:justify-end">
          <SignIn forceRedirectUrl="/portal" fallbackRedirectUrl="/portal" />
        </div>
      </div>
    </div>
  );
}
