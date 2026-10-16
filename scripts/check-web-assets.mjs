// 배포 전 웹 에셋 검사 — 파비콘(Google 검색 결과 아이콘 포함)·앱 아이콘·매니페스트·OG 이미지·크롤 허용.
// 외부 의존성 없음 (Node 18+). /generate-web-assets 스킬이 만드는 결과물을 기계적으로 확인한다.
//
// 실행:
//   node scripts/check-web-assets.mjs            소스 검사 (index.html + public/) — 경고만, 빌드는 계속
//   node scripts/check-web-assets.mjs --strict   실패 항목이 있으면 exit 1 (배포 직전 · 배포 훅 · 배포 CI)
//   node scripts/check-web-assets.mjs --url https://도메인   배포된 사이트를 Googlebot처럼 확인 (배포 후)
//   WEB_ASSETS_STRICT=1 환경변수 = --strict
//
// Google 검색 파비콘 기준 (developers.google.com/search/docs/appearance/favicon-in-search):
//   - <link rel="icon" | "shortcut icon" | "apple-touch-icon"> 가 홈페이지 HTML에 있어야 함
//   - 정사각형, 최소 8×8 — 48×48보다 큰 것 권장 / 지원 형식: ICO·PNG·GIF·JPEG·BMP (SVG는 목록에 없음)
//   - Googlebot이 홈페이지를, Googlebot-Image가 파비콘을 크롤할 수 있어야 함 (robots.txt 차단 금지)
//   - 파비콘 URL은 자주 바꾸지 않는다 / 반영까지 며칠~몇 주 — Search Console URL 검사로 재크롤 요청 가능
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const STRICT = args.includes("--strict") || process.env.WEB_ASSETS_STRICT === "1";
const urlIdx = args.indexOf("--url");
const LIVE_URL = urlIdx >= 0 ? args[urlIdx + 1] : null;
const ROOT = process.cwd();

const fails = [];
const warns = [];
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);

// ── 이미지 크기 읽기 (PNG / ICO / GIF / JPEG) ──
function imageInfo(buf) {
  if (!buf || buf.length < 24) return null;
  if (buf.readUInt32BE(0) === 0x89504e47) {
    return { type: "png", w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  if (buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) === 1) {
    const n = buf.readUInt16LE(4);
    const sizes = [];
    for (let i = 0; i < n && 6 + 16 * i + 1 < buf.length; i++) {
      const w = buf[6 + 16 * i] || 256;
      const h = buf[7 + 16 * i] || 256;
      sizes.push([w, h]);
    }
    const max = sizes.reduce((a, s) => (s[0] > a[0] ? s : a), [0, 0]);
    return { type: "ico", w: max[0], h: max[1], sizes };
  }
  if (buf.toString("ascii", 0, 3) === "GIF") {
    return { type: "gif", w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let o = 2;
    while (o + 9 < buf.length) {
      if (buf[o] !== 0xff) {
        o++;
        continue;
      }
      const marker = buf[o + 1];
      const len = buf.readUInt16BE(o + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { type: "jpeg", w: buf.readUInt16BE(o + 7), h: buf.readUInt16BE(o + 5) };
      }
      o += 2 + len;
    }
    return { type: "jpeg", w: 0, h: 0 };
  }
  if (buf.toString("utf8", 0, 256).includes("<svg")) return { type: "svg", w: 0, h: 0 };
  return null;
}

// ── HTML head에서 <link>·<meta> 수집 ──
function parseAttrs(tag) {
  const attrs = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  }
  return attrs;
}
function parseHead(html) {
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => parseAttrs(m[0]));
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => parseAttrs(m[0]));
  return { links, metas };
}
const RASTER = new Set(["png", "ico", "gif", "jpeg"]);
const ICON_RELS = ["icon", "shortcut icon", "apple-touch-icon", "apple-touch-icon-precomposed"];
const relOf = (l) => (l.rel || "").toLowerCase().trim().replace(/\s+/g, " ");

