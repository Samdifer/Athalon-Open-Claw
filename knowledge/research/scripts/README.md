# Research Scripts

## discover-websites.ts

Website discovery tool for Part 145 and Part 135 prospect data files.

### Workflow

```bash
# 1. Generate discovery queue (list of companies needing websites)
npx tsx discover-websites.ts

# 2. Show current website coverage stats
npx tsx discover-websites.ts --stats

# 3. After running web searches, merge results back into data files
npx tsx discover-websites.ts --merge discovery-results.json
```

### Discovery Methods (in priority order)

1. **Email domain inference** — If FAA data has a business email (e.g., `cynta@alloycolorado.com`), the domain is a strong website hint
2. **Web search** — Use Claude Code's WebSearch tool: `"{company name}" {city} {state} aviation`
3. **Domain pattern matching** — Try common patterns like `companyname.com`
4. **Aviation directories** — Check The145.com, MRO-Network for listings

### Results Format

Save discovery results as JSON array:

```json
[
  {
    "entityId": "ALWR453E",
    "dataset": "part145",
    "website": "https://www.alloycolorado.com",
    "confidence": "high",
    "source": "email domain match + Google top hit"
  }
]
```

### Data Files

- Part 145: `apps/athelon-app/src/shared/data/coloradoPart145Research.ts`
- Part 135: `apps/athelon-app/src/shared/data/part135Operators.ts`
