// 운영 콘텐츠 관리 repository — Firestore·Storage 호출은 여기서만 (rules.md § Repository).
// 초안 정책(기능명세 §1): 공개 중인 콘텐츠를 고치면 contentDrafts/{kind}__{id}에 초안을 두고 공개본은 그대로 둔다.
// "공개본 갱신"을 누를 때만 본문에 쓰고 초안을 지운다. 아직 공개된 적 없는 콘텐츠는 본문에 status "draft"로 저장한다.
// 권한은 Firestore·Storage 규칙(admins/{uid})이 실제로 막는다 — 화면 게이트는 안내용이다.
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { AdminKind } from "@/app/paths";
import { db, storage } from "@/lib/firebase";
import {
  COL,
  type ContentStatus,
  type CreatorCourse,
  type Festival,
  type Place,
} from "@/shared/domain";

export interface ContentByKind {
  festivals: Festival;
  places: Place;
  creators: CreatorCourse;
}
export type AnyContent = ContentByKind[AdminKind];

const COLLECTION: Record<AdminKind, string> = {
  festivals: COL.festivals,
  places: COL.places,
  creators: COL.creatorCourses,
};

const draftId = (kind: AdminKind, id: string) => `${kind}__${id}`;

interface DraftDoc<T> {
  kind: AdminKind;
  contentId: string;
  data: T;
  savedAt: string;
}

export async function checkIsAdmin(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, COL.admins, uid));
  return snap.exists();
}

/** 새 콘텐츠 id (저장 전에 사진 경로를 정하려고 미리 만든다) */
export function newContentId(kind: AdminKind): string {
  return doc(collection(db, COLLECTION[kind])).id;
}

// ponytail: 관리자 목록은 전부 받아 화면에서 거른다(장소 1천여 건) — 수천 건을 넘으면 서버 페이지네이션으로
export async function listContent<K extends AdminKind>(kind: K): Promise<ContentByKind[K][]> {
  const snap = await getDocs(collection(db, COLLECTION[kind]));
  return snap.docs.map(
    (d) => ({ ...(d.data() as Omit<ContentByKind[K], "id">), id: d.id }) as ContentByKind[K],
  );
}

export interface ContentCounts {
  total: number;
  published: number;
  draft: number;
  hidden: number;
}

export async function countContent(kind: AdminKind): Promise<ContentCounts> {
  const col = collection(db, COLLECTION[kind]);
  const count = async (status?: ContentStatus) =>
    (await getCountFromServer(status ? query(col, where("status", "==", status)) : col)).data()
      .count;
  const [total, published, draft, hidden] = await Promise.all([
    count(),
    count("published"),
    count("draft"),
    count("hidden"),
  ]);
  return { total, published, draft, hidden };
}

export interface EditableContent<T> {
  /** 본문 (없으면 새 콘텐츠) */
  saved: T | null;
  /** 공개 중 콘텐츠의 수정 초안 */
  draft: { data: T; savedAt: string } | null;
}

export async function getEditable<K extends AdminKind>(
  kind: K,
  id: string,
): Promise<EditableContent<ContentByKind[K]>> {
  const [main, draft] = await Promise.all([
    getDoc(doc(db, COLLECTION[kind], id)),
    getDoc(doc(db, COL.contentDrafts, draftId(kind, id))),
  ]);
  const d = draft.exists() ? (draft.data() as DraftDoc<ContentByKind[K]>) : null;
  return {
    saved: main.exists() ? ({ ...main.data(), id } as ContentByKind[K]) : null,
    draft: d ? { data: { ...d.data, id }, savedAt: d.savedAt } : null,
  };
}

function body<T extends AnyContent>(content: T): Omit<T, "id"> {
  const { id: _id, ...rest } = content;
  return rest;
}

/**
 * 초안 저장. 본문이 공개 중이면 공개본은 두고 contentDrafts에만 쓴다.
 * @returns "draft-doc" = 별도 초안으로 저장, "main" = 본문에 draft 상태로 저장
 */
export async function saveDraft(
  kind: AdminKind,
  content: AnyContent,
): Promise<"draft-doc" | "main"> {
  const now = new Date().toISOString();
  const main = await getDoc(doc(db, COLLECTION[kind], content.id));
  if (main.exists() && (main.data() as AnyContent).status === "published") {
    const draft: DraftDoc<Omit<AnyContent, "id">> = {
      kind,
      contentId: content.id,
      data: { ...body(content), status: "published", updatedAt: now },
      savedAt: now,
    };
    await setDoc(doc(db, COL.contentDrafts, draftId(kind, content.id)), draft);
    return "draft-doc";
  }
  // 공개 중이 아니면(신규·임시저장·비공개) 본문에 바로 쓴다. 남아 있던 수정 초안(비공개 전 저장분)은
  // 이 내용으로 옮겨졌으니 함께 지운다 — 남겨 두면 편집 화면이 옛 초안을 다시 불러와 이번 저장분을 가린다
  const status: ContentStatus = main.exists() ? (main.data() as AnyContent).status : "draft";
  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTION[kind], content.id), { ...body(content), status, updatedAt: now });
  batch.delete(doc(db, COL.contentDrafts, draftId(kind, content.id)));
  await batch.commit();
  return "main";
}

/** 공개본 갱신 — 본문을 이 내용으로 바꾸고 공개, 남아 있던 초안은 지운다 */
export async function publish(kind: AdminKind, content: AnyContent): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, COLLECTION[kind], content.id), {
    ...body(content),
    status: "published",
    updatedAt: new Date().toISOString(),
  });
  batch.delete(doc(db, COL.contentDrafts, draftId(kind, content.id)));
  await batch.commit();
}

/** 비공개 — 사용자 화면·목록에서 빠진다. 저장된 사용자 코스의 사본은 그대로 남는다 */
export async function hide(kind: AdminKind, id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION[kind], id), {
    status: "hidden",
    updatedAt: new Date().toISOString(),
  });
}

export async function discardDraft(kind: AdminKind, id: string): Promise<void> {
  await deleteDoc(doc(db, COL.contentDrafts, draftId(kind, id)));
}

export class PhotoTooLargeError extends Error {
  constructor() {
    super("사진은 10MB보다 작은 이미지 파일만 올릴 수 있어요.");
    this.name = "PhotoTooLargeError";
  }
}

/** content/{kind}/{id}/ 아래에 올리고 공개 URL을 돌려준다 (규칙: 관리자·이미지·10MB 미만) */
export async function uploadPhoto(kind: AdminKind, id: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.size >= 10 * 1024 * 1024)
    throw new PhotoTooLargeError();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const r = ref(storage, `content/${kind}/${id}/${String(Date.now())}.${ext}`);
  await uploadBytes(r, file, { contentType: file.type });
  return getDownloadURL(r);
}
