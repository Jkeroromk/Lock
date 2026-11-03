"""Download recent TestFlight crash submissions (with their crash logs) from App Store Connect."""
import base64, os, time, pathlib, json
import jwt, requests

BUNDLE = 'com.jkeroro.lockin'
OUT = pathlib.Path('.github/crash-logs')
OUT.mkdir(parents=True, exist_ok=True)

key = os.environ['ASC_PRIVATE_KEY']
if 'BEGIN PRIVATE KEY' not in key:
    key = base64.b64decode(key).decode()
token = jwt.encode(
    {'iss': os.environ['ASC_ISSUER_ID'], 'iat': int(time.time()), 'exp': int(time.time()) + 1100, 'aud': 'appstoreconnect-v1'},
    key, algorithm='ES256', headers={'kid': os.environ['ASC_KEY_ID'], 'typ': 'JWT'},
)
H = {'Authorization': f'Bearer {token}'}
API = 'https://api.appstoreconnect.apple.com'

def get(path, **params):
    r = requests.get(API + path, headers=H, params=params, timeout=60)
    if r.status_code >= 400:
        print(path, r.status_code, r.text[:500])
        r.raise_for_status()
    return r.json()

app = get('/v1/apps', **{'filter[bundleId]': BUNDLE})['data'][0]['id']
subs = get(f'/v1/apps/{app}/betaFeedbackCrashSubmissions', sort='-createdDate', limit=5)['data']
index = []
for s in subs:
    a = s['attributes']
    index.append({'id': s['id'], **{k: a.get(k) for k in ('createdDate', 'comment', 'deviceModel', 'osVersion', 'appPlatform', 'buildBundleId')}})
    try:
        log = get(f"/v1/betaFeedbackCrashSubmissions/{s['id']}/crashLog")['data']['attributes'].get('logText') or ''
    except Exception as e:  # keep going; the index still helps
        log = f'(no crash log: {e})'
    (OUT / f"{a.get('createdDate', s['id']).replace(':', '-')}.txt").write_text(json.dumps(index[-1], indent=2) + '\n\n' + log)
(OUT / 'index.json').write_text(json.dumps(index, indent=2))
print(json.dumps(index, indent=2))
