// 개인 보관함 repository — users/{uid}/savedPlaces·customPlaces·snsLinks (규칙: 본인만 읽고 쓴다).
// 중복 방지: 등록 장소의 보관 문서 id = placeId, 개인 장소는 customPlaceId, SNS 링크는 정리한 주소의 해시.
// 공통 장소(places)는 여기서 고치지 않는다 — 개인 보관함 수정과 공통 장소 수정은 다른 동작이다 (기능명세 §1).
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COL, type CustomPlace, type SavedPlace, type SnsLink } from "@/shared/domain";
import { refKey, snsPlatformOf } from "../lib/library";

export class SnsLinkExistsError extends Error {
  readonly linkId: string;

  constructor(linkId: string) {
    super("이미 보관한 링크예요.");
    this.name = "SnsLinkExistsError";
    this.linkId = linkId;
  }
}

export class SnsLinkNotFoundError extends Error {
  constructor() {
    super("링크를 찾을 수 없어요.");
    this.name = "SnsLinkNotFoundError";
  }
}

const savedCol = (uid: string) => collection(db, COL.users, uid, COL.savedPlaces);
const customCol = (uid: string) => collection(db, COL.users, uid, COL.customPlaces);
const linkCol = (uid: string) => collection(db, COL.users, uid, COL.snsLinks);

type SavedDoc = Omit<SavedPlace, "id">;
type CustomDoc = Omit<CustomPlace, "id">;
type LinkDoc = Omit<SnsLink, "id">;
type PlaceRef = SnsLink["linked"][number];

export async function listSavedPlaces(uid: string): Promise<SavedPlace[]> {
  const snap = await getDocs(query(savedCol(uid), orderBy("savedAt", "desc")));
  return snap.docs.map((d) => ({ ...(d.data() as SavedDoc), id: d.id }));
}

export async function listCustomPlaces(uid: string): Promise<CustomPlace[]> {
  const snap = await getDocs(query(customCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ ...(d.data() as CustomDoc), id: d.id }));
}

export async function listSnsLinks(uid: string): Promise<SnsLink[]> {
  const snap = await getDocs(query(linkCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ ...(d.data() as LinkDoc), id: d.id }));
}

/** 등록 장소 저장. 다른 기기에서 이미 저장했으면 그 태그·메모를 지우지 않고 그대로 둔다 */
export async function savePlace(uid: string, placeId: string): Promise<void> {
  const ref = doc(savedCol(uid), placeId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return;
    const data: SavedDoc = {
      ref: { kind: "place", placeId },
      tags: [],
      memo: "",
      savedAt: new Date().toISOString(),
    };
    tx.set(ref, data);
  });
}

/** 개인 태그·메모 수정 — 다른 기기에서 저장 해제했으면 되살리지 않고 실패한다 */
export async function updateSavedPlace(
  uid: string,
  input: { id: string; tags: string[]; memo: string },
): Promise<void> {
  await updateDoc(doc(savedCol(uid), input.id), { tags: input.tags, memo: input.memo });
}

/** 저장 해제 되돌리기 — 지우기 전 항목을 그대로 다시 쓴다 */
export async function restoreSavedPlace(uid: string, saved: SavedPlace): Promise<void> {
  const { id, ...data } = saved;
  await setDoc(doc(savedCol(uid), id), data);
}

/** 저장 해제 — 보관함 항목만 지운다. 이미 담은 코스·개인 장소·SNS 링크는 그대로 */
export async function removeSavedPlace(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(savedCol(uid), id));
}

/** 링크에 연결할 장소 — 등록 장소, 이미 만든 개인 장소, 이번에 새로 입력한 개인 장소 */
export type LinkTarget =
  | { kind: "place"; placeId: string }
  | { kind: "custom"; customPlaceId: string }
  | { kind: "new"; place: Omit<CustomPlace, "id" | "createdAt"> };

export interface SnsLinkInput {
  /** normalizeSnsUrl로 정리한 주소 */
  url: string;
  sigun: SnsLink["sigun"];
  tags: string[];
  memo: string;
  targets: LinkTarget[];
}

async function linkIdOf(url: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * SNS 링크 보관. linkId가 없으면 새 링크(같은 주소가 이미 있으면 SnsLinkExistsError), 있으면 그 링크를 고친다.
 * 연결한 장소 중 보관함에 없는 곳은 저장한 장소로 함께 담고(링크 태그를 붙여), 이미 있는 곳은 건드리지 않는다.
 */
export async function saveSnsLink(
  uid: string,
  input: SnsLinkInput,
  linkId: string | null,
): Promise<SnsLink> {
  const id = linkId ?? (await linkIdOf(input.url));
  const linkRef = doc(linkCol(uid), id);
  return runTransaction(db, async (tx) => {
    const existing = await tx.get(linkRef);
    if (linkId === null && existing.exists()) throw new SnsLinkExistsError(id);
    if (linkId !== null && !existing.exists()) throw new SnsLinkNotFoundError();
    const now = new Date().toISOString();
    const before = existing.exists() ? (existing.data() as LinkDoc) : null;
    const wasLinked = new Set(before?.linked.map(refKey));

    const linked: SnsLink["linked"] = [];
    const newCustoms: { id: string; data: CustomDoc }[] = [];
    for (const t of input.targets) {
      if (t.kind === "new") {
        const customId = doc(customCol(uid)).id;
        const { name, sigun, category, address, location } = t.place;
        newCustoms.push({
          id: customId,
          data: { name, sigun, category, address, location, createdAt: now },
        });
        linked.push({ kind: "custom", customPlaceId: customId });
      } else {
        const r: PlaceRef =
          t.kind === "place"
            ? { kind: "place", placeId: t.placeId }
            : { kind: "custom", customPlaceId: t.customPlaceId };
        if (!linked.some((x) => refKey(x) === refKey(r))) linked.push(r);
      }
    }
    // 이번에 새로 연결한 장소만 보관함에 담는다 — 예전부터 연결돼 있던 장소를 사용자가 저장 해제했으면 되살리지 않는다
    const toSave = linked.filter((r) => !wasLinked.has(refKey(r)));
    const savedRef = (r: PlaceRef) =>
      doc(savedCol(uid), r.kind === "place" ? r.placeId : r.customPlaceId);
    const isNew = new Set(newCustoms.map((c) => c.id));
    // 트랜잭션은 읽기를 모두 끝낸 뒤 쓴다 — 방금 만드는 개인 장소는 읽을 필요가 없다
    const snaps = await Promise.all(
      toSave
        .filter((r) => !(r.kind === "custom" && isNew.has(r.customPlaceId)))
        .map((r) => tx.get(savedRef(r))),
    );
    const alreadySaved = new Set(snaps.filter((s) => s.exists()).map((s) => s.id));

    for (const c of newCustoms) tx.set(doc(customCol(uid), c.id), c.data);
    for (const r of toSave) {
      const ref = savedRef(r);
      if (alreadySaved.has(ref.id)) continue;
      const data: SavedDoc = { ref: r, tags: input.tags, memo: "", savedAt: now };
      tx.set(ref, data);
    }
    const data: LinkDoc = {
      url: input.url,
      platform: snsPlatformOf(input.url),
      linked,
      sigun: input.sigun,
      tags: input.tags,
      memo: input.memo,
      createdAt: before?.createdAt ?? now,
    };
    tx.set(linkRef, data);
    return { ...data, id };
  });
}

/** 링크만 지운다 — 연결했던 장소와 메모는 보관함에 남는다 */
export async function deleteSnsLink(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(linkCol(uid), id));
}
