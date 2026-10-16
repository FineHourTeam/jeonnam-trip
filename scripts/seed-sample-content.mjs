// 에뮬레이터에 [샘플] 축제·장소·크리에이터 코스를 넣고, admin@test.local을 관리자로 등록한다.
// 실행: firebase emulators:start → npm run seed:test → npm run seed:sample
//
// ⚠️ 에뮬레이터 전용 (FIRESTORE_EMULATOR_HOST만 호출, "Bearer owner"로 규칙 우회).
// ⚠️ 모든 데이터는 가상이다. 이름에 [샘플]을 붙였고 영업시간·프로그램은 실제 정보가 아니다.
//    실제 콘텐츠 수집·검증·입력은 갑 담당 (작업지시서 "제외" 항목).

const FS = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const AUTH = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const PROJECT = process.env.VITE_FIREBASE_PROJECT_ID ?? "jeonnam-trip";
const BASE = `http://${FS}/v1/projects/${PROJECT}/databases/(default)/documents`;

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
const R = (open, close, lastOrder) => ({ open, close, ...(lastOrder ? { lastOrder } : {}) });
const week = (ranges, closedDows = []) =>
  Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, closedDows.includes(d) ? [] : ranges]));
const unknownWeek = () => Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((d) => [d, null]));
const ok = (source) => ({ state: "verified", source, checkedAt: "2026-10-16" });
const un = () => ({ state: "unverified" });

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
  checks: p.checks ?? { location: ok("샘플 데이터"), hours: un(), info: un() },
});

const PLACES = [
  place("sample-sc-cafe-garden", {
    name: "[샘플] 정원 카페",
    sigun: "suncheon",
    area: "순천만 권역",
    category: "cafe",
    subcategory: "디저트",
    moods: ["정원"],
    purposes: ["사진", "혼자 쉬기"],
    address: "전라남도 순천시 (샘플 주소)",
    location: { lat: 34.9301, lng: 127.5095 },
    hours: { weekly: week([R("10:00", "20:00", "19:30")], [1]), exceptions: [] },
    facts: { parking: true, reservation: false, pets: null },
    checks: { location: ok("샘플 데이터"), hours: ok("샘플 데이터"), info: un() },
  }),
  place("sample-sc-restaurant-alley", {
    name: "[샘플] 골목 식당",
    sigun: "suncheon",
    area: "순천 원도심",
    category: "restaurant",
    subcategory: "한식",
    purposes: ["가족 식사"],
    location: { lat: 34.9506, lng: 127.4872 },
    // 브레이크타임이 있는 식당 — 휴게시간을 가로질러 체류 배정 금지 검증용
    hours: {
      weekly: week([R("11:00", "15:00", "14:20"), R("17:00", "21:00", "20:20")], [0]),
      exceptions: [],
    },
    checks: { location: ok("샘플 데이터"), hours: ok("샘플 데이터"), info: un() },
  }),
  place("sample-sc-bay", {
    name: "[샘플] 습지 전망대",
    sigun: "suncheon",
    area: "순천만 권역",
    category: "attraction",
    moods: ["자연"],
    purposes: ["사진", "데이트"],
    location: { lat: 34.8846, lng: 127.5089 },
    hours: { weekly: week([R("08:00", "19:00", "18:00")]), exceptions: [] },
    checks: { location: ok("샘플 데이터"), hours: ok("샘플 데이터"), info: un() },
  }),
  place("sample-sc-unknown-hours", {
    name: "[샘플] 영업시간 미확인 상점",
    sigun: "suncheon",
    category: "shop",
    location: { lat: 34.9512, lng: 127.4901 },
  }),
  place("sample-ys-cafe-ocean", {
    name: "[샘플] 바다 전망 카페",
    sigun: "yeosu",
    area: "돌산 권역",
    category: "cafe",
    moods: ["오션뷰"],
    purposes: ["사진", "데이트"],
    location: { lat: 34.7247, lng: 127.7489 },
    hours: {
      weekly: week([R("09:00", "22:00", "21:30")]),
      exceptions: [{ date: "2026-10-28", ranges: [], note: "임시 휴무 (샘플)" }],
    },
    facts: { parking: true, reservation: false, pets: true },
    checks: { location: ok("샘플 데이터"), hours: ok("샘플 데이터"), info: ok("샘플 데이터") },
  }),
  place("sample-ys-restaurant-port", {
    name: "[샘플] 항구 식당",
    sigun: "yeosu",
    category: "restaurant",
    subcategory: "해산물",
    location: { lat: 34.7398, lng: 127.7356 },
    hours: { weekly: week([R("13:00", "22:00", "21:00")], [2]), exceptions: [] },
    checks: {
      location: ok("샘플 데이터"),
      hours: { state: "conflict", source: "샘플: 자료 두 곳이 다름", checkedAt: "2026-10-16" },
      info: un(),
    },
  }),
  place("sample-ys-no-location", {
    name: "[샘플] 좌표 미확인 관광지",
    sigun: "yeosu",
    category: "attraction",
    location: null,
    checks: { location: un(), hours: un(), info: un() },
  }),
  place("sample-dy-bamboo", {
    name: "[샘플] 대숲 산책로",
    sigun: "damyang",
    category: "attraction",
    moods: ["자연"],
    purposes: ["혼자 쉬기", "가족"],
    location: { lat: 35.3256, lng: 126.9866 },
    hours: { weekly: week([R("09:00", "18:00", "17:00")]), exceptions: [] },
    checks: { location: ok("샘플 데이터"), hours: ok("샘플 데이터"), info: un() },
  }),
  place("sample-dy-hanok-cafe", {
    name: "[샘플] 한옥 카페",
    sigun: "damyang",
    category: "cafe",
    moods: ["한옥"],
    location: { lat: 35.3112, lng: 126.9877 },
    hours: { weekly: week([R("11:00", "19:00")], [3]), exceptions: [] },
    checks: { location: ok("샘플 데이터"), hours: ok("샘플 데이터"), info: un() },
  }),
  place("sample-sc-stay", {
    name: "[샘플] 강변 숙소",
    sigun: "suncheon",
    category: "lodging",
    location: { lat: 34.9489, lng: 127.5032 },
    checks: { location: ok("샘플 데이터"), hours: un(), info: un() },
  }),
];

