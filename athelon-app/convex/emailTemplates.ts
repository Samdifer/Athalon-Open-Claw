// convex/emailTemplates.ts
// Athelon — Email Templates for MRO communications
//
// Author: Devraj Anand (Backend Engineer)
// All templates use inline CSS for maximum email client compatibility.

const BRAND_COLOR = "#1e40af";
const BRAND_BG = "#f8fafc";

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_BG};padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
<tr><td style="background:${BRAND_COLOR};padding:24px 32px;">
  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">✈️ Athelon MRO</h1>
</td></tr>
<tr><td style="padding:32px;">
${body}
</td></tr>
<tr><td style="padding:16px 32px;background:#f1f5f9;border-top:1px solid #e2e8f0;">
  <p style="margin:0;color:#64748b;font-size:12px;text-align:center;">
    Athelon MRO — Aviation Maintenance, Repair &amp; Overhaul<br>
    This is an automated message. Please do not reply directly to this email.
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(text: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td>
<a href="${url}" style="display:inline-block;padding:12px 28px;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;">${text}</a>
</td></tr></table>`;
}

export function invoiceSentTemplate(
  invoiceNumber: string,
  customerName: string,
  amount: string,
  dueDate: string,
  viewUrl: string,
): string {
  return layout(`
<h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;">New Invoice</h2>
<p style="color:#334155;line-height:1.6;">Hi ${customerName},</p>
<p style="color:#334155;line-height:1.6;">A new invoice has been issued for your account:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 0;color:#64748b;width:140px;">Invoice Number</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${invoiceNumber}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Amount Due</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${amount}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Due Date</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${dueDate}</td></tr>
</table>
${button("View Invoice", viewUrl)}
<p style="color:#64748b;font-size:13px;">If you have any questions, please contact our billing department.</p>
`);
}

export function quoteSentTemplate(
  quoteNumber: string,
  customerName: string,
  expiryDate: string,
  viewUrl: string,
): string {
  return layout(`
<h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;">New Quote for Review</h2>
<p style="color:#334155;line-height:1.6;">Hi ${customerName},</p>
<p style="color:#334155;line-height:1.6;">A new maintenance quote has been prepared for your review:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 0;color:#64748b;width:140px;">Quote Number</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${quoteNumber}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Valid Until</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${expiryDate}</td></tr>
</table>
${button("Review Quote", viewUrl)}
<p style="color:#64748b;font-size:13px;">This quote is valid until the date shown above. Please review and respond at your earliest convenience.</p>
`);
}

export function woStatusUpdateTemplate(
  woNumber: string,
  aircraftTail: string,
  newStatus: string,
  portalUrl: string,
): string {
  return layout(`
<h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;">Work Order Status Update</h2>
<p style="color:#334155;line-height:1.6;">There has been a status update on your work order:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 0;color:#64748b;width:140px;">Work Order</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${woNumber}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Aircraft</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${aircraftTail}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">New Status</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${newStatus}</td></tr>
</table>
${button("View in Portal", portalUrl)}
`);
}

export function paymentReceivedTemplate(
  invoiceNumber: string,
  amount: string,
  remainingBalance: string,
): string {
  return layout(`
<h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;">Payment Received</h2>
<p style="color:#334155;line-height:1.6;">Thank you! We have received your payment:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 0;color:#64748b;width:140px;">Invoice</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${invoiceNumber}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Payment Amount</td><td style="padding:8px 0;color:#16a34a;font-weight:600;">${amount}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Remaining Balance</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${remainingBalance}</td></tr>
</table>
<p style="color:#64748b;font-size:13px;">If you believe this is an error, please contact our billing department immediately.</p>
`);
}

export function overdueReminderTemplate(
  invoiceNumber: string,
  customerName: string,
  amount: string,
  daysPastDue: number,
): string {
  return layout(`
<h2 style="margin:0 0 16px;color:#dc2626;font-size:20px;">⚠️ Invoice Overdue</h2>
<p style="color:#334155;line-height:1.6;">Hi ${customerName},</p>
<p style="color:#334155;line-height:1.6;">This is a reminder that the following invoice is <strong>${daysPastDue} day${daysPastDue === 1 ? "" : "s"}</strong> past due:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;">
  <tr><td style="padding:8px 0;color:#64748b;width:140px;">Invoice Number</td><td style="padding:8px 0;color:#0f172a;font-weight:600;">${invoiceNumber}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Amount Due</td><td style="padding:8px 0;color:#dc2626;font-weight:600;">${amount}</td></tr>
  <tr><td style="padding:8px 0;color:#64748b;">Days Past Due</td><td style="padding:8px 0;color:#dc2626;font-weight:600;">${daysPastDue}</td></tr>
</table>
<p style="color:#334155;line-height:1.6;">Please arrange payment at your earliest convenience to avoid any service disruptions.</p>
`);
}
