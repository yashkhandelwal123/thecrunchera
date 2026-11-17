import json
import os
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch
from urllib.request import Request

from scripts.growth.common import ROOT, Runtime, Http, Paused, RequestFailed, SameOriginRedirect, date_window
from scripts.growth.crawl import Page, inspect_html, internal_url, crawl, pagespeed
from scripts.growth.analytics import gsc_rows, ga4_rows, pull
from scripts.growth.fixtures import sample
from scripts.growth.report import render
from scripts.growth import audit

CONFIG = json.loads((ROOT/'config/growth.json').read_text())

class FakeHttp:
    def __init__(self, responses): self.responses, self.calls = list(responses), []
    def json(self,*args):
        self.calls.append(args)
        return self.responses.pop(0)

class GrowthTests(unittest.TestCase):
    def test_date_window_90_inclusive_and_lag(self):
        start,end = date_window(date(2026,11,8))
        self.assertEqual(end,'2026-11-05')
        self.assertEqual((date.fromisoformat(end)-date.fromisoformat(start)).days,89)

    def test_pause_blocks_entry_without_outputs(self):
        with tempfile.TemporaryDirectory() as root:
            (Path(root)/'PAUSE').touch()
            with self.assertRaises(Paused): Runtime(root)
            self.assertEqual([p.name for p in Path(root).iterdir()], ['PAUSE'])

    def test_pause_added_during_run_blocks_next_request_and_write(self):
        with tempfile.TemporaryDirectory() as root:
            rt = Runtime(root); http = Http(rt,0)
            (Path(root)/'PAUSE').touch()
            with self.assertRaises(Paused): http.request('GET','https://example.com','test')
            with self.assertRaises(Paused): rt.write_json('data/generated/a.json',{})
            self.assertFalse((Path(root)/'data').exists())

    def test_dry_run_transport_rejects_all_network(self):
        with tempfile.TemporaryDirectory() as root:
            http = Http(Runtime(root,True),0)
            with patch('urllib.request.build_opener',side_effect=AssertionError('network used')):
                with self.assertRaises(RequestFailed): http.request('GET','https://example.com','test')
                with self.assertRaises(RequestFailed): http.authenticate()

    def test_url_scope_strips_trackers_and_fragments(self):
        base='https://thecrunchera.com/'
        self.assertEqual(internal_url(base,'/edamame-beans?size=150g#faq'),base+'edamame-beans')
        for link in ('mailto:hi@example.com','https://evil.example/','//evil.example/','javascript:alert(1)'):
            self.assertIsNone(internal_url(base,link))

    def test_off_origin_redirect_fails_closed(self):
        handler = SameOriginRedirect()
        with self.assertRaises(RequestFailed):
            handler.redirect_request(Request('https://thecrunchera.com/'),None,302,'',{},'https://evil.example/')

    def test_parser_collects_nested_jsonld(self):
        page=Page(); page.feed('<title>A &amp; B</title><h1>One <em>title</em></h1><script type="application/ld+json">{"@graph":[{"@type":"Product"}]}</script>')
        self.assertEqual(page.title,'A & B'); self.assertEqual(page.h1s,['One title'])
        result=inspect_html('https://thecrunchera.com/products/ragi-chips','<script type="application/ld+json">{"@graph":[{"@type":"Product"}]}</script>',CONFIG)
        self.assertIn('Product',result['schema_types'])
        self.assertIn('product-field',[i['code'] for i in result['issues']])

    def test_invalid_schema_and_public_noindex(self):
        row=inspect_html('https://thecrunchera.com/products/ragi-chips','<meta name="robots" content="noindex"><script type="application/ld+json">bad</script>',CONFIG)
        codes={i['code'] for i in row['issues']}
        self.assertTrue({'public-noindex','invalid-jsonld','missing-product-schema'}<=codes)

    def test_private_noindex_is_intentional(self):
        row=inspect_html('https://thecrunchera.com/cart','<title>Cart</title><link rel="canonical" href="https://thecrunchera.com/cart"><meta name="robots" content="noindex">',CONFIG)
        self.assertFalse(row['issues'])

    def test_optional_faq_not_required_for_every_product(self):
        row=sample(CONFIG)['crawl']['pages'][0]
        self.assertNotIn('missing-faq-schema',[i['code'] for i in row['issues']])

    def test_crawler_robots_failure_does_not_assume_permission(self):
        class Denied:
            def request(self,*args): raise RequestFailed('HTTP 403')
        with tempfile.TemporaryDirectory() as root:
            result=crawl(CONFIG,Denied(),Runtime(root))
            self.assertEqual(result['status'],'partial'); self.assertFalse(result['pages'])

    def test_crawler_sitemap_broken_links_cap_and_non_html(self):
        base=CONFIG['site_url']
        class Site:
            calls=[]
            def request(self,method,url,label):
                self.calls.append((method,url))
                if url.endswith('/robots.txt'): body='User-agent: *\nAllow: /\nDisallow: /admin\n'
                elif url.endswith('/sitemap.xml'): body='<urlset><url><loc>'+base+'</loc></url></urlset>'
                elif url.endswith('/blog/missing'): raise RequestFailed('HTTP 404')
                elif url.endswith('/image.jpg'): return {'body':'bytes','url':url,'status':200,'content_type':'image/jpeg'}
                else: body='<title>Fixture</title><h1>Home</h1><a href="/blog/missing">Missing</a><a href="/product-images/image.jpg">Label</a><a href="/auth/logout">Logout</a><a href="/admin/orders">Private</a><a href="https://evil.example/">External</a>'
                return {'body':body,'status':200,'url':url,'content_type':'text/html'}
        config={**CONFIG,'seed_paths':['/'],'max_pages':10}
        with tempfile.TemporaryDirectory() as root:
            site=Site(); result=crawl(config,site,Runtime(root))
        self.assertEqual(result['broken_links'][0]['referrers'],[base])
        image=next(p for p in result['pages'] if p['url'].endswith('image.jpg'))
        self.assertEqual(image['issues'],[])
        self.assertTrue(all(method=='GET' for method,_ in site.calls))
        self.assertFalse(any('evil.example' in url or '/admin/' in url or '/auth/' in url for _,url in site.calls))

    def test_gsc_pagination_and_encoded_property(self):
        http=FakeHttp([{'rows':[{'keys':['a']},{'keys':['b']}]},{'rows':[{'keys':['c']}]}])
        result=gsc_rows(http,CONFIG['gsc_property'],'2026-01-01','2026-03-31',['query'],cap=10,batch=2)
        self.assertEqual(len(result['rows']),3); self.assertFalse(result['limit_reached'])
        self.assertEqual(http.calls[1][3]['startRow'],2)
        self.assertIn('https%3A%2F%2Fthecrunchera.com%2F',http.calls[0][1])
        self.assertEqual(http.calls[0][3]['dataState'],'final')

    def test_gsc_cap_reports_uncertainty(self):
        result=gsc_rows(FakeHttp([{'rows':[{},{}]}]),CONFIG['gsc_property'],'a','b',['query'],cap=2,batch=2)
        self.assertTrue(result['limit_reached'])

    def test_ga4_pagination_host_filter_and_purchase_not_key_event(self):
        def row(path):return {'dimensionValues':[{'value':path}],'metricValues':[{'value':str(v)} for v in (10,5,2,225)]}
        http=FakeHttp([{'rows':[row('/a')],'rowCount':2,'metadata':{'currencyCode':'INR'}},{'rows':[row('/b')],'rowCount':2}])
        data=ga4_rows(http,'123','thecrunchera.com','a','b',True,cap=5,batch=1)
        self.assertEqual(len(data['rows']),2)
        self.assertEqual(data['rows'][0]['purchases'],2)
        self.assertEqual(data['rows'][0]['key_events'],5)
        self.assertEqual(data['rows'][0]['revenue_per_session_inr'],22.5)
        expressions=http.calls[0][3]['dimensionFilter']['andGroup']['expressions']
        self.assertEqual({e['filter']['fieldName'] for e in expressions},{'hostName','sessionSource','sessionMedium'})
        self.assertFalse(data['limit_reached'])

    def test_missing_credentials_produces_gap_without_network(self):
        with tempfile.TemporaryDirectory() as root, patch.dict(os.environ,{},clear=True):
            result=pull(CONFIG,FakeHttp([]),Runtime(root),'a','b')
            self.assertEqual(result['status'],'not_measured')
            self.assertNotIn('clicks',result)

    def test_speed_missing_key_is_unmeasured(self):
        self.assertEqual(pagespeed(CONFIG,None,None,None)['status'],'not_measured')

    def test_fixture_report_cannot_look_live(self):
        data={**sample(CONFIG),'mode':'fixture','range':{'start':'2026-01-01','end':'2026-03-31'}}
        report=render(data)
        self.assertIn('SYNTHETIC OFFLINE FIXTURE',report)
        self.assertIn('not measured',report)
        self.assertNotIn('| 0 | 0 |',report)

    def test_cli_dry_run_writes_separate_report_without_network(self):
        with tempfile.TemporaryDirectory() as root:
            Path(root,'config').mkdir(); Path(root,'config/growth.json').write_text(json.dumps(CONFIG))
            with patch.object(audit,'ROOT',Path(root)), patch.object(audit,'Runtime',lambda dry_run: Runtime(root,dry_run)), patch.object(audit,'Http',side_effect=AssertionError('network object created')):
                self.assertEqual(audit.main(['--dry-run']),0)
            self.assertTrue(Path(root,'reports/dry-run/audit.md').exists())
            self.assertFalse(Path(root,'reports/audit.md').exists())
            self.assertIn('fixture',Path(root,'reports/run-log.md').read_text())

    def test_cli_pause_has_no_outputs_or_network(self):
        with tempfile.TemporaryDirectory() as root:
            Path(root,'PAUSE').touch()
            with patch.object(audit,'ROOT',Path(root)), patch.object(audit,'Runtime',lambda dry_run: Runtime(root,dry_run)), patch.object(audit,'Http',side_effect=AssertionError('network')):
                self.assertEqual(audit.main([]),0)
            self.assertFalse(Path(root,'reports').exists())

    def test_require_complete_fails_after_writing_gap_report(self):
        with tempfile.TemporaryDirectory() as root:
            Path(root,'config').mkdir(); Path(root,'config/growth.json').write_text(json.dumps(CONFIG))
            missing={'status':'not_measured','reason':'no credentials','gsc':{},'ga4':{}}
            with patch.object(audit,'ROOT',Path(root)), patch.object(audit,'Runtime',lambda dry_run: Runtime(root,dry_run)), patch.object(audit,'Http'), patch.object(audit,'crawl',return_value={'status':'partial','pages':[],'gaps':['blocked']}), patch.object(audit,'pull',return_value=missing), patch.object(audit,'pagespeed',return_value={'status':'not_measured','rows':[]}):
                self.assertEqual(audit.main(['--require-complete']),1)
            self.assertTrue(Path(root,'reports/audit.md').exists())
            self.assertIn('incomplete',Path(root,'reports/audit.md').read_text())

    def test_service_account_configuration_errors_are_redacted(self):
        with tempfile.TemporaryDirectory() as root, patch.dict(os.environ,{'GOOGLE_SERVICE_ACCOUNT_JSON':'secret-invalid-json'},clear=True):
            rt=Runtime(root)
            with self.assertRaises(RequestFailed) as error: Http(rt,0).authenticate()
            self.assertNotIn('secret-invalid-json',str(error.exception))
            self.assertNotIn('secret-invalid-json',Path(root,'reports/run-log.md').read_text())

if __name__=='__main__': unittest.main()
