import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import type { MissingPrereqKind } from "@/components/zero-state/MissingPrereqBanner";

export type PagePrereqState =
  | "loading_context"
  | "missing_context"
  | "loading_data"
  | "ready";

interface UsePagePrereqsOptions {
  requiresOrg?: boolean;
  requiresTech?: boolean;
  isDataLoading?: boolean;
}

interface UsePagePrereqsResult {
  state: PagePrereqState;
  missingKind?: MissingPrereqKind;
}

export function usePagePrereqs(options: UsePagePrereqsOptions): UsePagePrereqsResult {
  const { requiresOrg = true, requiresTech = false, isDataLoading = false } = options;
  const { isLoaded, orgId, techId } = useCurrentOrg();

  if (!isLoaded) {
    return { state: "loading_context" };
  }

  if (requiresOrg && !orgId) {
    return { state: "missing_context", missingKind: "needs_org_context" };
  }

  if (requiresTech && !techId) {
    return { state: "missing_context", missingKind: "needs_technician_profile" };
  }

  if (isDataLoading) {
    return { state: "loading_data" };
  }

  return { state: "ready" };
}
