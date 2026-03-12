# Workforce & Manpower Planning for MRO Operations
## Athelon Scheduling Research — Optimization Tools Series, Document 06

**Status:** Research Draft
**Date:** 2026-03-12
**Audience:** Engineering, Product, Operations Leadership
**Scope:** Strategic workforce planning methodologies, optimization models, FAA Part 145 regulatory constraints, and integration architecture for the Athelon MRO SaaS platform

---

## Table of Contents

1. [What Workforce/Manpower Planning Is](#1-what-workforcemanpower-planning-is)
2. [Key Optimization Techniques](#2-key-optimization-techniques)
3. [Athelon-Specific Use Cases](#3-athelon-specific-use-cases)
4. [Implementation Details (Working Code)](#4-implementation-details-working-code)
5. [Where to Find It / Dependencies](#5-where-to-find-it--dependencies)
6. [Integration Architecture for Athelon](#6-integration-architecture-for-athelon)
7. [Interactions with Other Optimization Tools](#7-interactions-with-other-optimization-tools)
8. [FAA Part 145 Specific Requirements](#8-faa-part-145-specific-requirements)

---

## 1. What Workforce/Manpower Planning Is

### 1.1 Strategic Workforce Planning: The Four Rights

Strategic workforce planning is the discipline of ensuring an organization has the **right people** with the **right skills** in the **right place** at the **right cost** — consistently over time. In MRO operations this means:

- **Right people:** A&P-certificated mechanics, IA-authorized inspectors, FAA Repairman certificate holders, and trained support personnel in the correct mix
- **Right skills:** Airframe ratings, powerplant ratings, avionics qualifications, specific aircraft type experience, composite repair capability, NDT qualifications
- **Right time:** Matching labor supply to demand peaks (winter annual inspection season, contract induction schedules, AOG surge capacity)
- **Right cost:** Balancing permanent headcount (lower per-hour cost, higher fixed cost) against contract labor (higher per-hour cost, variable), and training investment against outsourcing cost

For a Part 145 certificated repair station, workforce planning is not just a business optimization problem — it is a **regulatory compliance requirement**. 14 CFR 145.151 mandates sufficient qualified personnel. Understaffing is an enforcement finding; chronic understaffing can result in certificate suspension.

### 1.2 The Workforce Planning Cycle

Workforce planning is a continuous cycle, not a one-time event:

```
Analyze → Forecast → Plan → Implement → Monitor → [repeat]
```

**Analyze:** Baseline the current workforce. Who do you have? What certifications do they hold? What is current utilization? Where are the skill gaps?

**Forecast:** Project future demand. What WOs are in the pipeline? What contracts are being negotiated? What is the fleet size trend for your customer base?

**Plan:** Produce actionable plans across three horizons:
- Short-term (1–4 weeks): Weekly rostering — which techs work which days, which WOs, which shifts
- Medium-term (1–3 months): Monthly staffing — overtime authorization, temp staffing decisions, training scheduling
- Long-term (3–18 months): Annual hiring — how many A&P mechanics to hire, when to onboard, training budget allocation

**Implement:** Execute the plans. Post rosters, authorize overtime, initiate hiring processes, schedule training.

**Monitor:** Track actuals against plan. Are utilization rates within target? Is overtime exceeding budget? Are certification gaps closing or widening?

### 1.3 Capacity Planning vs. Capability Planning

These are related but distinct concepts that are often conflated:

**Capacity planning** asks: "Do we have enough hours?"
- Unit of analysis: available technician-hours per period
- Inputs: headcount × shift hours × efficiency multiplier × (1 - absence rate)
- Output: total available hours vs. forecasted demand hours
- Gap metric: hours surplus or shortage
- Athelon's existing `getCapacityUtilization` query does this computation

**Capability planning** asks: "Do we have the right certifications and skills?"
- Unit of analysis: technicians with specific certifications or qualifications
- Inputs: workforce skill matrix (who can do what), demand skill requirements (what each WO type needs)
- Output: certification-specific gaps (e.g., "We need 2 IA-authorized inspectors on night shift but have 0")
- Gap metric: count of qualified personnel vs. required per skill/cert per period

An MRO that has 10 technicians covering 400 hours of demand against 380 hours of capacity looks fine on a capacity basis — but if the demand includes 3 Cessna Citation annual inspections that require 2 IA-authorized inspectors and the shop has only 1 IA current, there is a critical **capability gap** that capacity numbers completely hide.

Effective workforce planning requires both dimensions simultaneously.

### 1.4 Planning Horizons

| Horizon | Timeframe | Decisions | Uncertainty |
|---|---|---|---|
| Short-term rostering | 1–4 weeks | Which tech works which shift and WO | Low — WOs are scheduled, techs are known |
| Medium-term staffing | 1–3 months | Overtime authorization, temp labor, training timing | Medium — pipeline WOs have 60-80% booking probability |
| Long-term hiring | 3–18 months | Headcount additions by role, training investment | High — forecast uncertainty compounds |
| Strategic workforce | 2–5 years | Facilities, certification programs, compensation strategy | Very high — directional only |

Each horizon uses different data inputs, different optimization models, and different levels of precision. A weekly roster needs day-level precision; an annual hiring plan works on monthly buckets.

### 1.5 The MRO-Specific Workforce Challenge

General workforce planning frameworks (from retail, healthcare, call centers) apply partially but fail in several MRO-specific ways:

**FAA certification constraints make workers non-fungible.** A retail store can schedule any trained cashier for any register. An MRO cannot substitute an airframe-only mechanic for an annual inspection sign-off that legally requires an IA-authorized inspector. This makes MRO scheduling closer to healthcare (where nurse credentials determine assignment eligibility) than to retail.

**Skill perishability is real and regulated.** An IA that does not perform at least one annual inspection per 90 days (per 14 CFR 65.93) loses the right to exercise that authority on March 31. A technician who has not worked on a specific aircraft type in years may be certificated but practically incapable without refresher. Workforce planning must model skill currency, not just skill possession.

**Training pipeline lead times are long.** Hiring an A&P mechanic takes 4–8 weeks to recruit. Onboarding to productive output takes 4–12 weeks at a new shop. If a tech needs IA authorization, add the FAA exam process. If you need a tech type-certified on a specific turbine, add 2–4 weeks OEM training. From "we need an IA inspector" to "we have a fully productive IA inspector" can be 3–6 months. This means hiring decisions must be made far in advance of when capacity is actually needed — which requires demand forecasting.

**A&P certificate is the non-negotiable floor.** Every technician signing a maintenance entry at a Part 145 station must hold (at minimum) an appropriate mechanic certificate under 14 CFR Part 65. This creates an absolute floor: the workforce planning model cannot substitute uncertificated workers for certificated positions, only supplementary production-support roles.

**FAA repairman certificates are station-specific.** Unlike A&P certificates which are held by the individual, a repairman certificate under 14 CFR 65.101 is issued to a specific individual for a specific repair station's work scope. If a repairman leaves, the certificate becomes invalid; no substitute can be made without re-authorization. This creates key-person risk that succession planning must address.

---

## 2. Key Optimization Techniques for Workforce Planning

### 2.1 Demand Forecasting

Before any workforce plan can be built, demand must be forecast. MRO demand is unique: it is a combination of predictable schedule-driven work (annual inspections, 100-hour inspections) and unpredictable condition-driven work (squawks, AOG recoveries, lightning strike repairs).

#### 2.1.1 Time Series Methods

**Moving Average (Simple)**

The simplest forecasting method: the forecast for the next period equals the average of the last N periods.

```typescript
function movingAverage(data: number[], windowSize: number): number[] {
  const forecasts: number[] = [];
  for (let i = windowSize; i <= data.length; i++) {
    const window = data.slice(i - windowSize, i);
    const avg = window.reduce((sum, v) => sum + v, 0) / windowSize;
    forecasts.push(avg);
  }
  return forecasts;
}

// Usage: forecast next week's WO hours from last 4 weeks of actuals
const weeklyHours = [320, 380, 290, 410, 350, 370];
const forecast = movingAverage(weeklyHours, 4);
// Returns: [352.5, 357.5, 355.0] — one forecast per position after window
```

Simple moving average treats all historical periods equally and does not adapt to trends or seasonality. Good for stable, trendless demand.

**Exponential Smoothing (Single / Holt's)**

Assigns exponentially decaying weights to historical observations — recent observations count more. The smoothing parameter α controls how quickly the model adapts.

```typescript
interface ExponentialSmoothingResult {
  forecasts: number[];
  alpha: number;
  sse: number; // sum of squared errors (for alpha optimization)
}

function singleExponentialSmoothing(
  data: number[],
  alpha: number // 0 < alpha < 1; higher = more weight on recent data
): ExponentialSmoothingResult {
  if (data.length === 0) return { forecasts: [], alpha, sse: 0 };

  const forecasts: number[] = [data[0]]; // Initialize with first observation
  let sse = 0;

  for (let t = 1; t < data.length; t++) {
    const forecast = alpha * data[t - 1] + (1 - alpha) * forecasts[t - 1];
    forecasts.push(forecast);
    sse += Math.pow(data[t] - forecast, 2);
  }

  // One-step-ahead forecast for the next period
  const nextForecast =
    alpha * data[data.length - 1] + (1 - alpha) * forecasts[forecasts.length - 1];
  forecasts.push(nextForecast);

  return { forecasts, alpha, sse };
}

// Holt's Double Exponential Smoothing (handles linear trend)
function holtSmoothing(
  data: number[],
  alpha: number, // level smoothing
  beta: number   // trend smoothing
): { forecasts: number[]; hForecast: (h: number) => number } {
  let level = data[0];
  let trend = data[1] - data[0];
  const forecasts: number[] = [level + trend];

  for (let t = 1; t < data.length; t++) {
    const prevLevel = level;
    level = alpha * data[t] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    forecasts.push(level + trend);
  }

  // h-step ahead forecast
  const hForecast = (h: number) => level + h * trend;

  return { forecasts, hForecast };
}
```

For MRO demand, α = 0.2–0.4 typically works well. Lower α for stable demand, higher for volatile demand. Holt's method is better when there is a trend (growing fleet, expanding contracts).

**ARIMA and Prophet**

ARIMA (AutoRegressive Integrated Moving Average) and Facebook Prophet are full statistical time series models that handle trends, seasonality, and autocorrelation. Both require Python:

- **ARIMA:** Best for stationary-ish data with autocorrelation patterns. Use `pmdarima` (auto-arima) to automate parameter selection.
- **Prophet:** Best for data with strong seasonal patterns and multiple seasonalities (weekly + annual). Handles missing data gracefully. Available as `prophet` (Python) or `neuralprophet`.

For Athelon, Prophet via a Python microservice or Convex action is the recommended approach for medium and long-term forecasting where historical WO data exists.

#### 2.1.2 Causal Models

Time series methods use only the history of demand to predict future demand. Causal models incorporate external variables that _drive_ demand. For MRO, the key causal variables are:

**Fleet size:** More aircraft in the customer fleet → more maintenance demand. A causal model: `forecast_hours = β₀ + β₁ × fleet_size + β₂ × avg_aircraft_age + β₃ × flight_hours`

**Aircraft age distribution:** Older aircraft require more maintenance. The relationship is roughly exponential — a 20-year-old airframe requires 3–5x the maintenance hours of a 5-year-old airframe (after controlling for type and operation).

**Flight hours:** Flight hours drive cycle-based maintenance (landing gear, engines) and Hobbs-based inspections (100-hour). For Part 135 operators, monthly flight hours are strongly predictive of next-period inspection demand.

**Contract pipeline conversion:** The sales pipeline contains probabilistic demand. A quoted annual inspection with 80% close probability should contribute 80% × estimated_hours to the demand forecast. Athelon already tracks customers and their fleets — connecting this to workforce planning forecasts creates a demand signal that leads actual WOs by 30–90 days.

#### 2.1.3 Seasonal Patterns in MRO

MRO demand is heavily seasonal for specific customer segments:

- **Agricultural operators (Part 137):** Annual inspections cluster October–February (between crop seasons). Winter is peak demand for ag shops. Summer is low.
- **Tourism/charter (Part 135):** Peak summer, with a shoulder in spring/fall. Annual inspections often scheduled in winter during low utilization.
- **Corporate fleet (Part 91):** Less seasonal, but tends to cluster around calendar year-end (annual inspections before January).
- **Training schools:** Cluster at semester boundaries.
- **Military/government:** Fiscal year-end spending patterns create late-summer/early-fall surges.

Understanding your customer mix determines the seasonal shape of demand. A shop serving 60% agricultural operators has a dramatically different workforce planning challenge than one serving 60% corporate aviation.

### 2.2 Capacity Gap Analysis

The capacity gap analysis quantifies the mismatch between supply (what the workforce can produce) and demand (what WOs require). It must be done at the skill/certification level, not just in aggregate hours.

#### 2.2.1 Supply Model

```
Supply (per skill, per period) =
  Σ(tech in workforce with skill)
    × available_days(tech, period)
    × hours_per_day(tech)
    × efficiency_multiplier(tech)
    × (1 - absence_rate)
    × (1 - training_days_ratio)
```

The **absence rate** accounts for PTO, sick leave, and unplanned absences. A realistic figure for a shop with standard PTO is 8–12% of scheduled days.

The **training days ratio** accounts for time techs spend in training rather than production. If each tech averages 5 days/year in training, that is roughly 2% of capacity consumed by training.

The **efficiency multiplier** from Athelon's existing `technicianShifts` model already captures productivity variation. A new hire might be at 0.7× efficiency for the first 3 months.

#### 2.2.2 Demand Model

```
Demand (per skill, per period) =
  Σ(WO in forecast)
    × probability_of_booking(WO)
    × estimated_hours(WO)
    × skill_proportion(WO, skill)
```

The **skill proportion** is the key addition: what fraction of a WO's hours requires each specific certification? For a piston annual inspection:
- ~60% of hours require A&P (airframe or powerplant rating)
- ~20% of hours require IA (for return-to-service sign-off)
- ~20% of hours can be performed by non-certificated support staff

These proportions vary by WO type and must be calibrated from historical data.

#### 2.2.3 Gap Calculation

```
Gap(skill, period) = Demand(skill, period) - Supply(skill, period)

Positive gap → shortage (need to hire, train, or outsource)
Negative gap → surplus (overstaffed, consider reducing hours or taking on more work)
```

A time-phased gap analysis computes this gap for each future period (week or month). Gaps that appear in the near-term (1–4 weeks) require immediate action (overtime, contract labor). Gaps that appear in 3–6 months can be addressed with hiring. Gaps that appear in 12+ months drive strategic decisions (training programs, facility expansion, new certificate ratings).

### 2.3 Optimal Hiring Model (Mixed Integer Programming)

The hiring optimization problem asks: given forecasted demand and current workforce, **what is the minimum-cost hiring plan** (how many people of each role, in which month) that satisfies demand without over-hiring?

#### 2.3.1 MIP Formulation

```
Decision Variables:
  hire[r, m]     = number of people to hire of role r in month m   (integer ≥ 0)
  headcount[r, m] = total headcount of role r at end of month m    (integer ≥ 0)
  overtime[r, m] = overtime hours authorized for role r in month m (continuous ≥ 0)
  outsource[m]   = hours outsourced in month m                     (continuous ≥ 0)

Parameters:
  salary_cost[r]       = annual fully-loaded salary for role r
  recruiting_cost[r]   = one-time cost to recruit and hire role r
  training_cost[r]     = one-time cost to onboard/train role r
  overtime_rate        = premium rate multiplier for overtime (typically 1.5×)
  outsource_rate       = cost per hour for outsourced labor
  ramp_up_time[r]      = months before new hire reaches full productivity
  ramp_efficiency[r,t] = efficiency multiplier at t months after hire
  demand[r, m]         = forecasted hours requiring role r in month m
  capacity_per_head[r] = available hours per month per full-time employee of role r
  budget[m]            = maximum labor spend in month m (optional constraint)

Objective: Minimize total cost over planning horizon M
  Minimize:
    Σ_{r,m} hire[r, m] × recruiting_cost[r]
    + Σ_{r,m} hire[r, m] × training_cost[r]
    + Σ_{r,m} headcount[r, m] × (salary_cost[r] / 12)
    + Σ_{r,m} overtime[r, m] × (salary_cost[r] / 12 / capacity_per_head[r]) × overtime_rate
    + Σ_m outsource[m] × outsource_rate

Constraints:
  (1) Headcount continuity:
      headcount[r, m] = headcount[r, m-1] + hire[r, m] - attrition[r, m]

  (2) Demand coverage:
      Σ_r (effective_capacity[r, m] + overtime[r, m]) + outsource[m] ≥ Σ_r demand[r, m]

  (3) Effective capacity (accounts for ramp-up):
      effective_capacity[r, m] = Σ_{m'≤m} hire[r, m']
                                  × ramp_efficiency[r, m - m']
                                  × capacity_per_head[r]
                               + existing_headcount[r] × capacity_per_head[r]

  (4) Budget constraint (optional):
      Σ_r headcount[r, m] × (salary_cost[r] / 12)
      + overtime_cost[m] + outsource[m] × outsource_rate ≤ budget[m]

  (5) Overtime cap:
      overtime[r, m] ≤ max_overtime_rate × headcount[r, m] × capacity_per_head[r]

  (6) Non-negativity:
      hire[r, m] ≥ 0, headcount[r, m] ≥ 0, overtime[r, m] ≥ 0, outsource[m] ≥ 0
```

#### 2.3.2 Ramp-up Modeling

New hires do not produce at 100% from day one. A realistic ramp-up curve for an A&P mechanic at a new shop:

| Month | Efficiency | Notes |
|---|---|---|
| 1 | 40% | Orientation, paperwork, safety training, shadowing |
| 2 | 65% | First independent tasks, still requires oversight |
| 3 | 80% | Productive but not at full speed |
| 4+ | 95% | Near full productivity |

This ramp-up must be incorporated into the constraint that maps headcount to effective capacity. A hire in month 3 does not contribute full capacity until month 6.

#### 2.3.3 Role-Specific Lead Times

| Role | Recruiting Lead | Onboarding Lead | Total to Full Productivity |
|---|---|---|---|
| Technician (A&P) | 4–8 weeks | 6–12 weeks | 3–5 months |
| Lead Technician | 6–10 weeks | 8–16 weeks | 4–6 months |
| QCM Inspector | 8–12 weeks | 12–20 weeks | 5–8 months |
| Parts Clerk | 2–4 weeks | 2–4 weeks | 1–2 months |
| Billing Manager | 4–6 weeks | 4–6 weeks | 2–3 months |

The longer lead times for QCM Inspector reflect the requirement for IA authorization (the FAA exam and approval process adds 2–6 weeks) on top of the standard recruiting and onboarding pipeline.

### 2.4 Optimal Training Model

The training optimization problem asks: given a skill gap matrix (which techs are missing which certifications), a training budget, and a schedule of training seat availability — which techs should be sent to which training, and when?

#### 2.4.1 Formulation

```
Decision Variables:
  train[i, c, m] = 1 if technician i gets certification c in month m, else 0

Parameters:
  capacity_increase[c]   = additional billable hours enabled per tech per month
                           once they hold certification c
  training_cost[i, c]    = cost of sending tech i to get cert c (tuition + travel + lost production)
  seat_limit[c, m]       = maximum seats available for cert c in month m
  prereq[c, c']          = 1 if cert c requires cert c' as prerequisite
  holds[i, c]            = 1 if tech i already holds cert c

Objective: Maximize total capacity increase per dollar spent over horizon M
  Maximize:
    Σ_{i,c,m} train[i,c,m] × capacity_increase[c] × (M - m)
              / training_cost[i,c]

  Or equivalently: Minimize outsourcing cost (if outsource rate exceeds training ROI threshold)

Constraints:
  (1) Tech can't train for a cert they already hold:
      train[i,c,m] = 0 if holds[i,c] = 1

  (2) Prerequisite enforcement:
      sum_{m'≤m} train[i,c',m'] ≥ train[i,c,m]  for all (c, c') where prereq[c,c'] = 1

  (3) Seat availability:
      Σ_i train[i,c,m] ≤ seat_limit[c,m]

  (4) Tech can only be in training (not production) during training:
      — Production capacity of tech i in month m is reduced by training_duration[c] days
        for each train[i,c,m] = 1

  (5) Budget:
      Σ_{i,c,m} train[i,c,m] × training_cost[i,c] ≤ training_budget

  (6) One training per tech per month (simplification):
      Σ_c train[i,c,m] ≤ 1  for all i, m
```

#### 2.4.2 Cross-Training Strategy

Cross-training is about building redundancy in critical skill areas. The most dangerous workforce state is a **single-point-of-failure** in a required certification — one IA inspector, one avionics specialist, one sheet metal expert.

Cross-training investment priority should be:
1. **Critical path bottlenecks:** Skills that are currently the binding constraint on shop throughput
2. **Single-point-of-failure roles:** Any certification or skill held by exactly one person
3. **High-value certifications:** IAs and type certifications that unlock higher-rate work
4. **Near-expiry skills:** Certifications approaching expiration that could disrupt operations

The training optimizer should surface the top 5 cross-training investments by ROI as part of the workforce planning dashboard.

### 2.5 Shift Optimization

Shift optimization assigns technicians to shifts and days to minimize labor cost (primarily overtime) while meeting operational coverage requirements. This is the most computationally intensive of the workforce planning problems.

#### 2.5.1 Objective and Constraints

```
Objective: Minimize total labor cost per week
  = Σ_{t,d,s} assign[t,d,s] × cost(t, d, s)
  where cost includes overtime premium for hours exceeding 40/week

Hard Constraints:
  (1) Coverage: At least min_coverage[s] techs on each shift s each day d
  (2) Certification coverage: At least 1 IA-certified inspector on each shift per day
  (3) At most one shift per tech per day
  (4) No more than max_consecutive_days consecutive working days per tech
  (5) FAA required rest between shifts (typically 8 hours minimum)
  (6) Requested time off must be honored (approved PTO)

Soft Constraints (minimize violations, weighted):
  (7) Minimize undesirable shift assignments (weekend, night shift)
  (8) Distribute undesirable shifts fairly across techs
  (9) Honor shift preferences stated by technicians
  (10) Minimize consecutive overnight shifts
  (11) Keep team assignments stable (don't shuffle teams unnecessarily)
```

#### 2.5.2 Cyclic vs. Ad-Hoc Rostering

**Cyclic rostering** uses repeating patterns (e.g., 4-days-on, 3-days-off rotating pattern). Every tech follows the same pattern, offset by position. Advantages: predictable for techs, easy to explain, fair by construction. Disadvantages: rigid, cannot easily respond to demand variation.

**Ad-hoc rostering** assigns each tech independently each period based on demand. Advantages: maximum flexibility to match demand. Disadvantages: unpredictable for techs, requires solving an NP-hard optimization problem every period.

Most MRO shops use a **hybrid approach**: a cyclic base pattern with ad-hoc overrides for vacation, surge demand, and special assignments. Athelon's current roster model (teams with shift patterns, individual overrides) already implements this hybrid approach.

### 2.6 Attrition and Retention Modeling

Attrition is a first-order workforce planning variable that is often ignored until it becomes a crisis.

#### 2.6.1 Turnover Cost Model

The total cost of losing one A&P mechanic and replacing them:

| Cost Component | Typical Range |
|---|---|
| Recruitment (job postings, agency fees if used) | $2,000–$8,000 |
| Interviewing time (hiring manager + team) | $1,000–$3,000 |
| Onboarding and orientation | $500–$2,000 |
| Productivity ramp-up loss (months of reduced output) | $15,000–$35,000 |
| Knowledge transfer loss (undocumented tribal knowledge) | Hard to quantify |
| **Total per A&P mechanic** | **$18,000–$48,000** |

For a shop with 12 techs and 20% annual turnover (2–3 departures per year), turnover cost is $40,000–$100,000 per year — often invisible in budget discussions because it hides in recruiting line items and absorbed productivity losses.

#### 2.6.2 Turnover Prediction

A simple logistic regression model for turnover risk can be built with features available in Athelon's data:

```typescript
interface TechnicianTurnoverFeatures {
  monthsAtShop: number;           // Tenure (U-shaped risk curve)
  avgOvertimeHoursLast90Days: number; // Burnout indicator
  trainingOpportunitiesLast12Mo: number; // Career growth (inverse risk)
  shiftPreferenceFulfillmentRate: number; // Satisfaction proxy
  lastSalaryAdjustmentMonthsAgo: number; // Compensation staleness
  marketSalaryPremium: number;    // Market rate vs. current comp (%)
  supervisorTenureMonths: number; // Supervisor stability
}

// Simple scoring function (weights calibrated from industry data)
function turnoverRiskScore(features: TechnicianTurnoverFeatures): number {
  const score =
    // Tenure: highest risk at 6-18 months (honeymoon period over, not yet invested)
    (features.monthsAtShop < 18 ? 0.8 : features.monthsAtShop > 60 ? 0.2 : 0.5) +
    // Overtime burnout: >10 hrs/wk average = high risk
    Math.min(features.avgOvertimeHoursLast90Days / 4, 2.0) * 0.4 +
    // Training opportunity: each opportunity reduces risk
    Math.max(0, 1.0 - features.trainingOpportunitiesLast12Mo * 0.3) * 0.3 +
    // Shift preference satisfaction
    (1.0 - features.shiftPreferenceFulfillmentRate) * 0.5 +
    // Market salary gap: if market is 15%+ above current, high risk
    Math.max(0, features.marketSalaryPremium - 0.1) * 2.0;

  return Math.min(score / 4.0, 1.0); // Normalize to 0-1
}
```

#### 2.6.3 Scenario Modeling

The workforce plan should include scenario analysis: "What if annual turnover increases from 15% to 25%?" Scenario modeling quantifies the impact:
- Additional hiring needed per year
- Additional training cost
- Average productivity reduction during ramp-up
- Total incremental cost

This helps justify retention investments (compensation adjustments, shift flexibility, training programs) by showing their ROI against the turnover scenario cost.

---

## 3. Athelon-Specific Use Cases

### 3.1 Weekly Roster Optimization

**Problem:** Given next week's scheduled WOs and available techs, assign techs to shifts and WOs to minimize overtime while meeting all certification requirements.

**Data Inputs:**
- `rosterTeams`, `rosterShifts`, `technicianShifts` (existing Athelon tables)
- `workOrders` scheduled for the week with estimated hours and WO type
- `certificates` table — who is IA-authorized, who has which ratings
- Approved PTO records (new table required: `timeOffRequests`)
- `schedulingSettings` — shift defaults, buffer percent

**Optimization Model:**
- Constraint programming (CP-SAT or Timefold) for shift assignment
- Hard constraints: certification coverage per shift, PTO honored, consecutive day limits
- Soft constraints: minimize overtime, honor preferences, keep team assignments stable
- Scope: 7-day horizon, daily resolution

**Outputs:**
- Optimal roster: for each tech, which days they work and which shift
- WO-to-tech assignment suggestions based on certification match and availability
- Overtime forecast: which techs are projected to exceed 40 hours
- Coverage warnings: any shifts missing required certifications

**UI Surface:**
- Roster workspace (already exists in Athelon) — enhance with "optimize roster" button
- Generates a suggested roster that shop manager can accept, modify, or override
- Color-coded conflict indicators (missing IA coverage = red, overtime risk = amber)
- Side-by-side view: proposed roster vs. current roster

### 3.2 Monthly Staffing Plan

**Problem:** Given the next month's WO forecast, determine optimal shift patterns and overtime authorization. Flag weeks where demand exceeds capacity.

**Data Inputs:**
- Confirmed WOs in progress + pipeline WOs with booking probability
- Customer fleet data → maintenance event predictions
- Current headcount and certification matrix
- Shop calendar (holidays from `schedulingHolidays` table)

**Optimization Model:**
- Exponential smoothing forecast applied to weekly WO hour history
- Capacity gap analysis: supply vs. demand by skill per week
- Simple LP to determine optimal overtime authorization per week

**Outputs:**
- 4–5 week capacity heat map (green/amber/red by skill and week)
- Recommended overtime authorization by week and role
- Contract labor recommendation: if gap exceeds max overtime, recommend temp staffing for specific weeks
- Training scheduling recommendation: which weeks have spare capacity for training

**UI Surface:**
- New "Monthly Staffing" view under the scheduling module
- Capacity heat map Gantt (Recharts `ComposedChart` with bar for demand, line for supply)
- "Flag for approval" workflow for overtime authorization

### 3.3 Annual Hiring Plan

**Problem:** Given 12-month demand forecast and current workforce, produce a hiring plan (how many of each role, what month) that minimizes total cost.

**Data Inputs:**
- Historical WO volume by month (seasonality extraction)
- Customer contract pipeline with estimated start dates and scope
- Current headcount, certifications, projected attrition rate
- Salary and recruiting cost assumptions by role

**Optimization Model:**
- MIP formulation (Section 2.3) run quarterly
- 12-month rolling horizon, monthly buckets
- Accounts for onboarding ramp-up per role

**Outputs:**
- Month-by-month hiring plan: N people of role R starting in month M
- Total cost projection: base salary + recruiting + training vs. outsourcing alternative
- Break-even analysis: at what utilization does hiring beat outsourcing?
- Sensitivity table: hiring plan under low/base/high demand scenarios

**UI Surface:**
- Annual Hiring Plan wizard (admin role only)
- Generates a summary PDF-exportable report
- Integration with ATS/HRIS via webhook (future — for now, manual action)

### 3.4 Training Investment Planner

**Problem:** Given current skill gaps and projected demand, recommend which techs should get which certifications and when.

**Data Inputs:**
- `certificates` table — current certifications per tech
- `trainingRecords` table — past training history
- `qualificationRequirements` table — required certifications per role
- Forecasted WO demand by type (which types require which certifications)
- Training calendar: available courses, seat limits, cost

**Optimization Model:**
- For simple cases (< 10 techs, < 5 certifications): greedy algorithm by ROI
- For complex cases: MIP formulation (Section 2.4) run monthly

**ROI Calculation per Training Investment:**

```typescript
interface TrainingROIInput {
  certification: string;
  technicianId: string;
  trainingCost: number;        // Total cost including lost production time
  monthsToCompletion: number;  // How long until cert is active
  additionalBillableHoursPerMonth: number; // Revenue-generating hours unlocked
  billableRate: number;        // $/hour for work requiring this cert
  planningHorizonMonths: number; // Months to calculate ROI over
}

function calculateTrainingROI(input: TrainingROIInput): {
  roi: number;           // Return on investment (ratio)
  paybackMonths: number; // Months to break even
  netBenefit: number;    // Total $ benefit over planning horizon
} {
  const activeMonths = input.planningHorizonMonths - input.monthsToCompletion;
  const totalRevenueBenefit =
    activeMonths * input.additionalBillableHoursPerMonth * input.billableRate;
  const netBenefit = totalRevenueBenefit - input.trainingCost;
  const roi = netBenefit / input.trainingCost;
  const paybackMonths =
    input.trainingCost / (input.additionalBillableHoursPerMonth * input.billableRate) +
    input.monthsToCompletion;

  return { roi, paybackMonths, netBenefit };
}
```

**Outputs:**
- Ranked list of training investments by ROI
- Certification gap matrix: which certs the shop needs vs. has
- Recommended training schedule: which techs, which certs, which months
- Single-point-of-failure alerts: "Only 1 tech holds avionics cert — recommend training Tech X"

**UI Surface:**
- Training planner tab in personnel/HR module
- Certification matrix heat map (techs × certifications)
- ROI ranking table sortable by payback period

### 3.5 Multi-Location Workforce Balancing

**Problem:** For MROs with multiple shop locations, optimize tech allocation across locations based on local demand, travel costs, and skill availability.

**Data Inputs:**
- Per-location WO demand forecasts
- Per-location current headcount (filtered by `primaryShopLocationId`)
- Tech travel preferences and constraints
- Travel cost matrix between locations

**Optimization Model:**
- LP with cross-location assignment variables
- Objective: minimize total labor cost + travel cost
- Constraints: minimum coverage per location, tech travel consent, max days away per month

**Key Insight:**
A shop with two locations — one at 110% utilization (over capacity) and one at 70% (under capacity) — can resolve the imbalance by temporarily redeploying techs from the under-utilized location rather than authorizing overtime at the over-utilized one. The savings can be substantial if locations are within driving distance.

**Outputs:**
- Cross-location redeployment recommendations with cost comparison
- "Floating tech" roster for techs designated as multi-location
- Location-level capacity heat map

**UI Surface:**
- Multi-location view in the scheduling module (already supported via `shopLocationId` filtering)
- Visual flow diagram showing recommended cross-location assignments

### 3.6 Succession Planning

**Problem:** Identify single-points-of-failure in critical certifications and roles, and recommend cross-training investments.

**Data Inputs:**
- `certificates` table — count of techs per certification type
- `technicians` table — tenure, role, succession eligibility flags
- `qualificationRequirements` — what's required for each role
- Workforce plan headcount projections

**Critical SPOF Scenarios for a Part 145 Station:**
- Exactly one IA-authorized inspector (if they leave, the station cannot approve return-to-service)
- One person authorized as Director of Maintenance (required by 145.151)
- One person with repairman certificate for a specific work scope
- One avionics technician (if the RSM includes avionics work)

**Analysis Method:**

```typescript
interface CertificationCoverage {
  certType: string;
  holdersCount: number;
  isRegulatoryCritical: boolean;  // Required for Part 145 operations
  isSPOF: boolean;                // Only 1 holder
  crossTrainingCandidates: {
    technicianId: string;
    name: string;
    hasPrerequisites: boolean;
    estimatedTrainingCost: number;
    estimatedMonthsToComplete: number;
  }[];
}

function identifySPOFs(
  technicians: Technician[],
  certificates: Certificate[],
  regulatoryRequirements: string[]
): CertificationCoverage[] {
  const certMap = new Map<string, string[]>(); // cert type → tech IDs

  for (const cert of certificates) {
    if (!cert.active) continue;
    const existing = certMap.get(cert.certificateType) ?? [];
    existing.push(cert.technicianId);
    certMap.set(cert.certificateType, existing);
  }

  return Array.from(certMap.entries()).map(([certType, holders]) => ({
    certType,
    holdersCount: holders.length,
    isRegulatoryCritical: regulatoryRequirements.includes(certType),
    isSPOF: holders.length === 1,
    crossTrainingCandidates: identifyCandidates(certType, holders, technicians),
  }));
}
```

**Outputs:**
- SPOF risk matrix: critical certifications with single holders, flagged in red
- Cross-training recommendation priority list
- Succession map: for each critical role, who is the backup
- 12-month succession risk forecast: who is retirement/attrition eligible in key roles

### 3.7 Contract vs. Permanent Staffing

**Problem:** Optimize the mix of permanent staff (lower per-hour cost, fixed overhead) vs. contract/1099 labor (higher per-hour cost, variable, no overhead).

**The Economics:**

| Factor | Permanent Staff | Contract Labor |
|---|---|---|
| Hourly direct cost | $25–$55/hr (A&P) | $55–$90/hr (A&P) |
| Benefits burden | 25–35% of salary | Zero |
| Recruiting/turnover | $20–50K one-time | Zero (agency handles) |
| Training investment | Required | Minimal (pre-qualified) |
| Certification status | Must maintain | Typically pre-certified |
| Availability certainty | High (employed) | Low-Medium |
| Overhead at low demand | Full cost | Zero |

**Optimization Model:**

The optimal split minimizes total annual labor cost over the demand curve:

```
Let:
  Q_permanent = baseload demand (hours that are reliably present every period)
  Q_variable  = peak demand above baseload (hours that fluctuate)
  C_perm      = all-in cost per hour for permanent staff (salary + benefits)
  C_contract  = cost per hour for contract staff

Permanent is cheaper per hour, so use permanent for baseload up to:
  Q_permanent* = min(budget_capacity, demand_at_low_percentile)

Use contract for peak demand that exceeds permanent capacity:
  Q_contract[period] = max(0, demand[period] - permanent_capacity)

Total annual cost:
  = Q_permanent * C_perm * 2080 hrs/yr  (permanent at full employment)
  + Σ_periods Q_contract[period] * C_contract

Rule of thumb: permanent staff for the demand floor (~25th percentile of demand),
contract/overtime for the top 30% of peak weeks.
```

**Outputs:**
- Recommended permanent headcount vs. contract labor volume by role
- Seasonal contract labor calendar: which months to engage agency labor
- Break-even analysis: when does hiring another permanent tech become cheaper than sustained contracting?

---

## 4. Implementation Details (Working Code)

### 4.1 TypeScript: Capacity Gap Calculator with Skill-Level Breakdown

This extends Athelon's existing `getCapacityUtilization` query concept to add certification-level gap analysis:

```typescript
// convex/workforceGapAnalysis.ts

export type CertificationType =
  | "A&P"
  | "airframe_only"
  | "powerplant_only"
  | "IA"
  | "repairman"
  | "repair_station";

export interface SkillGapReport {
  periodLabel: string; // e.g., "2026-W15"
  startDateMs: number;
  endDateMs: number;
  bySkill: {
    skill: CertificationType;
    supplyHours: number;      // Available hours from techs holding this cert
    demandHours: number;      // Forecasted hours requiring this cert
    gapHours: number;         // Positive = shortage, negative = surplus
    supplyTechCount: number;  // Number of techs contributing to supply
    coverageRatio: number;    // supply / demand (1.0 = exactly covered)
    isCriticalShortfall: boolean; // gap > 10% of demand
  }[];
  aggregateSummary: {
    totalSupplyHours: number;
    totalDemandHours: number;
    totalGapHours: number;
    overallUtilizationPercent: number;
    criticalShortfalls: string[]; // cert types where isCriticalShortfall = true
  };
}

export interface ForecastedWorkOrder {
  woType: string; // "annual_inspection", "100hr_inspection", "unscheduled"
  estimatedTotalHours: number;
  scheduledStartMs: number;
  scheduledEndMs: number;
  bookingProbability: number; // 0.0 to 1.0
  // What fraction of hours requires each skill
  skillRequirements: Partial<Record<CertificationType, number>>;
}

// Skill requirement profiles by WO type (calibrate from historical data)
const WO_SKILL_PROFILES: Record<string, Partial<Record<CertificationType, number>>> = {
  annual_inspection: {
    "A&P": 0.55,
    "IA": 0.20,
    // remaining 25% can be non-certificated support
  },
  "100hr_inspection": {
    "A&P": 0.70,
    "IA": 0.10,
  },
  engine_overhaul: {
    "A&P": 0.60,
    "powerplant_only": 0.20,
    "IA": 0.05,
  },
  avionics_ifr: {
    "A&P": 0.40,
    "IA": 0.30,
    // ~30% avionics specialist (not a cert type in schema, but tracked via qualificationRequirements)
  },
  unscheduled: {
    "A&P": 0.75,
    "IA": 0.10,
  },
};

export function computeCapacityGap(
  techs: Array<{
    technicianId: string;
    availableHours: number; // from getShopCapacity
    certifications: CertificationType[];
  }>,
  forecastedWOs: ForecastedWorkOrder[],
  periodStartMs: number,
  periodEndMs: number
): SkillGapReport {
  // 1. Compute supply by skill
  const supplyBySkill = new Map<CertificationType, { hours: number; techCount: number }>();

  for (const tech of techs) {
    for (const cert of tech.certifications) {
      const existing = supplyBySkill.get(cert) ?? { hours: 0, techCount: 0 };
      // Each tech's hours are available for any of their cert types
      // (We don't divide — a tech with both A&P and IA contributes full hours to both)
      supplyBySkill.set(cert, {
        hours: existing.hours + tech.availableHours,
        techCount: existing.techCount + 1,
      });
    }
  }

  // 2. Compute demand by skill
  const demandBySkill = new Map<CertificationType, number>();

  for (const wo of forecastedWOs) {
    // Only include WOs that overlap with the period
    if (wo.scheduledStartMs > periodEndMs || wo.scheduledEndMs < periodStartMs) continue;

    // Scale by booking probability
    const effectiveHours = wo.estimatedTotalHours * wo.bookingProbability;

    // Get skill profile for this WO type
    const profile = WO_SKILL_PROFILES[wo.woType] ?? WO_SKILL_PROFILES.unscheduled;

    for (const [skill, fraction] of Object.entries(profile) as [CertificationType, number][]) {
      const current = demandBySkill.get(skill) ?? 0;
      demandBySkill.set(skill, current + effectiveHours * fraction);
    }
  }

  // 3. Compute gaps
  const allSkills = new Set([
    ...supplyBySkill.keys(),
    ...demandBySkill.keys(),
  ]) as Set<CertificationType>;

  const bySkill = Array.from(allSkills).map((skill) => {
    const supply = supplyBySkill.get(skill) ?? { hours: 0, techCount: 0 };
    const demand = demandBySkill.get(skill) ?? 0;
    const gapHours = demand - supply.hours;
    const coverageRatio = demand > 0 ? supply.hours / demand : Infinity;

    return {
      skill,
      supplyHours: supply.hours,
      demandHours: demand,
      gapHours,
      supplyTechCount: supply.techCount,
      coverageRatio,
      isCriticalShortfall: gapHours > demand * 0.10,
    };
  });

  const totalSupply = bySkill.reduce((s, r) => s + r.supplyHours, 0);
  const totalDemand = bySkill.reduce((s, r) => s + r.demandHours, 0);

  return {
    periodLabel: `${new Date(periodStartMs).toISOString().slice(0, 10)} to ${new Date(periodEndMs).toISOString().slice(0, 10)}`,
    startDateMs: periodStartMs,
    endDateMs: periodEndMs,
    bySkill,
    aggregateSummary: {
      totalSupplyHours: totalSupply,
      totalDemandHours: totalDemand,
      totalGapHours: totalDemand - totalSupply,
      overallUtilizationPercent: totalSupply > 0 ? (totalDemand / totalSupply) * 100 : 0,
      criticalShortfalls: bySkill
        .filter((r) => r.isCriticalShortfall)
        .map((r) => r.skill),
    },
  };
}
```

### 4.2 Python: MIP Hiring Plan (OR-Tools)

```python
# workforce_hiring_optimizer.py
# Requires: pip install ortools

from ortools.linear_solver import pywraplp
from dataclasses import dataclass
from typing import List, Dict, Optional
import math

@dataclass
class Role:
    id: str
    name: str
    annual_salary: float        # Fully loaded annual cost
    recruiting_cost: float      # One-time recruiting + onboarding cost
    capacity_hours_per_month: float  # Available hours per month per FTE
    ramp_up_months: int         # Months to full productivity
    ramp_efficiency: List[float]    # Efficiency per month during ramp-up

@dataclass
class HiringPlanInput:
    roles: List[Role]
    current_headcount: Dict[str, int]   # role_id → current count
    demand_by_role_month: Dict[str, List[float]]  # role_id → [month_0...month_N]
    planning_months: int
    max_overtime_fraction: float = 0.15  # Max overtime as % of regular capacity
    overtime_premium: float = 1.5
    outsource_cost_per_hour: float = 80.0
    monthly_budget_cap: Optional[float] = None
    attrition_rate_monthly: float = 0.015  # ~18% annual

@dataclass
class HiringPlanOutput:
    hires_by_role_month: Dict[str, List[int]]
    headcount_by_role_month: Dict[str, List[float]]
    overtime_by_role_month: Dict[str, List[float]]
    outsource_by_month: List[float]
    total_cost: float
    cost_breakdown: Dict[str, float]
    infeasible: bool

def optimize_hiring_plan(inp: HiringPlanInput) -> HiringPlanOutput:
    solver = pywraplp.Solver.CreateSolver("SCIP")
    if not solver:
        raise RuntimeError("SCIP solver not available")

    M = inp.planning_months
    roles = inp.roles
    infinity = solver.infinity()

    # Decision variables
    hire = {}      # hire[role_id][month] = integer
    overtime = {}  # overtime[role_id][month] = continuous hours
    outsource = {} # outsource[month] = continuous hours

    for role in roles:
        hire[role.id] = [
            solver.IntVar(0, 20, f"hire_{role.id}_{m}") for m in range(M)
        ]
        overtime[role.id] = [
            solver.NumVar(0, infinity, f"overtime_{role.id}_{m}") for m in range(M)
        ]

    for m in range(M):
        outsource[m] = solver.NumVar(0, infinity, f"outsource_{m}")

    # Headcount tracking (continuous approximation for simplicity)
    headcount = {}
    for role in roles:
        headcount[role.id] = []
        for m in range(M):
            hc = solver.NumVar(0, 1000, f"hc_{role.id}_{m}")
            headcount[role.id].append(hc)

    # Headcount continuity constraints
    for role in roles:
        initial = inp.current_headcount.get(role.id, 0)
        for m in range(M):
            if m == 0:
                # headcount[0] = initial + hire[0] - attrition
                solver.Add(
                    headcount[role.id][0] == initial * (1 - inp.attrition_rate_monthly) + hire[role.id][0]
                )
            else:
                solver.Add(
                    headcount[role.id][m] == headcount[role.id][m - 1] * (1 - inp.attrition_rate_monthly) + hire[role.id][m]
                )

    # Effective capacity with ramp-up
    def effective_capacity(role: Role, m: int) -> pywraplp.LinearExpr:
        expr = solver.Sum([])
        # Existing staff (pre-planning) at full productivity
        existing = inp.current_headcount.get(role.id, 0)
        expr = solver.Sum([expr, existing * role.capacity_hours_per_month])

        # New hires with ramp-up
        for hire_month in range(m + 1):
            months_since_hire = m - hire_month
            if months_since_hire < len(role.ramp_efficiency):
                efficiency = role.ramp_efficiency[months_since_hire]
            else:
                efficiency = role.ramp_efficiency[-1]  # Fully ramped
            expr = solver.Sum([expr, hire[role.id][hire_month] * role.capacity_hours_per_month * efficiency])

        return expr

    # Demand coverage constraints
    for m in range(M):
        # Total effective capacity + overtime + outsourcing >= total demand
        total_demand = sum(
            inp.demand_by_role_month.get(role.id, [0] * M)[m]
            for role in roles
        )
        total_supply_expr = solver.Sum(
            [effective_capacity(role, m) for role in roles] +
            [overtime[role.id][m] for role in roles] +
            [outsource[m]]
        )
        solver.Add(total_supply_expr >= total_demand)

    # Overtime caps
    for role in roles:
        for m in range(M):
            cap = effective_capacity(role, m) * inp.max_overtime_fraction
            solver.Add(overtime[role.id][m] <= cap)

    # Budget constraint
    if inp.monthly_budget_cap:
        for m in range(M):
            monthly_cost_expr = solver.Sum(
                [headcount[role.id][m] * (role.annual_salary / 12) for role in roles] +
                [outsource[m] * inp.outsource_cost_per_hour]
            )
            solver.Add(monthly_cost_expr <= inp.monthly_budget_cap)

    # Objective: minimize total cost
    total_recruiting = solver.Sum(
        hire[role.id][m] * role.recruiting_cost
        for role in roles
        for m in range(M)
    )
    total_salary = solver.Sum(
        headcount[role.id][m] * (role.annual_salary / 12)
        for role in roles
        for m in range(M)
    )
    # Overtime cost: base hourly × premium × overtime hours
    total_overtime = solver.Sum(
        overtime[role.id][m] *
        (role.annual_salary / (role.capacity_hours_per_month * 12)) *
        inp.overtime_premium
        for role in roles
        for m in range(M)
    )
    total_outsource = solver.Sum(
        outsource[m] * inp.outsource_cost_per_hour
        for m in range(M)
    )

    solver.Minimize(total_recruiting + total_salary + total_overtime + total_outsource)

    status = solver.Solve()

    if status not in (pywraplp.Solver.OPTIMAL, pywraplp.Solver.FEASIBLE):
        return HiringPlanOutput(
            hires_by_role_month={}, headcount_by_role_month={},
            overtime_by_role_month={}, outsource_by_month=[],
            total_cost=0, cost_breakdown={}, infeasible=True
        )

    return HiringPlanOutput(
        hires_by_role_month={
            role.id: [int(hire[role.id][m].solution_value()) for m in range(M)]
            for role in roles
        },
        headcount_by_role_month={
            role.id: [headcount[role.id][m].solution_value() for m in range(M)]
            for role in roles
        },
        overtime_by_role_month={
            role.id: [overtime[role.id][m].solution_value() for m in range(M)]
            for role in roles
        },
        outsource_by_month=[outsource[m].solution_value() for m in range(M)],
        total_cost=solver.Objective().Value(),
        cost_breakdown={
            "recruiting": sum(
                hire[role.id][m].solution_value() * role.recruiting_cost
                for role in roles for m in range(M)
            ),
            "salary": sum(
                headcount[role.id][m].solution_value() * (role.annual_salary / 12)
                for role in roles for m in range(M)
            ),
            "outsourcing": sum(outsource[m].solution_value() * inp.outsource_cost_per_hour
                               for m in range(M)),
        },
        infeasible=False
    )


# Example usage for a small Part 145 station:
if __name__ == "__main__":
    ap_mechanic = Role(
        id="technician",
        name="A&P Mechanic",
        annual_salary=75_000,
        recruiting_cost=8_000,
        capacity_hours_per_month=160,
        ramp_up_months=4,
        ramp_efficiency=[0.40, 0.65, 0.80, 0.95, 1.0],
    )
    ia_inspector = Role(
        id="qcm_inspector",
        name="IA Inspector",
        annual_salary=95_000,
        recruiting_cost=15_000,
        capacity_hours_per_month=160,
        ramp_up_months=6,
        ramp_efficiency=[0.30, 0.50, 0.70, 0.85, 0.95, 1.0],
    )

    inp = HiringPlanInput(
        roles=[ap_mechanic, ia_inspector],
        current_headcount={"technician": 6, "qcm_inspector": 1},
        demand_by_role_month={
            # Seasonal demand: peaks in winter (months 0, 1, 10, 11)
            "technician": [900, 950, 700, 650, 600, 580, 560, 600, 700, 850, 950, 1000],
            "qcm_inspector": [180, 190, 140, 130, 120, 116, 112, 120, 140, 170, 190, 200],
        },
        planning_months=12,
        outsource_cost_per_hour=85.0,
        attrition_rate_monthly=0.015,
    )

    result = optimize_hiring_plan(inp)
    if not result.infeasible:
        print("Hiring Plan:")
        for role_id, hires in result.hires_by_role_month.items():
            print(f"  {role_id}: {hires}")
        print(f"Total cost: ${result.total_cost:,.0f}")
        print(f"Breakdown: {result.cost_breakdown}")
```

### 4.3 Python: Shift Optimization with OR-Tools CP-SAT

```python
# shift_optimizer.py
# Solve a 7-day, N-tech, 2-shift scheduling problem with certification constraints

from ortools.sat.python import cp_model
from dataclasses import dataclass, field
from typing import List, Dict, Set, Optional

@dataclass
class Technician:
    id: str
    name: str
    certifications: Set[str]  # e.g. {"A&P", "IA", "airframe"}
    preferred_shift: Optional[str] = None  # "day" | "night" | None
    days_off_requested: List[int] = field(default_factory=list)  # 0=Mon...6=Sun

@dataclass
class Shift:
    id: str
    name: str        # "day" | "night" | "swing"
    required_certs: Set[str]   # At least one tech on this shift must hold each

DAYS = list(range(7))  # 0=Monday ... 6=Sunday
SHIFTS = ["day", "night"]

def optimize_weekly_roster(
    technicians: List[Technician],
    shifts: List[Shift],
    min_coverage_per_shift: int = 2,
    max_consecutive_days: int = 5,
) -> Optional[Dict[str, Dict[int, str]]]:  # tech_id → {day → shift_id or "off"}
    """
    Solve a 7-day shift scheduling problem with certification coverage constraints.
    Returns assignment dict or None if infeasible.
    """
    model = cp_model.CpModel()

    # Decision variables: assign[tech_idx, day, shift_idx] = 1 if assigned
    all_shifts = {s.id: i for i, s in enumerate(shifts)}
    assign = {}
    for t_idx, tech in enumerate(technicians):
        for day in DAYS:
            for s_idx, shift in enumerate(shifts):
                assign[(t_idx, day, s_idx)] = model.new_bool_var(
                    f"assign_t{t_idx}_d{day}_s{s_idx}"
                )

    # ── Hard Constraints ──

    # (1) At most one shift per tech per day
    for t_idx in range(len(technicians)):
        for day in DAYS:
            model.add_at_most_one(assign[(t_idx, day, s_idx)] for s_idx in range(len(shifts)))

    # (2) Minimum coverage per shift per day
    for day in DAYS:
        for s_idx in range(len(shifts)):
            model.add(
                sum(assign[(t_idx, day, s_idx)] for t_idx in range(len(technicians)))
                >= min_coverage_per_shift
            )

    # (3) Certification coverage: at least 1 tech with required cert on each shift each day
    for day in DAYS:
        for s_idx, shift in enumerate(shifts):
            for required_cert in shift.required_certs:
                # Find techs who hold this cert
                qualified_techs = [
                    t_idx for t_idx, tech in enumerate(technicians)
                    if required_cert in tech.certifications
                ]
                if not qualified_techs:
                    # Infeasible by construction — no one is qualified
                    model.add_bool_or([model.new_bool_var("infeasible_placeholder")])
                    continue
                model.add(
                    sum(assign[(t_idx, day, s_idx)] for t_idx in qualified_techs) >= 1
                )

    # (4) Honor requested days off
    for t_idx, tech in enumerate(technicians):
        for day_off in tech.days_off_requested:
            if 0 <= day_off <= 6:
                for s_idx in range(len(shifts)):
                    model.add(assign[(t_idx, day_off, s_idx)] == 0)

    # (5) Maximum consecutive working days
    # Sliding window constraint: sum over any window of (max_consecutive_days + 1) days ≤ max
    for t_idx in range(len(technicians)):
        worked = [
            model.new_bool_var(f"worked_t{t_idx}_d{day}")
            for day in DAYS
        ]
        for day in DAYS:
            # worked[day] = 1 if assigned to any shift on that day
            model.add_max_equality(worked[day], [assign[(t_idx, day, s_idx)] for s_idx in range(len(shifts))])

        window = max_consecutive_days + 1
        if len(DAYS) >= window:
            for start in range(len(DAYS) - window + 1):
                model.add(
                    sum(worked[start + k] for k in range(window)) <= max_consecutive_days
                )

    # (6) Total shifts per tech: equitable distribution (min/max within 1 shift of target)
    total_shifts = len(DAYS) * len(shifts)
    min_shifts = total_shifts // len(technicians)
    max_shifts = min_shifts + 1
    for t_idx in range(len(technicians)):
        shifts_worked = [assign[(t_idx, day, s_idx)] for day in DAYS for s_idx in range(len(shifts))]
        model.add(sum(shifts_worked) >= min_shifts)
        model.add(sum(shifts_worked) <= max_shifts)

    # ── Soft Constraints (via objective) ──

    # Maximize fulfilled shift preferences
    preference_score = []
    for t_idx, tech in enumerate(technicians):
        if tech.preferred_shift and tech.preferred_shift in all_shifts:
            preferred_s_idx = all_shifts[tech.preferred_shift]
            for day in DAYS:
                preference_score.append(assign[(t_idx, day, preferred_s_idx)])

    model.maximize(sum(preference_score))

    # ── Solve ──
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0  # 30-second timeout
    status = solver.solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return None

    # Extract solution
    result: Dict[str, Dict[int, str]] = {}
    for t_idx, tech in enumerate(technicians):
        result[tech.id] = {}
        for day in DAYS:
            assigned = False
            for s_idx, shift in enumerate(shifts):
                if solver.value(assign[(t_idx, day, s_idx)]) == 1:
                    result[tech.id][day] = shift.id
                    assigned = True
                    break
            if not assigned:
                result[tech.id][day] = "off"

    return result


# Example for a small shop with IA coverage requirement
if __name__ == "__main__":
    techs = [
        Technician("t1", "Alice Chen", {"A&P", "IA"}, preferred_shift="day"),
        Technician("t2", "Bob Martinez", {"A&P"}, preferred_shift="day"),
        Technician("t3", "Carol Singh", {"A&P", "IA"}, preferred_shift="night"),
        Technician("t4", "David Park", {"A&P"}, days_off_requested=[5, 6]),
        Technician("t5", "Eve Johnson", {"A&P"}, preferred_shift="day"),
    ]
    shifts = [
        Shift("day", "Day Shift (7am-5pm)", required_certs={"A&P", "IA"}),
        Shift("night", "Night Shift (5pm-1am)", required_certs={"A&P"}),
    ]

    roster = optimize_weekly_roster(techs, shifts, min_coverage_per_shift=2)
    if roster:
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        print(f"{'Tech':<15} " + " ".join(f"{d:<6}" for d in days))
        print("-" * 60)
        for tech in techs:
            row = [roster[tech.id].get(d, "off")[:5] for d in range(7)]
            print(f"{tech.name:<15} " + " ".join(f"{r:<6}" for r in row))
    else:
        print("No feasible roster found — check coverage requirements vs. headcount")
```

### 4.4 TypeScript: Exponential Smoothing Demand Forecast for Athelon

This is the TypeScript implementation suitable for a Convex action that processes historical WO data into a rolling demand forecast:

```typescript
// src/shared/lib/demandForecast.ts

export interface WeeklyDemandRecord {
  weekStartMs: number;
  totalWoHours: number;         // Actual hours worked that week
  woCount: number;              // Number of WOs active
}

export interface DemandForecast {
  weekStartMs: number;
  forecastedHours: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  method: "exponential_smoothing" | "moving_average";
}

export interface ForecastConfig {
  alpha: number;           // Smoothing factor (0 < alpha < 1)
  forecastWeeks: number;   // How many weeks ahead to forecast
  confidenceLevel: number; // 0.80 or 0.95
}

const DEFAULT_CONFIG: ForecastConfig = {
  alpha: 0.3,
  forecastWeeks: 8,
  confidenceLevel: 0.95,
};

/**
 * Generates a demand forecast using Holt's double exponential smoothing.
 * Handles both trend and level. Suitable for MRO shops with steady growth
 * or decline in demand.
 *
 * @param history - Historical weekly demand records, sorted ascending by weekStartMs
 * @param config - Smoothing configuration
 * @returns Array of weekly forecasts for the requested horizon
 */
export function forecastWeeklyDemand(
  history: WeeklyDemandRecord[],
  config: ForecastConfig = DEFAULT_CONFIG
): DemandForecast[] {
  if (history.length < 2) {
    throw new Error("Need at least 2 historical data points for demand forecasting");
  }

  const { alpha, forecastWeeks, confidenceLevel } = config;
  const beta = 0.1; // Trend smoothing — lower = smoother trend

  // Initialize level and trend
  let level = history[0].totalWoHours;
  let trend = history[1].totalWoHours - history[0].totalWoHours;

  // Track residuals for confidence interval calculation
  const residuals: number[] = [];

  // Run smoothing over historical data
  for (let i = 1; i < history.length; i++) {
    const prevLevel = level;
    const actual = history[i].totalWoHours;
    const predictedBefore = level + trend;

    level = alpha * actual + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;

    residuals.push(actual - predictedBefore);
  }

  // Compute standard deviation of residuals for confidence interval
  const meanResidual = residuals.reduce((s, r) => s + r, 0) / residuals.length;
  const variance =
    residuals.reduce((s, r) => s + Math.pow(r - meanResidual, 2), 0) / residuals.length;
  const stdDev = Math.sqrt(variance);

  // Z-score for confidence level (approximate)
  const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.80 ? 1.28 : 1.645;

  // Generate forecasts for h = 1, 2, ..., forecastWeeks
  const lastWeekMs = history[history.length - 1].weekStartMs;
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const forecasts: DemandForecast[] = [];

  for (let h = 1; h <= forecastWeeks; h++) {
    const forecastedHours = Math.max(0, level + h * trend);
    // Uncertainty grows with forecast horizon: σ_h ≈ σ × √h
    const margin = zScore * stdDev * Math.sqrt(h);

    forecasts.push({
      weekStartMs: lastWeekMs + h * WEEK_MS,
      forecastedHours,
      confidenceInterval: {
        lower: Math.max(0, forecastedHours - margin),
        upper: forecastedHours + margin,
      },
      method: "exponential_smoothing",
    });
  }

  return forecasts;
}

/**
 * Applies a seasonal index to a base forecast.
 * Use when demand has a clear annual seasonal pattern.
 *
 * @param forecasts - Base forecasts from forecastWeeklyDemand
 * @param seasonalIndices - 52-element array of weekly seasonal multipliers
 *                          (index = week of year 0..51)
 *                          Values > 1.0 = above-average weeks; < 1.0 = below-average
 */
export function applySeasonality(
  forecasts: DemandForecast[],
  seasonalIndices: number[]
): DemandForecast[] {
  return forecasts.map((forecast) => {
    const weekOfYear = getWeekOfYear(new Date(forecast.weekStartMs));
    const idx = weekOfYear % 52;
    const seasonalMultiplier = seasonalIndices[idx] ?? 1.0;

    return {
      ...forecast,
      forecastedHours: forecast.forecastedHours * seasonalMultiplier,
      confidenceInterval: {
        lower: forecast.confidenceInterval.lower * seasonalMultiplier,
        upper: forecast.confidenceInterval.upper * seasonalMultiplier,
      },
    };
  });
}

function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}
```

### 4.5 Dashboard Mockup: Workforce Planning KPIs

The workforce planning dashboard should present six KPI cards and three charts:

**KPI Cards:**
1. **Utilization Rate:** `committed_hours / available_hours × 100%` — Target: 75–88%
2. **Overtime Rate:** `overtime_hours / regular_hours × 100%` — Warning: >15%
3. **Outsourcing Rate:** `outsourced_hours / total_hours × 100%` — Threshold: >10%
4. **Training ROI:** `revenue_enabled_by_training / training_cost` — Target: >3.0x
5. **Time to Fill (days):** Average days from job posting to productive hire — Target: <60 days
6. **Turnover Rate (annual):** `departures / avg_headcount × 100%` — Target: <15%

**Charts:**
1. **Capacity Heat Map (8-week forward):** Recharts `ComposedChart` — bar for demand hours by skill (stacked: A&P, IA, other), line for available capacity. Color bands: green (< 80% utilized), amber (80–100%), red (> 100%).
2. **Certification Coverage Matrix:** Table of shifts (rows) × certifications (columns) — green checkmark if covered, red X if gap.
3. **Hiring Plan Timeline:** Gantt-style chart showing planned hire dates and when each role reaches full productivity (ramp-up visualization).

---

## 5. Where to Find It / Dependencies

### 5.1 Shift Scheduling and Rostering

**Timefold (formerly OptaPlanner):**
- URL: https://timefold.ai
- Best-in-class for constraint-based employee rostering
- Provides Java/Python/Quarkus solvers with out-of-the-box support for shift scheduling
- Handles hard/soft constraint separation, fairness, and preference satisfaction
- Deployable as a microservice callable from a Convex action
- **Recommended for Athelon's weekly roster optimization**

**Google OR-Tools CP-SAT:**
- URL: https://developers.google.com/optimization
- Open source, well-documented, Python + C++ bindings
- Excellent for medium-sized scheduling problems (< 500 techs, < 30 days)
- Code examples in this document use OR-Tools
- Install: `pip install ortools`

**Custom metaheuristic (last resort):**
- Simulated annealing or tabu search implemented in TypeScript
- Only needed if neither Timefold nor OR-Tools fits the deployment constraints
- Significantly more engineering effort for equivalent or worse solution quality

### 5.2 Demand Forecasting

**Prophet (Python):**
- URL: https://facebook.github.io/prophet/
- Best choice for medium/long-term forecasting with seasonal patterns
- Handles missing data, holidays, changepoints
- Install: `pip install prophet`
- Deployable as a Python microservice or via a Convex action with `"use node"`

**Simple Exponential Smoothing (TypeScript):**
- No dependencies — pure TypeScript as shown in Section 4.4
- Suitable for short-term (1–8 week) forecasting
- Can run directly in a Convex query/action without a separate service

**statsmodels ARIMA (Python):**
- URL: https://www.statsmodels.org
- More powerful than exponential smoothing for stationary series
- Use `pmdarima` for automatic parameter selection (auto-ARIMA)

### 5.3 MIP for Hiring and Training Optimization

**OR-Tools SCIP solver:**
- Included in the `ortools` package (same as CP-SAT above)
- Use `pywraplp.Solver.CreateSolver("SCIP")` as shown in Section 4.2
- Handles mixed-integer linear programs well for problem sizes relevant to MRO workforce planning

**PuLP (Python):**
- URL: https://coin-or.github.io/pulp/
- Simpler API than OR-Tools for pure LP/MIP
- Install: `pip install pulp`
- Integrates with CBC (free), Gurobi (commercial license required)

**Gurobi:**
- URL: https://www.gurobi.com
- Best commercial MIP solver, significantly faster than open-source for large problems
- Free academic license; commercial license required for production
- Only needed if problem size exceeds OR-Tools SCIP performance (unlikely for most MRO shops)

### 5.4 Visualization (Athelon Stack)

**Recharts** (already in Athelon's likely stack via shadcn/ui):
- `ComposedChart` for demand vs. capacity line-bar charts
- `BarChart` with stacked bars for skill-level capacity breakdown
- `LineChart` for forecast with confidence bands (use `Area` component for CI shading)

**D3.js:**
- For more complex visualizations (Gantt chart, matrix heat maps)
- Heavier dependency; use only if Recharts cannot support the required chart type

### 5.5 Workforce Planning Platforms (Reference)

These enterprise platforms are what Athelon should eventually be able to replace for MRO-specific workforce planning:

**Anaplan:**
- Connected planning platform with sophisticated workforce modeling
- Relevant features: workforce supply/demand modeling, headcount budgeting, scenario planning
- Key capability to replicate: multi-dimensional driver-based planning (fleet size → demand → staffing)
- Pricing: $30K–$200K+/year — enterprise only

**Workday Adaptive Planning:**
- HR-connected workforce planning
- Relevant features: position-based planning, competency tracking, hiring plan generation
- Key capability to replicate: the link between HRIS data (who exists) and plan (who is needed)
- Pricing: $20K–$100K+/year

**Planful:**
- Financial planning platform with workforce component
- Relevant features: scenario modeling, cost forecasting
- Key capability to replicate: cost-per-head modeling with ramp-up curves

**What Athelon can replicate cost-effectively for MRO:**
- Demand forecasting from WO history (Prophet/exponential smoothing)
- Capacity gap analysis at skill level (TypeScript, in Convex)
- Hiring plan optimizer (Python MIP, microservice)
- Training investment ROI calculator (TypeScript, in Convex)
- Weekly roster optimizer (Timefold/OR-Tools microservice)

The key insight is that MRO-specific regulatory constraints (FAA certifications, IA renewal tracking, Part 145 staffing ratios) are gaps in all generic workforce planning platforms. Athelon can differentiate by encoding these constraints natively.

---

## 6. Integration Architecture for Athelon

### 6.1 Capacity Dashboard Extension (Client-Side)

Athelon's existing `getCapacityUtilization` query computes aggregate hours but does not break down by certification type. The extension adds a parallel `getSkillCapacityGap` query:

```typescript
// Proposed addition to convex/capacity.ts

export const getSkillCapacityGap = query({
  args: {
    organizationId: v.id("organizations"),
    shopLocationId: shopLocationFilterValidator,
    startDateMs: v.number(),
    endDateMs: v.number(),
  },
  handler: async (ctx, args) => {
    // 1. Load techs and their capacity (reuse existing loadBaseSchedulingContext)
    // 2. For each tech, load active certificates from certificates table
    // 3. Compute available hours per cert type (using existing shift resolution)
    // 4. Load active/scheduled WOs in the period, compute demand by cert type
    //    using WO_SKILL_PROFILES mapping
    // 5. Return SkillGapReport (see Section 4.1)

    // Returns: { bySkill: [{ skill, supplyHours, demandHours, gapHours, isCriticalShortfall }] }
  },
});
```

This query surfaces on a new "Capacity" tab in the scheduling workspace, showing the skill-level heat map alongside the existing utilization numbers.

### 6.2 Demand Forecasting Service

**Architecture:** Python microservice deployed on Fly.io or Railway (or directly on Vercel as a serverless Python function). Athelon's Convex backend calls it via a Convex action with `fetch`.

```
Convex Action (generateDemandForecast)
  ↓ fetch()
Python Microservice (/forecast endpoint)
  Input: { historicalWOHours: WeeklyDemandRecord[], forecastWeeks: number }
  Output: { forecasts: DemandForecast[], modelDiagnostics: {...} }
  ↓
Convex Action stores result in demandForecasts table
```

**New Convex table: `demandForecasts`**

```typescript
// Addition to convex/schema.ts
demandForecasts: defineTable({
  organizationId: v.id("organizations"),
  shopLocationId: v.optional(v.id("shopLocations")),
  generatedAt: v.number(),
  forecastMethod: v.union(v.literal("exponential_smoothing"), v.literal("prophet"), v.literal("arima")),
  forecastHorizonWeeks: v.number(),
  forecasts: v.array(v.object({
    weekStartMs: v.number(),
    forecastedHours: v.number(),
    confidenceLower: v.number(),
    confidenceUpper: v.number(),
  })),
  modelDiagnostics: v.optional(v.string()), // JSON blob
})
  .index("by_org", ["organizationId", "generatedAt"])
  .index("by_org_location", ["organizationId", "shopLocationId", "generatedAt"])
```

Forecasts are regenerated weekly (scheduled Convex cron action) and cached in this table. The UI reads from the cache without triggering the Python service synchronously.

### 6.3 Roster Optimizer Service

**Architecture:** Timefold or OR-Tools Python microservice, callable as a Convex action.

```
Shop Manager clicks "Optimize Roster" in roster workspace
  ↓
Convex Action (optimizeWeeklyRoster)
  Gathers: techs, certifications, shifts, approved PTO, next week's WOs
  ↓ fetch()
Roster Optimizer Microservice
  Input: { technicians, shifts, wos, constraints }
  Output: { roster: TechAssignment[], conflicts: Conflict[], warnings: Warning[] }
  ↓
Convex Mutation (saveProposedRoster)
  Saves proposed roster to rosterProposals table (new)
  Displays in roster workspace for manager review/approval
```

**New Convex table: `rosterProposals`**

```typescript
rosterProposals: defineTable({
  organizationId: v.id("organizations"),
  shopLocationId: v.optional(v.id("shopLocations")),
  weekStartMs: v.number(),
  status: v.union(v.literal("proposed"), v.literal("approved"), v.literal("rejected"), v.literal("applied")),
  generatedAt: v.number(),
  generatedByUserId: v.string(),
  approvedAt: v.optional(v.number()),
  approvedByUserId: v.optional(v.string()),
  assignments: v.array(v.object({
    technicianId: v.id("technicians"),
    dayOfWeek: v.number(),         // 0=Mon...6=Sun
    shiftId: v.id("rosterShifts"),
    woAssignments: v.optional(v.array(v.id("workOrders"))),
  })),
  conflicts: v.array(v.object({
    type: v.string(),
    description: v.string(),
    severity: v.union(v.literal("hard"), v.literal("soft")),
  })),
  optimizationScore: v.optional(v.number()), // Objective value from solver
})
  .index("by_org_week", ["organizationId", "weekStartMs"])
  .index("by_status", ["organizationId", "status"])
```

### 6.4 Hiring Planner (Quarterly Run)

The hiring planner runs as a Convex scheduled action (triggered quarterly, or on-demand from admin UI):

1. **Data gathering:** Query last 24 months of WO hours by role from Convex DB
2. **Forecast:** Call demand forecasting service for next 12 months
3. **MIP:** Call hiring optimizer microservice with current headcount + forecast
4. **Store:** Save result to `hiringPlans` table (new)
5. **Notify:** Email shop manager with the hiring plan summary

**New Convex table: `hiringPlans`**

```typescript
hiringPlans: defineTable({
  organizationId: v.id("organizations"),
  generatedAt: v.number(),
  planningHorizonMonths: v.number(),
  demandScenario: v.union(v.literal("base"), v.literal("low"), v.literal("high")),
  hiringRecommendations: v.array(v.object({
    role: v.string(),           // MRO role ID
    month: v.number(),          // 0-indexed from plan generation
    monthLabel: v.string(),     // e.g. "Apr 2026"
    hireCount: v.number(),
    rationale: v.string(),
  })),
  projectedCosts: v.object({
    totalCost: v.number(),
    recruitingCost: v.number(),
    salaryExpense: v.number(),
    outsourcingCost: v.number(),
  }),
  assumptions: v.string(), // JSON blob of input assumptions
})
  .index("by_org", ["organizationId", "generatedAt"])
```

### 6.5 Training Recommender (TypeScript, In-Convex)

For most MRO shops, the training recommendation logic is simple enough to run entirely in a Convex query without a Python microservice:

```typescript
// convex/trainingRecommender.ts

export const getTrainingRecommendations = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    // 1. Load all active techs
    // 2. Load all active certificates per tech
    // 3. Load qualificationRequirements for the org
    // 4. Identify skill gaps (required - held)
    // 5. Compute SPOF risks (certs held by only 1 tech)
    // 6. Load forecastedWOs to determine which certs are most needed
    // 7. Return ranked training recommendations with ROI estimates

    // Output: {
    //   spofRisks: CertificationCoverage[],
    //   recommendedTraining: TrainingROIInput[],
    //   expiringCertifications: { tech, cert, expiresAt }[]
    // }
  },
});
```

### 6.6 Data Model Extensions Summary

| New Table | Purpose | Key Columns |
|---|---|---|
| `demandForecasts` | Store weekly demand forecasts | organizationId, weekStartMs, forecastedHours |
| `rosterProposals` | Optimizer-generated roster proposals pending approval | weekStartMs, assignments[], status |
| `hiringPlans` | Quarterly hiring plan output | hiringRecommendations[], projectedCosts |
| `timeOffRequests` | PTO and leave requests (feed into roster optimizer) | technicianId, startDateMs, endDateMs, status |
| `workforceMetricsHistory` | Weekly KPI snapshots for dashboarding | utilizationPercent, overtimeRate, turnoverYTD |

**Existing tables that already support workforce planning (no schema changes needed):**
- `technicians` — headcount, roles, status
- `certificates` — certifications, IA expiry, renewal activities
- `technicianShifts` — shift patterns with efficiency multipliers
- `rosterTeams` + `rosterShifts` — team/shift structure
- `trainingRecords` — training history with expiry
- `qualificationRequirements` — required certs per role
- `schedulingHolidays` — affects supply calculation
- `schedulingSettings` — buffer percent, defaults

### 6.7 Connection to Existing Athelon Features

| Existing Feature | Workforce Planning Connection |
|---|---|
| Roster workspace | Displays optimizer-proposed rosters; manager edits and approves |
| Capacity calculation (`getCapacityUtilization`) | Extended with skill-level breakdown |
| Technician records | Source of headcount and certification data for all models |
| Certification tracking (`certificates` table) | Drives skill supply model and SPOF detection |
| Training records (`trainingRecords` table) | Input to training ROI calculator |
| Work order pipeline | Source of demand data for forecasting |
| Customer fleet tracking | Drives causal demand model (fleet size → maintenance demand) |
| Billing (hours worked per WO) | Actuals for forecast calibration and utilization reporting |

---

## 7. Interactions with Other Optimization Tools

### 7.1 Workforce Planning + CP-SAT

CP-SAT (Google OR-Tools) is used for the **weekly roster optimization** — the most operationally granular level of workforce planning. It takes the strategic plan's staffing levels as given and finds the optimal assignment of existing techs to shifts and WOs.

The relationship is hierarchical: the workforce plan determines **how many** techs of each type to have; CP-SAT determines **which specific tech** works which specific day and shift within that headcount.

The output of CP-SAT feeds back to workforce planning as actuals: if the CP-SAT solver consistently reports infeasible schedules or large numbers of constraint violations, it signals that the strategic plan's staffing levels are inadequate and the workforce plan should be revised upward.

### 7.2 Workforce Planning + LP/MIP

MIP is used for two of the highest-leverage workforce planning decisions:
- **Hiring optimization** (Section 2.3): Which roles to hire, in which months, to minimize total cost over the planning horizon
- **Training optimization** (Section 2.4): Which techs to train in which certifications to maximize capacity increase per dollar

The LP/MIP models are run less frequently than the CP-SAT scheduler (quarterly for hiring, monthly for training) because they operate on longer horizons and coarser time buckets.

### 7.3 Workforce Planning + Bin Packing

Bin packing applies to the shift capacity packing problem: given a set of tasks (WOs, task cards) each requiring N hours of specific cert types, and a set of "bins" (tech-shift pairs, each with capacity = shift_hours × efficiency), assign tasks to bins to maximize utilization while respecting cert constraints.

This is distinct from the shift scheduling problem: the schedule determines which techs work which shifts; the bin packing determines which tasks are assigned to which tech-shift combination within the determined roster.

### 7.4 Workforce Planning + Forecasting

Forecasting is the **upstream dependency** for all workforce planning. Without a demand forecast, the capacity gap analysis has no demand-side input. The forecasting horizon must match the planning horizon:
- For weekly rostering: forecast 1–2 weeks ahead (high accuracy needed, short lead time)
- For monthly staffing: forecast 1–3 months ahead (medium accuracy, medium lead time)
- For annual hiring: forecast 6–18 months ahead (low accuracy, directional guidance only)

Forecasting uncertainty must be propagated to workforce planning decisions: a hiring plan built on a best-case demand scenario that does not materialize results in overstaff. Use scenario planning (low/base/high) and present plans for each.

### 7.5 Workforce Planning + EVM (Earned Value Management)

Earned Value Management connects workforce planning to cost performance tracking. The workforce plan establishes a **planned value** (PV) — the budgeted labor cost per period. As actual work proceeds, EVM measures:

- **Earned Value (EV):** Budgeted cost of work actually performed
- **Actual Cost (AC):** Actual labor cost spent
- **Cost Performance Index (CPI):** EV/AC — if < 1.0, labor is costing more than planned
- **Schedule Performance Index (SPI):** EV/PV — if < 1.0, less work is being completed than planned

A CPI of 0.85 month-over-month means labor is running 18% over budget — a signal to investigate overtime, low efficiency, or scope creep. The workforce plan should set the PV baseline against which EVM is measured.

### 7.6 Workforce Planning + Scheduling (Work Order Scheduling)

The workforce capacity plan is the **primary constraint** on the WO scheduling engine. The scheduling engine cannot assign work to a slot if:
1. No tech with the required certification is available in that slot
2. The slot's available hours are already fully committed

The two systems must share a common capacity representation. Athelon's `getCapacityUtilization` query is the bridge: the WO scheduler reads from it to know how much capacity remains; the workforce plan updates the capacity model when hiring and training decisions change the workforce.

The integration pattern:
1. Workforce plan → defines headcount and shift patterns → written to `technicians` + `technicianShifts`
2. Scheduler reads capacity from `getCapacityUtilization` (current state) + `demandForecasts` (future)
3. As WOs are scheduled, committed hours increase → utilization rises → workforce plan is alerted when thresholds are approached

---

## 8. FAA Part 145 Specific Requirements

FAA Part 145 creates hard regulatory constraints that **must be encoded as hard constraints** in any workforce optimization model. Violating these constraints is not a soft penalty — it is a compliance failure that can result in enforcement action up to certificate suspension.

### 8.1 Staffing Requirements Overview (14 CFR Part 145, Subpart D)

**§ 145.151 — Personnel Requirements (General)**

Each certificated repair station must:
1. Designate a repair station employee as the **accountable manager** (14 CFR 145.151(a)(1))
2. Provide **qualified personnel** to plan, supervise, perform, and approve return-to-service maintenance within the station's ratings (145.151(a)(2))
3. Maintain **sufficient employees** with the training, knowledge, and experience required for work to comply with 14 CFR Part 43 (145.151(b))
4. Assess and document the abilities of **non-certificated employees** performing maintenance functions (145.151(c))

**Workforce planning implication:** The "sufficient employees" language is not defined numerically — the FAA evaluates sufficiency based on whether the station can actually perform its authorized work scope. A station that consistently backlogs work or relies on unauthorized shortcuts will be found deficient on inspection. Workforce planning must ensure that staffed capacity is genuinely sufficient for the authorized work scope.

**§ 145.153 — Supervisory Personnel**

Repair stations must maintain "a sufficient number of supervisors to direct the work performed" and ensure that all employees unfamiliar with applicable regulations, standards, or equipment are properly supervised.

For domestic repair stations, supervisors must hold "an appropriate mechanic or repairman certificate" with appropriate ratings for the work they are supervising (14 CFR 145.153(b)).

**Workforce planning implication:** At least one supervisor with appropriate certification must be on-site whenever work is being performed. This creates a per-shift constraint: every active work shift must have at least one certificated supervisor present. In Athelon's context, this maps to the role constraint that a `lead_technician` or `shop_manager` (both of which require A&P certification) must be assigned to every shift.

**§ 145.157 — Personnel Authorized to Approve Articles for Return to Service**

Return-to-service approvals at domestic repair stations must be performed by personnel "certificated as a mechanic or repairman under Part 65" (14 CFR 145.157(a)).

**Workforce planning implication:** This is the most critical workforce constraint for a Part 145 station. Every shift where return-to-service approvals may be needed must have at least one eligible authorized person present. An IA-authorized inspector (or appropriately rated A&P mechanic working within the station's RSM) must be scheduled for every production shift.

**§ 145.163 — Training Requirements**

Each certificated repair station must have an **FAA-approved employee training program** with both initial and recurrent components, ensuring each employee assigned to maintenance functions is capable of performing their assigned tasks (14 CFR 145.163(a)).

Training records must be maintained for a **minimum of 2 years** in an FAA-acceptable format (145.163(b)).

**Workforce planning implication:** Training is not optional overhead — it is a regulatory requirement. The training planner must ensure:
- New hires complete initial training before performing unsupervised work
- All techs receive recurrent training on the schedule defined in the approved training program
- Training records are maintained in the system (Athelon's `trainingRecords` table already supports this)

### 8.2 Inspection Authorization (IA) Requirements (14 CFR 65.91–65.95)

**Eligibility (§ 65.91):**
An IA applicant must:
1. Hold a current A&P mechanic certificate with **both airframe and powerplant ratings**, each held for at least 3 years
2. Have been actively engaged in maintaining certificated aircraft for at least **2 years**
3. Have a fixed base of operations
4. Have access to necessary equipment, facilities, and inspection data
5. Pass a **written test** on inspection standards for return-to-service after major repairs/alterations and annual/progressive inspections

**Workforce planning implication:** The pipeline to an IA is long. A tech hired today with fresh A&P certificates cannot hold an IA for at least 3 years (the minimum rating tenure). An IA inspector who leaves cannot be replaced immediately. The succession planning system must flag when IA holders approach retirement or departure risk.

**Renewal Requirements (§ 65.93):**
An IA must be renewed every **2 years** by March 31 of odd-numbered years. During each 12-month period, the IA holder must perform at least one qualifying activity:
- Perform annual inspections (at least 1 per 90 days of IA currency)
- Complete 2+ major repairs/alterations per 90 days
- Perform or supervise progressive inspections
- Complete an 8-hour FAA-approved refresher course
- Pass an oral test with the FSDO

**If they fail to complete a qualifying activity by March 31 of year 1:** They lose the right to exercise IA privileges after that date (though they can regain them by passing the FAA oral test).

**Workforce planning implication:** This is a **time-sensitive, individually-tracked** regulatory constraint that Athelon must monitor. The system must:
1. Track when each IA holder last performed a qualifying activity
2. Alert when a holder is at risk of lapsing (< 30 days to deadline, no qualifying activity this period)
3. Factor IA lapse risk into capacity planning (an IA inspector who loses currency is functionally unavailable for return-to-service sign-offs)

Athelon's `certificates` table already stores `iaRenewalActivities` for this purpose. The workforce planning system should query this data to flag at-risk IAs.

**Currency Calculation:**

```typescript
interface IaRenewalStatus {
  technicianId: string;
  iaExpiryDate: number;         // March 31 of renewal year
  currentPeriodStartMs: number; // March 31 of previous odd year
  activitiesInCurrentPeriod: number;
  isAtRisk: boolean;            // < 30 days to Mar 31 with no qualifying activities
  daysTilExpiry: number;
  recommendation: string;
}

function computeIaRenewalStatus(
  certificate: {
    iaExpiryDate: number;
    iaRenewalActivities: { date: number; activityType: string }[];
  },
  nowMs: number
): IaRenewalStatus {
  const MARCH_31_MS = getMarch31Ms(new Date(certificate.iaExpiryDate).getFullYear());
  const prevMarch31Ms = getMarch31Ms(new Date(certificate.iaExpiryDate).getFullYear() - 2);

  // Count activities in the current 2-year period
  const activitiesInPeriod = certificate.iaRenewalActivities.filter(
    (a) => a.date >= prevMarch31Ms && a.date <= nowMs
  ).length;

  const daysTilExpiry = Math.floor((MARCH_31_MS - nowMs) / (24 * 60 * 60 * 1000));
  const isAtRisk = daysTilExpiry < 60 && activitiesInPeriod === 0;

  return {
    technicianId: "",
    iaExpiryDate: certificate.iaExpiryDate,
    currentPeriodStartMs: prevMarch31Ms,
    activitiesInCurrentPeriod: activitiesInPeriod,
    isAtRisk,
    daysTilExpiry,
    recommendation: isAtRisk
      ? `Schedule IA renewal activity immediately — ${daysTilExpiry} days until March 31 deadline`
      : activitiesInPeriod > 0
        ? "IA renewal on track"
        : "No renewal activity recorded yet this period",
  };
}

function getMarch31Ms(year: number): number {
  return new Date(year, 2, 31, 23, 59, 59).getTime(); // March = month index 2
}
```

### 8.3 Required Inspection Items (RII) — 14 CFR 43.15 + Part 121/135 Context

**What RII means:**
Required Inspection Items (RII) are specific maintenance tasks designated in an air carrier's maintenance program (14 CFR 121.369, 135.427) that must be inspected and approved by a person other than the one who performed the work (the "second-sign" requirement).

RII requirements apply primarily to **Part 121 and Part 135** operations. A Part 145 repair station servicing air carrier customers must honor the carrier's RII list and maintain personnel who can perform RII sign-offs — which means the RII inspector must not be the same person who performed the work.

**Workforce planning implication:**
- When a WO involves Part 121/135 aircraft, at minimum 2 qualified inspectors must be available during that WO's execution — one to perform and one to inspect RII items
- The shift optimizer must ensure that for any shift with RII work, the tech performing the work and the tech signing off the RII are different people
- Single-inspector shifts are a compliance risk for air carrier work

In practice this means: any shift expected to perform RII work must have at minimum **2 IA-authorized inspectors** (or 1 IA inspector + 1 carrier-approved inspector under 135.427(c)).

### 8.4 Repairman Certificate Considerations (14 CFR 65.101)

An FAA Repairman Certificate is issued to **a specific individual for work at a specific certificated repair station**. Unlike the A&P certificate (held by the individual regardless of employer), a repairman certificate:
- Is valid only at the repair station that recommended issuance
- Covers only the specific maintenance functions the station is authorized to perform
- Is not transferable to another station
- Becomes invalid if the holder leaves that repair station

**Workforce planning implication:**
- If a repairman certificate holder is the only person authorized to perform a specific work scope (e.g., specialized composite repair, specific avionics work), their departure means the station can no longer legally perform that work until a new repairman is authorized by the FAA — a process that can take weeks to months
- The succession planning system must identify all repairman certificate holders as critical key persons
- For high-risk specializations, consider cross-training another tech to A&P level (more portable) rather than relying on repairman certificates alone

### 8.5 Encoding FAA Constraints as Hard Optimization Constraints

The following table maps each FAA requirement to its representation in the workforce optimization models:

| FAA Requirement | Regulation | Constraint Type | Optimization Model | Enforcement Point |
|---|---|---|---|---|
| Accountable manager designated | 145.151(a)(1) | Hard | Not directly optimizable — staffing choice | UI validation on org setup |
| Sufficient qualified personnel | 145.151(b) | Hard | Minimum coverage constraint in MIP and CP-SAT | Both hiring plan and roster optimizer |
| Certificated supervisor on every shift | 145.153(b) | Hard | At least 1 `lead_technician`+ on each active shift | CP-SAT shift constraint |
| RTS signer must be certificated (Part 65) | 145.157(a) | Hard | At least 1 IA or A&P (with appropriate ratings) per shift | CP-SAT cert coverage constraint |
| IA renewal activities | 65.93 | Monitoring + soft | Flag in training planner when at risk | IA renewal alert in workforce dashboard |
| RII second-signer available | 43.15 + 121.369 | Hard | 2 qualified inspectors for shifts with air carrier WOs | CP-SAT: distinct-person constraint on RII work |
| Training program completion | 145.163 | Hard | Each tech completes recurrent training per approved schedule | Training recommender: flag overdue techs |
| Training records ≥ 2 years | 145.163(b) | Compliance | Not a scheduling constraint; system retention policy | Convex data retention policy |
| Repairman cert at specific station | 65.101 | SPOF monitoring | Identify in succession planning as single-point-of-failure | Succession planning SPOF report |

### 8.6 Staffing Ratio Guidance

The FAA does not publish numeric staffing ratios for Part 145 stations (unlike, for example, the nurse-to-patient ratios in healthcare regulation). However, industry practice and FAA inspection experience have established the following informal benchmarks:

| Metric | Industry Benchmark | Notes |
|---|---|---|
| Techs per IA inspector | 3:1 to 5:1 | Higher ratios acceptable in shops where IA is not the throughput bottleneck |
| Supervisor-to-tech ratio | 1:4 to 1:8 | FAA expects active supervision; 1:8+ is scrutinized |
| Inspectors (RTS authorized) per production tech | 1:3 to 1:6 | Depends on WO type mix |
| Shop manager coverage | 1 per active shift | At least 1 supervisor per shift during all production hours |
| IA holders per shop (minimum) | 2 | Single IA holder is a critical compliance risk |

These ratios should inform the **minimum coverage constraints** in the hiring optimizer and the **SPOF risk flagging** in the succession planner.

---

## Summary: Decision Map for Workforce Planning Implementation

```
Short-term (daily/weekly):
  → CP-SAT shift optimizer (Timefold microservice or Python)
  → Inputs: existing techs, certs, PTO, next-week WOs
  → Output: weekly roster proposal (rosterProposals table)

Medium-term (monthly):
  → Exponential smoothing forecast (TypeScript, runs in Convex action)
  → Capacity gap analysis by skill (getSkillCapacityGap Convex query)
  → Output: capacity heat map, overtime authorization recommendations

Long-term (quarterly/annual):
  → Prophet demand forecast (Python microservice)
  → MIP hiring optimizer (OR-Tools SCIP via Python microservice)
  → Training ROI calculator (TypeScript, in Convex)
  → Output: hiring plan, training investment recommendations

Continuous monitoring:
  → IA renewal status computation (TypeScript, getTrainingRecommendations query)
  → SPOF risk detection (TypeScript, succession planning query)
  → Turnover risk scoring (TypeScript, weekly background action)
  → Output: workforce dashboard KPI cards + alerts
```

The regulatory constraints (IA coverage, supervisor per shift, RTS-authorized inspector per shift, RII second-signer for air carrier work) are **always hard constraints** — they are not negotiable business preferences. Any optimization model that relaxes them in the name of cost reduction is producing a compliance-violating plan.

---

*Document compiled from: 14 CFR Part 145 (ecfr.gov), 14 CFR 65.91–65.95 (Cornell Law), OR-Tools documentation (Google), Athelon schema.ts and capacity.ts source analysis, MRO workforce planning industry knowledge.*
