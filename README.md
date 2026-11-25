**한국어** | [English](README.en.md)

# Ask a Local · Seoul

A map of tips from people who actually live here, for visitors to Seoul.

로컬이 직접 알려주는 정보를 지도에 모아, 한국을 찾은 외국인에게 보여주는 앱입니다.
동네를 고르면 그 근처의 맛집, 카페, 편의점, 은행/ATM, 약국과 "가보면 알아야 할 것" 한 줄 팁이 나옵니다.

> ⚠️ 지금 들어있는 장소는 전부 화면 확인용 **샘플**입니다. 실제 가게가 아니고 좌표도 임의입니다.

## 실행

빌드 과정이 없는 정적 페이지입니다. 폴더에서 서버를 띄우고 브라우저로 엽니다.

```bash
python3 -m http.server 5178
```

`http://localhost:5178` 에서 확인합니다. 지도(Leaflet, OpenStreetMap)를 인터넷에서 불러오므로 온라인 상태여야 합니다.

## 기능

- **동네 검색**: 영문·한글 모두 가능 (`Yeoksam`, `역삼동`). "Near me"는 현재 위치 기준.
- **필터**: 카테고리, 반경(500 m / 1 km / 2 km), Apple Pay 가능 여부.
- **장소 카드**: 영문 이름, 한글 상호(택시 기사나 직원에게 보여주는 용도), 팁, 태그, 거리와 도보 시간, 카카오맵 길찾기 링크.
- **팁 추가**: "Add a tip" → 지도에서 위치 선택 → 입력. 그 브라우저에만 저장되며 "Export my tips"로 JSON을 내려받을 수 있습니다.

## 장소 추가하기

모두에게 보이는 데이터는 [`data.js`](data.js) 하나에 들어 있습니다.

1. 앱에서 "Add a tip"으로 장소를 추가합니다 (좌표가 자동으로 잡힙니다).
2. "Export my tips"로 `my-tips.json`을 내려받습니다.
3. 그 안의 항목을 `data.js`의 `SEED_PLACES`에 붙여넣고 커밋합니다.

항목 형식:

```js
{ id: "s1", name: "Pork soup & rice", ko: "돼지국밥집", cat: "food",
  lat: 37.5012, lng: 127.0351,
  tip: "Order at the kiosk by the door — it has an English button.",
  tags: ["English kiosk", "Apple Pay OK"], by: "Chulhee" }
```

- `cat`: `food`, `cafe`, `store`, `bank`, `pharmacy` 중 하나. 카테고리는 `CATEGORIES`에 한 줄 추가하면 늘어납니다.
- `tags`: 외국인에게 중요한 조건. 태그에 `Apple Pay`가 들어 있으면 Apple Pay 필터에 잡힙니다.
- 검색되는 동네는 `AREAS`에 있습니다. 현재 강남 5개 동과 홍대, 이태원, 명동, 성수.

## 파일

| 파일 | 내용 |
| --- | --- |
| `index.html` | 화면 구조 |
| `app.js` | 지도, 검색, 필터, 팁 추가 |
| `data.js` | 동네, 카테고리, 장소 데이터 |
| `style.css` | 스타일 (폰에서는 지도 위, 목록 아래) |

## 아직 없는 것

- 서버가 없어서 앱에서 추가한 팁은 다른 사람에게 보이지 않습니다. 공유하려면 `data.js`에 넣어야 합니다.
- 지도 라벨이 한글로 표시됩니다.
