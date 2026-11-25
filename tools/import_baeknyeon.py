#!/usr/bin/env python3
"""백년가게 공공데이터 CSV -> baeknyeon.js

원본: 공공데이터포털 "소상공인시장진흥공단_전국 백년가게 지정리스트 현황 정보"
      https://www.data.go.kr/data/15132695/fileData.do  (이용허락범위 제한 없음)

사용법:  python3 tools/import_baeknyeon.py <내려받은.csv>

CSV에는 상호와 주소만 있어서 주소를 OpenStreetMap(Nominatim)으로 좌표 변환한다.
건물 단위로 정확히 잡힌 곳만 baeknyeon.js에 넣고, 나머지는
tools/baeknyeon-unmatched.csv에 남긴다. 변환 결과는 tools/baeknyeon-geocache.json에
캐시되므로 다시 돌려도 새 항목만 조회한다 (Nominatim 정책: 초당 1건 이하).
"""
import csv, json, os, re, sys, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "baeknyeon-geocache.json")
UNMATCHED = os.path.join(HERE, "baeknyeon-unmatched.csv")
OUT = os.path.join(HERE, "..", "baeknyeon.js")
GU_FIX = {"충구": "중구", "동대무": "동대문구"}  # 원본 오타
TIP = "Government-designated \"100-Year Shop\" (백년가게): a small local business that has been running for 30+ years."


def parse(addr):
    """'서울 은평구 대서문길 43-10 2층' -> ('은평구', '대서문길', '43-10')"""
    parts = addr.split()
    gu = GU_FIX.get(parts[1], parts[1])
    t = " ".join(parts[2:])
    m = re.search(r"([가-힣0-9]+?)\s*(\d+[가-힣]?길)\s*(\d+(?:-\d+)?)", t)
    if m:
        return gu, m.group(1) + m.group(2), m.group(3)
    m = re.search(r"([가-힣0-9]+(?:로|길))\s*(\d+(?:-\d+)?)", t)
    if m:
        return gu, m.group(1), m.group(2)
    return gu, None, None


def geocode(gu, road, num):
    q = urllib.parse.urlencode({"q": f"서울 {gu} {road} {num}", "format": "jsonv2", "limit": 1,
                                "countrycodes": "kr", "accept-language": "ko"})
    req = urllib.request.Request("https://nominatim.openstreetmap.org/search?" + q,
                                 headers={"User-Agent": "ask-a-local-geocoder/0.1"})
    d = json.load(urllib.request.urlopen(req, timeout=20))
    time.sleep(1.1)
    if not d:
        return None
    x = d[0]
    return {"lat": float(x["lat"]), "lng": float(x["lon"]), "category": x["category"],
            "type": x["type"], "rank": x.get("place_rank"), "display": x["display_name"]}


def exact(rec):
    """도로명·건물번호·구가 모두 일치하는 건물 단위 결과만 인정한다."""
    h = rec.get("hit")
    if not h or h["category"] == "highway":
        return False
    parts = [p.strip() for p in h["display"].split(",")]
    return (rec["gu"] in parts and rec["road"] in parts and rec["num"] in parts
            and 37.41 < h["lat"] < 37.72 and 126.75 < h["lng"] < 127.2)


# ---- 한글 -> 로마자 (국어의 로마자 표기법, 연음만 처리한 간이판) ----
CHO = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"]
JUNG = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"]
JONG = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"]
# 받침이 다음 음절 초성 ㅇ으로 넘어갈 때의 소리 (홑받침만)
LINK = {1: "g", 4: "n", 7: "d", 8: "r", 16: "m", 17: "b", 19: "s", 20: "ss", 22: "j", 23: "ch", 24: "k", 25: "t", 26: "p"}


def romanize(s):
    out, chars = [], list(s)
    for i, ch in enumerate(chars):
        code = ord(ch) - 0xAC00
        if not 0 <= code < 11172:
            out.append(ch)
            continue
        cho, jung, jong = code // 588, (code % 588) // 28, code % 28
        nxt = ord(chars[i + 1]) - 0xAC00 if i + 1 < len(chars) else -1
        nxt_cho = nxt // 588 if 0 <= nxt < 11172 else None
        ini = CHO[cho]
        if cho == 5 and out and out[-1].endswith("l"):
            ini = "l"  # ㄹㄹ -> ll
        if nxt_cho == 11 and jong in LINK:  # 연음: 받침을 다음 음절로
            fin, carry = "", LINK[jong]
        else:
            fin, carry = JONG[jong], ""
        out.append(ini + JUNG[jung] + fin + carry)
    return "".join(out)


def english_name(name):
    n = re.sub(r"주식회사|㈜|\(주\)", " ", name)
    n = re.sub(r"\s+", " ", romanize(n)).strip(" .")
    return " ".join(w[:1].upper() + w[1:] for w in n.split(" "))


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    rows = list(csv.reader(open(sys.argv[1], encoding="cp949")))[1:]
    seoul = [r for r in rows if r[2].strip().startswith("서울")]
    cache = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}

    for no, name, addr, *_ in seoul:
        if no in cache:
            continue
        gu, road, num = parse(addr.strip())
        rec = {"name": name.strip(), "addr": addr.strip(), "gu": gu, "road": road, "num": num, "hit": None}
        if road:
            try:
                rec["hit"] = geocode(gu, road, num)
            except Exception as e:  # 네트워크 오류는 캐시하지 않고 다음 실행에서 재시도
                print("retry later:", name, e, file=sys.stderr)
                continue
        cache[no] = rec
        json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    places, missed = [], []
    for no, name, addr, *_ in seoul:
        rec = cache.get(no)
        if rec and exact(rec):
            places.append({"id": "b" + no, "name": english_name(rec["name"]), "ko": rec["name"],
                           "cat": "heritage", "lat": round(rec["hit"]["lat"], 6), "lng": round(rec["hit"]["lng"], 6),
                           "addr": rec["addr"], "tip": TIP, "tags": ["100-Year Shop"], "by": "public data (SEMAS)"})
        else:
            missed.append([no, name.strip(), addr.strip()])

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("// 자동 생성 파일: tools/import_baeknyeon.py 로 만든다. 직접 고치지 말 것.\n")
        f.write("// 출처: 공공데이터포털 소상공인시장진흥공단 전국 백년가게 지정리스트 (서울, 좌표 확인된 곳만)\n")
        f.write("// 좌표: © OpenStreetMap contributors (Nominatim)\n")
        f.write("window.BAEKNYEON_PLACES = [\n")
        f.write(",\n".join("  " + json.dumps(p, ensure_ascii=False) for p in places))
        f.write("\n];\n")
    with open(UNMATCHED, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["연번", "업체명", "업체주소"])
        w.writerows(missed)
    print(f"서울 {len(seoul)}곳 중 {len(places)}곳 -> baeknyeon.js, {len(missed)}곳 -> tools/baeknyeon-unmatched.csv")


if __name__ == "__main__":
    main()
