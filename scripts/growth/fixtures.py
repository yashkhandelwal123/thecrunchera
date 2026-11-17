"""Synthetic, offline fixtures. Never present these as store measurements."""
from .crawl import inspect_html

def sample(config):
    body = '''<html><head><title>Fixture edamame page</title><meta name="description" content="Synthetic test page"><link rel="canonical" href="https://thecrunchera.com/edamame-beans"><script type="application/ld+json">{"@type":"Product","name":"Fixture beans","image":"https://thecrunchera.com/fixture.jpg","offers":{"@type":"Offer","price":"225","priceCurrency":"INR","url":"https://thecrunchera.com/edamame-beans"}}</script></head><body><h1>Fixture beans</h1><a href="/blog">Guides</a></body></html>'''
    return {'crawl':{'status':'ok','pages':[{'status':200,**inspect_html(config['site_url']+'edamame-beans',body,config)}],
                     'broken_links':[],'gaps':[],'robots':{'status':'ok'},'sitemaps':[{'status':'ok','url':config['site_url']+'sitemap.xml'}]},
            'analytics':{'status':'fixture','gsc':{},'ga4':{},'reason':'Synthetic fixture: no analytics requested'},
            'speed':{'status':'fixture','rows':[],'reason':'No speed measured in offline mode'}}
