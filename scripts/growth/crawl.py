"""Bounded same-origin HTML/sitemap audit. No browser writes or form submissions."""
import json
import re
import xml.etree.ElementTree as ET
from collections import deque
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser
from .common import Paused, RequestFailed

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title, self.h1s, self.links, self.schemas = '', [], [], []
        self.description, self.canonicals, self.robots = '', [], ''
        self.invalid_schema = False
        self._title, self._h1, self._json = False, None, None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'title': self._title = True
        if tag == 'h1': self._h1 = ''
        if tag == 'a' and a.get('href'): self.links.append(a['href'])
        if tag == 'link' and 'canonical' in a.get('rel', '').split(): self.canonicals.append(a.get('href', ''))
        if tag == 'meta':
            if a.get('name', '').lower() == 'description': self.description = a.get('content', '')
            if a.get('name', '').lower() == 'robots': self.robots = a.get('content', '')
        if tag == 'script' and a.get('type', '').lower() == 'application/ld+json': self._json = ''

    def handle_data(self, text):
        if self._title: self.title += text
        if self._h1 is not None: self._h1 += text
        if self._json is not None: self._json += text

    def handle_endtag(self, tag):
        if tag == 'title': self._title = False
        if tag == 'h1' and self._h1 is not None:
            self.h1s.append(self._h1.strip()); self._h1 = None
        if tag == 'script' and self._json is not None:
            try: self.schemas.append(json.loads(self._json))
            except ValueError: self.invalid_schema = True
            self._json = None


def nodes(value):
    if isinstance(value, list):
        for item in value: yield from nodes(item)
    if isinstance(value, dict):
        yield value
        for item in value.values(): yield from nodes(item)


def internal_url(base, href):
    url = urlsplit(urljoin(base, href))
    origin = urlsplit(base)
    if url.scheme not in ('http', 'https') or url.netloc != origin.netloc or url.username or url.password:
        return None
    # Strip fragments and query strings: inspect canonical pages, not carts/trackers/variant combinations.
    return urlunsplit((url.scheme, url.netloc, url.path or '/', '', ''))


def private_path(url, config):
    path = urlsplit(url).path.rstrip('/') or '/'
    return any(path == prefix or path.startswith(prefix + '/') for prefix in config['private_paths'])


