// 남도여행길잡이(namdokorea.com) 장소(관광·먹거리·숙박)와 추천 여행코스 수집 → 운영 Firestore `places`·`creatorCourses` + Storage 사진.
//
// 실행 (기본은 dry-run: 결과 JSON만 쓴다):
//   node scripts/crawl-namdo-places.mjs --out <파일.json>
//   GCP_TOKEN=$(gcloud auth print-access-token) node scripts/crawl-namdo-places.mjs --write --out <파일.json>
//
// - 좌표·주소·전화·주차·소개·사진(최대 3장, 600px)은 사이트 값을 쓴다. 영업시간은 출처에 없어 전부 null(미확인)
// - 자동 수집이라 확인 상태는 unverified. 출처·사진 제공처·수집일을 checks에 남긴다
// - 문서 id는 출처 기준 고정(nd-p-<infoId>, nd-c-<courseId>) — 다시 돌리면 같은 문서를 덮어쓴다
// - 코스는 사이트의 장소별 "여행코스"를 모은 것(이용자 코스 제외). 순서 근거가 편집자 구성이라 orderBasis는 editor_suggested
// - 좌표가 없으면 주소로 네이버 지오코딩(NCP_ID·NCP_SECRET 있을 때)
import { writeFileSync } from "node:fs";
import { commitDocs, uploadImage } from "./lib/firebase-rest.mjs";
import {
  SIGUN,
  SITE,
  SOURCE_LABEL,
  TODAY,
  UA,
  get,
  pool,
  postForm,
  text,
  thumbUrl,
} from "./lib/namdo.mjs";

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const OUT = args[args.indexOf("--out") + 1];
const MAX_PHOTOS = 3;
const CATEGORIES = ["관광", "먹거리", "숙박"];

async function listIds(area, category1) {
  const ids = [];
  for (let page = 1; ; page++) {
    const { resultMap } = await postForm("/tour/info/ajaxInfoList.do", {
      language: "KOR",
      area,
      category1,
      currentPageNo: page,
    });
    ids.push(...resultMap.infoList.map((x) => x.infoId));
    if (page >= resultMap.paginationInfo.totalPageCount) return ids;
  }
}

function category(v) {
  const label = `${v.category2 ?? ""} ${v.category3 ?? ""}`;
  if (v.category1 === "숙박") return "lodging";
  if (/카페|디저트|베이커리|제과/.test(label)) return "cafe";
  if (v.category1 === "먹거리") return "restaurant";
  if (/쇼핑|시장/.test(label)) return "shop";
  return "attraction";
}

const clean = (s) => {
  const t = (s ?? "").trim();
  return t && t !== "-" ? t : undefined;
};

function parking(s) {
  const t = clean(s);
  if (!t) return null;
  if (/불가|없음|불가능/.test(t)) return false;
  if (/가능|있음|무료|유료|주차장/.test(t)) return true;
  return null;
}

function httpUrl(s) {
  try {
    const u = new URL(clean(s) ?? "");
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : undefined;
  } catch {
    return undefined;
  }
}

function toPlace(v) {
  const lat = Number(v.latitude);
  const lng = Number(v.longitude);
  const located =
    Number.isFinite(lat) && Number.isFinite(lng) && lat > 33 && lat < 36 && lng > 125 && lng < 128;
  const images = (v.multimediaList ?? [])
    .filter((m) => m.type === "image" && m.fileMap)
    .slice(0, MAX_PHOTOS);
  const credits = [...new Set(images.map((m) => clean(m.source)).filter(Boolean))];
  const homepage = httpUrl(v.homepage);
  const check = (extra) => ({
    state: "unverified",
    source: SOURCE_LABEL + extra,
    checkedAt: TODAY,
  });
  const summary = text(v.contents ?? "").slice(0, 1000);
  return {
    place: {
      id: `nd-p-${v.infoId}`,
      name: v.name.trim(),
      sigun: SIGUN[v.area],
      category: category(v),
      ...(clean(v.category2) ? { subcategory: clean(v.category2) } : {}),
      moods: [],
      purposes: [],
      ...(clean(v.addr) ? { address: clean(v.addr) } : {}),
      location: located ? { lat, lng } : null,
      // 영업시간은 출처에 없다 → 요일 전부 null(미확인): 자동 시간 배정에서 빠지고 수동 후보로만 담긴다
      hours: {
        weekly: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
        exceptions: [],
      },
      facts: { parking: parking(v.parking), reservation: null, pets: null },
      ...((clean(v.phone) ?? clean(v.deptName))
        ? { phone: clean(v.phone) ?? clean(v.deptName) }
        : {}),
      ...(summary ? { summary } : {}),
      photos: [],
      sources: [
        ...(homepage ? [{ platform: "official", url: homepage, label: "공식 홈페이지" }] : []),
        { platform: "other", url: SITE, label: "남도여행길잡이" },
      ],
      checks: {
        location: check(""),
        hours: check(" · 영업시간 정보 없음"),
        info: check(credits.length ? ` · 사진: ${credits.join(", ")}` : ""),
      },
      status: "published",
      updatedAt: new Date().toISOString(),
    },
    photoSources: images.map((m) => thumbUrl(m.fileMap)),
  };
}

