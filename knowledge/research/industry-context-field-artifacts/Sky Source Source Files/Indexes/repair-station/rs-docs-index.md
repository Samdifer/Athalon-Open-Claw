# Repair Station Documents Index

**Source:** `Source Files/Repair Station/`
**Facility:** Skysource (HSYR817E)
**Total Documents:** 2 PDFs
**Indexed:** 2026-01-12

---

## Overview

These are the internal documents for the Skysource repair station. They implement the requirements of 14 CFR Part 145 and must comply with FAA Order 8900.1 DCT evaluation criteria.

---

## Document 1: Repair Station Training Manual (RSTM)

### Basic Information
- **File:** `2025 RSTM training manual-complete reissue (1).pdf`
- **Size:** 1.9 MB
- **Revision:** 2025 Complete Reissue
- **Type:** FAA Approved Document

### Regulatory Basis
- **CFR Reference:** 14 CFR 145.163 - Training requirements
- **Related AC:** AC 145-10 - Repair Station Training Program
- **Related Order:** FAA Order 8900.1, Vol 6, Ch 9, Sec 13
- **DCT Form:** EP_4_3_6_145F_AW - Training Program Surveillance

### Expected Content (per 145.163)
1. **Training Program Structure**
   - Initial training requirements
   - Recurrent training requirements
   - On-the-job training (OJT)
   - Specialized training

2. **Training Records Requirements**
   - Record format
   - Retention period (minimum 2 years per 145.163(c))
   - Record accessibility

3. **Training Program Administration**
   - Training coordinator responsibilities
   - Training evaluation methods
   - Training material maintenance
   - Revision procedures

### Compliance Requirements
| CFR Section | Requirement | RSTM Section |
|-------------|-------------|--------------|
| 145.163(a) | FAA-approved training program | TBD |
| 145.163(b) | Ensure employee capability | TBD |
| 145.163(c) | Document training, retain 2 years | TBD |
| 145.163(d) | Submit revisions to FSDO | TBD |

### FAA Status
- **Approval Status:** Approved
- **Change Process:** Requires FAA approval before implementation
- **Notification:** Submit revisions to responsible Flight Standards office

---

## Document 2: Repair Station Quality Control Manual (RSQC)

### Basic Information
- **File:** `RSQC Skysource HSYR817E Revision 22_20-FEB-2025.pdf`
- **Size:** 3.0 MB
- **Revision:** 22
- **Revision Date:** February 20, 2025
- **Certificate Number:** HSYR817E
- **Type:** FAA Accepted Document

### Regulatory Basis
- **CFR Reference:** 14 CFR 145.211 - Quality control system
- **Related AC:** AC 145-5 - Quality Control
- **Related Order:** FAA Order 8900.1, Vol 6, Ch 9, Sec 21
- **DCT Form:** EP_4_4_6_145F_AW - Quality Control Surveillance

### Expected Content (per 145.211)
1. **Inspection Procedures**
   - Incoming raw materials inspection
   - Preliminary inspection
   - Hidden damage inspection
   - Final inspection

2. **Calibration Program**
   - Tool and equipment calibration
   - Calibration standards
   - Calibration records

3. **Defect Control**
   - Suspected unapproved parts (SUP)
   - Defect recall system
   - Nonconformance handling

4. **Documentation**
   - Inspection documentation
   - Return to service records
   - Quality records retention

### Compliance Requirements
| CFR Section | Requirement | RSQC Section |
|-------------|-------------|--------------|
| 145.211(a) | Inspect incoming materials | TBD |
| 145.211(b) | Perform preliminary inspection | TBD |
| 145.211(c) | Perform hidden damage inspection | TBD |
| 145.211(d) | Perform final inspection | TBD |
| 145.211(e) | Calibrate tools/equipment | TBD |
| 145.211(f) | Recall defective articles | TBD |

### FAA Status
- **Acceptance Status:** Accepted
- **Change Process:** 30-day advance notification for changes
- **Notification:** Notify responsible Flight Standards office of revisions

---

## Document Hierarchy

```
Skysource Repair Station (HSYR817E)
├── Repair Station Manual (RSM) - Not provided
│   └── Defines organization, procedures, privileges
├── Quality Control Manual (RSQC) ✓ Available
│   └── RSQC Skysource HSYR817E Revision 22
│       └── Defines inspection and quality procedures
└── Training Manual (RSTM) ✓ Available
    └── 2025 RSTM Training Manual Complete Reissue
        └── Defines training programs and requirements
```

---

## Cross-Reference to DCT Evaluation

### Training Manual Evaluation
| DCT Item | Evaluation Area | RSTM Coverage |
|----------|-----------------|---------------|
| EP_4_3_6 Item 1 | Training program documented | Pending review |
| EP_4_3_6 Item 2 | Initial training defined | Pending review |
| EP_4_3_6 Item 3 | Recurrent training defined | Pending review |
| EP_4_3_6 Item 4 | Training records maintained | Pending review |

### Quality Manual Evaluation
| DCT Item | Evaluation Area | RSQC Coverage |
|----------|-----------------|---------------|
| EP_4_4_6 Item 1 | Receiving inspection | Pending review |
| EP_4_4_6 Item 2 | In-process inspection | Pending review |
| EP_4_4_6 Item 3 | Final inspection | Pending review |
| EP_4_4_6 Item 4 | Calibration program | Pending review |

---

## Audit Preparation Notes

### Documents Available
- [x] Training Manual (RSTM 2025)
- [x] Quality Control Manual (RSQC Rev 22)
- [ ] Repair Station Manual (RSM) - Not in source files

### Key Review Areas
1. **Training (145.163)**
   - Initial training for each employee
   - Recurrent training schedule
   - Record retention (2 years minimum)
   - Training program revision process

2. **Quality Control (145.211)**
   - Inspection procedures completeness
   - Calibration program currency
   - Defect tracking system
   - Final inspection documentation

3. **Records (145.219)**
   - Work record content
   - Return to service documentation
   - Record retention and accessibility

---

## Index Metadata

```json
{
  "id": "RS-Docs-Index",
  "type": "repair-station",
  "facility": "Skysource",
  "certificate": "HSYR817E",
  "documents": [
    {
      "id": "RSTM-2025",
      "type": "training-manual",
      "revision": "2025 Complete Reissue",
      "cfr_reference": "145.163"
    },
    {
      "id": "RSQC-Rev22",
      "type": "quality-control-manual",
      "revision": "22",
      "revision_date": "2025-02-20",
      "cfr_reference": "145.211"
    }
  ],
  "source_path": "Source Files/Repair Station/",
  "indexed_date": "2026-01-12"
}
```
