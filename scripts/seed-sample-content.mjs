// 에뮬레이터에 개발용 콘텐츠(축제·장소·크리에이터 코스)를 넣고, admin@test.local을 관리자로 등록한다.
// 실행: npm run emulators(또는 emulators:alt) → npm run seed:test → npm run seed:sample
//
// ⚠️ 에뮬레이터 전용 (FIRESTORE_EMULATOR_HOST만 호출, "Bearer owner"로 규칙 우회). 실 프로젝트에 넣지 않는다.
// 데이터 구분 (2026-10-17 기준):
//   - 실제 관광지 12곳·실제 축제 6건: 지자체·한국관광공사 등 공개 자료를 옮겼다 (출처·확인일은 checks에). 10월 기준 시간이라
//     계절이 바뀌면 다를 수 있다 — 실제 운영 데이터의 수집·검증·입력은 발주자 담당이다.
//   - 이름에 [샘플]이 붙은 카페·식당·숙소·축제는 가상이다. 영업시간·프로그램은 기능 검증용이고 실제 업체 정보가 아니다.
//   - 사진: Wikimedia Commons CC0/CC BY/CC BY-SA (scripts/sample-photos.json — 저작자·라이선스·원본 주소). 업체 사진은 일반 풍경 사진이다.
import { readFileSync } from "node:fs";

const FS = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const PROJECT = process.env.VITE_FIREBASE_PROJECT_ID ?? "jeonnam-trip";
const BASE = `http://${FS}/v1/projects/${PROJECT}/databases/(default)/documents`;

const PHOTOS = JSON.parse(readFileSync(new URL("./sample-photos.json", import.meta.url), "utf8"));
const REAL_FESTIVALS = JSON.parse(readFileSync(new URL("./sample-festivals.json", import.meta.url), "utf8"));

// ── Firestore REST 값 인코딩 ──
function enc(v) {
  if (v === null) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number")
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(v)
          .filter(([, x]) => x !== undefined)
          .map(([k, x]) => [k, enc(x)]),
      ),
    },
  };
}

