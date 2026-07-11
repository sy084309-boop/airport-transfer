#!/usr/bin/env python3
"""
機場快綫 航班資料 CLI 工具
用法:
  python flight_data.py arrivals TPE        # 入境航班
  python flight_data.py departures TPE      # 出境航班
  python flight_data.py all TPE             # 全部航班
  python flight_data.py search CI102        # 搜尋航班
  python flight_data.py validate BR178      # 驗證航班

支援機場: TPE TSA KHH RMQ KNH MZG TNN HUN
"""
import sys, json, urllib.request, urllib.parse, ssl, time, os

BASE = "tdx.transportdata.tw"
AUTH_PATH = "/auth/realms/TDXConnect/protocol/openid-connect/token"

KEYS = [
    ("sy084309-4142a1e4-2abc-408e", "8731edd6-de41-4b82-bbf8-106b0d6f0364"),
    ("sy084309-22f9c072-0006-4b76", "56c96486-ae7a-4966-9951-0a9b46f631e1"),
    ("sy084309-cafc7872-9f0b-4507", "2dded46466034c283ac0453730d83cf9"),
]

AIRPORTS = {
    "TPE": "臺灣桃園國際機場", "TSA": "臺北松山機場", "KHH": "高雄小港機場",
    "RMQ": "臺中國際機場", "KNH": "金門航空站", "MZG": "澎湖航空站",
    "TNN": "臺南航空站", "HUN": "花蓮航空站",
}

AIRLINES = {
    "BR": "長榮航空", "CI": "中華航空", "JX": "星宇航空",
    "IT": "台灣虎航", "AE": "華信航空", "B7": "立榮航空",
    "CX": "國泰航空", "KE": "大韓航空", "JL": "日本航空",
    "NH": "全日空", "SQ": "新加坡航空", "TG": "泰國航空",
}

TOKEN_CACHE = {}
ssl_ctx = ssl.create_default_context()

