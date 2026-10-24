// 개인 보관함 repository — users/{uid}/savedPlaces · customPlaces · snsLinks (본인만 읽고 쓴다, firestore.rules).
// 공통 장소 정보는 덮어쓰지 않는다: 보관함에는 참조 + 개인 태그·메모만 둔다 (PLC-05).
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COL, type CustomPlace, type SavedPlace, type SnsLink } from "@/shared/domain";

const savedCol = (uid: string) => collection(db, COL.users, uid, COL.savedPlaces);
const customCol = (uid: string) => collection(db, COL.users, uid, COL.customPlaces);
const snsCol = (uid: string) => collection(db, COL.users, uid, COL.snsLinks);

/** 같은 장소는 문서 하나 — id를 참조에서 만들어 중복 저장을 막는다 (PLC-07) */
export function savedIdFor(ref: SavedPlace["ref"]): string {
  return ref.kind === "place" ? `place__${ref.placeId}` : `custom__${ref.customPlaceId}`;
}

export class AlreadySavedError extends Error {
  constructor() {
    super("이미 보관함에 있는 장소예요.");
    this.name = "AlreadySavedError";
  }
}

export async function listSavedPlaces(uid: string): Promise<SavedPlace[]> {
  const snap = await getDocs(query(savedCol(uid), orderBy("savedAt", "desc")));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<SavedPlace, "id">), id: d.id }));
}

export async function savePlace(
  uid: string,
  ref: SavedPlace["ref"],
  extra: { tags?: string[]; memo?: string } = {},
): Promise<SavedPlace> {
  const id = savedIdFor(ref);
  const target = doc(savedCol(uid), id);
  const exists = await getDoc(target);
  if (exists.exists()) throw new AlreadySavedError();
  const data: Omit<SavedPlace, "id"> = {
    ref,
    tags: extra.tags ?? [],
    memo: extra.memo ?? "",
    savedAt: new Date().toISOString(),
  };
  await setDoc(target, data);
  return { ...data, id };
}

export async function updateSavedPlace(
  uid: string,
  id: string,
  patch: Pick<SavedPlace, "tags" | "memo">,
): Promise<void> {
  await updateDoc(doc(savedCol(uid), id), { tags: patch.tags, memo: patch.memo });
}

/** 보관함 저장 해제 — 이미 담은 코스의 방문 항목은 그대로 둔다 (PLC-06) */
export async function unsavePlace(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(savedCol(uid), id));
}

export async function listCustomPlaces(uid: string): Promise<CustomPlace[]> {
  const snap = await getDocs(query(customCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<CustomPlace, "id">), id: d.id }));
}

/** 개인 장소를 만들고 보관함에도 저장한다 (한 번에) */
export async function createCustomPlace(
  uid: string,
  input: Omit<CustomPlace, "id" | "createdAt">,
  extra: { tags: string[]; memo: string },
): Promise<CustomPlace> {
  const ref = doc(customCol(uid));
  const place: Omit<CustomPlace, "id"> = { ...input, createdAt: new Date().toISOString() };
  const savedRef = { kind: "custom", customPlaceId: ref.id } as const;
  const batch = writeBatch(db);
  batch.set(ref, place);
  batch.set(doc(savedCol(uid), savedIdFor(savedRef)), {
    ref: savedRef,
    tags: extra.tags,
    memo: extra.memo,
    savedAt: place.createdAt,
  } satisfies Omit<SavedPlace, "id">);
  await batch.commit();
  return { ...place, id: ref.id };
}

export async function updateCustomPlace(
  uid: string,
  id: string,
  patch: Partial<Omit<CustomPlace, "id" | "createdAt">>,
): Promise<void> {
  await updateDoc(doc(customCol(uid), id), patch);
}

export async function listSnsLinks(uid: string): Promise<SnsLink[]> {
  const snap = await getDocs(query(snsCol(uid), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<SnsLink, "id">), id: d.id }));
}

export async function getSnsLink(uid: string, id: string): Promise<SnsLink | null> {
  const snap = await getDoc(doc(snsCol(uid), id));
  return snap.exists() ? { ...(snap.data() as Omit<SnsLink, "id">), id: snap.id } : null;
}

/**
 * SNS 링크 저장 — 링크 하나 + 연결한 장소들을 한 번에 기록한다.
 * 연결 장소는 보관함에도 담는다(이미 있으면 건드리지 않음). 새 개인 장소는 여기서 함께 만든다.
 */
export async function saveSnsLink(
  uid: string,
  input: {
    id?: string;
    url: string;
    platform: SnsLink["platform"];
    title?: string;
    sigun: SnsLink["sigun"];
    tags: string[];
    memo: string;
    linkedPlaceIds: string[];
    existingCustomIds: string[];
    newCustomPlaces: Omit<CustomPlace, "id" | "createdAt">[];
  },
): Promise<SnsLink> {
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  const linkRef = input.id ? doc(snsCol(uid), input.id) : doc(snsCol(uid));
  const created = input.newCustomPlaces.map((p) => {
    const ref = doc(customCol(uid));
    batch.set(ref, { ...p, createdAt: now } satisfies Omit<CustomPlace, "id">);
    return ref.id;
  });
  const linked: SnsLink["linked"] = [
    ...input.linkedPlaceIds.map((placeId) => ({ kind: "place" as const, placeId })),
    ...[...input.existingCustomIds, ...created].map((customPlaceId) => ({
      kind: "custom" as const,
      customPlaceId,
    })),
  ];
  const existingSaved = new Set((await getDocs(savedCol(uid))).docs.map((d) => d.id));
  for (const ref of linked) {
    const id = savedIdFor(ref);
    if (existingSaved.has(id)) continue;
    batch.set(doc(savedCol(uid), id), {
      ref,
      tags: input.tags,
      memo: "",
      savedAt: now,
    } satisfies Omit<SavedPlace, "id">);
  }
  const previous = input.id ? await getSnsLink(uid, input.id) : null;
  const data: Omit<SnsLink, "id"> = {
    url: input.url,
    platform: input.platform,
    ...(input.title ? { title: input.title } : {}),
    linked,
    sigun: input.sigun,
    tags: input.tags,
    memo: input.memo,
    createdAt: previous?.createdAt ?? now,
  };
  batch.set(linkRef, data);
  await batch.commit();
  return { ...data, id: linkRef.id };
}

/** 링크 삭제 — 연결했던 장소·보관함 항목·개인 메모는 보존한다 (기능명세 §4) */
export async function deleteSnsLink(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(snsCol(uid), id));
}
