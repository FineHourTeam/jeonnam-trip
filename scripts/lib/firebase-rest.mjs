// 운영 Firestore·Storage REST 쓰기 — gcloud 액세스 토큰(GCP_TOKEN)으로 IAM 인가 (보안 규칙을 거치지 않는다).
// 콘텐츠 수집 스크립트(crawl-namdo-*.mjs)가 함께 쓴다. 새 패키지 없이 fetch만 쓴다.
const PROJECT = process.env.FIREBASE_PROJECT ?? "jeonnam-trip";
const BUCKET = process.env.STORAGE_BUCKET ?? "jeonnam-trip.firebasestorage.app";
const DOCS = `projects/${PROJECT}/databases/(default)/documents`;

const auth = () => {
  if (!process.env.GCP_TOKEN)
    throw new Error("GCP_TOKEN(gcloud auth print-access-token)이 필요해요.");
  return { Authorization: `Bearer ${process.env.GCP_TOKEN}` };
};

/** JS 값 → Firestore REST Value (undefined 필드는 뺀다) */
export function enc(v) {
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

/** Firestore REST Value → JS 값 */
export function dec(v) {
  if ("mapValue" in v)
    return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, dec(x)]));
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(dec);
  if ("integerValue" in v) return Number(v.integerValue);
  if ("nullValue" in v) return null;
  return v.stringValue ?? v.booleanValue ?? v.doubleValue ?? v.timestampValue;
}

/** 문서의 일부 필드만 읽는다. 문서가 없으면 null */
export async function getFields(collection, id, fieldPaths) {
  const mask = fieldPaths.map((f) => `mask.fieldPaths=${f}`).join("&");
  const res = await fetch(
    `https://firestore.googleapis.com/v1/${DOCS}/${collection}/${id}?${mask}`,
    {
      headers: auth(),
    },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`get ${id}: ${String(res.status)} ${await res.text()}`);
  return dec({ mapValue: { fields: (await res.json()).fields ?? {} } });
}

/** data에 있는 필드만 바꾼다(updateMask) — 나머지 필드는 그대로 두고, 없는 문서는 만들지 않는다 */
export async function patchFields(collection, id, data) {
  const mask = Object.keys(data)
    .map((f) => `updateMask.fieldPaths=${f}`)
    .join("&");
  const res = await fetch(
    `https://firestore.googleapis.com/v1/${DOCS}/${collection}/${id}?${mask}&currentDocument.exists=true`,
    {
      method: "PATCH",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify({ fields: enc(data).mapValue.fields }),
    },
  );
  if (!res.ok) throw new Error(`patch ${id}: ${String(res.status)} ${await res.text()}`);
}

/** 문서를 통째로 쓴다(덮어쓰기). docs: [{ collection, id, data }] — 200개씩 커밋 */
export async function commitDocs(docs) {
  for (let i = 0; i < docs.length; i += 200) {
    const writes = docs.slice(i, i + 200).map(({ collection, id, data }) => ({
      update: { name: `${DOCS}/${collection}/${id}`, fields: enc(data).mapValue.fields },
    }));
    const res = await fetch(`https://firestore.googleapis.com/v1/${DOCS}:commit`, {
      method: "POST",
      headers: { ...auth(), "Content-Type": "application/json" },
      body: JSON.stringify({ writes }),
    });
    if (!res.ok) throw new Error(`commit ${String(i)}: ${String(res.status)} ${await res.text()}`);
  }
}

/** 이미지를 받아 Storage path에 올리고 공개 다운로드 URL을 돌려준다 (content/** 는 공개 읽기 규칙) */
export async function uploadImage(path, srcUrl, headers = {}) {
  const img = await fetch(srcUrl, { headers });
  if (!img.ok) throw new Error(`${String(img.status)} ${srcUrl}`);
  // "image/jpeg;charset=utf-8"처럼 매개변수가 붙어 오는 서버가 있어 미디어 타입만 쓴다
  const type = (img.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!type.startsWith("image/")) throw new Error(`이미지가 아님: ${srcUrl}`);
  const buf = Buffer.from(await img.arrayBuffer());
  if (buf.length >= 10 * 1024 * 1024) throw new Error(`10MB 초과: ${srcUrl}`);
  const ext = type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const name = `${path}.${ext}`;
  const res = await fetch(
    `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=media&name=${encodeURIComponent(name)}`,
    { method: "POST", headers: { ...auth(), "Content-Type": type }, body: buf },
  );
  if (!res.ok) throw new Error(`upload ${name}: ${String(res.status)} ${await res.text()}`);
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(name)}?alt=media`;
}
