// 동네 목록: 검색창에서 고를 수 있는 지역. center는 대략적인 동 중심 좌표.
window.AREAS = [
  { id: "yeoksam", name: "Yeoksam-dong", ko: "역삼동", district: "Gangnam-gu", lat: 37.5006, lng: 127.0364 },
  { id: "nonhyeon", name: "Nonhyeon-dong", ko: "논현동", district: "Gangnam-gu", lat: 37.5112, lng: 127.0286 },
  { id: "samseong", name: "Samseong-dong", ko: "삼성동", district: "Gangnam-gu", lat: 37.5140, lng: 127.0565 },
  { id: "sinsa", name: "Sinsa-dong", ko: "신사동", district: "Gangnam-gu", lat: 37.5240, lng: 127.0228 },
  { id: "cheongdam", name: "Cheongdam-dong", ko: "청담동", district: "Gangnam-gu", lat: 37.5247, lng: 127.0493 },
  { id: "seogyo", name: "Seogyo-dong (Hongdae)", ko: "서교동", district: "Mapo-gu", lat: 37.5551, lng: 126.9229 },
  { id: "itaewon", name: "Itaewon-dong", ko: "이태원동", district: "Yongsan-gu", lat: 37.5345, lng: 126.9946 },
  { id: "myeongdong", name: "Myeong-dong", ko: "명동", district: "Jung-gu", lat: 37.5636, lng: 126.9850 },
  { id: "seongsu", name: "Seongsu-dong", ko: "성수동", district: "Seongdong-gu", lat: 37.5446, lng: 127.0560 },
];

// 카테고리. 새 카테고리는 여기에 한 줄 추가하면 필터 칩과 핀에 자동 반영된다.
window.CATEGORIES = [
  { id: "food", label: "Food", emoji: "🍜", color: "#e8590c" },
  { id: "cafe", label: "Cafe", emoji: "☕", color: "#8d5a2b" },
  { id: "store", label: "Convenience store", emoji: "🏪", color: "#2f9e44" },
  { id: "bank", label: "Bank / ATM", emoji: "🏧", color: "#1971c2" },
  { id: "pharmacy", label: "Pharmacy", emoji: "💊", color: "#c2255c" },
  // 백년가게: 정부 지정 30년 이상 가게. 음식점 외 업종도 섞여 있어 별도 카테고리로 둔다. 데이터는 baeknyeon.js
  { id: "heritage", label: "100-Year Shop", emoji: "🏅", color: "#7048e8" },
];

// ⚠️ 아래는 화면 확인용 "샘플" 데이터다. 실제 가게가 아니며 좌표도 임의로 찍었다.
// 우리가 아는 실제 장소로 교체할 것. (앱에서 "Add a tip"으로 추가 → Export 해서 여기에 붙여넣으면 된다)
//
// 필드: id, name(영문), ko(한글 상호: 택시/길 물을 때 보여주는 용도), cat, lat, lng,
//       tip(로컬이 알려주는 한 줄 정보), tags(외국인에게 중요한 조건), by(제보자)
window.SEED_PLACES = [
  { id: "s1", name: "[Sample] Pork soup & rice", ko: "[샘플] 돼지국밥집", cat: "food", lat: 37.5012, lng: 127.0351,
    tip: "Open 24h. Order at the kiosk by the door — it has an English button top-right. Rice is already in the soup.",
    tags: ["English kiosk", "Solo-friendly", "24h"], by: "Chulhee" },
  { id: "s2", name: "[Sample] Korean BBQ", ko: "[샘플] 삼겹살집", cat: "food", lat: 37.4992, lng: 127.0338,
    tip: "Minimum 2 portions per table. Staff grill it for you. Gets a queue after 7pm, go at 5:30.",
    tags: ["Foreign cards OK", "Min. 2 people", "Apple Pay OK"], by: "Chulhee" },
  { id: "s3", name: "[Sample] Kimbap shop", ko: "[샘플] 김밥집", cat: "food", lat: 37.5021, lng: 127.0389,
    tip: "Cheap quick breakfast, ready in 2 minutes. Picture menu on the wall, just point.",
    tags: ["Picture menu", "Under ₩5,000", "Vegetarian option"], by: "Chulhee" },
  { id: "s4", name: "[Sample] Quiet work cafe", ko: "[샘플] 카페", cat: "cafe", lat: 37.4999, lng: 127.0379,
    tip: "Power outlets at every seat on the 2nd floor. Wi-Fi password is printed on the receipt.",
    tags: ["Wi-Fi", "Outlets", "Apple Pay OK"], by: "Chulhee" },
  { id: "s5", name: "[Sample] Convenience store (24h)", ko: "[샘플] 편의점", cat: "store", lat: 37.5008, lng: 127.0372,
    tip: "You can top up a T-money transit card here — cash only for top-ups. Has seating and a microwave.",
    tags: ["T-money top-up", "24h", "Seating", "Apple Pay OK"], by: "Chulhee" },
  { id: "s6", name: "[Sample] Convenience store w/ tax refund", ko: "[샘플] 편의점 (택스리펀)", cat: "store", lat: 37.4986, lng: 127.0359,
    tip: "Instant tax refund at the counter if you show your passport (purchases over ₩15,000).",
    tags: ["Tax refund", "Foreign cards OK", "Apple Pay OK"], by: "Chulhee" },
  { id: "s7", name: "[Sample] Bank with global ATM", ko: "[샘플] 은행 글로벌 ATM", cat: "bank", lat: 37.5003, lng: 127.0347,
    tip: "Look for the machine labelled 'Global ATM' — the others reject foreign cards. ATM lobby stays open after the branch closes at 4pm.",
    tags: ["Global ATM", "English menu"], by: "Chulhee" },
  { id: "s8", name: "[Sample] Currency exchange counter", ko: "[샘플] 환전소", cat: "bank", lat: 37.5017, lng: 127.0331,
    tip: "Better rate than the airport. Bring your passport. Closed Sundays.",
    tags: ["Passport needed"], by: "Chulhee" },
  { id: "s9", name: "[Sample] Pharmacy", ko: "[샘플] 약국", cat: "pharmacy", lat: 37.4995, lng: 127.0393,
    tip: "Pharmacist speaks some English. Cold medicine and painkillers need no prescription.",
    tags: ["English spoken", "Open Saturday"], by: "Chulhee" },
  { id: "s10", name: "[Sample] Late-night fried chicken", ko: "[샘플] 치킨집", cat: "food", lat: 37.5109, lng: 127.0279,
    tip: "Half-and-half (fried + sweet-spicy) is the standard order. Open until 2am.",
    tags: ["Late night", "Foreign cards OK"], by: "Chulhee" },
  { id: "s11", name: "[Sample] Convenience store", ko: "[샘플] 편의점", cat: "store", lat: 37.5118, lng: 127.0295,
    tip: "Sells prepaid SIM cards at the counter — ask for 'yusim' (유심).",
    tags: ["SIM card", "24h", "Apple Pay OK"], by: "Chulhee" },
];
