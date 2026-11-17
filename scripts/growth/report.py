"""Evidence-first report: no fabricated totals, keyword volumes or speed scores."""
from datetime import datetime
from zoneinfo import ZoneInfo
from urllib.parse import urlsplit


def cell(value):
    return str(value).replace('|','/').replace('\n',' ')


def render(data):
    fixture = data['mode']=='fixture'
    crawl, analytics, speed = data['crawl'], data['analytics'], data['speed']
    lines = ['# Phase 1 SEO and measurement audit', '',
             '> SYNTHETIC OFFLINE FIXTURE — not site performance.' if fixture else '> Read-only run. No storefront changes, publishing, orders or account configuration writes.', '',
             f"Generated: {datetime.now(ZoneInfo('Asia/Kolkata')).isoformat()} (Asia/Kolkata).",
             f"Requested analytics window: {data['range']['start']} through {data['range']['end']} (90 inclusive days; GSC Pacific dates).", '',
             '## Coverage and limits', '',
             '| Component | Status | Evidence / limitation |','|---|---|---|',
             f"| Crawl | {crawl['status']} | Initial HTML, same-origin links only; no JavaScript execution or checkout interaction |",
             f"| Official GSC / GA4 service-account collector | {analytics['status']} | {cell(analytics.get('reason','Inspect data/generated exports for per-source coverage and limits'))} |",
             f"| PageSpeed | {speed['status']} | Lighthouse lab only; missing data is not a passing score |", '',
             'A successful fetch is not proof of Google indexing. Schema checks are structural heuristics, not Google eligibility validation. FAQ markup is inspected when present; it does not promise a rich result. Short product copy alone is not a defect. External links and fragments are not checked; private routes are excluded from crawling. GA4 key events are distinct from purchases.']
    for gap in crawl.get('gaps',[]): lines.append('- ' + gap)
    if speed.get('reason'): lines.append('- PageSpeed: ' + speed['reason'])
    lines += ['', '## Prioritised fix and verification list', '', '| Priority | Finding / task | Evidence | Action |','|---|---|---|---|']
    if analytics['status'] != 'ok':
        lines.append('| P0 | Revenue and search baseline incomplete | Official collector has missing or partial inputs | Configure read-only service account and numeric GA4 property ID; rerun before choosing content investments |')
    if crawl['status'] != 'ok':
        lines.append('| P1 | Crawl coverage incomplete | See coverage gaps | Rerun from CI or an allowed network; do not diagnose an outage from a blocked runner |')
    for page in crawl.get('pages',[]):
        for issue in page.get('issues',[]):
            lines.append(f"| {issue['priority']} | {cell(issue['code'])} | {cell(page['url'])} | {cell(issue['detail'])} |")
    for broken in crawl.get('broken_links',[]):
        lines.append(f"| P1 | Confirmed broken internal URL | {cell(broken['url'])}; linked from {cell(', '.join(broken['referrers']))} | Repair originating anchor or intentional redirect after approval |")
    if speed['status'] != 'ok':
        lines.append('| P2 | Page experience unmeasured | No complete PageSpeed run | Configure PageSpeed API key and compare mobile/desktop lab results; field INP needs separate CrUX data |')
    lines += ['| P2 | Product/offer facts need reconciliation | Founder brief gives 150 g edamame; repository includes other sizes | Confirm supported sizes and threshold basis; do not alter current offers |',
              '| P2 | Verify purchase measurement | GA4 connectivity does not prove purchase events match paid orders | Founder validates purchase event deduplication, INR value and transaction IDs against real orders |',
              '| P3 | Bundle opportunities for a later phase | Arithmetic from founder prices only, not an experiment result | Six chips cost INR 420; seven cost INR 490 before discount / INR 441 after CRUNCH10. Review margin, stock and shipping rules before publishing a bundle |']
    priority_start = lines.index('|---|---|---|---|', lines.index('## Prioritised fix and verification list')) + 1
    lines[priority_start:] = sorted(lines[priority_start:], key=lambda row: row.split('|')[1].strip())
    lines += ['', '## Page audit', '', '| URL | HTTP | Title | H1 count | Schema types |', '|---|---|---|---|---|']
    for page in crawl.get('pages',[]):
        lines.append(f"| {cell(page['url'])} | {cell(page.get('status'))} | {cell(page.get('title','not measured'))} | {len(page.get('h1s',[])) if page.get('title') else 'unknown'} | {cell(', '.join(page.get('schema_types',[])))} |")
    lines += ['', '## Official analytics baseline', '']
    totals = analytics.get('gsc',{}).get('totals',{})
    if totals.get('status')=='ok' and totals.get('rows'):
        row = totals['rows'][0]
        lines += ['Source: official Search Console API, property-level request; raw CTR fraction converted to percent here.', '',
                  '| Clicks | Impressions | CTR | Average position |', '|---|---|---|---|',
                  f"| {row['clicks']} | {row['impressions']} | {row['ctr']*100:.2f}% | {row['position']:.2f} |"]
    else: lines.append('Search Console property totals: not measured in this run. Query-row totals must not replace property totals.')
    for scope in ('all_traffic','google_organic'):
        ga = analytics.get('ga4',{}).get(scope,{})
        lines += ['', '### GA4 ' + scope.replace('_',' '), '']
        if ga.get('status')!='ok': lines.append('Not measured. ' + ga.get('reason',analytics.get('reason','Configure GA4 credentials and property ID.'))); continue
        lines += [f"Currency: INR. Scope: {ga['scope']}. Limit reached: {ga['limit_reached']}. Key events are not purchases.", '',
                  '| Landing page | Sessions | Key events | Purchases | Purchase revenue INR | Revenue/session INR |', '|---|---|---|---|---|---|']
        for row in sorted(ga['rows'], key=lambda r:r['purchase_revenue_inr'],reverse=True)[:15]:
            lines.append('| ' + ' | '.join(cell(urlsplit(row[k]).path if k == 'landing_page' else row[k]) for k in ('landing_page','sessions','key_events','purchases','purchase_revenue_inr','revenue_per_session_inr')) + ' |')
        if not ga['rows']: lines.append('No returned rows for this scope; verify tracking and date coverage before treating as no sales.')
        if ga.get('metadata'): lines.append('Reporting metadata (sampling/thresholding/timezone): ' + cell(ga['metadata']))
    lines += ['', '## PageSpeed lab measurements', '', '| Page | Device | Status | Score (0–1) | LCP ms | CLS | TBT ms |','|---|---|---|---|---|---|---|']
    for r in speed.get('rows',[]):
        lines.append('| ' + ' | '.join(cell(r.get(k,'not measured')) for k in ('path','strategy','status','performance_score','lab_lcp_ms','lab_cls','lab_tbt_ms')) + ' |')
    supplemental = data.get('supplemental')
    if supplemental and not fixture:
        gsc = supplemental['gsc']; current = gsc['current']; onpage = supplemental['onpage']
        lines += ['', '## Dated supplemental connected-account observations', '',
                  'These are separately collected GSC Wizard observations, not results from the service-account collector. They are a static bootstrap snapshot and are not refreshed when this script runs.',
                  'Snapshot retrieved: ' + supplemental['retrieved_at'] + '.',
                  f"Source: `{gsc['tool']}`, {gsc['range']['startDate']} through {gsc['range']['endDate']}; CTR already a percent in this source.", '',
                  '| Clicks | Impressions | CTR | Average position |', '|---|---|---|---|',
                  f"| {current['clicks']} | {current['impressions']} | {current['ctr']:.2f}% | {current['avgPosition']:.2f} |", '',
                  f"Live HTML snapshot source: `{onpage['tool']}` at snapshot time (its search-metric context window does not date the live crawl).", '',
                  '| Sampled URL | HTTP | Indexable in HTML | Tool issues |', '|---|---|---|---|']
        for page in onpage['pages']:
            lines.append(f"| {cell(page['url'])} | {page['status']} | {page['indexable']} | {cell(', '.join(i['message'] for i in page['issues']) or 'None detected')} |")
        lines += ['', 'GA4 connected-account status: ' + supplemental['ga4']['limitation']]
    lines += ['', '## Required founder inputs', '',
              '- A service account granted Search Console access and GA4 Viewer access. Supply its key only through local environment / CI secret configuration.',
              '- Numeric GA4 property ID; enable Search Console API and Google Analytics Data API in the key’s Google Cloud project.',
              '- Optional PageSpeed API key with PageSpeed Insights API enabled.',
              '- Confirm edamame variants and whether the free-shipping threshold uses subtotal before or after discount.',
              '- Confirm current pack-label evidence for claims before any Phase 3 draft is approved.', '',
              '## Next gate', '', 'Phase 1 code can run offline and read-only. A complete measurement audit requires the missing inputs above. Phase 2 is not started; wait for founder OK.', '',
              '## API references', '',
              '- https://developers.google.com/webmaster-tools/v1/searchanalytics/query',
              '- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport',
              '- https://developers.google.com/speed/docs/insights/v5/get-started', '']
    return '\n'.join(lines)