def get_token(client_id, client_secret):
    if client_id in TOKEN_CACHE and TOKEN_CACHE[client_id][1] > time.time():
        return TOKEN_CACHE[client_id][0]
    data = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": client_id, "client_secret": client_secret
    }).encode()
    req = urllib.request.Request(f"https://{BASE}{AUTH_PATH}", data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    resp = json.loads(urllib.request.urlopen(req, context=ssl_ctx).read())
    TOKEN_CACHE[client_id] = (resp["access_token"], time.time() + resp["expires_in"] - 300)
    return TOKEN_CACHE[client_id][0]

def tdx_get(path, key_index=0):
    for i in range(len(KEYS)):
        kid, ksecret = KEYS[(key_index + i) % len(KEYS)]
        token = get_token(kid, ksecret)
        req = urllib.request.Request(f"https://{BASE}{path}",
            headers={"Authorization": f"Bearer {token}"})
        try:
            data = json.loads(urllib.request.urlopen(req, context=ssl_ctx).read())
            if isinstance(data, list): return data
            if data.get("message", "").find("rate limit") >= 0: continue
        except: continue
    return None

def normalize(flight, direction="departure"):
    remark = flight.get("DepartureRemark") or flight.get("ArrivalRemark") or ""
    status = "unknown"
    if "取消" in remark or "cancel" in remark.lower(): status = "cancelled"
    elif "延遲" in remark or "delay" in remark.lower(): status = "delayed"
    elif "已到" in remark or "arrived" in remark.lower(): status = "landed"
    elif "出發" in remark or "departed" in remark.lower(): status = "departed"
    elif "準時" in remark: status = "on-time"

    aid = flight.get("AirlineID", "")
    return {
        "flightNo": f"{aid}{flight.get('FlightNumber','')}",
        "airline": AIRLINES.get(aid, aid),
        "route": f"{flight.get('DepartureAirportID','')}->{flight.get('ArrivalAirportID','')}",
        "schedule": flight.get("ScheduleDepartureTime") or flight.get("ScheduleArrivalTime") or "",
        "actual": flight.get("ActualDepartureTime") or flight.get("ActualArrivalTime") or "",
        "terminal": flight.get("Terminal") or "",
        "gate": flight.get("Gate") or "",
        "status": status, "remark": remark,
    }

STATUS_ICON = {"on-time":"🟢","landed":"🟢","departed":"🟢","delayed":"🔴","cancelled":"⛔","unknown":"⚪"}
STATUS_TEXT = {"on-time":"準時","landed":"已抵達","departed":"已出發","delayed":"延遲","cancelled":"取消","unknown":"未知"}

def show(flights, max_rows=50):
    print(f"\n{'航班':8s} {'航空公司':8s} {'路線':12s} {'表定時間':17s} {'狀態':6s} {'航廈':4s} 登機門")
    print("-" * 85)
    for f in flights[:max_rows]:
        icon = STATUS_ICON.get(f["status"], "⚪")
        print(f"{icon} {f['flightNo']:6s} {f['airline']:6s} {f['route']:10s} {f['schedule']:17s} {STATUS_TEXT.get(f['status'],f['status']):4s} {f['terminal']:3s}  {f['gate']}")
    print(f"\n顯示 {min(len(flights), max_rows)} / 共 {len(flights)} 筆\n")

def show_detail(flight):
    print(f"\n✈️  {flight['flightNo']} {flight['airline']}")
    print("-" * 40)
    for k, v in flight.items():
        if k != "flightNo": print(f"  {k}: {v}")
    print()

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return

    cmd = sys.argv[1].lower()
    airport = sys.argv[2].upper() if len(sys.argv) > 2 else "TPE"

    if cmd == "arrivals":
        data = tdx_get(f"/api/basic/v2/Air/FIDS/Airport/Arrival/{airport}?$top=50&$format=JSON")
        flights = [normalize(f, "arrival") for f in data] if data else []
        print(f"\n🛬 {AIRPORTS.get(airport, airport)} 入境航班")
        show(flights)

    elif cmd == "departures":
        data = tdx_get(f"/api/basic/v2/Air/FIDS/Airport/Departure/{airport}?$top=50&$format=JSON")
        flights = [normalize(f, "departure") for f in data] if data else []
        print(f"\n🛫 {AIRPORTS.get(airport, airport)} 出境航班")
        show(flights)

    elif cmd == "all":
        arr = tdx_get(f"/api/basic/v2/Air/FIDS/Airport/Arrival/{airport}?$top=30&$format=JSON") or []
        dep = tdx_get(f"/api/basic/v2/Air/FIDS/Airport/Departure/{airport}?$top=30&$format=JSON") or []
        a_flights = [normalize(f, "arrival") for f in arr]
        d_flights = [normalize(f, "departure") for f in dep]
        print(f"\n{AIRPORTS.get(airport, airport)} 航班總覽")
        print(f"\n🛬 入境 ({len(a_flights)} 筆)")
        show(a_flights, 25)
        print(f"\n🛫 出境 ({len(d_flights)} 筆)")
        show(d_flights, 25)

    elif cmd in ("search", "validate"):
        query = sys.argv[2] if len(sys.argv) > 2 else ""
        import re
        m = re.match(r"^([A-Z]{2})\s*(\d{1,4})$", query.upper())
        if not m:
            print("❌ 格式錯誤，請用如 CI102 或 BR178")
            return
        airline, flight_num = m.groups()
        # Search all airports
        for ap in ["TPE", "TSA", "KHH"]:
            for direction in ["Arrival", "Departure"]:
                data = tdx_get(f"/api/basic/v2/Air/FIDS/Airport/{direction}/{ap}?$top=30&$format=JSON") or []
                for f in data:
                    if f.get("AirlineID") == airline and f.get("FlightNumber") == flight_num:
                        flight = normalize(f, direction.lower())
                        show_detail(flight)
                        if cmd == "validate":
                            print(f"✅ 航班有效: {flight['flightNo']} {flight['airline']} {flight['route']}")
                            print(f"   時間: {flight['schedule']} 航廈: {flight['terminal']} 登機門: {flight['gate']}")
                            print(f"   狀態: {STATUS_ICON.get(flight['status'])} {STATUS_TEXT.get(flight['status'])}")
                        return
        print(f"⚠️  找不到航班 {query}")

    else:
        print(f"未知指令: {cmd}\n{__doc__}")

if __name__ == "__main__":
    main()
