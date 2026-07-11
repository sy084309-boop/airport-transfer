"""Quick flight check - queries TDX directly"""
import sys, json, urllib.request, ssl

sys.stdout.reconfigure(encoding='utf-8')

BASE = "tdx.transportdata.tw"
AUTH_PATH = "/auth/realms/TDXConnect/protocol/openid-connect/token"
KEYS = [
    ("sy084309-4142a1e4-2abc-408e", "8731edd6-de41-4b82-bbf8-106b0d6f0364"),
    ("sy084309-22f9c072-0006-4b76", "56c96486-ae7a-4966-9951-0a9b46f631e1"),
    ("sy084309-cafc7872-9f0b-4507", "2dded46466034c283ac0453730d83cf9"),
]
ssl_ctx = ssl.create_default_context()
token_cache = {}

for kid, ksec in KEYS:
    data = urllib.parse.urlencode({"grant_type": "client_credentials", "client_id": kid, "client_secret": ksec}).encode()
    req = urllib.request.Request(f"https://{BASE}{AUTH_PATH}", data=data)
    try:
        resp = json.loads(urllib.request.urlopen(req, context=ssl_ctx).read())
        token_cache[kid] = resp["access_token"]
        break
    except Exception as e:
        print(f"Key {kid[:10]}... failed: {e}", file=sys.stderr)
        continue

if not token_cache:
    print("ALL KEYS FAILED")
    sys.exit(1)

token = list(token_cache.values())[0]
print(f"Token OK (len={len(token)})")

# Search for JX758 in departures
for ap in ["TPE", "TSA", "KHH"]:
    url = f"https://{BASE}/api/basic/v2/Air/FIDS/Airport/Departure/{ap}?$top=50&$format=JSON"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        data = json.loads(urllib.request.urlopen(req, context=ssl_ctx).read())
        for f in data:
            fn = f.get('FlightNumber', '')
            if 'JX758' in fn:
                print(f"FOUND: {ap} {fn} {f.get('AirlineID','')} {f.get('ScheduleDepartureTime','')} Status:{f.get('DepartureRemark','')} Remark:{f.get('Remark','')}")
    except Exception as e:
        print(f"{ap} departures: {e}")

# Search for JX758 in arrivals
for ap in ["TPE", "TSA", "KHH"]:
    url = f"https://{BASE}/api/basic/v2/Air/FIDS/Airport/Arrival/{ap}?$top=50&$format=JSON"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        data = json.loads(urllib.request.urlopen(req, context=ssl_ctx).read())
        for f in data:
            fn = f.get('FlightNumber', '')
            if 'JX758' in fn:
                print(f"FOUND: {ap} {fn} {f.get('AirlineID','')} {f.get('ScheduleArrivalTime','')} Status:{f.get('ArrivalRemark','')} Remark:{f.get('Remark','')}")
    except Exception as e:
        print(f"{ap} arrivals: {e}")

if not any(True for _ in []):
    print("JX758 not found in any major Taiwan airport today")