def inspect_html(url, body, config):
    page = Page(); page.feed(body)
    issues = []
    private = private_path(url, config)
    def add(priority, code, detail): issues.append({'priority':priority,'code':code,'detail':detail})
    if not page.title.strip(): add('P1', 'missing-title', 'Supply a unique descriptive title')
    elif len(page.title.strip()) > 65: add('P3', 'long-title', 'May truncate; assess search intent and pixel width')
    if not page.description.strip() and not private: add('P2', 'missing-description', 'Write a page-specific description')
    if len(page.h1s) != 1 and not private: add('P2', 'h1-count', f'Found {len(page.h1s)} H1 headings in initial HTML')
    if len(page.canonicals) != 1: add('P1', 'canonical-count', f'Found {len(page.canonicals)} canonical tags')
    elif not page.canonicals[0].startswith(config['site_url'].rstrip('/') + '/'):
        add('P1', 'canonical-origin', 'Canonical is relative or outside the configured origin; review intent')
    elif internal_url(url, page.canonicals[0]) != internal_url(url, url):
        add('P2', 'canonical-other', 'Canonical points elsewhere; verify this is intentional')
    if 'noindex' in page.robots.lower() and not private: add('P1', 'public-noindex', 'Public page excludes itself from search')
    if private and 'noindex' not in page.robots.lower(): add('P1', 'private-indexable', 'Transactional/private route needs noindex')
    internal = sorted({u for href in page.links if (u := internal_url(url, href))})
    if not internal and not private: add('P2', 'no-internal-links', 'No crawlable internal anchors in initial HTML')
    all_nodes = list(nodes(page.schemas))
    types = set()
    for node in all_nodes:
        kind = node.get('@type', [])
        if isinstance(kind, str): types.add(kind)
        elif isinstance(kind, list): types.update(t for t in kind if isinstance(t, str))
    if page.invalid_schema: add('P1', 'invalid-jsonld', 'JSON-LD could not be parsed')
    path = urlsplit(url).path
    if path.startswith('/products/') or path == '/edamame-beans':
        if not types.intersection({'Product','ProductGroup'}): add('P2', 'missing-product-schema', 'No Product or ProductGroup detected')
    if path.startswith('/blog/') and 'Article' not in types and 'BlogPosting' not in types:
        add('P2', 'missing-article-schema', 'Article/BlogPosting absent')
    if (path.startswith('/products/') or path == '/edamame-beans' or path.startswith('/blog/')) and 'BreadcrumbList' not in types:
        add('P3', 'missing-breadcrumb-schema', 'Consider matching visible breadcrumbs; not a ranking requirement')
    for node in all_nodes:
        if node.get('@type') == 'Product':
            for key in ('name','image','offers'):
                if not node.get(key): add('P2', 'product-field', f'Product missing {key}')
        if node.get('@type') == 'Offer':
            for key in ('price','priceCurrency','url'):
                if not node.get(key): add('P2', 'offer-field', f'Offer missing {key}')
        if node.get('@type') == 'FAQPage' and not node.get('mainEntity'):
            add('P2', 'faq-field', 'FAQPage missing questions')
        if node.get('@type') == 'BreadcrumbList' and not node.get('itemListElement'):
            add('P2', 'breadcrumb-field', 'BreadcrumbList missing items')
    return {'url':url,'title':page.title.strip(),'description':page.description,'h1s':page.h1s,
            'canonical':page.canonicals,'robots':page.robots,'internal_links':internal,
            'schema_types':sorted(types),'issues':issues,'scope':'initial HTML only; not browser or Rich Results validation'}


def allowed_page(url, config):
    path = urlsplit(url).path.rstrip('/') or '/'
    return path in config['allowed_page_paths'] or any(path.startswith(p) for p in config['allowed_path_prefixes'])


