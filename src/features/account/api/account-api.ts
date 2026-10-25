// 계정·공유 repository — 로그인(소셜 1종: Google)·로그아웃·계정 삭제, 공유본(shares) 만들기·갱신·중지·조회.
// 공유본은 공개 시점 사본이다: 개인 메모·출발/종료 위치를 빼고 담는다 (SHR-01). 코스 수정은 자동 반영하지 않는다.
import {
  deleteUser,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { setTripShareId } from "@/features/trips";
import { auth, db } from "@/lib/firebase";
import { COL, type SharedTrip, type Trip } from "@/shared/domain";

export class ShareUnavailableError extends Error {
  constructor() {
    super("공유가 중지됐거나 없는 링크예요.");
    this.name = "ShareUnavailableError";
  }
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * 계정 삭제 — 내 코스·공유본·보관함(저장 장소·개인 장소·SNS 링크)을 지운 뒤 인증 계정을 지운다.
 * 이미 다른 사람이 복사한 코스는 그 사람 것이라 남는다 (기능명세 §8).
 */
export async function deleteMyAccount(uid: string): Promise<void> {
  const refs = [
    ...(await getDocs(query(collection(db, COL.trips), where("ownerUid", "==", uid)))).docs.map(
      (d) => d.ref,
    ),
    ...(await getDocs(query(collection(db, COL.shares), where("ownerUid", "==", uid)))).docs.map(
      (d) => d.ref,
    ),
  ];
  for (const sub of [COL.savedPlaces, COL.customPlaces, COL.snsLinks]) {
    refs.push(...(await getDocs(collection(db, COL.users, uid, sub))).docs.map((d) => d.ref));
  }
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    for (const r of refs.slice(i, i + 400)) batch.delete(r);
    await batch.commit();
  }
  const user = auth.currentUser;
  if (!user) return;
  try {
    await deleteUser(user);
  } catch (e) {
    // 오래전에 로그인했으면 다시 확인이 필요하다
    if ((e as { code?: string }).code === "auth/requires-recent-login") {
      await reauthenticateWithPopup(user, new GoogleAuthProvider());
      await deleteUser(user);
      return;
    }
    throw e;
  }
}

// ── 공유 ──

export type ShareContent = Omit<
  SharedTrip,
  "id" | "ownerUid" | "tripId" | "active" | "publishedVersion" | "publishedAt"
>;

function shareFromDoc(id: string, data: Record<string, unknown>): SharedTrip {
  return { ...(data as unknown as Omit<SharedTrip, "id">), id };
}

export async function getShare(shareId: string): Promise<SharedTrip> {
  try {
    const snap = await getDoc(doc(db, COL.shares, shareId));
    if (!snap.exists()) throw new ShareUnavailableError();
    return shareFromDoc(snap.id, snap.data());
  } catch (e) {
    if ((e as { code?: string }).code === "permission-denied") throw new ShareUnavailableError();
    throw e;
  }
}

/** 공유 시작 — 공유본을 만들고 코스에 연결한다. 해제 뒤 다시 공유하면 새 링크가 된다 */
export async function createShare(trip: Trip, content: ShareContent): Promise<SharedTrip> {
  const ref = doc(collection(db, COL.shares));
  const data: Omit<SharedTrip, "id"> = {
    ...content,
    ownerUid: trip.ownerUid,
    tripId: trip.id,
    active: true,
    publishedVersion: 1,
    publishedAt: new Date().toISOString(),
  };
  await setDoc(ref, data);
  await setTripShareId(trip.id, ref.id);
  return shareFromDoc(ref.id, data);
}

/** "공유 내용 업데이트" — 지금 코스로 공개본을 다시 만든다 */
export async function updateShare(share: SharedTrip, content: ShareContent): Promise<void> {
  await updateDoc(doc(db, COL.shares, share.id), {
    ...content,
    publishedVersion: share.publishedVersion + 1,
    publishedAt: new Date().toISOString(),
  });
}

/** 공유 중지 — 기존 링크로는 더 이상 열 수 없다. 이미 복사한 사람의 코스는 회수하지 않는다 (SHR-02) */
export async function stopShare(shareId: string, tripId: string | null): Promise<void> {
  await updateDoc(doc(db, COL.shares, shareId), { active: false });
  if (tripId) await setTripShareId(tripId, null);
}
