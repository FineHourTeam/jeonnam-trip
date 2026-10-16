// 개인 코스(trips) repository — Firestore 호출은 여기서만 (rules.md § Repository).
// 저장은 트랜잭션으로 버전을 비교한다: 다른 기기에서 먼저 저장했다면 VersionConflictError (기능명세 §8).
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COL, type Trip, type TripDraft } from "@/shared/domain";

export class VersionConflictError extends Error {
  constructor() {
    super("다른 기기에서 먼저 저장된 코스예요.");
    this.name = "VersionConflictError";
  }
}

export class TripNotFoundError extends Error {
  constructor() {
    super("코스를 찾을 수 없어요.");
    this.name = "TripNotFoundError";
  }
}

type TripDoc = Omit<Trip, "id">;

function fromDoc(id: string, data: TripDoc): Trip {
  return { ...data, id };
}

export async function getTrip(tripId: string): Promise<Trip> {
  const snap = await getDoc(doc(db, COL.trips, tripId));
  if (!snap.exists()) throw new TripNotFoundError();
  return fromDoc(snap.id, snap.data() as TripDoc);
}

export async function listMyTrips(uid: string): Promise<Trip[]> {
  const snap = await getDocs(
    query(collection(db, COL.trips), where("ownerUid", "==", uid), orderBy("updatedAt", "desc")),
  );
  return snap.docs.map((d) => fromDoc(d.id, d.data() as TripDoc));
}

/** 새 코스 저장 (로그인 전 초안을 처음 저장할 때 포함). 서버 성공 후에만 id를 돌려준다 */
export async function createTrip(uid: string, draft: TripDraft): Promise<Trip> {
  const ref = doc(collection(db, COL.trips));
  const now = new Date().toISOString();
  const data: TripDoc = {
    ...draft,
    ownerUid: uid,
    shareId: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, data);
  return fromDoc(ref.id, data);
}

/**
 * 기존 코스 저장. trip.version은 "불러왔을 때의 버전"이어야 한다.
 * 서버 버전이 다르면 덮어쓰지 않고 VersionConflictError.
 */
export async function saveTrip(trip: Trip): Promise<Trip> {
  const ref = doc(db, COL.trips, trip.id);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new TripNotFoundError();
    const server = snap.data() as TripDoc;
    if (server.version !== trip.version) throw new VersionConflictError();
    const { id: _id, ...rest } = trip;
    const next: TripDoc = {
      ...rest,
      ownerUid: server.ownerUid,
      shareId: server.shareId,
      createdAt: server.createdAt,
      version: server.version + 1,
      updatedAt: new Date().toISOString(),
    };
    tx.set(ref, next);
    return fromDoc(trip.id, next);
  });
}

/** 공유본 id 연결/해제 — 공유 기능이 사용. 버전도 함께 올린다 */
export async function setTripShareId(trip: Trip, shareId: string | null): Promise<void> {
  await updateDoc(doc(db, COL.trips, trip.id), {
    shareId,
    version: trip.version + 1,
    updatedAt: new Date().toISOString(),
  });
}

/** 코스 삭제. 연결된 공유본 비활성화는 호출 측(공유 기능)이 먼저 처리한다 */
export async function deleteTrip(tripId: string): Promise<void> {
  await deleteDoc(doc(db, COL.trips, tripId));
}
