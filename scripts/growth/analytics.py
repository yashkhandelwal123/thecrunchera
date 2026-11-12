"""Official Search Console v3 and GA4 Data API v1beta; reporting POSTs only."""
import os
from urllib.parse import quote
from .common import RequestFailed

GSC = 'https://www.googleapis.com/webmasters/v3/sites/'
GA4 = 'https://analyticsdata.googleapis.com/v1beta/properties/'


def gsc_rows(http, prop, start, end, dimensions, cap=50000, batch=25000):
    rows = []
    while len(rows) < cap:
        body = {'startDate':start,'endDate':end,'dimensions':dimensions,'type':'web','dataState':'final',
                'rowLimit':min(batch,cap-len(rows)),'startRow':len(rows)}
        data = http.json('POST',GSC+quote(prop,safe='')+'/searchAnalytics/query',
                         'gsc searchAnalytics.query ' + (','.join(dimensions) or 'property total'),body,True)
        page = data.get('rows',[])
        rows.extend(page)
        if len(page) < body['rowLimit']: break
    return {'dimensions':dimensions,'rows':rows,'limit_reached':len(rows)>=cap,
            'note':'GSC returns top rows under internal limits, not all queries. Anonymised queries omitted. CTR is a 0–1 fraction in these raw official API exports.'}


def ga4_rows(http, property_id, hostname, start, end, organic=False, cap=50000, batch=10000):
    rows, metadata, total, totals = [], {}, None, []
    filters = [{'filter':{'fieldName':'hostName','stringFilter':{'matchType':'EXACT','value':hostname}}}]
    if organic:
        filters.extend([{'filter':{'fieldName':'sessionSource','stringFilter':{'matchType':'EXACT','value':'google'}}},
                        {'filter':{'fieldName':'sessionMedium','stringFilter':{'matchType':'EXACT','value':'organic'}}}])
    body = {'dateRanges':[{'startDate':start,'endDate':end}],
            'dimensions':[{'name':'landingPagePlusQueryString'}],
            'metrics':[{'name':n} for n in ('sessions','keyEvents','ecommercePurchases','purchaseRevenue')],
            'dimensionFilter':{'andGroup':{'expressions':filters}},
            'currencyCode':'INR','orderBys':[{'metric':{'metricName':'sessions'},'desc':True}],
            'metricAggregations':['TOTAL']}
    while len(rows)<cap:
        body.update({'limit':min(batch,cap-len(rows)),'offset':len(rows)})
        data = http.json('POST',GA4+property_id+':runReport', 'ga4 runReport ' + ('google-organic' if organic else 'all-traffic'),body,True)
        page = data.get('rows',[])
        rows.extend(page); total = int(data.get('rowCount',len(rows))); metadata = data.get('metadata',metadata)
        totals = data.get('totals',totals)
        if not page or len(rows)>=total: break
    normalized = []
    for row in rows:
        values = [float(v['value']) for v in row['metricValues']]
        normalized.append({'landing_page':row['dimensionValues'][0]['value'],'sessions':values[0],
                           'key_events':values[1],'purchases':values[2],'purchase_revenue_inr':values[3],
                           'revenue_per_session_inr':values[3]/values[0] if values[0] else None})
    return {'rows':normalized,'row_count':total,'limit_reached':total is not None and len(rows)<total,
            'metadata':metadata,'totals':totals,'scope':'google / organic' if organic else 'all traffic',
            'currency':'INR','note':'Key events include the property’s configured events; they are not necessarily purchases. Landing paths retain query strings. Revenue is GA4 purchaseRevenue, not verified settlement revenue.'}


def pull(config, http, rt, start, end):
    result = {'range':{'start':start,'end':end,'days':90,'gsc_date_basis':'America/Los_Angeles',
                       'ga4_date_basis':'GA4 property timezone (see response metadata)'},'gsc':{},'ga4':{}}
    credentials = bool(os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON') or os.environ.get('GOOGLE_APPLICATION_CREDENTIALS'))
    if not credentials:
        rt.log('analytics collection','not measured: service-account credentials missing')
        result.update({'status':'not_measured','reason':'Service-account credentials missing'})
        return result
    for name, dimensions in [('totals',[]),('daily',['date']),('queries',['query']),('pages',['page'])]:
        try: result['gsc'][name] = {'status':'ok',**gsc_rows(http,config['gsc_property'],start,end,dimensions,config['max_api_rows'])}
        except RequestFailed as error: result['gsc'][name] = {'status':'not_measured','reason':str(error)}
    prop = os.environ.get('GA4_PROPERTY_ID','')
    if not prop.isdigit():
        result['ga4'] = {'status':'not_measured','reason':'GA4_PROPERTY_ID missing or not numeric'}
    else:
        for name, organic in [('all_traffic',False),('google_organic',True)]:
            try: result['ga4'][name] = {'status':'ok',**ga4_rows(http,prop,config['ga4_hostname'],start,end,organic,config['max_api_rows'])}
            except RequestFailed as error: result['ga4'][name] = {'status':'not_measured','reason':str(error)}
    gsc_ok = all(v.get('status')=='ok' and not v.get('limit_reached') for v in result['gsc'].values())
    ga4_ok = all(result['ga4'].get(k,{}).get('status')=='ok' and not result['ga4'][k].get('limit_reached') for k in ('all_traffic','google_organic'))
    result['status'] = 'ok' if gsc_ok and ga4_ok else 'partial'
    return result