async function put(col, id, data) {
  const res = await fetch(`${BASE}/${col}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: "Bearer owner" },
    body: JSON.stringify({ fields: enc(data).mapValue.fields }),
  });
  if (!res.ok) throw new Error(`${col}/${id}: ${res.status} ${await res.text()}`);
}

const NOW = new Date().toISOString();
const CHECKED = "2026-10-17";
const R = (open, close, lastOrder) => ({ open, close, ...(lastOrder ? { lastOrder } : {}) });
const week = (ranges, closedDows = []) =>
  Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, closedDows.includes(d) ? [] : ranges]));
const unknownWeek = () => Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, null]));
const ok = (source) => ({ state: "verified", source, checkedAt: CHECKED });
const un = (source) => ({ state: "unverified", ...(source ? { source } : {}) });
const conflict = (source) => ({ state: "conflict", source, checkedAt: CHECKED });
const SAMPLE = "샘플 데이터 (가상 업체 — 실제 정보 아님)";

function photo(slug) {
  const p = PHOTOS[slug];
  if (!p) return [];
  return [{ url: p.file, alt: p.subject, credit: p.author, license: p.license, sourceUrl: p.sourceUrl }];
}

const place = (id, p) => ({
  id,
  moods: [],
  purposes: [],
  facts: { parking: null, reservation: null, pets: null },
  photos: [],
  sources: [],
  status: "published",
  updatedAt: NOW,
  ...p,
  hours: p.hours ?? { weekly: unknownWeek(), exceptions: [] },
  checks: p.checks ?? { location: ok(SAMPLE), hours: un(), info: un() },
});

// 매월 마지막 주 월요일 휴무 (순천만 정원·습지) — 2026-10 ~ 2027-01
const LAST_MONDAYS = ["2026-10-26", "2026-11-30", "2026-12-28", "2027-01-25"].map((date) => ({
  date,
  ranges: [],
  note: "매월 마지막 주 월요일 휴무",
}));

const official = (label, url) => ({ platform: "official", url, label });

// ── 실제 관광지 (공개 자료 기준, 10월 운영시간) ──
const REAL_PLACES = [
  place("suncheon-bay-wetland", {
    name: "순천만습지",
    sigun: "suncheon",
    area: "순천만 권역",
    category: "attraction",
    subcategory: "자연",
    moods: ["자연", "노을"],
    purposes: ["사진", "산책", "데이트"],
    address: "순천시 순천만길 513-25",
    location: { lat: 34.8852018, lng: 127.5103223 },
    hours: { weekly: week([R("08:00", "19:00", "18:00")]), exceptions: LAST_MONDAYS },
    facts: { parking: true, reservation: false, pets: null },
    phone: "061-749-6052",
    photos: photo("suncheon-bay-wetland"),
    sources: [official("순천만국가정원·습지 관람안내", "https://scbay.suncheon.go.kr/wetland/information/0001/")],
    checks: {
      location: ok("OpenStreetMap"),
      hours: ok("순천만국가정원 관람안내 (9~10월 기준, 11~2월 08:00~18:00)"),
      info: ok("순천만국가정원 관람안내"),
    },
  }),
  place("suncheon-national-garden", {
    name: "순천만국가정원",
    sigun: "suncheon",
    area: "순천만 권역",
    category: "attraction",
    subcategory: "정원",
    moods: ["정원", "자연"],
    purposes: ["사진", "산책", "아이와 함께"],
    address: "순천시 국가정원1호길 47",
    location: { lat: 34.9269651, lng: 127.4980052 },
    hours: { weekly: week([R("09:00", "20:00", "19:00")]), exceptions: LAST_MONDAYS },
    facts: { parking: true, reservation: false, pets: null },
    phone: "061-749-3114",
    photos: photo("suncheon-national-garden"),
    sources: [official("순천만국가정원 관람안내", "https://scbay.suncheon.go.kr/garden/0016/0001/")],
    checks: { location: ok("OpenStreetMap"), hours: ok("순천만국가정원 관람안내"), info: ok("순천만국가정원 관람안내") },
  }),
  place("naganeupseong", {
    name: "순천 낙안읍성",
    sigun: "suncheon",
    area: "낙안 권역",
    category: "attraction",
    subcategory: "역사",
    moods: ["한옥", "자연"],
    purposes: ["사진", "아이와 함께", "산책"],
    address: "순천시 낙안면 충민길 30",
    location: { lat: 34.906111, lng: 127.335833 },
    hours: { weekly: week([R("09:00", "18:00", "18:00")]), exceptions: [] },
    facts: { parking: true, reservation: false, pets: null },
    phone: "061-749-8831",
    photos: photo("naganeupseong"),
    sources: [official("낙안읍성 관람안내", "https://www.suncheon.go.kr/nagan/page03/0001/")],
    checks: {
      location: ok("Wikidata"),
      hours: ok("낙안읍성 관람안내 (10월 매표시간 기준 — 퇴장 시각은 안내 없음)"),
      info: un("주차·휴무는 한국관광공사 자료만 확인"),
    },
  }),
  place("yeosu-odongdo", {
    name: "오동도",
    sigun: "yeosu",
    area: "여수 시내 권역",
    category: "attraction",
    subcategory: "자연",
    moods: ["오션뷰", "자연"],
    purposes: ["산책", "사진"],
    address: "여수시 오동도로 222",
    location: { lat: 34.745035, lng: 127.7670926 },
    hours: { weekly: week([R("00:00", "23:59")]), exceptions: [] },
    facts: { parking: true, reservation: false, pets: null },
    phone: "061-659-1822",
    photos: photo("yeosu-odongdo"),
    sources: [official("여수시 관광 · 오동도", "https://www.yeosu.go.kr/tour/travel/10tour/odongdo")],
    checks: { location: ok("OpenStreetMap"), hours: ok("한국관광공사 (상시 개방)"), info: ok("여수시 관광") },
  }),
  place("yeosu-hyangiram", {
    name: "향일암",
    sigun: "yeosu",
    area: "돌산 권역",
    category: "attraction",
    subcategory: "역사",
    moods: ["오션뷰", "자연"],
    purposes: ["사진", "혼자 쉬기"],
    address: "여수시 돌산읍 향일암로 1",
    location: { lat: 34.5915967, lng: 127.8038089 },
    hours: { weekly: week([R("05:00", "19:00")]), exceptions: [] },
    facts: { parking: true, reservation: false, pets: null },
    phone: "061-644-4742",
    photos: photo("yeosu-hyangiram"),
    sources: [official("여수시 관광 · 향일암", "https://www.yeosu.go.kr/tour/travel/10tour/hyangilam")],
    checks: {
      location: ok("OpenStreetMap"),
      hours: ok("한국관광공사 (05:00~19:00)"),
      info: conflict("주소가 자료마다 달라요 (향일암로 1 / 60)"),
    },
  }),
  place("yeosu-cable-car", {
    name: "여수해상케이블카 돌산정류장",
    sigun: "yeosu",
    area: "돌산 권역",
    category: "attraction",
    subcategory: "전망",
    moods: ["오션뷰", "야경"],
    purposes: ["데이트", "사진", "아이와 함께"],
    address: "여수시 돌산읍 돌산로 3600-1",
    location: { lat: 34.730555, lng: 127.7415854 },
    hours: { weekly: week([R("09:30", "21:30", "21:00")]), exceptions: [] },
    facts: { parking: true, reservation: false, pets: null },
    phone: "061-664-7301",
    photos: photo("yeosu-cable-car"),
    sources: [official("여수해상케이블카", "http://yeosucablecar.com/")],
    checks: { location: ok("OpenStreetMap"), hours: ok("공식 홈페이지 오늘의 운행시간"), info: un("정기 휴무 안내 없음") },
  }),
  place("damyang-juknokwon", {
    name: "죽녹원",
    sigun: "damyang",
    area: "담양읍",
    category: "attraction",
    subcategory: "자연",
    moods: ["대숲", "자연"],
    purposes: ["산책", "사진", "혼자 쉬기"],
    address: "담양군 담양읍 죽녹원로 119",
    location: { lat: 35.325542, lng: 126.986728 },
    hours: { weekly: week([R("09:00", "19:00", "18:00")]), exceptions: [] },
    facts: { parking: true, reservation: false, pets: null },
    phone: "061-380-2680",
    photos: photo("damyang-juknokwon"),
    sources: [official("죽녹원 관람안내", "https://www.juknokwon.go.kr")],
    checks: { location: ok("담양군 문화관광"), hours: ok("죽녹원 관람안내 (하절기 3~10월)"), info: un("주차는 한국관광공사 자료만 확인") },
  }),
  place("damyang-metasequoia", {
    name: "담양 메타세쿼이아 가로수길",
    sigun: "damyang",
    area: "담양읍",
    category: "attraction",
    subcategory: "자연",
    moods: ["자연"],
    purposes: ["산책", "사진", "데이트"],
    address: "담양군 담양읍 메타세쿼이아로 12",
    location: { lat: 35.3234379, lng: 127.0020232 },
    hours: { weekly: week([R("09:00", "18:00")]), exceptions: [] },
    facts: { parking: true, reservation: false, pets: null },
    phone: "061-380-3149",
    photos: photo("damyang-metasequoia"),
    sources: [official("담양군 관광지 입장료 안내", "https://www.damyang.go.kr")],
    checks: { location: ok("담양군 문화관광"), hours: conflict("담양군 09:00~18:00 / 한국관광공사 5~8월 19:00까지"), info: un() },
  }),
  place("damyang-soswaewon", {
    name: "담양 소쇄원",
    sigun: "damyang",
    area: "가사문학면",
    category: "attraction",
    subcategory: "정원",
    moods: ["정원", "한옥", "자연"],
    purposes: ["혼자 쉬기", "사진"],
    address: "담양군 가사문학면 소쇄원길 17",
    location: { lat: 35.1842359, lng: 127.0121303 },
    hours: { weekly: week([R("09:00", "18:00")]), exceptions: [] },
    facts: { parking: true, reservation: false, pets: null },
    phone: "061-381-0115",
    photos: photo("damyang-soswaewon"),
    sources: [official("담양군 관광지 입장료 안내", "https://www.damyang.go.kr")],
    checks: { location: ok("담양군 문화관광"), hours: ok("담양군 (3·4·9·10월 기준, 11~2월 17:00까지)"), info: un() },
  }),
  place("boseong-green-tea", {
    name: "대한다원 (보성 녹차밭)",
    sigun: "boseong",
    area: "보성읍",
    category: "attraction",
    subcategory: "자연",
    moods: ["자연"],
    purposes: ["사진", "산책", "데이트"],
    address: "보성군 보성읍 녹차로 763-67",
    location: { lat: 34.7158469, lng: 127.07796 },
    hours: { weekly: week([R("09:00", "19:00", "18:00")]), exceptions: [] },
    facts: { parking: true, reservation: false, pets: null },
    phone: "061-852-4540",
    photos: photo("boseong-green-tea"),
    sources: [official("대한다원 개장안내", "http://www.dhdawon.com")],
    checks: { location: ok("OpenStreetMap"), hours: ok("대한다원 개장안내 (하계 3~10월, 입장 18:00까지)"), info: un() },
  }),
  place("mokpo-yudalsan", {
    name: "유달산",
    sigun: "mokpo",
    area: "목포 원도심",
    category: "attraction",
    subcategory: "전망",
    moods: ["자연", "노을"],
    purposes: ["산책", "사진"],
    address: "목포시 노적봉길 45",
    location: { lat: 34.7879739, lng: 126.3820996 },
    hours: { weekly: week([R("00:00", "23:59")]), exceptions: [] },
    facts: { parking: true, reservation: false, pets: null },
    phone: "061-270-8359",
    photos: photo("mokpo-yudalsan"),
    sources: [official("목포 관광 · 유달산", "https://www.mokpo.go.kr/tour/attraction/nineplace/yudalsan")],
    checks: { location: ok("OpenStreetMap"), hours: ok("한국관광공사 (상시 개방)"), info: un() },
  }),
  place("mokpo-cable-car", {
    name: "목포해상케이블카 북항스테이션",
    sigun: "mokpo",
    area: "북항",
    category: "attraction",
    subcategory: "전망",
    moods: ["오션뷰", "야경"],
    purposes: ["데이트", "아이와 함께", "사진"],
    address: "목포시 해양대학로 240",
    location: { lat: 34.7994941, lng: 126.3699919 },
    hours: {
      weekly: {
        0: [R("09:00", "20:00", "19:00")],
        1: [R("09:00", "20:00", "19:00")],
        2: [R("09:00", "20:00", "19:00")],
        3: [R("09:00", "20:00", "19:00")],
        4: [R("09:00", "20:00", "19:00")],
        5: [R("09:00", "21:00", "20:00")],
        6: [R("09:00", "21:00", "20:00")],
      },
      exceptions: [],
    },
    facts: { parking: true, reservation: false, pets: null },
    phone: "061-244-2600",
    photos: photo("mokpo-cable-car"),
    sources: [official("목포해상케이블카 운행 공지", "http://www.mmcablecar.com/")],
    checks: { location: ok("OpenStreetMap"), hours: ok("공식 공지 (2026-03-01 운행시간)"), info: un() },
  }),
];

// ── 가상 업체 [샘플] — 기능 검증용 (브레이크타임·예외 휴무·정보 상충·미확인·좌표 없음) ──
const SAMPLE_PLACES = [
  place("sample-sc-cafe-garden", {
    name: "[샘플] 정원 카페",
    sigun: "suncheon",
    area: "순천만 권역",
    category: "cafe",
    subcategory: "디저트",
    moods: ["정원"],
    purposes: ["사진", "혼자 쉬기"],
    address: "순천시 (샘플 주소)",
    location: { lat: 34.9301, lng: 127.5095 },
    hours: { weekly: week([R("10:00", "20:00", "19:30")], [1]), exceptions: [] },
    facts: { parking: true, reservation: false, pets: null },
    photos: photo("cafe-garden"),
    checks: { location: ok(SAMPLE), hours: ok(SAMPLE), info: un() },
  }),
  place("sample-sc-restaurant-alley", {
    name: "[샘플] 골목 한정식",
    sigun: "suncheon",
    area: "순천 원도심",
    category: "restaurant",
    subcategory: "한정식",
    purposes: ["가족 식사"],
    location: { lat: 34.9506, lng: 127.4872 },
    // 브레이크타임 — 휴게시간을 가로질러 체류를 배정하지 않는지 검증
    hours: {
      weekly: week([R("11:00", "15:00", "14:20"), R("17:00", "21:00", "20:20")], [0]),
      exceptions: [],
    },
    photos: photo("food-hanjeongsik"),
    checks: { location: ok(SAMPLE), hours: ok(SAMPLE), info: un() },
  }),
  place("sample-sc-unknown-hours", {
    name: "[샘플] 영업시간 미확인 상점",
    sigun: "suncheon",
    category: "shop",
    location: { lat: 34.9512, lng: 127.4901 },
  }),
  place("sample-sc-stay", {
    name: "[샘플] 강변 한옥 숙소",
    sigun: "suncheon",
    category: "lodging",
    subcategory: "한옥",
    moods: ["한옥"],
    location: { lat: 34.9489, lng: 127.5032 },
    photos: photo("stay-hanok"),
    checks: { location: ok(SAMPLE), hours: un(), info: un() },
  }),
  place("sample-ys-cafe-ocean", {
    name: "[샘플] 바다 전망 카페",
    sigun: "yeosu",
    area: "돌산 권역",
    category: "cafe",
    moods: ["오션뷰", "노을"],
    purposes: ["사진", "데이트"],
    location: { lat: 34.7247, lng: 127.7489 },
    hours: {
      weekly: week([R("09:00", "22:00", "21:30")]),
      exceptions: [{ date: "2026-10-28", ranges: [], note: "임시 휴무 (샘플)" }],
    },
    facts: { parking: true, reservation: false, pets: true },
    photos: photo("cafe-ocean"),
    checks: { location: ok(SAMPLE), hours: ok(SAMPLE), info: ok(SAMPLE) },
  }),
  place("sample-ys-restaurant-port", {
    name: "[샘플] 항구 게장 식당",
    sigun: "yeosu",
    category: "restaurant",
    subcategory: "해산물",
    purposes: ["가족 식사"],
    location: { lat: 34.7398, lng: 127.7356 },
    hours: { weekly: week([R("13:00", "22:00", "21:00")], [2]), exceptions: [] },
    photos: photo("food-gejang"),
    checks: { location: ok(SAMPLE), hours: conflict("샘플: 자료 두 곳의 영업시간이 달라요"), info: un() },
  }),
  place("sample-ys-no-location", {
    name: "[샘플] 좌표 미확인 관광지",
    sigun: "yeosu",
    category: "attraction",
    location: null,
    checks: { location: un(), hours: un(), info: un() },
  }),
  place("sample-dy-hanok-cafe", {
    name: "[샘플] 한옥 찻집",
    sigun: "damyang",
    category: "cafe",
    subcategory: "전통찻집",
    moods: ["한옥"],
    purposes: ["혼자 쉬기"],
    location: { lat: 35.3112, lng: 126.9877 },
    hours: { weekly: week([R("11:00", "19:00")], [3]), exceptions: [] },
    photos: photo("cafe-hanok"),
    checks: { location: ok(SAMPLE), hours: ok(SAMPLE), info: un() },
  }),
  place("sample-dy-tteokgalbi", {
    name: "[샘플] 대통 떡갈비",
    sigun: "damyang",
    category: "restaurant",
    subcategory: "떡갈비",
    purposes: ["가족 식사"],
    location: { lat: 35.3189, lng: 126.9925 },
    hours: { weekly: week([R("11:00", "20:30", "19:50")], [1]), exceptions: [] },
    facts: { parking: true, reservation: true, pets: false },
    photos: photo("food-tteokgalbi"),
    checks: { location: ok(SAMPLE), hours: ok(SAMPLE), info: ok(SAMPLE) },
  }),
  place("sample-dy-bamboo-shop", {
    name: "[샘플] 대나무 공방",
    sigun: "damyang",
    category: "shop",
    subcategory: "공예",
    purposes: ["아이와 함께"],
    location: { lat: 35.3241, lng: 126.9893 },
    hours: { weekly: week([R("10:00", "18:00")], [1]), exceptions: [] },
    photos: photo("shop-bamboo"),
    checks: { location: ok(SAMPLE), hours: ok(SAMPLE), info: un() },
  }),
  place("sample-bs-tea-house", {
    name: "[샘플] 녹차밭 찻집",
    sigun: "boseong",
    category: "cafe",
    subcategory: "전통찻집",
    moods: ["자연"],
    purposes: ["혼자 쉬기", "데이트"],
    location: { lat: 34.7182, lng: 127.0811 },
    hours: { weekly: week([R("10:00", "18:30", "18:00")]), exceptions: [] },
    photos: photo("cafe-tea"),
    checks: { location: ok(SAMPLE), hours: ok(SAMPLE), info: un() },
  }),
  place("sample-mp-nakji", {
    name: "[샘플] 북항 낙지집",
    sigun: "mokpo",
    category: "restaurant",
    subcategory: "해산물",
    purposes: ["가족 식사"],
    location: { lat: 34.7971, lng: 126.3735 },
    hours: { weekly: week([R("11:30", "15:00", "14:30"), R("17:00", "21:30", "20:40")], [2]), exceptions: [] },
    photos: photo("food-nakji"),
    checks: { location: ok(SAMPLE), hours: ok(SAMPLE), info: un() },
  }),
];

const PLACES = [...REAL_PLACES, ...SAMPLE_PLACES];

const dayRanges = (start, end, ranges) => {
  const out = [];
  for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push({ date: d.toISOString().slice(0, 10), ranges });
  }
  return out;
};

// ── 실제 축제 (scripts/sample-festivals.json — 공식 누리집·문체부 지역축제 정보) ──
const NAGAN = REAL_PLACES.find((p) => p.id === "naganeupseong");
const realFestivals = REAL_FESTIVALS.map((f) => {
  const [open, close] = (f.dailyHours ?? "").split("~");
  const ranges = open && close ? [R(open.trim(), close.trim())] : null;
  const nagan = f.id === "suncheon-naganeupseong-folk-2026";
  const lat = nagan ? NAGAN.location.lat : f.lat;
  const lng = nagan ? NAGAN.location.lng : f.lng;
  const hoursConflict = f.id === "hampyeong-gukhyang-2026";
  return {
    id: f.id,
    name: f.name,
    sigun: f.sigun,
    summary: f.summary,
    startDate: f.startDate,
    endDate: f.endDate,
    days: dayRanges(f.startDate, f.endDate, ranges),
    programs: f.programs.map((p, i) => ({ id: `p${String(i + 1)}`, ...p, place: f.venue })),
    address: nagan ? NAGAN.address : (f.address ?? f.venue),
    location: lat && lng ? { lat, lng } : null,
    officialUrl: f.officialUrl ?? undefined,
    photos: photo(`festival-${f.id}`),
    state: "scheduled",
    checks: {
      schedule: hoursConflict
        ? conflict("문체부 10:00~18:00 / 예매처 09:00~18:00 — 공식 확인 필요")
        : { state: f.confidence === "high" ? "verified" : "unverified", source: "공식 누리집·문체부 지역축제 정보", checkedAt: CHECKED },
      location: lat ? ok("OpenStreetMap·공식 안내") : un(),
      info: un("요금·주차는 공식 안내를 확인해 주세요"),
    },
    status: "published",
    updatedAt: NOW,
  };
});

// ── 가상 축제 [샘플] — 고정 프로그램·변경·취소 흐름 검증용 ──
const SAMPLE_FESTIVALS = [
  {
    id: "sample-fes-river",
    name: "[샘플] 강변 가을축제",
    sigun: "suncheon",
    summary: "기능 검증용 가상 축제예요. 실제 축제 정보가 아니에요.",
    startDate: "2026-10-23",
    endDate: "2026-10-25",
    days: dayRanges("2026-10-23", "2026-10-25", [R("10:00", "21:00")]),
    programs: [
      { id: "opening", name: "개막 공연", date: "2026-10-23", start: "14:00", end: "15:00", place: "주무대" },
      { id: "lantern", name: "등불 행진", date: "2026-10-24", start: "18:30", end: "19:30" },
    ],
    address: "순천시 (샘플 주소)",
    location: { lat: 34.9445, lng: 127.5068 },
    parking: "임시 주차장 운영 (샘플)",
    contact: "061-000-0000 (샘플)",
    photos: photo("suncheon-national-garden"),
    state: "scheduled",
    checks: { schedule: ok(SAMPLE), location: ok(SAMPLE), info: un() },
    status: "published",
    updatedAt: NOW,
  },
  {
    id: "sample-fes-cancelled",
    name: "[샘플] 취소된 대숲 음악회",
    sigun: "damyang",
    startDate: "2026-10-17",
    endDate: "2026-10-18",
    days: dayRanges("2026-10-17", "2026-10-18", [R("13:00", "18:00")]),
    programs: [],
    location: { lat: 35.3256, lng: 126.9866 },
    photos: [],
    state: "cancelled",
    stateNote: "주최 측 사정으로 취소 (샘플)",
    checks: { schedule: ok(SAMPLE), location: ok(SAMPLE), info: un() },
    status: "published",
    updatedAt: NOW,
  },
];

const FESTIVALS = [...realFestivals, ...SAMPLE_FESTIVALS];

const course = (id, c) => ({ id, status: "published", updatedAt: NOW, reviewedAt: CHECKED, ...c });
const COURSES = [
  course("sample-crt-suncheon", {
    title: "[샘플] 순천 1박 2일 정원·습지 코스",
    creator: { name: "샘플 크리에이터" },
    sourceUrl: "https://www.youtube.com/results?search_query=%EC%88%9C%EC%B2%9C%EB%A7%8C+%EC%97%AC%ED%96%89",
    siguns: ["suncheon"],
    tags: ["정원", "느긋하게"],
    orderBasis: "video_order",
    summary: "영상 등장 순서를 옮긴 가상 코스예요. 실제 방문 순서는 확인되지 않았어요.",
    days: [
      { day: 1, items: [{ placeId: "suncheon-national-garden" }, { placeId: "sample-sc-restaurant-alley" }, { placeId: "suncheon-bay-wetland", note: "해 질 무렵 용산전망대" }] },
      { day: 2, items: [{ placeId: "naganeupseong" }, { placeId: "sample-sc-cafe-garden" }, { placeId: "sample-sc-unknown-hours" }] },
    ],
  }),
  course("sample-crt-damyang", {
    title: "[샘플] 담양 대숲 당일 코스",
    creator: { name: "샘플 크리에이터" },
    sourceUrl: "https://www.youtube.com/results?search_query=%EB%8B%B4%EC%96%91+%EC%97%AC%ED%96%89",
    siguns: ["damyang"],
    tags: ["대숲", "당일치기"],
    orderBasis: "editor_suggested",
    summary: "운영팀이 이동을 고려해 짠 가상 코스예요.",
    days: [
      { day: 1, items: [{ placeId: "damyang-juknokwon" }, { placeId: "sample-dy-tteokgalbi" }, { placeId: "damyang-metasequoia" }, { placeId: "sample-dy-hanok-cafe" }, { placeId: "damyang-soswaewon" }] },
    ],
  }),
  course("sample-crt-yeosu", {
    title: "[샘플] 여수 바다 1박 2일",
    creator: { name: "샘플 크리에이터" },
    sourceUrl: "https://www.youtube.com/results?search_query=%EC%97%AC%EC%88%98+%EC%97%AC%ED%96%89",
    siguns: ["yeosu"],
    tags: ["바다", "야경"],
    orderBasis: "verified_trip",
    summary: "가상 코스예요. 둘째 날 아침 일출은 향일암에서 봐요.",
    days: [
      { day: 1, items: [{ placeId: "yeosu-odongdo" }, { placeId: "sample-ys-restaurant-port" }, { placeId: "yeosu-cable-car" }] },
      { day: 2, items: [{ placeId: "yeosu-hyangiram" }, { placeId: "sample-ys-cafe-ocean" }] },
    ],
  }),
];

async function adminUid() {
  const res = await fetch(
    `http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@test.local", password: "test123456!", returnSecureToken: true }),
    },
  );
  if (!res.ok) return null;
  return (await res.json()).localId ?? null;
}

for (const p of PLACES) await put("places", p.id, p);
for (const f of FESTIVALS) await put("festivals", f.id, f);
for (const c of COURSES) await put("creatorCourses", c.id, c);
console.log(`✅ 장소 ${PLACES.length} · 축제 ${FESTIVALS.length} · 크리에이터 코스 ${COURSES.length}`);

const uid = await adminUid();
if (uid) {
  await put("admins", uid, { email: "admin@test.local", createdAt: NOW });
  console.log(`✅ 관리자 등록: admin@test.local (${uid})`);
} else {
  console.log("⏭️  admin@test.local 없음 — 먼저 npm run seed:test");
}
