// 공유본(shares) repository — Firestore 호출은 여기서만 (rules.md § Repository).
// 공개 시점 사본을 만든다. 개인 코스를 고쳐도 공유본은 그대로이고, "공유 내용 업데이트"를 눌러야 바뀐다 (기능명세 §8).
// 규칙: 활성 공유본은 링크(id)를 아는 누구나 단건 조회, 만들기·고치기는 자기 코스의 소유자만.
import { FirebaseError } from "firebase/app";
import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COL, type SharedTrip, type Trip } from "@/shared/domain";
import { toSharedTrip } from "../lib/share-copy";

export class ShareNotFoundError extends Error {
  constructor() {
    super("공유가 해제됐거나 없는 링크예요.");
    this.name = "ShareNotFoundError";
  }
}

type ShareDoc = Omit<SharedTrip, "id">;

/** 공개 페이지용 — 비활성·없는 공유본은 같은 "없음"으로 */
export async function getActiveShare(shareId: string): Promise<SharedTrip> {
  try {
    const snap = await getDoc(doc(db, COL.shares, shareId));
    if (!snap.exists()) throw new ShareNotFoundError();
    const data = snap.data() as ShareDoc;
    if (!data.active) throw new ShareNotFoundError();
    return { ...data, id: snap.id };
  } catch (e) {
    if (e instanceof FirebaseError && e.code === "permission-denied")
      throw new ShareNotFoundError();
    throw e;
  }
}

/** 소유자용 — 비활성이어도 읽는다. 없으면 null */
export async function getOwnShare(shareId: string): Promise<SharedTrip | null> {
  const snap = await getDoc(doc(db, COL.shares, shareId));
  return snap.exists() ? { ...(snap.data() as ShareDoc), id: snap.id } : null;
}

export async function createShare(trip: Trip): Promise<SharedTrip> {
  const ref = doc(collection(db, COL.shares));
  const share = toSharedTrip(trip, {
    id: ref.id,
    publishedVersion: 1,
    publishedAt: new Date().toISOString(),
  });
  const { id: _id, ...data } = share;
  await setDoc(ref, data);
  return share;
}

/** 공유 내용 업데이트 — 지금 코스로 사본을 다시 만들고 공개 버전을 올린다 */
export async function republishShare(trip: Trip, current: SharedTrip): Promise<SharedTrip> {
  const share = toSharedTrip(trip, {
    id: current.id,
    publishedVersion: current.publishedVersion + 1,
    publishedAt: new Date().toISOString(),
  });
  const { id: _id, ...data } = share;
  await setDoc(doc(db, COL.shares, current.id), data);
  return share;
}

/** 공유 해제 — 링크로 더 이상 열리지 않는다. 이미 복사해 간 개인 코스는 회수하지 않는다 */
export async function deactivateShare(shareId: string): Promise<void> {
  await updateDoc(doc(db, COL.shares, shareId), { active: false });
}