// ── robots.txt: 특정 UA가 경로를 크롤할 수 있는가 (가장 긴 규칙 우선, Allow 동률 우선) ──
function robotsAllows(txt, ua, path) {
  const groups = [];
  let cur = null;
  let lastWasUA = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      if (!lastWasUA) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasUA = true;
    } else {
      lastWasUA = false;
      if (cur && (key === "allow" || key === "disallow"))
        cur.rules.push({ allow: key === "allow", path: val });
    }
  }
  const uaL = ua.toLowerCase();
  // 가장 구체적인 UA 그룹: googlebot-image → googlebot → *
  const pick = (name) => groups.filter((g) => g.agents.includes(name));
  let chosen = pick(uaL);
  if (!chosen.length && uaL.startsWith("googlebot-")) chosen = pick("googlebot");
  if (!chosen.length) chosen = pick("*");
  const rules = chosen.flatMap((g) => g.rules).filter((r) => r.path !== "");
  let best = null;
  for (const r of rules) {
    const re = new RegExp(
      "^" +
        r.path
          .replace(/[.+?^${}()|[\]\\]/g, (c) => (c === "$" ? "$" : "\\" + c))
          .replace(/\*/g, ".*"),
    );
    const src = r.path.endsWith("$") ? re.source : re.source.replace(/\$$/, "");
    if (new RegExp(src).test(path)) {
      if (
        !best ||
        r.path.length > best.path.length ||
        (r.path.length === best.path.length && r.allow)
      )
        best = r;
    }
  }
  return !best || best.allow;
}

const pathOf = (href) => {
  try {
    return new URL(href, "https://x.invalid").pathname;
  } catch {
    return href;
  }
};

