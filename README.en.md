[한국어](README.md) | **English**

# Ask a Local · Seoul

A map of tips from people who actually live here, for visitors to Seoul.

Pick a neighborhood and see nearby restaurants, cafes, convenience stores, banks/ATMs and pharmacies, each with a one-line tip on what you should know before you go.

> ⚠️ The `[Sample]` places in `data.js` are **samples** for checking the layout. They are not real businesses and the coordinates are arbitrary. Only the 100-Year Shops are real data.

## Run

It is a static page with no build step. Start a server in the folder and open it in a browser.

```bash
python3 -m http.server 5178
```

Open `http://localhost:5178`. The map (Leaflet, OpenStreetMap) loads from the internet, so you need to be online.

## Features

- **Neighborhood search**: works in English or Korean (`Yeoksam`, `역삼동`). "Near me" uses your current location.
- **Filters**: category, radius (500 m / 1 km / 2 km), and whether Apple Pay is accepted.
- **Place cards**: English name, Korean name (to show a taxi driver or staff), tip, tags, distance and walking time, and a KakaoMap directions link.
- **Add a tip**: "Add a tip" → tap the location on the map → fill in the form. Tips are saved in that browser only; "Export my tips" downloads them as JSON.

## Adding places

The data everyone sees lives in one file, [`data.js`](data.js).

1. Add the place in the app with "Add a tip" (the coordinates are captured for you).
2. Download `my-tips.json` with "Export my tips".
3. Paste its entries into `SEED_PLACES` in `data.js` and commit.

Entry format:

```js
{ id: "s1", name: "Pork soup & rice", ko: "돼지국밥집", cat: "food",
  lat: 37.5012, lng: 127.0351,
  tip: "Order at the kiosk by the door — it has an English button.",
  tags: ["English kiosk", "Apple Pay OK"], by: "Chulhee" }
```

- `cat`: one of `food`, `cafe`, `store`, `bank`, `pharmacy`, `heritage`. Add a line to `CATEGORIES` to create a new one.
- `tags`: conditions that matter to visitors. A tag containing `Apple Pay` is picked up by the Apple Pay filter.
- Searchable neighborhoods are in `AREAS`: currently five in Gangnam, plus Hongdae, Itaewon, Myeong-dong and Seongsu.

## 100-Year Shop data

98 of Seoul's 100-Year Shops (백년가게: government-designated businesses that have run for 30+ years) are included under the "100-Year Shop" category.

- Source: Korea's public data portal, [nationwide list of designated 100-Year Shops](https://www.data.go.kr/data/15132695/fileData.do) (as of 2026-08-20, no usage restrictions).
- The source has only names and addresses, so addresses were geocoded with OpenStreetMap. Of 181 shops in Seoul, only the 98 that matched at building level are included; the other 83 are listed in [`tools/baeknyeon-unmatched.csv`](tools/baeknyeon-unmatched.csv).
- English names are a mechanical romanization of the Korean name and may differ from a shop's official English name.
- To refresh: download a new CSV from the portal and run `python3 tools/import_baeknyeon.py <file.csv>` to regenerate `baeknyeon.js`.

## Files

| File | Contents |
| --- | --- |
| `index.html` | Page structure |
| `app.js` | Map, search, filters |
| `add.js` | Add-a-tip popup (add, edit, delete, export) |
| `data.js` | Neighborhoods, categories, places |
| `baeknyeon.js` | 100-Year Shop data (generated) |
| `tools/` | 100-Year Shop import script and geocode cache |
| `style.css` | Styles (on phones: map on top, list below) |

## Not there yet

- There is no server, so tips added in the app are not visible to anyone else. To share one, put it in `data.js`.
- Map labels are shown in Korean.
