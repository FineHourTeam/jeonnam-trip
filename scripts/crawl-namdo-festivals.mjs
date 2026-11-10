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
// - 사이트 저작물은 공공누리 제4유형(출처표시·상업적 이용금지·변경금지). 사진은 사이트가 내려주는 그대로 올린다
//
// ponytail: HTML을 정규식으로 읽는다 — 사이트 마크업이 바뀌면 깨지므로, 깨지면 dry-run 결과부터 확인한다
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { commitDocs, uploadImage } from "./lib/firebase-rest.mjs";
import {
  SIGUN,
  SITE,
  SOURCE_LABEL,
  TODAY,
  UA,
  geocode,
  get,
  text,
  thumbUrl,
} from "./lib/namdo.mjs";

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const YEAR = Number(arg("--year") ?? new Date().getFullYear());
const WRITE = args.includes("--write");
const OUT = arg("--out");

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
  return f ? thumbUrl(f) : null;
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
      for (const [i, src] of f.photoSources.entries()) {
        try {
          f.festival.photos.push(
            await uploadImage(
              `content/festivals/${f.festival.id}/${String(i + 1).padStart(2, "0")}`,
              src,
              { "User-Agent": UA },
            ),
          );
        } catch (e) {
          report.errors.push(`사진 ${f.festival.id}: ${e.message}`);
        }
      }
      report.photos += f.festival.photos.length;
    }
    await commitDocs(
      festivals.map(({ festival: { id, ...data } }) => ({ collection: "festivals", id, data })),
    );
  }

  if (OUT) writeFileSync(OUT, JSON.stringify({ festivals, report }, null, 2));
  console.log(JSON.stringify({ total: festivals.length, ...report, write: WRITE }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
