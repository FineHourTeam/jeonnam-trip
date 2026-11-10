// 사진 없는 축제에 출처가 확인된 공공저작물 사진을 채운다 → 운영 Storage + Firestore `festivals`의 사진 필드.
//
// 실행 (기본은 dry-run: 무엇을 할지와 이미지 주소가 살아 있는지만 확인한다):
//   GCP_TOKEN=$(gcloud auth print-access-token) node scripts/fill-festival-photos.mjs
//   GCP_TOKEN=$(gcloud auth print-access-token) node scripts/fill-festival-photos.mjs --write
//   ... --write --force   이미 사진이 있는 축제도 매니페스트 사진으로 바꾼다
//
// - 사진 목록은 scripts/data/festival-photos.json (축제 id → imageUrl·sourcePage·license·credit)에 사람이 고른 것만 둔다
// - 이용 조건이 분명한 출처만 쓴다: 공공누리 표시가 있는 남도여행길잡이(namdokorea.com, 제4유형)·시군 관광 누리집 갤러리 등.
//   제4유형은 출처표시·상업적 이용금지·변경금지 — 이미지는 출처 서버가 내려주는 그대로 올리고, credit을 photoCredit에 남겨
//   축제 상세 사진 아래에 보인다
// - 문서는 photos·photoCredit 두 필드만 updateMask로 바꾼다 (다른 필드는 건드리지 않고, 없는 문서는 만들지 않는다)
// - 이미 사진이 있는 축제는 건너뛴다 (--force일 때만 바꾼다). Storage 경로가 고정(content/festivals/<id>/credited-01)이라
//   다시 돌려도 같은 파일을 덮어쓴다
//
// ponytail: 사진은 자동 검색하지 않고 매니페스트로만 받는다 — 출처 주소가 바뀌면 dry-run의 "이미지 확인 실패"로 드러나니 그때 매니페스트를 고친다
import { readFileSync } from "node:fs";
import { getFields, patchFields, uploadImage } from "./lib/firebase-rest.mjs";
import { UA } from "./lib/namdo.mjs";

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const FORCE = args.includes("--force");
const manifest = JSON.parse(
  readFileSync(new URL("./data/festival-photos.json", import.meta.url), "utf8"),
);

async function imageOk(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const type = (res.headers.get("content-type") ?? "").split(";")[0];
  await res.arrayBuffer();
  return res.ok && type.startsWith("image/");
}

async function main() {
  if (!process.env.GCP_TOKEN)
    throw new Error("GCP_TOKEN(gcloud auth print-access-token)이 필요해요.");
  const report = { planned: 0, written: 0, skipped: [], errors: [] };
  for (const [id, p] of Object.entries(manifest)) {
    const doc = await getFields("festivals", id, ["name", "photos"]);
    if (!doc) {
      report.skipped.push(`${id}: 문서 없음`);
      continue;
    }
    if (doc.photos?.length && !FORCE) {
      report.skipped.push(`${id} ${doc.name}: 이미 사진 ${String(doc.photos.length)}장`);
      continue;
    }
    if (!(await imageOk(p.imageUrl))) {
      report.errors.push(`${id} ${doc.name}: 이미지 확인 실패 ${p.imageUrl}`);
      continue;
    }
    report.planned++;
    console.log(`${WRITE ? "쓰기" : "예정"} ${id} ${doc.name} ← ${p.credit}`);
    if (!WRITE) continue;
    try {
      const url = await uploadImage(`content/festivals/${id}/credited-01`, p.imageUrl, {
        "User-Agent": UA,
      });
      await patchFields("festivals", id, { photos: [url], photoCredit: p.credit });
      report.written++;
    } catch (e) {
      report.errors.push(`${id} ${doc.name}: ${e.message}`);
    }
  }
  console.log(
    JSON.stringify({ total: Object.keys(manifest).length, ...report, write: WRITE }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
