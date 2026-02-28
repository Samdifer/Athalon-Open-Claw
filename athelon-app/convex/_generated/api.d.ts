/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adCompliance from "../adCompliance.js";
import type * as aircraft from "../aircraft.js";
import type * as billing from "../billing.js";
import type * as billingV4 from "../billingV4.js";
import type * as billingV4b from "../billingV4b.js";
import type * as bulkImport from "../bulkImport.js";
import type * as capacity from "../capacity.js";
import type * as conformityInspections from "../conformityInspections.js";
import type * as cores from "../cores.js";
import type * as currency from "../currency.js";
import type * as customerPortal from "../customerPortal.js";
import type * as customers from "../customers.js";
import type * as discrepancies from "../discrepancies.js";
import type * as documents from "../documents.js";
import type * as email from "../email.js";
import type * as emailLog from "../emailLog.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as faaLookup from "../faaLookup.js";
import type * as fleetCalendar from "../fleetCalendar.js";
import type * as gapFixes from "../gapFixes.js";
import type * as hangarBays from "../hangarBays.js";
import type * as laborKits from "../laborKits.js";
import type * as lib_authHelpers from "../lib/authHelpers.js";
import type * as lib_billingHelpers from "../lib/billingHelpers.js";
import type * as lib_numberGenerator from "../lib/numberGenerator.js";
import type * as lib_orgScope from "../lib/orgScope.js";
import type * as loaners from "../loaners.js";
import type * as logbook from "../logbook.js";
import type * as maintenanceRecords from "../maintenanceRecords.js";
import type * as notifications from "../notifications.js";
import type * as otcSales from "../otcSales.js";
import type * as parts from "../parts.js";
import type * as physicalInventory from "../physicalInventory.js";
import type * as predictions from "../predictions.js";
import type * as pricing from "../pricing.js";
import type * as quickbooks from "../quickbooks.js";
import type * as releaseCertificates from "../releaseCertificates.js";
import type * as returnToService from "../returnToService.js";
import type * as roles from "../roles.js";
import type * as rotables from "../rotables.js";
import type * as scheduling from "../scheduling.js";
import type * as seed from "../seed.js";
import type * as seedGroundAero from "../seedGroundAero.js";
import type * as seedPartsServices from "../seedPartsServices.js";
import type * as shipping from "../shipping.js";
import type * as shopLocations from "../shopLocations.js";
import type * as simHelper from "../simHelper.js";
import type * as simPartsRunner from "../simPartsRunner.js";
import type * as simRunner from "../simRunner.js";
import type * as taskCardVendorServices from "../taskCardVendorServices.js";
import type * as taskCards from "../taskCards.js";
import type * as taskCompliance from "../taskCompliance.js";
import type * as technicians from "../technicians.js";
import type * as timeClock from "../timeClock.js";
import type * as toolCrib from "../toolCrib.js";
import type * as training from "../training.js";
import type * as vendors from "../vendors.js";
import type * as warranty from "../warranty.js";
import type * as workOrders from "../workOrders.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adCompliance: typeof adCompliance;
  aircraft: typeof aircraft;
  billing: typeof billing;
  billingV4: typeof billingV4;
  billingV4b: typeof billingV4b;
  bulkImport: typeof bulkImport;
  capacity: typeof capacity;
  conformityInspections: typeof conformityInspections;
  cores: typeof cores;
  currency: typeof currency;
  customerPortal: typeof customerPortal;
  customers: typeof customers;
  discrepancies: typeof discrepancies;
  documents: typeof documents;
  email: typeof email;
  emailLog: typeof emailLog;
  emailTemplates: typeof emailTemplates;
  faaLookup: typeof faaLookup;
  fleetCalendar: typeof fleetCalendar;
  gapFixes: typeof gapFixes;
  hangarBays: typeof hangarBays;
  laborKits: typeof laborKits;
  "lib/authHelpers": typeof lib_authHelpers;
  "lib/billingHelpers": typeof lib_billingHelpers;
  "lib/numberGenerator": typeof lib_numberGenerator;
  "lib/orgScope": typeof lib_orgScope;
  loaners: typeof loaners;
  logbook: typeof logbook;
  maintenanceRecords: typeof maintenanceRecords;
  notifications: typeof notifications;
  otcSales: typeof otcSales;
  parts: typeof parts;
  physicalInventory: typeof physicalInventory;
  predictions: typeof predictions;
  pricing: typeof pricing;
  quickbooks: typeof quickbooks;
  releaseCertificates: typeof releaseCertificates;
  returnToService: typeof returnToService;
  roles: typeof roles;
  rotables: typeof rotables;
  scheduling: typeof scheduling;
  seed: typeof seed;
  seedGroundAero: typeof seedGroundAero;
  seedPartsServices: typeof seedPartsServices;
  shipping: typeof shipping;
  shopLocations: typeof shopLocations;
  simHelper: typeof simHelper;
  simPartsRunner: typeof simPartsRunner;
  simRunner: typeof simRunner;
  taskCardVendorServices: typeof taskCardVendorServices;
  taskCards: typeof taskCards;
  taskCompliance: typeof taskCompliance;
  technicians: typeof technicians;
  timeClock: typeof timeClock;
  toolCrib: typeof toolCrib;
  training: typeof training;
  vendors: typeof vendors;
  warranty: typeof warranty;
  workOrders: typeof workOrders;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
