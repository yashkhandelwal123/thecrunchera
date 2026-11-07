"""Run: python -m scripts.growth.audit [--dry-run] [--require-complete]."""
import argparse
import json
import os
import sys
from .common import ROOT, Runtime, Http, Paused, date_window
from .crawl import crawl, pagespeed
from .analytics import pull
from .fixtures import sample
from .report import render


def main(argv=None):
    parser = argparse.ArgumentParser(description='Phase 1 read-only growth audit; never publishes')
    parser.add_argument('--dry-run',action='store_true',help='Offline synthetic fixtures; zero network or credentials required')
    parser.add_argument('--require-complete',action='store_true',help='Exit 1 for incomplete live data (still writes an honest report)')
    args = parser.parse_args(argv)
    try:
        rt = Runtime(dry_run=args.dry_run)
        rt.log('phase 1 audit','starting')
        config = json.loads((ROOT/'config/growth.json').read_text())
        start, end = date_window()
        if args.dry_run:
            data = sample(config)
        else:
            http = Http(rt,config['request_delay_seconds'],config['timeout_seconds'])
            data = {'crawl':crawl(config,http,rt),'analytics':pull(config,http,rt,start,end),
                    'speed':pagespeed(config,http,rt,os.environ.get('PAGESPEED_API_KEY'))}
        observations = ROOT/'data/generated/bootstrap-observations.json'
        if not args.dry_run and observations.exists():
            rt.check()
            data['supplemental'] = json.loads(observations.read_text())
            rt.log('read dated GSC Wizard observations','supplement only; not refreshed by runner')
        data.update({'mode':'fixture' if args.dry_run else 'live','range':{'start':start,'end':end},'run_id':rt.run_id})
        folder = 'data/generated/dry-run' if args.dry_run else 'data/generated/live'
        for name in ('crawl','analytics','speed'):
            rt.write_json(f'{folder}/{name}.json',{'mode':data['mode'],'range':data['range'],'result':data[name]})
        rt.write_json(f'{folder}/audit.json',data)
        report_path = 'reports/dry-run/audit.md' if args.dry_run else 'reports/audit.md'
        rt.check(); (ROOT/report_path).parent.mkdir(parents=True,exist_ok=True)
        (ROOT/report_path).write_text(render(data)); rt.log('write '+report_path,'ok')
        complete = all(data[k]['status']=='ok' for k in ('crawl','analytics','speed'))
        rt.log('phase 1 audit','complete' if complete else 'finished with explicit coverage gaps')
        print(report_path + (' (SYNTHETIC FIXTURE)' if args.dry_run else ''))
        return 1 if args.require_complete and not args.dry_run and not complete else 0
    except Paused:
        print('PAUSE is present; stopped without further actions')
        return 0
    except Exception:
        # Avoid echoing secret-bearing third-party exception messages.
        try: rt.log('phase 1 audit','failed; details redacted')
        except (UnboundLocalError, Paused): pass
        print('Audit failed. Check configuration and safe run log; exception details redacted.',file=sys.stderr)
        return 1

if __name__=='__main__':
    sys.exit(main())
