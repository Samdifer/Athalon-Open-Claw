// convex/email.ts
// Athelon — Email sending via Resend API (or stub mode)
//
// Author: Devraj Anand (Backend Engineer)
//
// Uses Convex actions (not mutations) since actions can make external HTTP calls.
// Falls back to console logging if RESEND_API_KEY is not configured.

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    from: v.optional(v.string()),
    replyTo: v.optional(v.string()),
    // Metadata for logging
    organizationId: v.optional(v.string()),
    relatedTable: v.optional(v.string()),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;

    let success = false;
    let responseData: Record<string, unknown> = {};
    let stub = false;
    let errorMessage: string | undefined;

    if (!apiKey) {
      console.log(`[EMAIL STUB] To: ${args.to}, Subject: ${args.subject}`);
      console.log(`[EMAIL STUB] Body: ${args.html.substring(0, 200)}...`);
      success = true;
      stub = true;
      responseData = { message: "Email logged (no RESEND_API_KEY configured)" };
    } else {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: args.from ?? "Athelon MRO <noreply@athelon.app>",
            to: args.to,
            subject: args.subject,
            html: args.html,
            reply_to: args.replyTo,
          }),
        });
        responseData = (await response.json()) as Record<string, unknown>;
        success = response.ok;
        if (!success) {
          errorMessage = JSON.stringify(responseData);
        }
      } catch (e: unknown) {
        errorMessage = e instanceof Error ? e.message : String(e);
        success = false;
      }
    }

    // Log the email
    await ctx.runMutation(internal.emailLog.logEmail, {
      to: args.to,
      subject: args.subject,
      status: success ? "sent" : "failed",
      stub,
      errorMessage,
      organizationId: args.organizationId,
      relatedTable: args.relatedTable,
      relatedId: args.relatedId,
    });

    return { success, stub, data: responseData, errorMessage };
  },
});

// Internal version callable from scheduler
export const sendEmailInternal = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    from: v.optional(v.string()),
    replyTo: v.optional(v.string()),
    organizationId: v.optional(v.string()),
    relatedTable: v.optional(v.string()),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;

    let success = false;
    let stub = false;
    let errorMessage: string | undefined;

    if (!apiKey) {
      console.log(`[EMAIL STUB] To: ${args.to}, Subject: ${args.subject}`);
      console.log(`[EMAIL STUB] Body: ${args.html.substring(0, 200)}...`);
      success = true;
      stub = true;
    } else {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: args.from ?? "Athelon MRO <noreply@athelon.app>",
            to: args.to,
            subject: args.subject,
            html: args.html,
            reply_to: args.replyTo,
          }),
        });
        const data = await response.json();
        success = response.ok;
        if (!success) errorMessage = JSON.stringify(data);
      } catch (e: unknown) {
        errorMessage = e instanceof Error ? e.message : String(e);
      }
    }

    await ctx.runMutation(internal.emailLog.logEmail, {
      to: args.to,
      subject: args.subject,
      status: success ? "sent" : "failed",
      stub,
      errorMessage,
      organizationId: args.organizationId,
      relatedTable: args.relatedTable,
      relatedId: args.relatedId,
    });
  },
});
