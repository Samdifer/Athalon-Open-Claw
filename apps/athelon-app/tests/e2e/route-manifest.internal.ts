export type InternalRoute = {
  label: string;
  path: string;
  skipCtaClickAudit?: boolean;
};

export const INTERNAL_ROUTE_MANIFEST: InternalRoute[] = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "My Work", path: "/my-work" },
  { label: "Lead Center", path: "/lead" },

  { label: "Fleet", path: "/fleet" },
  { label: "Fleet Calendar", path: "/fleet/calendar" },
  { label: "Fleet Predictions", path: "/fleet/predictions" },

  { label: "Work Orders", path: "/work-orders" },
  { label: "Work Order Kanban", path: "/work-orders/kanban" },
  { label: "Work Order Templates", path: "/work-orders/templates" },
  { label: "New Work Order", path: "/work-orders/new" },

  { label: "Parts", path: "/parts" },
  { label: "New Part", path: "/parts/new" },
  { label: "Part Requests", path: "/parts/requests" },
  { label: "Part Receiving", path: "/parts/receiving" },
  { label: "Tools", path: "/parts/tools" },
  { label: "Cores", path: "/parts/cores" },
  { label: "Inventory Count", path: "/parts/inventory-count" },
  { label: "Shipping", path: "/parts/shipping" },
  { label: "Rotables", path: "/parts/rotables" },
  { label: "Loaners", path: "/parts/loaners" },

  { label: "Personnel", path: "/personnel" },
  { label: "Training", path: "/personnel/training" },

  { label: "Compliance", path: "/compliance" },
  { label: "QCM Review", path: "/compliance/qcm-review" },
  { label: "Audit Trail", path: "/compliance/audit-trail" },
  { label: "AD/SB", path: "/compliance/ad-sb" },
  { label: "Findings", path: "/findings" },

  { label: "Customers", path: "/billing/customers" },
  { label: "Invoices", path: "/billing/invoices" },
  { label: "Quotes", path: "/billing/quotes" },
  { label: "Purchase Orders", path: "/billing/purchase-orders" },
  { label: "Vendors", path: "/billing/vendors" },
  { label: "AR Dashboard", path: "/billing/ar-dashboard" },
  { label: "Billing Analytics", path: "/billing/analytics" },
  { label: "Pricing", path: "/billing/pricing" },
  { label: "Time Clock", path: "/billing/time-clock" },
  { label: "Time Approval", path: "/billing/time-approval" },
  { label: "Deposits", path: "/billing/deposits" },
  { label: "Credit Memos", path: "/billing/credit-memos" },
  { label: "Recurring", path: "/billing/recurring" },
  { label: "Tax Config", path: "/billing/tax-config" },
  { label: "Billing Settings", path: "/billing/settings" },
  { label: "OTC Sales", path: "/billing/otc" },
  { label: "Warranty", path: "/billing/warranty" },
  { label: "Labor Kits", path: "/billing/labor-kits" },

  { label: "Sales Dashboard", path: "/sales/dashboard" },
  { label: "Sales Ops", path: "/sales/ops" },
  { label: "Sales Quotes", path: "/sales/quotes" },
  { label: "Sales Training", path: "/sales/training" },

  { label: "CRM Dashboard", path: "/crm/dashboard" },
  { label: "CRM Accounts", path: "/crm/accounts" },
  { label: "CRM Prospect Intelligence", path: "/crm/prospects/intelligence" },
  { label: "CRM Contacts", path: "/crm/contacts" },
  { label: "CRM Interactions", path: "/crm/interactions" },
  { label: "CRM Pipeline", path: "/crm/pipeline" },
  { label: "CRM Analytics", path: "/crm/analytics" },

  { label: "Scheduling", path: "/scheduling" },
  { label: "Scheduling Bays", path: "/scheduling/bays" },
  { label: "Scheduling Capacity", path: "/scheduling/capacity" },
  { label: "Scheduling Roster", path: "/scheduling/roster" },
  { label: "Scheduling Financial Planning", path: "/scheduling/financial-planning" },
  { label: "Scheduling Quote Workspace", path: "/scheduling/quotes" },

  { label: "Reports", path: "/reports" },

  { label: "Settings Shop", path: "/settings/shop" },
  { label: "Settings Station Config", path: "/settings/station-config" },
  { label: "Settings Users", path: "/settings/users" },
  { label: "Settings Notifications", path: "/settings/notifications" },
  { label: "Settings Locations", path: "/settings/locations" },
  { label: "Settings Import", path: "/settings/import" },
  { label: "Settings Routing Templates", path: "/settings/routing-templates" },
  { label: "Settings Email Log", path: "/settings/email-log" },
  { label: "Settings QuickBooks", path: "/settings/quickbooks" },
];