// ── 공통 검사: head + 파일 가져오는 함수 ──
async function checkAll({ html, getFile, getText, where }) {
  const { links, metas } = parseHead(html);
  const iconLinks = links.filter((l) => ICON_RELS.includes(relOf(l)) && l.href);
  const favLinks = iconLinks.filter((l) => ["icon", "shortcut icon"].includes(relOf(l)));

  if (!favLinks.length) {
    fail(
      `${where}: <link rel="icon"> 가 없습니다 — 브라우저 탭과 Google 검색 결과에 기본 지구본 아이콘이 뜹니다.`,
    );
  }
  let bestRaster = 0;
  for (const l of iconLinks) {
    const buf = await getFile(pathOf(l.href));
    if (!buf) {
      fail(`${where}: ${relOf(l)} 파일이 없습니다 — ${l.href}`);
      continue;
    }
    const info = imageInfo(buf);
    if (!info) {
      fail(`${where}: 이미지로 읽을 수 없는 아이콘 — ${l.href}`);
      continue;
    }
    if (info.type !== "svg" && info.w !== info.h)
      fail(`${where}: 아이콘이 정사각형이 아닙니다 (${info.w}×${info.h}) — ${l.href}`);
    if (RASTER.has(info.type) && ["icon", "shortcut icon"].includes(relOf(l)))
      bestRaster = Math.max(bestRaster, info.w);
    if (relOf(l) === "apple-touch-icon" && info.w < 180)
      warn(`${where}: apple-touch-icon은 180×180 권장 (현재 ${info.w}×${info.h})`);
  }
  if (favLinks.length) {
    const first = favLinks[0];
    if (/\.svg($|\?)/i.test(first.href) || /svg/i.test(first.type || "")) {
      warn(
        `${where}: 첫 번째 rel="icon"이 SVG입니다 — Google 검색은 SVG를 지원 형식으로 명시하지 않습니다. ICO/PNG를 먼저 두세요.`,
      );
    }
    if (bestRaster === 0)
      fail(
        `${where}: ICO/PNG 형식의 rel="icon"이 없습니다 — Google 검색 파비콘은 ICO·PNG·GIF·JPEG만 지원합니다.`,
      );
    else if (bestRaster < 48)
      fail(
        `${where}: 가장 큰 ICO/PNG 파비콘이 ${bestRaster}px — Google 검색용으로 48×48 이상이 필요합니다.`,
      );
    else if (bestRaster === 48)
      warn(
        `${where}: ICO/PNG 파비콘 최대가 48px — Google은 48×48보다 큰 것을 권장합니다 (예: icon-192.png를 rel="icon"으로 추가).`,
      );
  }

  if (!iconLinks.some((l) => relOf(l) === "apple-touch-icon"))
    warn(`${where}: apple-touch-icon이 없습니다 (iOS 홈 화면 아이콘).`);

  // 매니페스트
  const man = links.find((l) => relOf(l) === "manifest" && l.href);
  if (!man) fail(`${where}: <link rel="manifest"> 가 없습니다 (PWA·안드로이드 홈 화면 아이콘).`);
  else {
    const txt = await getText(pathOf(man.href));
    if (!txt) fail(`${where}: 매니페스트 파일이 없습니다 — ${man.href}`);
    else {
      let json = null;
      try {
        json = JSON.parse(txt);
      } catch {
        fail(`${where}: 매니페스트 JSON 문법 오류 — ${man.href}`);
      }
      if (json) {
        const icons = Array.isArray(json.icons) ? json.icons : [];
        for (const need of ["192x192", "512x512"]) {
          const ic = icons.find((i) => (i.sizes || "").split(/\s+/).includes(need));
          if (!ic) {
            fail(`${where}: 매니페스트에 ${need} 아이콘이 없습니다.`);
            continue;
          }
          const buf = await getFile(pathOf(ic.src));
          const info = buf && imageInfo(buf);
          if (!info) fail(`${where}: 매니페스트 아이콘 파일이 없습니다 — ${ic.src}`);
          else if (`${info.w}x${info.h}` !== need)
            fail(`${where}: ${ic.src} 실제 크기 ${info.w}×${info.h} ≠ 선언 ${need}`);
        }
      }
    }
  }

  // OG 이미지 (카카오톡·슬랙·페이스북 미리보기)
  const og = metas.find((m) => (m.property || m.name || "").toLowerCase() === "og:image");
  if (!og || !og.content)
    fail(`${where}: og:image 메타가 없습니다 — 링크 공유 시 미리보기 이미지가 안 뜹니다.`);
  else {
    if (!/^https:\/\//.test(og.content))
      fail(`${where}: og:image는 https 절대 URL이어야 합니다 — ${og.content}`);
    if (/\[.*\]/.test(og.content))
      fail(`${where}: og:image에 자리표시자가 남아 있습니다 — ${og.content}`);
    const buf = await getFile(pathOf(og.content));
    const info = buf && imageInfo(buf);
    if (!info) fail(`${where}: og:image 파일이 없습니다 — ${og.content}`);
    else if (info.w && (info.w !== 1200 || info.h !== 630))
      warn(`${where}: og:image ${info.w}×${info.h} — 1200×630 권장`);
  }

  // 크롤 허용 (Google이 홈페이지·파비콘을 못 읽으면 검색 결과 아이콘이 안 뜸)
  const robots = await getText("/robots.txt");
  if (robots) {
    if (!robotsAllows(robots, "Googlebot", "/"))
      fail(`${where}: robots.txt가 Googlebot의 홈페이지(/) 크롤을 막고 있습니다.`);
    for (const l of favLinks) {
      const p = pathOf(l.href);
      if (!robotsAllows(robots, "Googlebot-Image", p))
        fail(`${where}: robots.txt가 Googlebot-Image의 파비콘 크롤을 막고 있습니다 — ${p}`);
    }
  }
}

// ── 소스 모드: index.html + public/ (Vite가 public/을 그대로 dist 루트로 복사) ──
async function checkSource() {
  const htmlPath = join(ROOT, "index.html");
  if (!existsSync(htmlPath)) {
    fail("index.html이 없습니다 (프로젝트 루트에서 실행하세요).");
    return;
  }
  const html = readFileSync(htmlPath, "utf8");
  const pub = join(ROOT, "public");
  const getFile = async (p) => {
    const f = join(pub, decodeURIComponent(p));
    return existsSync(f) ? readFileSync(f) : null;
  };
  const getText = async (p) => {
    const b = await getFile(p);
    return b ? b.toString("utf8") : null;
  };
  await checkAll({ html, getFile, getText, where: "소스" });

  // firebase.json: 사이트 전체에 noindex 헤더를 걸면 검색 결과 자체에서 빠진다
  const fj = join(ROOT, "firebase.json");
  if (existsSync(fj)) {
    try {
      const conf = JSON.parse(readFileSync(fj, "utf8"));
      const hostings = Array.isArray(conf.hosting)
        ? conf.hosting
        : conf.hosting
          ? [conf.hosting]
          : [];
      for (const h of hostings)
        for (const hd of h.headers || []) {
          const src = hd.source || hd.glob || hd.regex || "";
          const all = ["**", "/**", "**/*", "/", "/index.html", "**/*.html"].includes(src);
          const noindex = (hd.headers || []).some(
            (x) => /x-robots-tag/i.test(x.key) && /noindex/i.test(x.value),
          );
          if (all && noindex)
            fail(
              `firebase.json: "${src}"에 X-Robots-Tag noindex — 사이트 전체가 검색에서 빠집니다 (스테이징 전용 설정인지 확인).`,
            );
        }
    } catch {
      warn("firebase.json을 읽지 못했습니다 (JSON 문법 확인).");
    }
  }
}

// ── 배포 사이트 모드: Googlebot처럼 가져와 확인 ──
async function checkLive(base) {
  const origin = new URL(base).origin;
  const UA_PAGE = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
  const UA_IMG = "Googlebot-Image/1.0";
  const res = await fetch(origin + "/", { headers: { "user-agent": UA_PAGE }, redirect: "follow" });
  if (!res.ok) {
    fail(`배포 사이트: 홈페이지 응답 ${res.status}`);
    return;
  }
  const xr = res.headers.get("x-robots-tag") || "";
  if (/noindex/i.test(xr)) fail(`배포 사이트: 홈페이지에 X-Robots-Tag: ${xr}`);
  const html = await res.text();
  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html))
    fail("배포 사이트: 홈페이지에 <meta name=robots noindex>");
  const getFile = async (p) => {
    const r = await fetch(new URL(p, origin), { headers: { "user-agent": UA_IMG } }).catch(
      () => null,
    );
    if (!r || !r.ok) return null;
    return Buffer.from(await r.arrayBuffer());
  };
  const getText = async (p) => {
    const r = await fetch(new URL(p, origin), { headers: { "user-agent": UA_PAGE } }).catch(
      () => null,
    );
    return r && r.ok ? r.text() : null;
  };
  await checkAll({ html, getFile, getText, where: `배포 사이트(${origin})` });
}