const dayRanges = (start, end, ranges) => {
  const out = [];
  for (
    let d = new Date(`${start}T00:00:00Z`);
    d <= new Date(`${end}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    out.push({ date: d.toISOString().slice(0, 10), ranges });
  }
  return out;
};

const FESTIVALS = [
  {
    id: "sample-fes-river",
    name: "[샘플] 강변 가을축제",
    sigun: "suncheon",
    summary: "가상의 가을 축제예요. 실제 축제 정보가 아니에요.",
    startDate: "2026-10-23",
    endDate: "2026-10-25",
    days: dayRanges("2026-10-23", "2026-10-25", [R("10:00", "21:00")]),
    programs: [
      {
        id: "opening",
        name: "개막 공연",
        date: "2026-10-23",
        start: "14:00",
        end: "15:00",
        place: "주무대",
      },
      { id: "lantern", name: "등불 행진", date: "2026-10-24", start: "18:30", end: "19:30" },
    ],
    address: "전라남도 순천시 (샘플 주소)",
    location: { lat: 34.9445, lng: 127.5068 },
    parking: "임시 주차장 운영 (샘플)",
    contact: "061-000-0000 (샘플)",
    photos: [],
    state: "scheduled",
    checks: { schedule: ok("샘플 데이터"), location: ok("샘플 데이터"), info: un() },
    status: "published",
    updatedAt: NOW,
  },
  {
    id: "sample-fes-sea",
    name: "[샘플] 바다 불빛축제",
    sigun: "yeosu",
    startDate: "2026-10-30",
    endDate: "2026-11-08",
    // 날짜별 운영시간 일부 미확인 — 수동 후보 처리 검증용
    days: [
      ...dayRanges("2026-10-30", "2026-11-05", [R("17:00", "22:00")]),
      ...dayRanges("2026-11-06", "2026-11-08", null),
    ],
    programs: [],
    location: { lat: 34.7432, lng: 127.7471 },
    photos: [],
    state: "changed",
    stateNote: "11/6 이후 운영시간 미정 (샘플)",
    checks: {
      schedule: { state: "conflict", source: "샘플", checkedAt: "2026-10-16" },
      location: ok("샘플 데이터"),
      info: un(),
    },
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
    checks: { schedule: ok("샘플 데이터"), location: ok("샘플 데이터"), info: un() },
    status: "published",
    updatedAt: NOW,
  },
];

const COURSES = [
  {
    id: "sample-crt-suncheon",
    title: "[샘플] 순천 1박 2일 정원 코스",
    creator: { name: "샘플 크리에이터" },
    sourceUrl: "https://www.youtube.com/watch?v=sample",
    siguns: ["suncheon"],
    tags: ["정원", "느긋하게"],
    orderBasis: "video_order",
    reviewedAt: "2026-10-16",
    summary: "영상 등장 순서 기준이에요. 실제 방문 순서는 확인되지 않았어요. (샘플)",
    days: [
      {
        day: 1,
        items: [
          { placeId: "sample-sc-cafe-garden" },
          { placeId: "sample-sc-restaurant-alley" },
          { placeId: "sample-sc-bay" },
        ],
      },
      { day: 2, items: [{ placeId: "sample-sc-unknown-hours" }] },
    ],
    status: "published",
    updatedAt: NOW,
  },
];

async function adminUid() {
  const res = await fetch(
    `http://${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@test.local",
        password: "test123456!",
        returnSecureToken: true,
      }),
    },
  );
  if (!res.ok) return null;
  return (await res.json()).localId ?? null;
}

for (const p of PLACES) await put("places", p.id, p);
for (const f of FESTIVALS) await put("festivals", f.id, f);
for (const c of COURSES) await put("creatorCourses", c.id, c);
console.log(
  `✅ 장소 ${PLACES.length} · 축제 ${FESTIVALS.length} · 크리에이터 코스 ${COURSES.length}`,
);

const uid = await adminUid();
if (uid) {
  await put("admins", uid, { email: "admin@test.local", createdAt: NOW });
  console.log(`✅ 관리자 등록: admin@test.local (${uid})`);
} else {
  console.log("⏭️  admin@test.local 없음 — 먼저 npm run seed:test");
}
