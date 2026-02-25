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
import type * as customers from "../customers.js";
import type * as discrepancies from "../discrepancies.js";
import type * as lib_authHelpers from "../lib/authHelpers.js";
import type * as lib_billingHelpers from "../lib/billingHelpers.js";
import type * as lib_numberGenerator from "../lib/numberGenerator.js";
import type * as lib_orgScope from "../lib/orgScope.js";
import type * as maintenanceRecords from "../maintenanceRecords.js";
import type * as parts from "../parts.js";
import type * as pricing from "../pricing.js";
import type * as returnToService from "../returnToService.js";
import type * as seed from "../seed.js";
import type * as taskCards from "../taskCards.js";
import type * as technicians from "../technicians.js";
import type * as timeClock from "../timeClock.js";
import type * as vendors from "../vendors.js";
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
  customers: typeof customers;
  discrepancies: typeof discrepancies;
  "lib/authHelpers": typeof lib_authHelpers;
  "lib/billingHelpers": typeof lib_billingHelpers;
  "lib/numberGenerator": typeof lib_numberGenerator;
  "lib/orgScope": typeof lib_orgScope;
  maintenanceRecords: typeof maintenanceRecords;
  parts: typeof parts;
  pricing: typeof pricing;
  returnToService: typeof returnToService;
  seed: typeof seed;
  taskCards: typeof taskCards;
  technicians: typeof technicians;
  timeClock: typeof timeClock;
  vendors: typeof vendors;
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