try {
  if (LIVE_URL) await checkLive(LIVE_URL);
  else await checkSource();
} catch (e) {
  fail(`검사 중 오류: ${e.message}`);
}

const hasLogo = ["png", "svg"].some((x) =>
  existsSync(join(ROOT, "web-assets/logo-source", `logo.${x}`)),
);
for (const w of warns) console.warn(`  ⚠️  ${w}`);
for (const f of fails) console.error(`  ❌ ${f}`);
if (fails.length) {
  console.error(
    hasLogo || LIVE_URL
      ? "\n→ /generate-web-assets 를 실행해 파비콘·앱 아이콘·매니페스트·OG 이미지를 만들고 index.html에 연결하세요."
      : "\n→ 로고 원본을 web-assets/logo-source/logo.png(1024×1024 이상) 또는 logo.svg로 넣은 뒤 /generate-web-assets 를 실행하세요.",
  );
  if (LIVE_URL)
    console.error(
      "  고친 뒤 재배포 → Search Console URL 검사에서 홈페이지 '색인 생성 요청' (검색 결과 반영까지 며칠~몇 주).",
    );
  if (STRICT || LIVE_URL) process.exit(1);
  console.error("  (경고 모드 — 배포 전에는 --strict로 막힙니다)");
} else {
  console.log(`✅ 웹 에셋 검사 통과${warns.length ? ` (경고 ${warns.length}건)` : ""}`);
}
