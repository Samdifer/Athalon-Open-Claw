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
import type * as carryForwardItems from "../carryForwardItems.js";
import type * as conformityInspections from "../conformityInspections.js";
import type * as cores from "../cores.js";
import type * as currency from "../currency.js";
import type * as customerPortal from "../customerPortal.js";
import type * as customers from "../customers.js";
import type * as discrepancies from "../discrepancies.js";
import type * as documents from "../documents.js";
import type * as domains_billing_billing from "../domains/billing/billing.js";
import type * as domains_billing_billingV4 from "../domains/billing/billingV4.js";
import type * as domains_billing_billingV4b from "../domains/billing/billingV4b.js";
import type * as domains_billing_currency from "../domains/billing/currency.js";
import type * as domains_billing_customers from "../domains/billing/customers.js";
import type * as domains_billing_email from "../domains/billing/email.js";
import type * as domains_billing_emailLog from "../domains/billing/emailLog.js";
import type * as domains_billing_emailTemplates from "../domains/billing/emailTemplates.js";
import type * as domains_billing_index from "../domains/billing/index.js";
import type * as domains_billing_laborKits from "../domains/billing/laborKits.js";
import type * as domains_billing_otcSales from "../domains/billing/otcSales.js";
import type * as domains_billing_pricing from "../domains/billing/pricing.js";
import type * as domains_billing_quickbooks from "../domains/billing/quickbooks.js";
import type * as domains_billing_quoteEnhancements from "../domains/billing/quoteEnhancements.js";
import type * as domains_billing_quoteTemplates from "../domains/billing/quoteTemplates.js";
import type * as domains_billing_timeClock from "../domains/billing/timeClock.js";
import type * as domains_billing_vendors from "../domains/billing/vendors.js";
import type * as domains_billing_warranty from "../domains/billing/warranty.js";
import type * as domains_fleet_adCompliance from "../domains/fleet/adCompliance.js";
import type * as domains_fleet_aircraft from "../domains/fleet/aircraft.js";
import type * as domains_fleet_fleetCalendar from "../domains/fleet/fleetCalendar.js";
import type * as domains_fleet_index from "../domains/fleet/index.js";
import type * as domains_fleet_logbook from "../domains/fleet/logbook.js";
import type * as domains_fleet_predictions from "../domains/fleet/predictions.js";
import type * as domains_parts_cores from "../domains/parts/cores.js";
import type * as domains_parts_index from "../domains/parts/index.js";
import type * as domains_parts_loaners from "../domains/parts/loaners.js";
import type * as domains_parts_parts from "../domains/parts/parts.js";
import type * as domains_parts_physicalInventory from "../domains/parts/physicalInventory.js";
import type * as domains_parts_rotables from "../domains/parts/rotables.js";
import type * as domains_parts_shipping from "../domains/parts/shipping.js";
import type * as domains_parts_toolCrib from "../domains/parts/toolCrib.js";
import type * as domains_personnel_index from "../domains/personnel/index.js";
import type * as domains_personnel_notifications from "../domains/personnel/notifications.js";
import type * as domains_personnel_onboarding from "../domains/personnel/onboarding.js";
import type * as domains_personnel_roles from "../domains/personnel/roles.js";
import type * as domains_personnel_technicianTraining from "../domains/personnel/technicianTraining.js";
import type * as domains_personnel_technicians from "../domains/personnel/technicians.js";
import type * as domains_personnel_training from "../domains/personnel/training.js";
import type * as domains_platform_bulkImport from "../domains/platform/bulkImport.js";
import type * as domains_platform_customerPortal from "../domains/platform/customerPortal.js";
import type * as domains_platform_documents from "../domains/platform/documents.js";
import type * as domains_platform_faaLookup from "../domains/platform/faaLookup.js";
import type * as domains_platform_gapFixes from "../domains/platform/gapFixes.js";
import type * as domains_platform_index from "../domains/platform/index.js";
import type * as domains_scheduling_capacity from "../domains/scheduling/capacity.js";
import type * as domains_scheduling_hangarBays from "../domains/scheduling/hangarBays.js";
import type * as domains_scheduling_index from "../domains/scheduling/index.js";
import type * as domains_scheduling_schedulerPlanning from "../domains/scheduling/schedulerPlanning.js";
import type * as domains_scheduling_schedulerRoster from "../domains/scheduling/schedulerRoster.js";
import type * as domains_scheduling_scheduling from "../domains/scheduling/scheduling.js";
import type * as domains_scheduling_shopLocations from "../domains/scheduling/shopLocations.js";
import type * as domains_scheduling_stationConfig from "../domains/scheduling/stationConfig.js";
import type * as domains_seeds_index from "../domains/seeds/index.js";
import type * as domains_seeds_seed from "../domains/seeds/seed.js";
import type * as domains_seeds_seedAudit from "../domains/seeds/seedAudit.js";
import type * as domains_seeds_seedGroundAero from "../domains/seeds/seedGroundAero.js";
import type * as domains_seeds_seedPartsServices from "../domains/seeds/seedPartsServices.js";
import type * as domains_seeds_seedRepairStationScenario from "../domains/seeds/seedRepairStationScenario.js";
import type * as domains_seeds_simHelper from "../domains/seeds/simHelper.js";
import type * as domains_seeds_simPartsRunner from "../domains/seeds/simPartsRunner.js";
import type * as domains_seeds_simRunner from "../domains/seeds/simRunner.js";
import type * as domains_workOrders_carryForwardItems from "../domains/workOrders/carryForwardItems.js";
import type * as domains_workOrders_conformityInspections from "../domains/workOrders/conformityInspections.js";
import type * as domains_workOrders_discrepancies from "../domains/workOrders/discrepancies.js";
import type * as domains_workOrders_index from "../domains/workOrders/index.js";
import type * as domains_workOrders_leadTurnover from "../domains/workOrders/leadTurnover.js";
import type * as domains_workOrders_maintenanceRecords from "../domains/workOrders/maintenanceRecords.js";
import type * as domains_workOrders_releaseCertificates from "../domains/workOrders/releaseCertificates.js";
import type * as domains_workOrders_returnToService from "../domains/workOrders/returnToService.js";
import type * as domains_workOrders_taskAssignments from "../domains/workOrders/taskAssignments.js";
import type * as domains_workOrders_taskCardVendorServices from "../domains/workOrders/taskCardVendorServices.js";
import type * as domains_workOrders_taskCards from "../domains/workOrders/taskCards.js";
import type * as domains_workOrders_taskCompliance from "../domains/workOrders/taskCompliance.js";
import type * as domains_workOrders_workOrders from "../domains/workOrders/workOrders.js";
import type * as email from "../email.js";
import type * as emailLog from "../emailLog.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as evidenceChecklists from "../evidenceChecklists.js";
import type * as faaLookup from "../faaLookup.js";
import type * as fileStorage from "../fileStorage.js";
import type * as fleetCalendar from "../fleetCalendar.js";
import type * as form8130 from "../form8130.js";
import type * as gapFixes from "../gapFixes.js";
import type * as hangarBays from "../hangarBays.js";
import type * as inventoryAlerts from "../inventoryAlerts.js";
import type * as inventoryValuation from "../inventoryValuation.js";
import type * as laborKits from "../laborKits.js";
import type * as leadTurnover from "../leadTurnover.js";
import type * as lib_authHelpers from "../lib/authHelpers.js";
import type * as lib_billingHelpers from "../lib/billingHelpers.js";
import type * as lib_numberGenerator from "../lib/numberGenerator.js";
import type * as lib_orgScope from "../lib/orgScope.js";
import type * as lib_rosterHelpers from "../lib/rosterHelpers.js";
import type * as lib_workOrderNumber from "../lib/workOrderNumber.js";
import type * as loaners from "../loaners.js";
import type * as logbook from "../logbook.js";
import type * as lots from "../lots.js";
import type * as maintenancePrograms from "../maintenancePrograms.js";
import type * as maintenanceRecords from "../maintenanceRecords.js";
import type * as notifications from "../notifications.js";
import type * as ojt from "../ojt.js";
import type * as onboarding from "../onboarding.js";
import type * as otcSales from "../otcSales.js";
import type * as partDocuments from "../partDocuments.js";
import type * as partHistory from "../partHistory.js";
import type * as parts from "../parts.js";
import type * as physicalInventory from "../physicalInventory.js";
import type * as poReceiving from "../poReceiving.js";
import type * as predictions from "../predictions.js";
import type * as pricing from "../pricing.js";
import type * as quickbooks from "../quickbooks.js";
import type * as quoteEnhancements from "../quoteEnhancements.js";
import type * as quoteTemplates from "../quoteTemplates.js";
import type * as releaseCertificates from "../releaseCertificates.js";
import type * as returnToService from "../returnToService.js";
import type * as roles from "../roles.js";
import type * as rotables from "../rotables.js";
import type * as scheduleSnapshots from "../scheduleSnapshots.js";
import type * as schedulerPlanning from "../schedulerPlanning.js";
import type * as schedulerRoster from "../schedulerRoster.js";
import type * as scheduling from "../scheduling.js";
import type * as seed from "../seed.js";
import type * as seedAudit from "../seedAudit.js";
import type * as seedGroundAero from "../seedGroundAero.js";
import type * as seedPartsServices from "../seedPartsServices.js";
import type * as seedRepairStationScenario from "../seedRepairStationScenario.js";
import type * as seeds_seed from "../seeds/seed.js";
import type * as seeds_seedAudit from "../seeds/seedAudit.js";
import type * as seeds_seedGroundAero from "../seeds/seedGroundAero.js";
import type * as seeds_seedPartsServices from "../seeds/seedPartsServices.js";
import type * as seeds_seedRepairStationScenario from "../seeds/seedRepairStationScenario.js";
import type * as seeds_simHelper from "../seeds/simHelper.js";
import type * as seeds_simPartsRunner from "../seeds/simPartsRunner.js";
import type * as seeds_simRunner from "../seeds/simRunner.js";
import type * as shared_helpers_authHelpers from "../shared/helpers/authHelpers.js";
import type * as shared_helpers_billingHelpers from "../shared/helpers/billingHelpers.js";
import type * as shared_helpers_numberGenerator from "../shared/helpers/numberGenerator.js";
import type * as shared_helpers_orgScope from "../shared/helpers/orgScope.js";
import type * as shared_helpers_rosterHelpers from "../shared/helpers/rosterHelpers.js";
import type * as shared_helpers_schedulingPermissions from "../shared/helpers/schedulingPermissions.js";
import type * as shared_helpers_workOrderNumber from "../shared/helpers/workOrderNumber.js";
import type * as shipping from "../shipping.js";
import type * as shopLocations from "../shopLocations.js";
import type * as simHelper from "../simHelper.js";
import type * as simPartsRunner from "../simPartsRunner.js";
import type * as simRunner from "../simRunner.js";
import type * as stationConfig from "../stationConfig.js";
import type * as taskAssignments from "../taskAssignments.js";
import type * as taskCardVendorServices from "../taskCardVendorServices.js";
import type * as taskCards from "../taskCards.js";
import type * as taskCompliance from "../taskCompliance.js";
import type * as taskStepPartTrace from "../taskStepPartTrace.js";
import type * as taskStepReferences from "../taskStepReferences.js";
import type * as tatEstimation from "../tatEstimation.js";
import type * as technicianTraining from "../technicianTraining.js";
import type * as technicians from "../technicians.js";
import type * as timeClock from "../timeClock.js";
import type * as toolCrib from "../toolCrib.js";
import type * as training from "../training.js";
import type * as vendors from "../vendors.js";
import type * as voiceNotes from "../voiceNotes.js";
import type * as warranty from "../warranty.js";
import type * as workOrderParts from "../workOrderParts.js";
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
  carryForwardItems: typeof carryForwardItems;
  conformityInspections: typeof conformityInspections;
  cores: typeof cores;
  currency: typeof currency;
  customerPortal: typeof customerPortal;
  customers: typeof customers;
  discrepancies: typeof discrepancies;
  documents: typeof documents;
  "domains/billing/billing": typeof domains_billing_billing;
  "domains/billing/billingV4": typeof domains_billing_billingV4;
  "domains/billing/billingV4b": typeof domains_billing_billingV4b;
  "domains/billing/currency": typeof domains_billing_currency;
  "domains/billing/customers": typeof domains_billing_customers;
  "domains/billing/email": typeof domains_billing_email;
  "domains/billing/emailLog": typeof domains_billing_emailLog;
  "domains/billing/emailTemplates": typeof domains_billing_emailTemplates;
  "domains/billing/index": typeof domains_billing_index;
  "domains/billing/laborKits": typeof domains_billing_laborKits;
  "domains/billing/otcSales": typeof domains_billing_otcSales;
  "domains/billing/pricing": typeof domains_billing_pricing;
  "domains/billing/quickbooks": typeof domains_billing_quickbooks;
  "domains/billing/quoteEnhancements": typeof domains_billing_quoteEnhancements;
  "domains/billing/quoteTemplates": typeof domains_billing_quoteTemplates;
  "domains/billing/timeClock": typeof domains_billing_timeClock;
  "domains/billing/vendors": typeof domains_billing_vendors;
  "domains/billing/warranty": typeof domains_billing_warranty;
  "domains/fleet/adCompliance": typeof domains_fleet_adCompliance;
  "domains/fleet/aircraft": typeof domains_fleet_aircraft;
  "domains/fleet/fleetCalendar": typeof domains_fleet_fleetCalendar;
  "domains/fleet/index": typeof domains_fleet_index;
  "domains/fleet/logbook": typeof domains_fleet_logbook;
  "domains/fleet/predictions": typeof domains_fleet_predictions;
  "domains/parts/cores": typeof domains_parts_cores;
  "domains/parts/index": typeof domains_parts_index;
  "domains/parts/loaners": typeof domains_parts_loaners;
  "domains/parts/parts": typeof domains_parts_parts;
  "domains/parts/physicalInventory": typeof domains_parts_physicalInventory;
  "domains/parts/rotables": typeof domains_parts_rotables;
  "domains/parts/shipping": typeof domains_parts_shipping;
  "domains/parts/toolCrib": typeof domains_parts_toolCrib;
  "domains/personnel/index": typeof domains_personnel_index;
  "domains/personnel/notifications": typeof domains_personnel_notifications;
  "domains/personnel/onboarding": typeof domains_personnel_onboarding;
  "domains/personnel/roles": typeof domains_personnel_roles;
  "domains/personnel/technicianTraining": typeof domains_personnel_technicianTraining;
  "domains/personnel/technicians": typeof domains_personnel_technicians;
  "domains/personnel/training": typeof domains_personnel_training;
  "domains/platform/bulkImport": typeof domains_platform_bulkImport;
  "domains/platform/customerPortal": typeof domains_platform_customerPortal;
  "domains/platform/documents": typeof domains_platform_documents;
  "domains/platform/faaLookup": typeof domains_platform_faaLookup;
  "domains/platform/gapFixes": typeof domains_platform_gapFixes;
  "domains/platform/index": typeof domains_platform_index;
  "domains/scheduling/capacity": typeof domains_scheduling_capacity;
  "domains/scheduling/hangarBays": typeof domains_scheduling_hangarBays;
  "domains/scheduling/index": typeof domains_scheduling_index;
  "domains/scheduling/schedulerPlanning": typeof domains_scheduling_schedulerPlanning;
  "domains/scheduling/schedulerRoster": typeof domains_scheduling_schedulerRoster;
  "domains/scheduling/scheduling": typeof domains_scheduling_scheduling;
  "domains/scheduling/shopLocations": typeof domains_scheduling_shopLocations;
  "domains/scheduling/stationConfig": typeof domains_scheduling_stationConfig;
  "domains/seeds/index": typeof domains_seeds_index;
  "domains/seeds/seed": typeof domains_seeds_seed;
  "domains/seeds/seedAudit": typeof domains_seeds_seedAudit;
  "domains/seeds/seedGroundAero": typeof domains_seeds_seedGroundAero;
  "domains/seeds/seedPartsServices": typeof domains_seeds_seedPartsServices;
  "domains/seeds/seedRepairStationScenario": typeof domains_seeds_seedRepairStationScenario;
  "domains/seeds/simHelper": typeof domains_seeds_simHelper;
  "domains/seeds/simPartsRunner": typeof domains_seeds_simPartsRunner;
  "domains/seeds/simRunner": typeof domains_seeds_simRunner;
  "domains/workOrders/carryForwardItems": typeof domains_workOrders_carryForwardItems;
  "domains/workOrders/conformityInspections": typeof domains_workOrders_conformityInspections;
  "domains/workOrders/discrepancies": typeof domains_workOrders_discrepancies;
  "domains/workOrders/index": typeof domains_workOrders_index;
  "domains/workOrders/leadTurnover": typeof domains_workOrders_leadTurnover;
  "domains/workOrders/maintenanceRecords": typeof domains_workOrders_maintenanceRecords;
  "domains/workOrders/releaseCertificates": typeof domains_workOrders_releaseCertificates;
  "domains/workOrders/returnToService": typeof domains_workOrders_returnToService;
  "domains/workOrders/taskAssignments": typeof domains_workOrders_taskAssignments;
  "domains/workOrders/taskCardVendorServices": typeof domains_workOrders_taskCardVendorServices;
  "domains/workOrders/taskCards": typeof domains_workOrders_taskCards;
  "domains/workOrders/taskCompliance": typeof domains_workOrders_taskCompliance;
  "domains/workOrders/workOrders": typeof domains_workOrders_workOrders;
  email: typeof email;
  emailLog: typeof emailLog;
  emailTemplates: typeof emailTemplates;
  evidenceChecklists: typeof evidenceChecklists;
  faaLookup: typeof faaLookup;
  fileStorage: typeof fileStorage;
  fleetCalendar: typeof fleetCalendar;
  form8130: typeof form8130;
  gapFixes: typeof gapFixes;
  hangarBays: typeof hangarBays;
  inventoryAlerts: typeof inventoryAlerts;
  inventoryValuation: typeof inventoryValuation;
  laborKits: typeof laborKits;
  leadTurnover: typeof leadTurnover;
  "lib/authHelpers": typeof lib_authHelpers;
  "lib/billingHelpers": typeof lib_billingHelpers;
  "lib/numberGenerator": typeof lib_numberGenerator;
  "lib/orgScope": typeof lib_orgScope;
  "lib/rosterHelpers": typeof lib_rosterHelpers;
  "lib/workOrderNumber": typeof lib_workOrderNumber;
  loaners: typeof loaners;
  logbook: typeof logbook;
  lots: typeof lots;
  maintenancePrograms: typeof maintenancePrograms;
  maintenanceRecords: typeof maintenanceRecords;
  notifications: typeof notifications;
  ojt: typeof ojt;
  onboarding: typeof onboarding;
  otcSales: typeof otcSales;
  partDocuments: typeof partDocuments;
  partHistory: typeof partHistory;
  parts: typeof parts;
  physicalInventory: typeof physicalInventory;
  poReceiving: typeof poReceiving;
  predictions: typeof predictions;
  pricing: typeof pricing;
  quickbooks: typeof quickbooks;
  quoteEnhancements: typeof quoteEnhancements;
  quoteTemplates: typeof quoteTemplates;
  releaseCertificates: typeof releaseCertificates;
  returnToService: typeof returnToService;
  roles: typeof roles;
  rotables: typeof rotables;
  scheduleSnapshots: typeof scheduleSnapshots;
  schedulerPlanning: typeof schedulerPlanning;
  schedulerRoster: typeof schedulerRoster;
  scheduling: typeof scheduling;
  seed: typeof seed;
  seedAudit: typeof seedAudit;
  seedGroundAero: typeof seedGroundAero;
  seedPartsServices: typeof seedPartsServices;
  seedRepairStationScenario: typeof seedRepairStationScenario;
  "seeds/seed": typeof seeds_seed;
  "seeds/seedAudit": typeof seeds_seedAudit;
  "seeds/seedGroundAero": typeof seeds_seedGroundAero;
  "seeds/seedPartsServices": typeof seeds_seedPartsServices;
  "seeds/seedRepairStationScenario": typeof seeds_seedRepairStationScenario;
  "seeds/simHelper": typeof seeds_simHelper;
  "seeds/simPartsRunner": typeof seeds_simPartsRunner;
  "seeds/simRunner": typeof seeds_simRunner;
  "shared/helpers/authHelpers": typeof shared_helpers_authHelpers;
  "shared/helpers/billingHelpers": typeof shared_helpers_billingHelpers;
  "shared/helpers/numberGenerator": typeof shared_helpers_numberGenerator;
  "shared/helpers/orgScope": typeof shared_helpers_orgScope;
  "shared/helpers/rosterHelpers": typeof shared_helpers_rosterHelpers;
  "shared/helpers/schedulingPermissions": typeof shared_helpers_schedulingPermissions;
  "shared/helpers/workOrderNumber": typeof shared_helpers_workOrderNumber;
  shipping: typeof shipping;
  shopLocations: typeof shopLocations;
  simHelper: typeof simHelper;
  simPartsRunner: typeof simPartsRunner;
  simRunner: typeof simRunner;
  stationConfig: typeof stationConfig;
  taskAssignments: typeof taskAssignments;
  taskCardVendorServices: typeof taskCardVendorServices;
  taskCards: typeof taskCards;
  taskCompliance: typeof taskCompliance;
  taskStepPartTrace: typeof taskStepPartTrace;
  taskStepReferences: typeof taskStepReferences;
  tatEstimation: typeof tatEstimation;
  technicianTraining: typeof technicianTraining;
  technicians: typeof technicians;
  timeClock: typeof timeClock;
  toolCrib: typeof toolCrib;
  training: typeof training;
  vendors: typeof vendors;
  voiceNotes: typeof voiceNotes;
  warranty: typeof warranty;
  workOrderParts: typeof workOrderParts;
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
