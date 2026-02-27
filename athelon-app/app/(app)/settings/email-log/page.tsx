// app/(app)/settings/email-log/page.tsx
// Athelon — Email Log page

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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

export default function EmailLogPage() {
  const emails = useQuery(api.emailLog.listEmails, { limit: 100 });

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
          {!emails ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No emails sent yet</p>
              <p className="text-sm">Emails will appear here when invoices, quotes, or payment confirmations are sent.</p>
            </div>
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
