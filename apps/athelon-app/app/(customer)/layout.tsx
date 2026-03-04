import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Plane, LogOut } from "lucide-react";

export function CustomerLayout() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/sign-in");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/portal" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Athelon</span>
              <span className="text-sm text-gray-500 hidden sm:inline">Customer Portal</span>
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:inline">
                {user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Customer"}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2">
            {[
              { to: "/portal", label: "Dashboard" },
              { to: "/portal/work-orders", label: "Work Orders" },
              { to: "/portal/quotes", label: "Quotes" },
              { to: "/portal/invoices", label: "Invoices" },
              { to: "/portal/fleet", label: "Fleet" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md whitespace-nowrap transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-gray-400">
            Powered by <span className="font-semibold text-gray-500">Athelon</span> — Aviation MRO Platform
          </p>
        </div>
      </footer>
    </div>
  );
}

export default CustomerLayout;
