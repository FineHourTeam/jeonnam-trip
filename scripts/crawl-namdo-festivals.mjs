// 남도여행길잡이(namdokorea.com) 축제 수집 → 운영 Firestore `festivals` + Storage 사진.
//
// 실행 (기본은 dry-run: 결과 JSON만 쓴다):
//   node scripts/crawl-namdo-festivals.mjs --year 2026 --out <파일.json>
//   GCP_TOKEN=$(gcloud auth print-access-token) NCP_ID=... NCP_SECRET=... \
//     node scripts/crawl-namdo-festivals.mjs --year 2026 --write
//
// - 상세 페이지가 있는 축제: 이름·기간·주소·설명·홈페이지·사진. 좌표는 주소를 네이버 지오코딩으로 변환(NCP_ID·NCP_SECRET 있을 때)
// - 축제전체일정 표에만 있는 축제: 날짜가 정확히 적힌 것만 이름·시군·기간으로 (주소·사진 없음)
// - 자동 수집이라 확인 상태는 전부 unverified. 출처·수집일을 checks에 남긴다 (기능명세 § 정보 정확성)
// - 문서 id는 출처 기준으로 고정(nd-<축제ID> / nd-s-<해시>)이라 다시 돌려도 같은 문서를 덮어쓴다
// - 사이트 저작물은 공공누리 제4유형(출처표시·상업적 이용금지·변경금지). 사진은 원본 그대로 올린다
//
// ponytail: HTML을 정규식으로 읽는다 — 사이트 마크업이 바뀌면 깨지므로, 깨지면 dry-run 결과부터 확인한다
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

const SITE = "https://www.namdokorea.com";
const SOURCE_LABEL = "남도여행길잡이(namdokorea.com) 자동 수집 · 공공누리 제4유형";
const UA = "jeonnam-trip-content-bot/1.0 (+https://jeonnam-trip.web.app)";
const PROJECT = "jeonnam-trip";
const BUCKET = process.env.STORAGE_BUCKET ?? "jeonnam-trip.firebasestorage.app";

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const YEAR = Number(arg("--year") ?? new Date().getFullYear());
const WRITE = args.includes("--write");
const OUT = arg("--out");
const TODAY = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

const SIGUN = {
  목포: "mokpo",
  여수: "yeosu",
  순천: "suncheon",
  나주: "naju",
  광양: "gwangyang",
  담양: "damyang",
  곡성: "gokseong",
  구례: "gurye",
  고흥: "goheung",
  보성: "boseong",
  화순: "hwasun",
  장흥: "jangheung",
  강진: "gangjin",
  해남: "haenam",
  영암: "yeongam",
  무안: "muan",
  함평: "hampyeong",
  영광: "yeonggwang",
  장성: "jangseong",
  완도: "wando",
  진도: "jindo",
  신안: "sinan",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  await sleep(400); // 원 사이트에 부담을 주지 않게 천천히
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res;
}

const text = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();

