import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listRates = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    return await ctx.db
      .query("currencyRates")
      .withIndex("by_org", (q) => q.eq("organizationId", orgId))
      .collect();
  },
});

export const upsertRate = mutation({
  args: {
    orgId: v.id("organizations"),
    fromCurrency: v.string(),
    toCurrency: v.string(),
    rate: v.number(),
  },
  handler: async (ctx, { orgId, fromCurrency, toCurrency, rate }) => {
    const existing = await ctx.db
      .query("currencyRates")
      .withIndex("by_pair", (q) =>
        q.eq("organizationId", orgId).eq("fromCurrency", fromCurrency).eq("toCurrency", toCurrency),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { rate, updatedAt: Date.now() });
      return existing._id;
    }

    return await ctx.db.insert("currencyRates", {
      organizationId: orgId,
      fromCurrency,
      toCurrency,
      rate,
      updatedAt: Date.now(),
    });
  },
});

export const deleteRate = mutation({
  args: { rateId: v.id("currencyRates") },
  handler: async (ctx, { rateId }) => {
    await ctx.db.delete(rateId);
  },
});

export const convertAmount = query({
  args: {
    orgId: v.id("organizations"),
    amount: v.number(),
    fromCurrency: v.string(),
    toCurrency: v.string(),
  },
  handler: async (ctx, { orgId, amount, fromCurrency, toCurrency }) => {
    if (fromCurrency === toCurrency) return amount;

    const rate = await ctx.db
      .query("currencyRates")
      .withIndex("by_pair", (q) =>
        q.eq("organizationId", orgId).eq("fromCurrency", fromCurrency).eq("toCurrency", toCurrency),
      )
      .first();

    if (rate) return amount * rate.rate;

    // Try reverse
    const reverseRate = await ctx.db
      .query("currencyRates")
      .withIndex("by_pair", (q) =>
        q.eq("organizationId", orgId).eq("fromCurrency", toCurrency).eq("toCurrency", fromCurrency),
      )
      .first();

    if (reverseRate && reverseRate.rate !== 0) return amount / reverseRate.rate;

    throw new Error(`No exchange rate found for ${fromCurrency} → ${toCurrency}`);
  },
});

export const listSupportedCurrencies = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const settings = await ctx.db
      .query("orgBillingSettings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();

    return {
      baseCurrency: settings?.baseCurrency ?? "USD",
      supportedCurrencies: settings?.supportedCurrencies ?? ["USD"],
    };
  },
});

export const updateCurrencySettings = mutation({
  args: {
    orgId: v.id("organizations"),
    baseCurrency: v.string(),
    supportedCurrencies: v.array(v.string()),
  },
  handler: async (ctx, { orgId, baseCurrency, supportedCurrencies }) => {
    const settings = await ctx.db
      .query("orgBillingSettings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();

    if (settings) {
      await ctx.db.patch(settings._id, {
        baseCurrency,
        supportedCurrencies,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("orgBillingSettings", {
        orgId,
        baseCurrency,
        supportedCurrencies,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});
