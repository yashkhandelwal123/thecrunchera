# The Crunch Era growth engineering

Phase 1 only: read-only auditing and measurement infrastructure. No storefront, checkout, pricing, database, content-publication or social-publication changes.

- [Runbook, credential setup and limitations](scripts/growth/README.md)
- [Current audit and prioritised actions](reports/audit.md)
- [Business facts and unresolved questions](config/business.json)
- [Rules for all future runs](AGENTS.md)
- [Manual read-only CI workflow](.github/workflows/growth-audit.yml)

```bash
python -m unittest discover -s scripts/tests -v
python -m scripts.growth.audit --dry-run
```

For a live 90-day report, configure the read-only Google service account and GA4 property ID as described in the runbook, then run `python -m scripts.growth.audit`. Missing data is reported, never fabricated. Add root `PAUSE` to stop runners. No scheduled run or publisher is enabled.

Phase 2 (keywords/briefs) requires separate founder OK after reviewing Phase 1 and resolving its measurement gaps. Later phases have not been implemented.