def crawl(config, http, rt):
    base = config['site_url']
    result = {'status':'ok','pages':[],'gaps':[],'sitemaps':[], 'broken_links':[]}
    robots = RobotFileParser()
    try:
        raw = http.request('GET', urljoin(base, '/robots.txt'), 'site robots.txt')['body']
        robots.parse(raw.splitlines())
        result['robots'] = {'status':'ok','sitemap_urls':robots.site_maps() or []}
    except RequestFailed as error:
        result['robots'] = {'status':'unavailable','reason':str(error)}
        result['gaps'].append('robots.txt unavailable; crawler stopped rather than assuming permission')
        result['status'] = 'partial'
        return result
    pending = deque([internal_url(base,p) for p in config['seed_paths']])
    sitemap_queue = deque([urljoin(base,'/sitemap.xml'), *(robots.site_maps() or [])])
    seen_sitemaps, sitemap_urls = set(), set()
    while sitemap_queue and len(seen_sitemaps) < config['max_sitemaps']:
        rt.check()
        url = sitemap_queue.popleft()
        if url in seen_sitemaps or not internal_url(base,url): continue
        seen_sitemaps.add(url)
        if not robots.can_fetch('CrunchEraReadOnlyAudit', url):
            result['gaps'].append('robots.txt blocks sitemap fetch'); continue
        try:
            xml = ET.fromstring(http.request('GET',url,'site sitemap')['body'])
            name = xml.tag.rsplit('}',1)[-1]
            locations = [n.text.strip() for n in xml.iter() if n.tag.rsplit('}',1)[-1]=='loc' and n.text]
            result['sitemaps'].append({'url':url,'status':'ok','kind':name,'locations':len(locations)})
            if name == 'sitemapindex': sitemap_queue.extend(locations)
            elif name == 'urlset':
                for loc in locations:
                    clean = internal_url(base,loc)
                    if clean:
                        sitemap_urls.add(clean); pending.append(clean)
                    else: result['gaps'].append('Sitemap contains an off-origin URL')
            else: result['gaps'].append('Unrecognised sitemap root')
        except (RequestFailed, ET.ParseError):
            result['sitemaps'].append({'url':url,'status':'failed'})
            result['gaps'].append('Sitemap fetch or parsing failed')
    if sitemap_queue: result['gaps'].append('Sitemap limit reached; coverage partial')
    visited, referrers = set(), {}
    while pending and len(visited) < config['max_pages']:
        rt.check()
        url = pending.popleft()
        if not url or url in visited: continue
        visited.add(url)
        if not robots.can_fetch('CrunchEraReadOnlyAudit',url):
            result['gaps'].append('robots.txt disallows ' + urlsplit(url).path); continue
        if private_path(url, config): continue
        if not allowed_page(url, config):
            result['gaps'].append('URL outside read-only crawl allowlist: ' + urlsplit(url).path)
            continue
        try:
            response = http.request('GET',url,'site page ' + urlsplit(url).path)
            if 'html' not in response.get('content_type','text/html').lower():
                result['pages'].append({'url':url,'status':response['status'],'kind':'non-HTML resource','issues':[]})
                continue
            row = inspect_html(response['url'],response['body'],config)
            row.update({'requested_url':url,'status':response['status'],'in_sitemap':url in sitemap_urls,'redirected':response['url'] != url})
            result['pages'].append(row)
            for link in row['internal_links']:
                referrers.setdefault(link, []).append(url)
                pending.append(link)
        except RequestFailed as error:
            result['pages'].append({'url':url,'status':'failed','reason':str(error),'issues':[]})
            if str(error) in ('HTTP 404','HTTP 410'):
                result['broken_links'].append({'url':url,'referrers':referrers.get(url,[])})
            else: result['gaps'].append('Unverified page: ' + urlsplit(url).path + ' (' + str(error) + ')')
    remaining = sorted({u for u in pending if u and u not in visited})
    if remaining: result['gaps'].append(f'{len(remaining)} discovered URLs not checked due to crawl cap')
    for broken in result['broken_links']:
        broken['referrers'] = referrers.get(broken['url'],[])
    for field in ('title','description'):
        groups = {}
        for page in result['pages']:
            if page.get(field): groups.setdefault(page[field],[]).append(page)
        for matching in groups.values():
            if len({p['url'] for p in matching}) > 1:
                for page in matching:
                    page['issues'].append({'priority':'P2','code':'duplicate-'+field,'detail':'Shared by multiple audited canonical pages; review search intent'})
    result['sitemap_urls'] = sorted(sitemap_urls)
    result['unverified_urls'] = remaining
    if result['gaps']: result['status'] = 'partial'
    return result


def pagespeed(config, http, rt, key):
    from urllib.parse import urlencode
    if not key: return {'status':'not_measured','reason':'PAGESPEED_API_KEY not configured','rows':[]}
    rows = []
    for path in config['pagespeed_paths']:
        for strategy in config['pagespeed_strategies']:
            rt.check()
            try:
                data = http.json('GET','https://www.googleapis.com/pagespeedonline/v5/runPagespeed?' + urlencode({'url':urljoin(config['site_url'],path),'strategy':strategy,'category':'performance','key':key}), 'pagespeed ' + path + ' ' + strategy)
                lighthouse = data['lighthouseResult']
                audits = lighthouse.get('audits',{})
                rows.append({'path':path,'strategy':strategy,'status':'ok','performance_score':lighthouse['categories']['performance']['score'],
                             'lab_lcp_ms':audits.get('largest-contentful-paint',{}).get('numericValue'),
                             'lab_cls':audits.get('cumulative-layout-shift',{}).get('numericValue'),
                             'lab_tbt_ms':audits.get('total-blocking-time',{}).get('numericValue'),
                             'measured_at':lighthouse.get('fetchTime'),'note':'Lighthouse lab measurement, not field INP or a ranking guarantee'})
            except (RequestFailed, KeyError): rows.append({'path':path,'strategy':strategy,'status':'not_measured'})
    return {'status':'ok' if all(r['status']=='ok' for r in rows) else 'partial','rows':rows}
