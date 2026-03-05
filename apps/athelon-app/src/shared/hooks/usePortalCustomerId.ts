import type { Id } from "@/convex/_generated/dataModel";
import { useCustomerAuth } from "@/components/customer/CustomerAuthContext";

/**
 * Customer portal helper hook.
 * Reads the resolved customer id from CustomerAuthProvider.
 */
export function usePortalCustomerId(): Id<"customers"> | null {
  const { customerId } = useCustomerAuth();
  return customerId;
}
