import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Resolves the customer ID for the currently logged-in portal user.
 * Looks up the customer record by matching the Clerk user's email
 * against the customers table.
 */
export function usePortalCustomerId(): Id<"customers"> | null {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const result = useQuery(
    api.customerPortal.getCustomerByEmail,
    email ? { email } : "skip"
  );
  return result?._id ?? null;
}
