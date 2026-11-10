// 남도여행길잡이(namdokorea.com) 수집 공통 — 요청 간격·시군 매핑·출처 문구.
// 사이트 저작물은 공공누리 제4유형(출처표시·상업적 이용금지·변경금지)이라 출처를 항상 남긴다.
export const SITE = "https://www.namdokorea.com";
export const UA = "jeonnam-trip-content-bot/1.0 (+https://jeonnam-trip.web.app)";
export const SOURCE_LABEL = "남도여행길잡이(namdokorea.com) 자동 수집 · 공공누리 제4유형";
export const TODAY = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

export const SIGUN = {
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

/** 원 사이트에 부담을 주지 않게 요청마다 간격을 둔다 */
export async function get(url) {
  await sleep(300);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${String(res.status)} ${url}`);
  return res;
}

export async function postForm(path, data) {
  await sleep(300);
  const res = await fetch(`${SITE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": UA,
    },
    body: new URLSearchParams(data),
  });
  if (!res.ok) throw new Error(`${String(res.status)} ${path}`);
  return res.json();
}

/** HTML 조각 → 줄바꿈을 살린 평문 */
export const text = (html) =>
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
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();

/** 사이트 사진 — 원본 경로는 공개되지 않고 600px 썸네일만 내려준다 */
export function thumbUrl(fileMap) {
  return `${SITE}${fileMap.filePath}/thumb/${fileMap.fileNm}_600.${fileMap.fileExt}`;
}

/** 동시에 limit개씩 처리 */
export async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

/** 주소 → 좌표 (네이버 지오코딩, NCP_ID·NCP_SECRET이 있을 때만). 못 찾으면 null */
export async function geocode(address) {
  if (!process.env.NCP_ID || !process.env.NCP_SECRET || !address) return null;
  const res = await fetch(
    `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address.replace(/^대한민국\s*/, ""))}`,
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
