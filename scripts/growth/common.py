"""Shared read-only transport, PAUSE, safe logs and service-account auth."""
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly", "https://www.googleapis.com/auth/analytics.readonly"]

class Paused(RuntimeError):
    pass

class RequestFailed(RuntimeError):
    pass

class Runtime:
    def __init__(self, root=ROOT, dry_run=False):
        self.root = Path(root)
        self.dry_run = dry_run
        self.run_id = datetime.now(ZoneInfo("UTC")).strftime("%Y%m%dT%H%M%S%fZ")
        self.check()

    def check(self):
        if (self.root / "PAUSE").exists():
            raise Paused("PAUSE is present; no action taken")

    def log(self, action, status):
        self.check()
        path = self.root / "reports/run-log.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            path.write_text("# Growth run log\n\n| UTC time | Run | Mode | Action | Status |\n|---|---|---|---|---|\n")
        # All action/status labels are controlled strings, not server messages.
        clean = lambda s: str(s).replace("|", "/").replace("\n", " ")[:180]
        with path.open("a") as handle:
            handle.write(f"| {datetime.now(ZoneInfo('UTC')).isoformat()} | {self.run_id} | {'fixture' if self.dry_run else 'live'} | {clean(action)} | {clean(status)} |\n")

    def write_json(self, path, data):
        self.check()
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(data, indent=2) + "\n")
        self.log("write " + str(path), "ok")


def date_window(today=None):
    # Search Console reporting dates are Pacific, regardless of founder location.
    today = today or datetime.now(ZoneInfo("America/Los_Angeles")).date()
    end = today - timedelta(days=3)
    return (end - timedelta(days=89)).isoformat(), end.isoformat()


class SameOriginRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        from urllib.parse import urlsplit
        old, new = urlsplit(req.full_url), urlsplit(newurl)
        if (new.scheme, new.netloc) != (old.scheme, old.netloc):
            raise RequestFailed("Off-origin redirect blocked; review manually")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class Http:
    def __init__(self, runtime, delay=0.25, timeout=30):
        self.rt, self.delay, self.timeout = runtime, delay, timeout
        self.session = None

    def authenticate(self):
        self.rt.check()
        if self.rt.dry_run:
            raise RequestFailed("Network disabled in fixture mode")
        raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
        path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if bool(raw) == bool(path):
            raise RequestFailed("Set exactly one service-account credential environment variable")
        self.rt.log("google service-account authentication", "starting")
        try:
            from google.oauth2 import service_account
            from google.auth.transport.requests import AuthorizedSession
            info = json.loads(raw) if raw else json.loads(Path(path).read_text())
            # Never send a private key to an endpoint supplied by an untrusted key file.
            if info.get("type") != "service_account" or info.get("token_uri") != "https://oauth2.googleapis.com/token":
                raise ValueError("Invalid service account")
            creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
            self.session = AuthorizedSession(creds)
            self.rt.log("google service-account authentication", "configured; token refresh occurs during API request")
        except Exception:
            self.rt.log("google service-account authentication", "failed; details redacted")
            raise RequestFailed("Service-account configuration invalid or Python dependencies missing") from None

    def request(self, method, url, label, body=None, authenticated=False):
        self.rt.check()
        if self.rt.dry_run:
            raise RequestFailed("Network disabled in fixture mode")
        self.rt.log(label, "request " + method)
        time.sleep(self.delay)
        self.rt.check()
        try:
            if authenticated:
                if self.session is None:
                    self.authenticate()
                # AuthorizedSession handles token refresh; never log tokens or payloads.
                self.rt.log("google auth refresh if needed", "delegated to google-auth")
                response = self.session.request(method, url, json=body, timeout=self.timeout)
                status, final, text = response.status_code, response.url, response.text
                content_type = response.headers.get("Content-Type", "")
            else:
                req = urllib.request.Request(url, method=method, headers={"User-Agent":"CrunchEraReadOnlyAudit/1.0"})
                with urllib.request.build_opener(SameOriginRedirect()).open(req, timeout=self.timeout) as response:
                    status, final = response.status, response.url
                    content_type = response.headers.get("Content-Type", "")
                    text = response.read(5_000_001).decode("utf-8", errors="replace")
                    if len(text) > 5_000_000:
                        raise RequestFailed("Response exceeds audit size limit")
            self.rt.log(label, "HTTP " + str(status))
            if status >= 400:
                raise RequestFailed("HTTP " + str(status))
            return {"status":status,"url":final,"body":text,"content_type":content_type}
        except urllib.error.HTTPError as error:
            self.rt.log(label, "HTTP " + str(error.code))
            raise RequestFailed("HTTP " + str(error.code)) from None
        except Paused:
            raise
        except RequestFailed:
            raise
        except Exception:
            self.rt.log(label, "failed; details redacted")
            raise RequestFailed("Network, quota or authentication failure; details redacted") from None

    def json(self, method, url, label, body=None, authenticated=False):
        response = self.request(method, url, label, body, authenticated)
        try:
            return json.loads(response["body"])
        except (ValueError, TypeError):
            raise RequestFailed("Invalid JSON response") from None