async function coursesOf(infoId) {
  const res = await get(
    `${SITE}/tour/course/ajaxCourseListByInfo.do?infoId=${infoId}&language=KOR`,
  );
  return (await res.json()).resultMap.courseList ?? [];
}

function toCourse(c, placeById) {
  const byDay = new Map();
  for (const p of c.planList ?? []) {
    const placeId = `nd-p-${p.infoId}`;
    if (!placeById.has(placeId)) continue; // 수집 범위 밖 장소는 뺀다
    const day = Number(p.day) || 1;
    const items = byDay.get(day) ?? [];
    if (!items.some((x) => x.placeId === placeId)) items.push({ placeId });
    byDay.set(day, items);
  }
  const days = [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, items]) => ({ day, items }));
  const placeIds = days.flatMap((d) => d.items.map((x) => x.placeId));
  if (placeIds.length < 2) return null;
  const siguns = [...new Set(placeIds.map((id) => placeById.get(id).sigun))];
  return {
    id: `nd-c-${c.courseId}`,
    title: c.name.trim(),
    creator: { name: "남도여행길잡이", channelUrl: SITE },
    sourceUrl: `${SITE}/tour/info/thema/season/seasonView.do?menuCd=T002003001&courseId=${c.courseId}`,
    siguns,
    tags: [clean(c.category1)].filter(Boolean),
    orderBasis: "editor_suggested",
    reviewedAt: TODAY,
    summary: `남도여행길잡이 여행코스를 옮겨 온 것이에요 (${SOURCE_LABEL}).`,
    days,
    status: "published",
    updatedAt: new Date().toISOString(),
  };
}

async function main() {
  if (WRITE && !process.env.GCP_TOKEN) throw new Error("--write에는 GCP_TOKEN이 필요해요.");
  const report = {
    listed: 0,
    places: 0,
    located: 0,
    photos: 0,
    courses: 0,
    courseCategories: {},
    errors: [],
  };

  const ids = [];
  for (const area of Object.keys(SIGUN)) {
    for (const c of CATEGORIES) ids.push(...(await listIds(area, c)));
  }
  const unique = [...new Set(ids)];
  report.listed = unique.length;

  const rows = await pool(unique, 3, async (infoId) => {
    try {
      const { resultMap } = await postForm("/tour/info/ajaxInfoSelect.do", { infoId });
      const v = resultMap.infoVO;
      if (!v || !SIGUN[v.area]) return null;
      const courses = await coursesOf(infoId);
      const row = toPlace(v);
      // 사이트 좌표가 없거나 전남 범위 밖이면 주소로 한 번 더 찾는다
      if (!row.place.location) row.place.location = await geocode(row.place.address);
      return { ...row, courses };
    } catch (e) {
      report.errors.push(`${infoId}: ${e.message}`);
      return null;
    }
  });
  const places = rows.filter(Boolean);
  report.places = places.length;
  report.located = places.filter((p) => p.place.location).length;

  const placeById = new Map(places.map((p) => [p.place.id, p.place]));
  const rawCourses = new Map();
  for (const p of places) for (const c of p.courses) rawCourses.set(c.courseId, c);
  for (const c of rawCourses.values()) {
    report.courseCategories[c.category1] = (report.courseCategories[c.category1] ?? 0) + 1;
  }
  // "사용자코스"는 사이트 이용자가 만든 코스라(이름이 "ㅇㅇ"인 것도 있다) 편집자 코스만 옮긴다
  const courses = [...rawCourses.values()]
    .filter((c) => c.category1 !== "사용자코스")
    .map((c) => toCourse(c, placeById))
    .filter(Boolean);
  report.courses = courses.length;

  if (WRITE) {
    await pool(places, 4, async (p) => {
      for (const [i, src] of p.photoSources.entries()) {
        try {
          p.place.photos.push(
            await uploadImage(
              `content/places/${p.place.id}/${String(i + 1).padStart(2, "0")}`,
              src,
              { "User-Agent": UA },
            ),
          );
        } catch (e) {
          report.errors.push(`사진 ${p.place.id}: ${e.message}`);
        }
      }
    });
    report.photos = places.reduce((n, p) => n + p.place.photos.length, 0);
    await commitDocs(
      places.map(({ place: { id, ...data } }) => ({ collection: "places", id, data })),
    );
    await commitDocs(
      courses.map(({ id, ...data }) => ({ collection: "creatorCourses", id, data })),
    );
  }

  if (OUT)
    writeFileSync(
      OUT,
      JSON.stringify(
        { places: places.map(({ courses: _c, ...p }) => p), courses, report },
        null,
        2,
      ),
    );
  console.log(
    JSON.stringify(
      {
        ...report,
        errors: report.errors.slice(0, 20),
        errorCount: report.errors.length,
        write: WRITE,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
