# Dispatch No. 8 — The Database Returns Nothing. That's the Wrong Answer.
**By Miles Beaumont**  
**Filed:** Phase 26, February 2026  
**Series:** The Athelon Dispatches

---

I want to tell you about a moment that happens in maintenance shops all over the country, several times a week, and nobody talks about it because it doesn't look like a problem until it is.

A mechanic sits down at a computer. He has an aircraft in front of him — in this case, a Robinson R44 Raven II. He pulls up the shop's compliance software. He searches the FAA AD database. The query runs. Nothing comes back. He moves on.

What he just searched for was main rotor blade retention bolts. There is no FAA Airworthiness Directive covering main rotor blade retention bolts on the Robinson R44. The search returned zero results because zero results is the correct answer to the question he asked.

The question he should have asked is different. The mandatory replacement interval for those bolts doesn't live in the FAA AD database. It lives in the Rotorcraft Flight Manual — specifically in Section 4, the Airworthiness Limitations section. Two thousand two hundred hours, or twelve years, whichever comes first. FAA-approved. Mandatory. Not in any database you can search.

If those bolts are at 2,201 hours, the aircraft is not airworthy. The compliance software just told him it is.

---

## The Distinction Nobody Built Software For

There are two kinds of mandatory maintenance requirements in aviation. Most people in the industry know this. The software industry, largely, does not.

**Airworthiness Directives** come from the FAA under 14 CFR Part 39. They have official numbers — you've seen them, the format is YYYY-NN-NN. They're published in the Federal Register. They're searchable in the FAA's online AD database. If you want to know whether a specific AD applies to a specific aircraft by serial number, you can find out in minutes. The system is imperfect in places but it's searchable, standardized, and automatable. MRO software has been built around it for years.

**Airworthiness Limitations** come from the aircraft manufacturer, under 14 CFR §27.1529 for normal category rotorcraft and equivalent sections for other aircraft categories. The manufacturer is required to include them in the Instructions for Continued Airworthiness — typically in the Rotorcraft Flight Manual or the maintenance manual. They are mandatory. They carry the same compliance force as an AD. The FAA has approved them as part of the aircraft's type certificate. There is no searchable database. You read the document.

The maintenance professional knows this. Walk into any shop that does serious helicopter work and ask the IA about the Robinson ALS intervals. He'll tell you from memory. He doesn't need a database. He read the manual.

The software doesn't know this, usually. The software was built from the database outward, and the database doesn't have ALS items. So the software doesn't have them either.

---

## Twelve Years of R44 Annuals

I spoke with a Robinson-qualified IA named Tobias Ferreira. Tobias has been doing R44 and R22 annuals for twelve years, out of a helicopter MRO in Fort Worth. When I asked him about the AD database and main rotor blade retention bolts, he said exactly what I expected him to say.

"It doesn't show up. It never showed up. It's not in the AD database. It's in the manual. It's one of the first things I check."

I asked him whether he'd ever seen shops miss an ALS item because they were tracking compliance by AD database alone.

"Yes. I've seen it in shops that were importing aircraft from other operators. Records showed AD compliance current — and it was. But the ALS hours on the drive belt weren't being tracked at all. The shop's tracking system didn't have a field for it. They were pulling up the AD list and saying 'we're good.' They were not good on the belt.

"It's not negligence, usually. It's that the tool they're using doesn't have a place for ALS items. If the tool only shows ADs, the mechanic can only see ADs. That's the gap."

The drive belt on a Robinson R44 is a 300-hour or two-year interval, whichever comes first. Three hundred hours is not a lot of flight time. The calendar limit — two years — catches a lot of aircraft that don't fly hard enough to hit the hours first. A shop without a calendar-aware ALS tracking system can miss the calendar side entirely even if the hours look fine.

That belt is not a trivial component. On the R44, the main rotor drive belt is the power transmission path between the engine and the rotor. Tobias does not mince words about what a failed belt means at altitude.

---

## Why the Industry Settled for This

I've been covering aviation maintenance long enough to know that this gap didn't develop because the people building software were careless or the people in shops were negligent. It developed because the path of least resistance for compliance tracking was the AD database.

The FAA AD database is a known, standardized, authoritative source. It has an official format. It's updated when ADs are issued. It's queryable by aircraft type, make, model, engine. Building compliance software around it is rational — it's one place, you can hit it with an API, you get results. It's not perfect but it's tractable.

The ALS is not tractable in the same way. There is no centralized ALS database. Each manufacturer maintains their own documentation. The documentation is revised through service bulletins and RFM amendments. Tracking ALS requires reading the actual document — the one that's supposed to come with the aircraft and gets revised by the manufacturer over the aircraft's life. The intervals can change. The applicable serial number ranges can change. The document format varies by manufacturer.

Software engineers building compliance tools default to what's queryable. What's queryable is the AD database. The ALS is not queryable because there's nowhere to query it. So the software tracks ADs and calls it compliance coverage.

Meanwhile, in the shop, the IA who has been doing R44 annuals for twelve years tracks the ALS intervals from memory or from the paper in his logbook because that's what his license requires and that's what the manual says. He's not surprised there's a gap in the software. He's been working around the gap for years. He didn't build the software. He just uses it for the parts he can use it for.

---

## The Pre-Onboarding Call

A couple of months ago, a helicopter MRO DOM named Sandra Okafor was on an onboarding call with Athelon. She'd been doing helicopter maintenance for nineteen years. She's the kind of customer who shows up to a software demonstration knowing exactly what she's going to ask and listening carefully to the answer.

