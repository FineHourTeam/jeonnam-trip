// 콘텐츠 영어·일본어 번역(scripts/data/*-i18n.json) → 운영 Firestore {컬렉션}/{id}.i18n 필드만 갱신.
//
// 실행 (기본은 dry-run: 건수만 센다):
//   GCP_TOKEN=$(gcloud auth print-access-token) node scripts/apply-translations.mjs --write
//
// - 데이터 파일 모양: { [id]: { ko: {...}, en: {...}, ja: {...} } } — ko는 번역할 때의 원문
//   장소·축제 {name,summary,address}, 코스 {title,summary,notes: {"d{일차}-{순서}": 메모}}
// - 화면은 원문이 ko와 같은 필드만 번역을 쓴다(src/shared/lib/content-text.ts) → 관리자가 고친 필드는 한국어로 보인다
// - crawl-namdo-*.mjs --write는 문서를 통째로 덮어써 i18n이 지워진다. 수집을 다시 돌렸으면 이 스크립트도 다시 돌린다
// - 없는 문서는 건너뛴다(만들지 않는다)
import { readFileSync } from "node:fs";
import { patchFields } from "./lib/firebase-rest.mjs";

const WRITE = process.argv.includes("--write");
const FILES = {
  places: "place-i18n.json",
  festivals: "festival-i18n.json",
  creatorCourses: "course-i18n.json",
};

for (const [collection, file] of Object.entries(FILES)) {
  const data = JSON.parse(readFileSync(new URL(`./data/${file}`, import.meta.url), "utf8"));
  const ids = Object.keys(data);
  console.log(
    `${collection} 번역 ${String(ids.length)}건${WRITE ? " 쓰는 중…" : " (dry-run — --write로 반영)"}`,
  );
  if (!WRITE) continue;

  let done = 0;
  const missing = [];
  for (let i = 0; i < ids.length; i += 20) {
    await Promise.all(
      ids.slice(i, i + 20).map(async (id) => {
        try {
          await patchFields(collection, id, { i18n: data[id] });
          done++;
        } catch (e) {
          if (String(e).includes(" 404 ")) missing.push(id);
          else throw e;
        }
      }),
    );
  }
  console.log(
    `${collection} 반영 ${String(done)}건, 문서 없음 ${String(missing.length)}건`,
    missing.slice(0, 10),
  );
}
