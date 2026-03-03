// app/(app)/settings/email-log/page.tsx
// Athelon — Email Log page

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { usePagePrereqs } from "@/hooks/usePagePrereqs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionableEmptyState } from "@/components/zero-state/ActionableEmptyState";

export default function EmailLogPage() {
  const { orgId, isLoaded } = useCurrentOrg();
  const emails = useQuery(
    api.emailLog.listEmails,
    orgId ? { orgId: String(orgId), limit: 100 } : "skip",
  );
  const prereq = usePagePrereqs({
    requiresOrg: true,
    isDataLoading: !isLoaded || emails === undefined,
  });

  if (prereq.state === "loading_context" || prereq.state === "loading_data") {
    return (
      <div className="space-y-4" data-testid="page-loading-state">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (prereq.state === "missing_context") {
    return (
      <ActionableEmptyState
        title="Email log requires organization setup"
        missingInfo="Complete onboarding before using outbound email tracking."
        primaryActionLabel="Complete Setup"
        primaryActionType="link"
        primaryActionTarget="/onboarding"
      />
    );
  }

  if (!emails) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Log</h1>
        <p className="text-muted-foreground">Track all outbound emails sent by the system.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Recent Emails
          </CardTitle>
          <CardDescription>Showing the last 100 emails sent.</CardDescription>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <ActionableEmptyState
              title="No emails sent yet"
              missingInfo="Emails will appear here when invoices, quotes, or payment confirmations are sent."
              primaryActionLabel="Open Invoices"
              primaryActionType="link"
              primaryActionTarget="/billing/invoices"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email: { _id: string; to: string; subject: string; status: string; stub: boolean; sentAt: number }) => (
                    <TableRow key={email._id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {email.to}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {email.subject}
                      </TableCell>
                      <TableCell>
                        {email.status === "sent" ? (
                          email.stub ? (
                            <Badge variant="outline" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Stub
                            </Badge>
                          ) : (
                            <Badge className="gap-1 bg-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Sent
                            </Badge>
                          )
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {new Date(email.sentAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