She asked about the main rotor blade retention bolts on the R44.

Specifically: how does Athelon track the ALS interval on those bolts?

The compliance architect on the call — Marcus Webb — had not fully enumerated ALS tracking in his Part 27 audit documentation at that point. He was honest about it. He said he'd look into it.

Sandra decided that was an acceptable answer. Not the answer she was hoping for, but acceptable. She'd heard vendors say "we handle everything" before. She'd heard vendors describe their AD database integration as complete compliance coverage. She knew what that meant and she knew what it missed. A man who said "I'll look into it" was at least telling her the truth about where his documentation ended.

Twelve weeks later, Athelon has an `alsItems` table.

---

## What That Table Is

I want to be specific about this because the temptation in product coverage is to say "we've added ALS tracking" and leave it there. That covers the marketing. It doesn't tell you what the product actually did.

The `alsItems` table in Athelon is a separate data model from the `adComplianceRecords` table. This is intentional and it matters. Here's why:

An AD compliance record has a regulatory basis in 14 CFR Part 39. It has an FAA AD number. It has an AMOC path — if you can't comply with the AD as written, you can submit an Alternative Method of Compliance to the FAA and get an approved workaround. It has a NOT_APPLICABLE status, because some ADs don't apply to some aircraft.

An ALS item has a different regulatory basis — 14 CFR §27.1529 for normal category rotorcraft. It doesn't have an AD number; it has an ALS section reference. There is no AMOC equivalent for ALS items — you cannot submit an operator alternative to a manufacturer's mandatory life limit. There is no NOT_APPLICABLE status. An ALS item applies to all aircraft of the covered model. If you have a Robinson R44, the R44 ALS applies. There is no opt-out.

If you merge these into one table with one compliance status model, you obscure the distinction. A mechanic looking at a unified compliance list doesn't know whether the NOT_APPLICABLE on that record came from a legitimate serial-number-based AD applicability finding or someone clicking through a menu to make an overdue ALS item go away. The data looks the same. The compliance posture is completely different.

Separate tables. Separate regulatory basis fields. Separate status enums. The NOT_APPLICABLE status doesn't exist in the `alsItems` table — not as a deprecated value, not as an admin override, not at all. The schema rejects it.

Marcus Webb made a point of reviewing this design and signing off on it. His sign-off on compliance architecture means something specific at Athelon: he looked at the regulatory basis, he verified the implementation matches the regulation, and he put his name on it. He doesn't sign off on things he hasn't read.

---

## The Drive Belt

On the day Lone Star Rotorcraft activated ALS tracking for its Robinson fleet, Sandra Okafor's team entered the maintenance history on N224LS — a 2014 R44 Raven II with 1,410 hours total time.

When they entered the drive belt data, the system flagged OVERDUE immediately. Last replacement: 810 hours. Current hours: 1,410. Interval: 300 hours. Overdue by 300 hours. Calendar limit also exceeded by sixteen months.

Sandra grounded the aircraft on the spot. No debate, no "let me look at this later." Nineteen years of helicopter maintenance and she didn't need to think about what an overdue drive belt means.

She said: "I would have caught this at the annual. But the annual isn't until December. That's ten months away. This system found it today."

Then she said something I want to quote carefully because it's the most honest thing I've heard a customer say about an MRO software product in years of covering this space:

"I came into this call skeptical. I've been doing this for nineteen years. I know what this kind of software usually does — it shows you a compliance dashboard that doesn't actually track what matters."

That's the gap. That's what this dispatch is about. Not because the developers were building bad software. Because they were building software toward a database that doesn't contain what matters most.

---

## What's Still Not Done

Athelon now tracks ALS items for Robinson R44 and R22 aircraft. That's what WS26-A produced. Marcus audited the R44 RFM, Tobias confirmed the field findings, Devraj built the table, Cilla ran ten test cases.

What's not done: Bell 206B-III. Sikorsky S-76C. Robinson mandatory service bulletins that create ALS-equivalent compliance requirements outside the RFM ALS section. Those are listed as Phase 27 scope items. The Bell mandatory SI gap specifically — Sandra Okafor named it, and the honest answer is it's on the list and not yet shipped.

I'm reporting this because honest product coverage means telling you what the coverage is and where it ends. An MRO product that tells you "we track ALS" without telling you which aircraft types have been audited is running the same play as the product that pointed at the AD database and called it complete compliance. The database returns a result. The result has a scope boundary. Know the scope boundary.

The Robinson ALS audit is done. Bell is next. The scope boundary moves when the audit moves.

---

## The Question Worth Asking

If you run a helicopter maintenance operation and you use MRO software, I'd ask your software vendor one question. Not "do you track ALS compliance" — they'll say yes. Ask them to show you the ALS interval for the main rotor blade retention bolts on your aircraft type.

If the answer comes from the AD database, that's not an ALS interval. That's an AD. They're different things with different regulatory bases and different compliance paths and different consequences for getting them wrong.

If the answer comes from the RFM — specifically the section, the paragraph, the interval in hours and calendar days — you're talking to someone who read the document.

After twelve years of R44 annuals, Tobias Ferreira can tell you that interval from memory. After twelve weeks of building the `alsItems` table, Athelon can tell you too.

The database returns nothing. That's still the wrong answer.

---

*Miles Beaumont writes about aviation maintenance operations and the people who do them.*  
*Dispatches 1 through 7 are archived at the series index.*  
*This is Dispatch No. 8.*

---

*Filed: Phase 26, February 2026*