function dateRange(start, end) {
  const out = [];
  for (
    let d = new Date(`${start}T00:00:00Z`);
    d <= new Date(`${end}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/** 이름 비교용 — "제31회", 연도, 공백·기호를 뺀다 */
const norm = (name) =>
  name
    .replace(/제\s*\d+\s*회/g, "")
    .replace(/20\d{2}/g, "")
    .replace(/[\s·・,.()'"’‘\-]/g, "");

// ── 1) 월별 목록: 축제 ID·시군·기간·사진 ID ──
async function listMonth(month) {
  const html = await (
    await get(
      `${SITE}/tour/fastival/fastivalIndex.do?menuCd=T007005001&year=${YEAR}&month=${month}`,
    )
  ).text();
  const items = [];
  const re =
    /fn_fastivalView\('(\d+)'\);">\s*<span class="thum" id="image_(\d+)">[\s\S]*?<span class="cate">([\s\S]*?)<\/span>([\s\S]*?)<\/p>\s*<p class="terms"><!--\s*(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})/g;
  for (const m of html.matchAll(re)) {
    const label = text(m[3]).replace(/[[\]]/g, "");
    items.push({
      fastivalId: m[1],
      imageSlot: m[2],
      sigunLabel: label,
      name: text(m[4]),
      startDate: m[5],
      endDate: m[6],
    });
  }
  const media = new Map();
  for (const m of html.matchAll(/"multimediaId":'(MULT_\d+)'[\s\S]*?\$\("#image_(\d+)"\)/g)) {
    if (!media.has(m[2])) media.set(m[2], m[1]);
  }
  return items.map((it) => ({ ...it, multimediaId: media.get(it.imageSlot) ?? null }));
}

// ── 2) 상세: 주소·문의·설명·홈페이지·슬라이드 사진 ──
async function detail(fastivalId) {
  const url = `${SITE}/tour/fastival/fastivalView.do?menuCd=T007005001&fastivalId=${fastivalId}`;
  const html = await (await get(url)).text();
  const pick = (re) => html.match(re)?.[1];
  const address =
    pick(/name="eName" value="([^"]*)"/) ||
    text(pick(/<span class="label">위치<\/span>([\s\S]*?)<\/li>/) ?? "");
  const phone = text(pick(/<span class="label">문의전화<\/span>([\s\S]*?)<\/li>/) ?? "").replace(
    /^-+$/,
    "",
  );
  const summary = text(pick(/<div class="con">([\s\S]*?)<\/div>/) ?? "");
  const homepage = pick(/<li class="item1">\s*<a href="(https?:\/\/[^"]+)"/);
  const slides = [
    ...(pick(/<ul class="slide">([\s\S]*?)<\/ul>/) ?? "").matchAll(/src="([^"]+)"/g),
  ].map((m) => new URL(m[1], SITE).href);
  return { url, address: address.trim(), phone, summary, homepage, slides };
}

async function multimediaImage(multimediaId) {
  const data = await (
    await get(`${SITE}/tour/multimedia/ajaxMultimediaSelect.do?multimediaId=${multimediaId}`)
  ).json();
  const f = data?.resultMap?.multimediaVO?.fileMap;
  // 원본 경로는 공개되지 않고 600px 썸네일만 내려준다 (사이트 화면과 같은 이미지)
  return f ? `${SITE}${f.filePath}/thumb/${f.fileNm}_600.${f.fileExt}` : null;
}

// ── 3) 축제전체일정 표 ──
function parseTableDates(s) {
  const m = s.match(
    /^(\d{1,2})\.(\d{1,2})\.?~\s*(?:['’‘]?(\d{2})\.)?(?:(\d{1,2})\.)?(\d{1,2})\.?$/,
  );
  if (!m) return null;
  const [, m1, d1, y2, m2, d2] = m;
  const sm = Number(m1);
  const em = m2 ? Number(m2) : sm;
  let ey = y2 ? 2000 + Number(y2) : YEAR;
  if (!y2 && em < sm) ey = YEAR + 1; // 12.31.~1.1.
  const pad = (n) => String(n).padStart(2, "0");
  return { startDate: `${YEAR}-${pad(sm)}-${pad(d1)}`, endDate: `${ey}-${pad(em)}-${pad(d2)}` };
}

async function scheduleTable() {
  const html = await (await get(`${SITE}/content/view.do?menuCd=T007005002`)).text();
  const tbody = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  const rows = [];
  const skipped = [];
  for (const tr of tbody.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    const cells = [...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => text(m[1]));
    if (cells.length < 3) continue;
    const [label, nameWithDate, note] = cells.slice(-3);
    // "진도·해남 도"처럼 여러 시군이면 첫 시군으로 둔다
    const sigunLabel = Object.keys(SIGUN).find((k) => label.includes(k));
    const m = nameWithDate.match(/^(.*)\(([^()]*)\)\s*(.*)$/);
    const dates = m ? parseTableDates(m[2].trim()) : null;
    if (!m || !dates || !sigunLabel) {
      skipped.push(`${label} ${nameWithDate}`);
      continue;
    }
    const remark = [m[3], note]
      .map((x) => x.replace(/^\*/, "").trim())
      .filter(Boolean)
      .join(" · ");
    rows.push({ sigunLabel, name: m[1].trim(), note: remark, ...dates });
  }
  return { rows, skipped };
}

// ── 지오코딩 ──
async function geocode(address) {
  if (!process.env.NCP_ID || !process.env.NCP_SECRET || !address) return null;
  const res = await fetch(
    `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`,
    {
      headers: {
        "x-ncp-apigw-api-key-id": process.env.NCP_ID,
        "x-ncp-apigw-api-key": process.env.NCP_SECRET,
      },
    },
  );
  if (!res.ok) return null;
  const a = (await res.json()).addresses?.[0];
  return a ? { lat: Number(a.y), lng: Number(a.x) } : null;
}

// ── 변환 ──
function check(state, extra = {}) {
  return { state, source: SOURCE_LABEL, checkedAt: TODAY, ...extra };
}

function toFestival({
  id,
  name,
  sigun,
  startDate,
  endDate,
  summary,
  address,
  location,
  contact,
  officialUrl,
  photos,
}) {
  return {
    id,
    name,
    sigun,
    ...(summary ? { summary } : {}),
    startDate,
    endDate,
    // 날짜별 운영시간은 출처에 없다 → null(미확인): 일정에는 수동 후보로만 담긴다
    days: dateRange(startDate, endDate).map((date) => ({ date, ranges: null })),
    programs: [],
    ...(address ? { address } : {}),
    location,
    ...(contact ? { contact } : {}),
    ...(officialUrl ? { officialUrl } : {}),
    photos,
    state: "scheduled",
    checks: {
      schedule: check("unverified"),
      location: check("unverified"),
      info: check("unverified"),
    },
    status: "published",
    updatedAt: new Date().toISOString(),
  };
}

// ── 쓰기 (REST, gcloud 토큰 — 보안 규칙이 아니라 IAM으로 인가) ──
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

const auth = () => ({ Authorization: `Bearer ${process.env.GCP_TOKEN}` });

async function putFestival(f) {
  const { id, ...data } = f;
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/festivals/${id}`,
    {
      method: "PATCH",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify({ fields: enc(data).mapValue.fields }),
    },
  );
  if (!res.ok) throw new Error(`festivals/${id}: ${res.status} ${await res.text()}`);
}

/** 원본 사진을 받아 content/festivals/{id}/ 아래에 올리고 공개 URL을 돌려준다 */
async function uploadPhoto(festivalId, srcUrl, index) {
  const img = await get(srcUrl);
  const type = img.headers.get("content-type") ?? "image/jpeg";
  if (!type.startsWith("image/")) throw new Error(`이미지가 아님: ${srcUrl}`);
  const buf = Buffer.from(await img.arrayBuffer());
  if (buf.length >= 10 * 1024 * 1024) throw new Error(`10MB 초과: ${srcUrl}`);
  const ext = type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `content/festivals/${festivalId}/${String(index + 1).padStart(2, "0")}.${ext}`;
  const res = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(path)}`,
    { method: "POST", headers: { ...auth(), "Content-Type": type }, body: buf },
  );
  if (!res.ok) throw new Error(`upload ${path}: ${res.status} ${await res.text()}`);
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
}

// ── 실행 ──
async function main() {
  if (WRITE && !process.env.GCP_TOKEN)
    throw new Error("--write에는 GCP_TOKEN(gcloud auth print-access-token)이 필요해요.");

  const listed = new Map();
  for (let month = 1; month <= 12; month++) {
    for (const it of await listMonth(month)) listed.set(it.fastivalId, it);
  }

  const festivals = [];
  const report = { detailed: 0, tableOnly: 0, geocoded: 0, photos: 0, skipped: [], errors: [] };
  const detailedNames = new Set();

  for (const it of listed.values()) {
    const sigun = SIGUN[it.sigunLabel];
    if (!sigun) {
      report.skipped.push(`시군 불명: ${it.sigunLabel} ${it.name}`);
      continue;
    }
    try {
      const d = await detail(it.fastivalId);
      const id = `nd-${it.fastivalId}`;
      const sources = [...d.slides];
      if (it.multimediaId) {
        const main = await multimediaImage(it.multimediaId);
        if (main && !sources.includes(main)) sources.unshift(main);
      }
      const location = await geocode(d.address);
      if (location) report.geocoded++;
      festivals.push({
        festival: toFestival({
          id,
          name: it.name,
          sigun,
          startDate: it.startDate,
          endDate: it.endDate,
          summary: d.summary && d.summary !== it.name ? d.summary : undefined,
          address: d.address,
          location,
          contact: d.phone || undefined,
          officialUrl: d.homepage ?? d.url,
          photos: [],
        }),
        photoSources: sources,
        sourceUrl: d.url,
      });
      detailedNames.add(norm(it.name));
      report.detailed++;
    } catch (e) {
      report.errors.push(`${it.fastivalId} ${it.name}: ${e.message}`);
    }
  }

  const { rows, skipped } = await scheduleTable();
  report.skipped.push(...skipped.map((s) => `날짜 미정/형식 불명: ${s}`));
  for (const r of rows) {
    if ([...detailedNames].some((n) => n.includes(norm(r.name)) || norm(r.name).includes(n)))
      continue;
    const id = `nd-s-${createHash("sha1").update(`${r.sigunLabel}|${r.name}|${r.startDate}`).digest("hex").slice(0, 12)}`;
    festivals.push({
      festival: toFestival({
        id,
        name: r.name,
        sigun: SIGUN[r.sigunLabel],
        startDate: r.startDate,
        endDate: r.endDate,
        summary: r.note || undefined,
        location: null,
        photos: [],
      }),
      photoSources: [],
      sourceUrl: `${SITE}/content/view.do?menuCd=T007005002`,
    });
    report.tableOnly++;
  }

  if (WRITE) {
    for (const f of festivals) {
      try {
        const photos = [];
        for (const [i, src] of f.photoSources.entries()) {
          try {
            photos.push(await uploadPhoto(f.festival.id, src, i));
          } catch (e) {
            report.errors.push(`사진 ${f.festival.id}: ${e.message}`);
          }
        }
        report.photos += photos.length;
        await putFestival({ ...f.festival, photos });
      } catch (e) {
        report.errors.push(e.message);
      }
    }
  }

  if (OUT) writeFileSync(OUT, JSON.stringify({ festivals, report }, null, 2));
  console.log(JSON.stringify({ total: festivals.length, ...report, write: WRITE }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
