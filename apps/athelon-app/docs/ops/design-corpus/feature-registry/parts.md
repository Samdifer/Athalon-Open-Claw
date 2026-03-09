# Parts - Feature Registry

## Design Direction

- Primary mode: mixed `ICW` + `ETF`
- Operational inventory work is execution-facing
- Warehouse, alerts, and procurement edges need more structured business-software treatment

## Roles and Access

- Primary users:
  - `parts_clerk`
  - `lead_technician`
  - `technician`
  - `shop_manager`
- Secondary users:
  - `billing_manager` on procurement-adjacent paths
- Access notes:
  - Parts is one of the clearest mixed-role surfaces in the app
  - some procurement and sales-adjacent visibility exists in the sidebar for `parts_clerk`, which needs explicit justification

## Entry Points and Adjacent Surfaces

- Main entries:
  - `/parts`
  - `/parts/requests`
  - `/parts/receiving`
  - `/parts/warehouse`
  - `/parts/alerts`
  - `/parts/receiving/po`
- Main adjacency:
  - Work Orders
  - Billing purchase orders and vendors
  - Tool and compliance readiness

## Routes

- `/parts`
- `/parts/new`
- `/parts/requests`
- `/parts/receiving`
- `/parts/tools`
- `/parts/cores`
- `/parts/inventory-count`
- `/parts/shipping`
- `/parts/rotables`
- `/parts/loaners`
- `/parts/alerts`
- `/parts/lots`
- `/parts/receiving/po`
- `/parts/warehouse`
- `/parts/tags`

## Shell Dependencies

- Uses `LocationSwitcher`
- Top-bar notifications link into `/parts/alerts`
- QR and barcode flows are prominent across the surface
- Depends on org and technician context for inspection and reservation actions

## Data Dependencies

### Convex Queries

- Core inventory:
  - `api.parts.listParts`
  - `api.partTags.getPartsByTag`
  - `api.documents.getPhotoThumbnailsForParts`
  - `api.technicians.getSelf`
  - `api.workOrders.listActive`
- Alerts and readiness:
  - `api.inventoryAlerts.getReorderAlerts`
  - `api.inventoryAlerts.getAlertsSummary`
  - `api.inventoryAlerts.getCalibrationAlerts`
  - `api.inventoryAlerts.getShelfLifeAlerts`
- Warehouse and bins:
  - `api.warehouseLocations.listWarehouses`
  - area, shelf, shelf-location, bin, and full-path queries
  - lot and part queries by bin
- Traceability and documents:
  - `api.partHistory.listHistoryForPart`
  - `api.partDocuments.listForPart`
  - `api.partDocuments.listForLot`
  - `api.partDocuments.getConformityStatus`
  - `api.documents.getDocumentUrl`
  - `api.form8130.getForm8130Data`
- Specialized subdomains:
  - `api.rotables.*`
  - `api.loaners.*`
  - `api.cores.*`
  - `api.shipping.*`
  - `api.lots.*`
  - `api.physicalInventory.*`
  - `api.toolCrib.*`
  - `api.poReceiving.*`
  - `api.vendors.listVendors`
  - `api.customers.listCustomers`

### Convex Mutations and Actions

- Receiving and reservation:
  - `api.gapFixes.completeReceivingInspection`
  - `api.gapFixes.reservePartForWorkOrder`
  - `api.gapFixes.releasePartReservation`
  - `api.parts.receivePart`
- Documents:
  - `api.documents.generateUploadUrl`
  - `api.documents.saveDocument`
  - `api.partDocuments.linkDocument`
  - `api.partDocuments.unlinkDocument`
- Subdomain writes:
  - core return, loaner, rotable, shipping, count, tag, and warehouse create/update flows

### Cross-Feature Data

- Work Orders provide active demand and reservation targets
- Vendors, customers, and purchase orders connect Parts to Billing
- Tool calibration and training readiness connect Parts to Compliance and Personnel

## Cross-Feature Component Imports

- Imports `DocumentAttachmentPanel` from Work Orders detail components

## Shared Component Usage

- `LocationSwitcher`
- `BarcodeScanner`
- `QRCodeBadge`
- `QRScannerDialog`
- `PartStatusBadge`
- `ExportCSVButton`

## UI Patterns in Use

- Route-level tabs for:
  - all
  - in stock
  - pending inspection
  - installed
  - quarantine
  - disposition
  - low stock
  - kanban
  - inventory master
  - parts requests
- View modes inside the main inventory view:
  - cards
  - tiles
  - compact list
- Dialogs for receiving inspection, reservation, and QR output
- Sheet-based part detail
- Search, category filter, and location-aware views

## State Model

- Large local state surface:
  - active tab
  - view mode
  - category filter
  - QR/dialog state
  - selected part and sheet state
  - request-queue state
- Location selection comes from the shell
- Filter persistence is still mostly local

## Key Workflows by Role

- Parts clerk:
  - receive and inspect parts
  - manage inventory, bins, requests, and alerts
  - work through PO receiving and shipping
- Technician / lead:
  - inspect availability
  - request parts for work orders
  - reserve and review attached documentation
- Shop manager:
  - monitor shortages, traceability, and operational blockers

## Critical Decisions and Safety Checks

- Receiving inspection pass/fail
- Reservation against the correct work order
- Conformity and traceability document handling
- Low-stock and quarantine treatment

## Redesign Notes

- This is the strongest candidate for a new `DataTable`
- Keep sheet-based drill-in as a pattern to expand, not remove
- Separate operator-facing request flows from inventory-administration flows more clearly
- Later redesign should normalize the view-mode toggle and document/traceability panels

## Surface Acceptance Criteria

- Inventory, requests, receiving, warehouse, and alerts must remain connected
- Part traceability and supporting documents cannot become harder to access
- Work-order reservation and issue flows must remain intact

## Open Questions

- Should `Inventory Master` become the default clerk view once a stronger table primitive exists?
- Should the work-order attachment panel remain imported from Work Orders or be promoted to shared?
