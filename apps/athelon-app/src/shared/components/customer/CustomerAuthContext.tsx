import { createContext, useContext } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";

export interface CustomerAuthContextValue {
  isLoaded: boolean;
  isSignedIn: boolean;
  customer: Doc<"customers"> | null;
  customerId: Id<"customers"> | null;
  hasPortalAccess: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  const customer = useQuery(
    api.customerPortal.getCustomerByEmail,
    email ? { email } : "skip",
  );

  const value: CustomerAuthContextValue = {
    isLoaded: isLoaded && (!email || customer !== undefined),
    isSignedIn: Boolean(isSignedIn),
    customer: customer ?? null,
    customerId: customer?._id ?? null,
    hasPortalAccess: Boolean(customer?._id),
  };

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  }
  return context;
}
