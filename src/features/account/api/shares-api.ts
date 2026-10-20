// 공유본(shares) repository — Firestore 호출은 여기서만 (rules.md § Repository).
// 공개 시점 사본을 만든다. 개인 코스를 고쳐도 공유본은 그대로이고, "공유 내용 업데이트"를 눌러야 바뀐다 (기능명세 §8).
// 규칙: 활성 공유본은 링크(id)를 아는 누구나 단건 조회, 만들기·고치기는 자기 코스의 소유자만.
import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COL, type SharedTrip, type Trip } from "@/shared/domain";
import { toSharedTrip } from "../lib/share-copy";

export class ShareNotFoundError extends Error {
  constructor() {
    super("공유가 해제됐거나 없는 링크예요.");
    this.name = "ShareNotFoundError";
  }
}

export class ShareInactiveError extends Error {
  constructor() {
    super("공유가 이미 해제된 링크예요. 새 링크를 만들어 주세요.");
    this.name = "ShareInactiveError";
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

/**
 * 공유 내용 업데이트 — 지금 코스로 사본을 다시 만들고 공개 버전을 올린다.
 * 다른 기기에서 이미 해제한 공유본을 화면 캐시만 믿고 되살리지 않게 서버 상태를 읽고 쓴다.
 */
export async function republishShare(trip: Trip, current: SharedTrip): Promise<SharedTrip> {
  const ref = doc(db, COL.shares, current.id);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists() || !(snap.data() as ShareDoc).active) throw new ShareInactiveError();
    const server = snap.data() as ShareDoc;
    const share = toSharedTrip(trip, {
      id: current.id,
      publishedVersion: server.publishedVersion + 1,
      publishedAt: new Date().toISOString(),
    });
    const { id: _id, ...data } = share;
    tx.set(ref, data);
    return share;
  });
}

/** 공유 해제 — 링크로 더 이상 열리지 않는다. 이미 복사해 간 개인 코스는 회수하지 않는다 */
export async function deactivateShare(shareId: string): Promise<void> {
  await updateDoc(doc(db, COL.shares, shareId), { active: false });
}

/**
 * 코스를 지우기 전에 그 코스의 활성 공유본을 모두 막는다 — 화면 캐시의 shareId가 오래됐어도
 * 삭제된 코스의 링크가 열리지 않게 서버에서 찾는다 (규칙: 소유자 목록 조회 허용)
 */
export async function deactivateSharesOfTrip(ownerUid: string, tripId: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, COL.shares),
      where("ownerUid", "==", ownerUid),
      where("tripId", "==", tripId),
      where("active", "==", true),
    ),
  );
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { active: false })));
}
