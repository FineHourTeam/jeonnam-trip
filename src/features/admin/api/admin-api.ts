// 관리자 repository — 운영 콘텐츠 등록·수정·초안·공개·비공개, 사진 업로드 (ADM-01~03).
// 권한은 화면이 아니라 firestore.rules/storage.rules(admins/{uid})가 검사한다. 공개 중인 콘텐츠의 수정은
// contentDrafts에 초안으로 두고 기존 공개본을 유지하다가 "공개본 갱신" 때 반영한다 (기능명세 §1).
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { AdminKind } from "@/app/paths";
import { courseFromDoc, festivalFromDoc, placeFromDoc } from "@/features/content";
import { db, storage } from "@/lib/firebase";
import { COL, type ContentStatus, type CreatorCourse, type Festival, type Place } from "@/shared/domain";

export interface ContentByKind {
  places: Place;
  festivals: Festival;
  creators: CreatorCourse;
}
export type AnyContent = Place | Festival | CreatorCourse;
/** 편집 폼이 다루는 값 — id·status·updatedAt은 저장소가 정한다 */
export type ContentInput<K extends AdminKind> = K extends AdminKind ? Omit<ContentByKind[K], "id" | "status" | "updatedAt"> : never;

const COLLECTION: Record<AdminKind, string> = {
  places: COL.places,
  festivals: COL.festivals,
  creators: COL.creatorCourses,
};

function fromDoc(kind: AdminKind, id: string, data: Record<string, unknown>): AnyContent {
  if (kind === "places") return placeFromDoc(id, data);
  if (kind === "festivals") return festivalFromDoc(id, data);
  return courseFromDoc(id, data);
}

const draftId = (kind: AdminKind, id: string) => `${kind}__${id}`;

export async function checkIsAdmin(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, COL.admins, uid));
  return snap.exists();
}

export async function listContent(kind: AdminKind): Promise<AnyContent[]> {
  const snap = await getDocs(query(collection(db, COLLECTION[kind]), orderBy("updatedAt", "desc"), limit(300)));
  return snap.docs.map((d) => fromDoc(kind, d.id, d.data()));
}

export async function getContentWithDraft(kind: AdminKind, id: string): Promise<{ content: AnyContent; draft: AnyContent | null }> {
  const [snap, draftSnap] = await Promise.all([
    getDoc(doc(db, COLLECTION[kind], id)),
    getDoc(doc(db, COL.contentDrafts, draftId(kind, id))),
  ]);
  if (!snap.exists()) throw new Error("콘텐츠를 찾을 수 없어요. 삭제됐을 수 있어요.");
  return {
    content: fromDoc(kind, snap.id, snap.data()),
    draft: draftSnap.exists() ? fromDoc(kind, id, draftSnap.data()) : null,
  };
}

/** 새로 등록 — 임시저장(draft) 상태로 만든다. 불완전한 정보도 허용 */
export async function createContent<K extends AdminKind>(kind: K, input: ContentInput<K>): Promise<string> {
  const r = doc(collection(db, COLLECTION[kind]));
  await setDoc(r, { ...input, status: "draft" satisfies ContentStatus, updatedAt: new Date().toISOString() });
  return r.id;
}

/** 초안 저장 — 공개 중이면 공개본은 두고 초안 문서에, 아니면 본문서에 저장 */
export async function saveDraft<K extends AdminKind>(kind: K, id: string, status: ContentStatus, input: ContentInput<K>): Promise<void> {
  const now = new Date().toISOString();
  if (status === "published") {
    await setDoc(doc(db, COL.contentDrafts, draftId(kind, id)), { ...input, status, updatedAt: now });
    return;
  }
  await setDoc(doc(db, COLLECTION[kind], id), { ...input, status, updatedAt: now });
}

/** 공개(또는 공개본 갱신) — 본문서를 바꾸고 초안을 지운다. updatedAt이 바뀌어 저장 코스가 재검토 안내를 받는다 */
export async function publishContent<K extends AdminKind>(kind: K, id: string, input: ContentInput<K>): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTION[kind], id), { ...input, status: "published", updatedAt: new Date().toISOString() });
  batch.delete(doc(db, COL.contentDrafts, draftId(kind, id)));
  await batch.commit();
}

export async function hideContent(kind: AdminKind, id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION[kind], id), { status: "hidden", updatedAt: new Date().toISOString() });
}

export async function discardDraft(kind: AdminKind, id: string): Promise<void> {
  await deleteDoc(doc(db, COL.contentDrafts, draftId(kind, id)));
}

/** 사진 올리기 — content/{kind}/{id}/{파일} (storage.rules: 이미지·10MB 미만·관리자) */
export async function uploadContentPhoto(kind: AdminKind, id: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.-]+/g, "_").slice(-60);
  const r = ref(storage, `content/${kind}/${id}/${String(Date.now())}-${safe}`);
  await uploadBytes(r, file, { contentType: file.type });
  return getDownloadURL(r);
}
